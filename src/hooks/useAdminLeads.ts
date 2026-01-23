import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { differenceInHours } from "date-fns";

export interface AdminLead {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string | null;
  language: string;
  lead_source: string;
  lead_source_detail: string | null;
  lead_segment: string;
  lead_status: string;
  lead_priority: string;
  budget_range: string | null;
  location_preference: string[] | null;
  current_lead_score: number;
  assigned_agent_id: string | null;
  assigned_at: string | null;
  assignment_method: string | null;
  lead_claimed: boolean;
  claim_window_expires_at: string | null;
  created_at: string;
  last_contact_at: string | null;
  days_since_last_contact: number | null;
  archived: boolean;
  contact_complete?: boolean;
  agent?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface AdminLeadFilters {
  includeArchived?: boolean;
  filterStatus?: "all" | "unclaimed" | "claimed" | "incomplete" | "sla_breach" | "expired_claim";
  filterLanguage?: string;
  filterSegment?: string;
  filterPriority?: string;
  searchQuery?: string;
}

export interface EligibleAgent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  languages: string[];
  current_lead_count: number;
  max_active_leads: number;
  accepts_new_leads: boolean;
  is_active: boolean;
}

// Fetch all leads for admin
export function useAdminLeads(filters: AdminLeadFilters = {}) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["admin-leads", filters],
    queryFn: async () => {
      let query = supabase
        .from("crm_leads")
        .select(`
          *,
          agent:crm_agents!crm_leads_assigned_agent_id_fkey(
            id, first_name, last_name, email
          )
        `)
        .order("created_at", { ascending: false });

      // Include/exclude archived
      if (!filters.includeArchived) {
        query = query.eq("archived", false);
      }

      const { data, error } = await query;
      if (error) throw error;

      let leads = (data || []) as AdminLead[];

      // Apply client-side filters for complex conditions
      if (filters.filterStatus === "unclaimed") {
        leads = leads.filter(l => !l.lead_claimed && !l.assigned_agent_id);
      } else if (filters.filterStatus === "claimed") {
        leads = leads.filter(l => l.lead_claimed && l.assigned_agent_id);
      } else if (filters.filterStatus === "incomplete") {
        leads = leads.filter(l => l.contact_complete === false);
      } else if (filters.filterStatus === "sla_breach") {
        leads = leads.filter(l => {
          if (!l.assigned_at) return false;
          const hoursSinceAssigned = differenceInHours(new Date(), new Date(l.assigned_at));
          return hoursSinceAssigned > 24 && !l.last_contact_at;
        });
      } else if (filters.filterStatus === "expired_claim") {
        leads = leads.filter(l => {
          if (!l.claim_window_expires_at) return false;
          return new Date(l.claim_window_expires_at) < new Date() && !l.lead_claimed;
        });
      }

      if (filters.filterLanguage && filters.filterLanguage !== "all") {
        leads = leads.filter(l => l.language === filters.filterLanguage);
      }

      if (filters.filterSegment && filters.filterSegment !== "all") {
        leads = leads.filter(l => l.lead_segment === filters.filterSegment);
      }

      if (filters.filterPriority && filters.filterPriority !== "all") {
        leads = leads.filter(l => l.lead_priority === filters.filterPriority);
      }

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        leads = leads.filter(l =>
          l.first_name.toLowerCase().includes(q) ||
          l.last_name.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone_number.includes(q)
        );
      }

      return leads;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_leads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Fetch eligible agents for a lead
