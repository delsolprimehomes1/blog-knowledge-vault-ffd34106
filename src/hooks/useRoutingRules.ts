import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoutingRule {
  id: string;
  rule_name: string;
  rule_description: string | null;
  priority: number;
  is_active: boolean;
  match_language: string[];
  match_page_type: string[];
  match_page_slug: string[];
  match_lead_source: string[];
  match_lead_segment: string[];
  match_budget_range: string[];
  match_property_type: string[];
  match_timeframe: string[];
  assign_to_agent_id: string;
  fallback_to_broadcast: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_matched_at: string | null;
  total_matches: number;
  // Joined agent data
  agent?: {
    id: string;
    first_name: string;
    last_name: string;
    languages: string[];
    current_lead_count: number;
    max_active_leads: number;
  };
}

export interface CreateRoutingRulePayload {
  rule_name: string;
  rule_description?: string;
  priority?: number;
  is_active?: boolean;
  match_language?: string[];
  match_page_type?: string[];
  match_page_slug?: string[];
  match_lead_source?: string[];
  match_lead_segment?: string[];
  match_budget_range?: string[];
  match_property_type?: string[];
  match_timeframe?: string[];
  assign_to_agent_id: string;
  fallback_to_broadcast?: boolean;
}

export function useRoutingRules() {
  return useQuery({
    queryKey: ["routing-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_routing_rules")
        .select(`
          *,
          agent:crm_agents!assign_to_agent_id(
            id,
            first_name,
            last_name,
            languages,
            current_lead_count,
            max_active_leads
          )
        `)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as RoutingRule[];
    },
  });
}

export function useRoutingRule(id: string) {
  return useQuery({
    queryKey: ["routing-rule", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_routing_rules")
        .select(`
          *,
          agent:crm_agents!assign_to_agent_id(
            id,
            first_name,
            last_name,
            languages,
            current_lead_count,
            max_active_leads
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as RoutingRule;
    },
    enabled: !!id,
  });
}

export function useRoutingRuleStats() {
  return useQuery({
    queryKey: ["routing-rule-stats"],
    queryFn: async () => {
      const { data: rules, error } = await supabase
        .from("crm_routing_rules")
        .select("id, is_active, total_matches, last_matched_at");

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeRules = rules?.filter((r) => r.is_active).length || 0;
      const totalRules = rules?.length || 0;
      const totalMatches = rules?.reduce((sum, r) => sum + (r.total_matches || 0), 0) || 0;
      
      // Matches today (based on last_matched_at being today)
      const matchesToday = rules?.filter((r) => {
        if (!r.last_matched_at) return false;
        const matchDate = new Date(r.last_matched_at);
        return matchDate >= today;
      }).length || 0;

      return {
        activeRules,
        totalRules,
        totalMatches,
        matchesToday,
      };
    },
  });
}

export function useCreateRoutingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRoutingRulePayload) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase
        .from("crm_routing_rules")
        .insert({
          ...payload,
          created_by: session.session?.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      queryClient.invalidateQueries({ queryKey: ["routing-rule-stats"] });
      toast.success("Routing rule created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });
}

export function useUpdateRoutingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateRoutingRulePayload> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_routing_rules")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      queryClient.invalidateQueries({ queryKey: ["routing-rule-stats"] });
      toast.success("Routing rule updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });
}

export function useDeleteRoutingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_routing_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      queryClient.invalidateQueries({ queryKey: ["routing-rule-stats"] });
      toast.success("Routing rule deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
}

export function useToggleRuleActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("crm_routing_rules")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      queryClient.invalidateQueries({ queryKey: ["routing-rule-stats"] });
      toast.success(is_active ? "Rule activated" : "Rule deactivated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle rule: ${error.message}`);
    },
  });
}

export function useUpdateRulePriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: number }) => {
      const { data, error } = await supabase
        .from("crm_routing_rules")
        .update({ priority })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update priority: ${error.message}`);
    },
  });
}