export function useEligibleAgents(language?: string) {
  return useQuery({
    queryKey: ["eligible-agents", language],
    queryFn: async () => {
      let query = supabase
        .from("crm_agents")
        .select("*")
        .eq("is_active", true)
        .eq("accepts_new_leads", true)
        .order("current_lead_count", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      let agents = (data || []) as EligibleAgent[];

      // Filter by language if specified
      if (language) {
        agents = agents.filter(a => a.languages.includes(language));
      }

      // Filter out agents at capacity
      agents = agents.filter(a => a.current_lead_count < a.max_active_leads);

      return agents;
    },
  });
}

// Get suggested agent (least loaded with language match)
export function getSuggestedAgent(agents: EligibleAgent[], language: string): EligibleAgent | null {
  const eligible = agents.filter(
    a => a.languages.includes(language) && a.current_lead_count < a.max_active_leads
  );
  
  if (eligible.length === 0) return null;
  
  return eligible.reduce((prev, current) =>
    current.current_lead_count < prev.current_lead_count ? current : prev
  );
}

// Helper to update agent lead count directly
async function updateAgentLeadCount(agentId: string, delta: number) {
  const { data: agent, error: fetchError } = await supabase
    .from("crm_agents")
    .select("current_lead_count")
    .eq("id", agentId)
    .single();

  if (fetchError) throw fetchError;

  const newCount = Math.max(0, (agent?.current_lead_count || 0) + delta);

  const { error: updateError } = await supabase
    .from("crm_agents")
    .update({ current_lead_count: newCount })
    .eq("id", agentId);

  if (updateError) throw updateError;
}

// Manual assignment mutation
export function useAssignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      agentId,
      reason,
      adminId,
      previousAgentId,
    }: {
      leadId: string;
      agentId: string;
      reason?: string;
      adminId: string;
      previousAgentId?: string | null;
    }) => {
      // Decrement previous agent's count if reassigning
      if (previousAgentId) {
        await updateAgentLeadCount(previousAgentId, -1);
      }

      // Update lead
      const { error: leadError } = await supabase
        .from("crm_leads")
        .update({
          assigned_agent_id: agentId,
          assigned_at: new Date().toISOString(),
          assignment_method: "admin_assigned",
          lead_claimed: true,
        })
        .eq("id", leadId);

      if (leadError) throw leadError;

      // Increment new agent's count
      await updateAgentLeadCount(agentId, 1);

      // Log activity
      const activityNote = previousAgentId
        ? `Lead reassigned by admin from previous agent. Reason: ${reason || "Not specified"}`
        : `Lead manually assigned by admin. Reason: ${reason || "Not specified"}`;

      await supabase.from("crm_activities").insert({
        lead_id: leadId,
        agent_id: agentId,
        activity_type: "note",
        notes: activityNote,
        created_at: new Date().toISOString(),
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agent-stats"] });
      toast({ title: "Lead assigned successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to assign lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Bulk assignment mutation
export function useBulkAssignLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadIds,
      agentId,
      reason,
      adminId,
    }: {
      leadIds: string[];
      agentId: string;
      reason?: string;
      adminId: string;
    }) => {
      // Get agent capacity
      const { data: agent } = await supabase
        .from("crm_agents")
        .select("current_lead_count, max_active_leads, first_name, last_name")
        .eq("id", agentId)
        .single();

      if (!agent) throw new Error("Agent not found");

      const availableCapacity = agent.max_active_leads - agent.current_lead_count;
      if (leadIds.length > availableCapacity) {
        throw new Error(
          `Cannot assign ${leadIds.length} leads. Agent has capacity for only ${availableCapacity} more leads.`
        );
      }

      // Get leads with their current agents
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("id, assigned_agent_id")
        .in("id", leadIds);

      // Collect previous agents to decrement
      const previousAgentCounts = new Map<string, number>();
      leads?.forEach(l => {
        if (l.assigned_agent_id) {
          previousAgentCounts.set(
            l.assigned_agent_id,
            (previousAgentCounts.get(l.assigned_agent_id) || 0) + 1
          );
        }
      });

      // Decrement previous agents
      for (const [prevAgentId, count] of previousAgentCounts) {
        await updateAgentLeadCount(prevAgentId, -count);
      }

      // Update all leads
      const { error: leadError } = await supabase
        .from("crm_leads")
        .update({
          assigned_agent_id: agentId,
          assigned_at: new Date().toISOString(),
          assignment_method: "admin_bulk_assigned",
          lead_claimed: true,
        })
        .in("id", leadIds);

      if (leadError) throw leadError;

      // Increment agent's count
      await updateAgentLeadCount(agentId, leadIds.length);

      // Log activities
      const activities = leadIds.map(leadId => ({
        lead_id: leadId,
        agent_id: agentId,
        activity_type: "note" as const,
        notes: `Lead bulk-assigned by admin. Reason: ${reason || "Bulk assignment"}`,
        created_at: new Date().toISOString(),
      }));

      await supabase.from("crm_activities").insert(activities);

      return { 
        success: true, 
        count: leadIds.length,
        agentName: `${agent.first_name} ${agent.last_name}` 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agent-stats"] });
      toast({ title: `${data.count} leads assigned to ${data.agentName}` });
    },
    onError: (error) => {
      toast({
        title: "Failed to bulk assign leads",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Bulk delete leads mutation
export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadIds,
      adminId,
    }: {
      leadIds: string[];
      adminId: string;
    }) => {
      // Get leads with their current agents to decrement counts
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("id, assigned_agent_id")
        .in("id", leadIds);

      // Collect agents to decrement
      const agentCounts = new Map<string, number>();
      leads?.forEach(l => {
        if (l.assigned_agent_id) {
          agentCounts.set(
            l.assigned_agent_id,
            (agentCounts.get(l.assigned_agent_id) || 0) + 1
          );
        }
      });

      // Decrement agent lead counts
      for (const [agentId, count] of agentCounts) {
        await updateAgentLeadCount(agentId, -count);
      }

      // Delete related activities first
      await supabase
        .from("crm_activities")
        .delete()
        .in("lead_id", leadIds);

      // Delete related notes
      await supabase
        .from("crm_lead_notes")
        .delete()
        .in("lead_id", leadIds);

      // Delete related notifications
      await supabase
        .from("crm_notifications")
        .delete()
        .in("lead_id", leadIds);

      // Delete the leads
      const { error } = await supabase
        .from("crm_leads")
        .delete()
        .in("id", leadIds);

      if (error) throw error;

      return { success: true, count: leadIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agent-stats"] });
      toast({ title: `${data.count} lead${data.count !== 1 ? 's' : ''} permanently deleted` });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete leads",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Restart round robin mutation
export function useRestartRoundRobin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      adminId,
    }: {
      leadId: string;
      adminId: string;
    }) => {
      // Get current assignment
      const { data: lead } = await supabase
        .from("crm_leads")
        .select("assigned_agent_id")
        .eq("id", leadId)
        .single();

      // Decrement old agent's count if assigned
      if (lead?.assigned_agent_id) {
        await updateAgentLeadCount(lead.assigned_agent_id, -1);
      }

      // Reset lead to unclaimed state
      const { error } = await supabase
        .from("crm_leads")
        .update({
          lead_claimed: false,
          assigned_agent_id: null,
          assigned_at: null,
          assignment_method: null,
          claim_window_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;

      // Log activity
      await supabase.from("crm_activities").insert({
        lead_id: leadId,
        agent_id: adminId,
        activity_type: "note",
        notes: "Round robin restarted by admin - lead re-broadcast to eligible agents",
        created_at: new Date().toISOString(),
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
      toast({ title: "Round robin restarted" });
    },
    onError: (error) => {
      toast({
        title: "Failed to restart round robin",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Archive/Unarchive lead mutation
export function useArchiveLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      archive,
      reason,
      adminId,
    }: {
      leadId: string;
      archive: boolean;
      reason?: string;
      adminId: string;
    }) => {
      // Get current assignment
      const { data: lead } = await supabase
        .from("crm_leads")
        .select("assigned_agent_id")
        .eq("id", leadId)
        .single();

      // If archiving and has agent, decrement count
      if (archive && lead?.assigned_agent_id) {
        await updateAgentLeadCount(lead.assigned_agent_id, -1);
      }

      const { error } = await supabase
        .from("crm_leads")
        .update({ archived: archive })
        .eq("id", leadId);

      if (error) throw error;

      // Log activity
      await supabase.from("crm_activities").insert({
        lead_id: leadId,
        agent_id: adminId,
        activity_type: "note",
        notes: archive
          ? `Lead archived by admin. Reason: ${reason || "Not specified"}`
          : `Lead unarchived by admin`,
        created_at: new Date().toISOString(),
      });

      return { success: true, archived: archive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
      toast({ title: data.archived ? "Lead archived" : "Lead unarchived" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Admin stats hook
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [leadsResult, agentsResult] = await Promise.all([
        supabase
          .from("crm_leads")
          .select("id, lead_claimed, assigned_agent_id, assigned_at, last_contact_at, claim_window_expires_at, archived, contact_complete")
          .eq("archived", false),
        supabase
          .from("crm_agents")
          .select("id, is_active, accepts_new_leads"),
      ]);

      if (leadsResult.error) throw leadsResult.error;
      if (agentsResult.error) throw agentsResult.error;

      const leads = leadsResult.data || [];
      const agents = agentsResult.data || [];

      const unclaimed = leads.filter(l => !l.lead_claimed && !l.assigned_agent_id).length;
      
      const expiredClaims = leads.filter(l => {
        if (!l.claim_window_expires_at) return false;
        return new Date(l.claim_window_expires_at) < new Date() && !l.lead_claimed;
      }).length;

      const slaBreaches = leads.filter(l => {
        if (!l.assigned_at) return false;
        const hoursSinceAssigned = differenceInHours(new Date(), new Date(l.assigned_at));
        return hoursSinceAssigned > 24 && !l.last_contact_at;
      }).length;

      const activeAgents = agents.filter(a => a.is_active && a.accepts_new_leads).length;
      const totalAgents = agents.filter(a => a.is_active).length;
      
      const incomplete = leads.filter(l => (l as any).contact_complete === false).length;

      return {
        unclaimed,
        expiredClaims,
        slaBreaches,
        activeAgents,
        totalAgents,
        totalLeads: leads.length,
        incomplete,
      };
    },
  });
}
