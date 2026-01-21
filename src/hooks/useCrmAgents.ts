import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CrmAgent {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  languages: string[];
  email_notifications: boolean;
  slack_channel_id: string | null;
  slack_user_id: string | null;
  max_active_leads: number;
  accepts_new_leads: boolean;
  current_lead_count: number;
  is_active: boolean;
  timezone: string;
  created_at: string;
  last_login: string | null;
  updated_at: string;
  urgent_emails_enabled: boolean;
}

export function useCrmAgents() {
  return useQuery({
    queryKey: ["crm-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CrmAgent[];
    },
  });
}

export function useCrmAgent(id: string) {
  return useQuery({
    queryKey: ["crm-agent", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_agents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as CrmAgent;
    },
    enabled: !!id,
  });
}

export function useCrmAgentStats() {
  return useQuery({
    queryKey: ["crm-agent-stats"],
    queryFn: async () => {
      const [agentsResult, leadsResult] = await Promise.all([
        supabase.from("crm_agents").select("id, is_active"),
        supabase.from("crm_leads").select("id, lead_claimed, archived").eq("archived", false),
      ]);

      if (agentsResult.error) throw agentsResult.error;
      if (leadsResult.error) throw leadsResult.error;

      const agents = agentsResult.data || [];
      const leads = leadsResult.data || [];

      return {
        totalAgents: agents.length,
        activeAgents: agents.filter((a) => a.is_active).length,
        totalLeads: leads.length,
        unclaimedLeads: leads.filter((l) => !l.lead_claimed).length,
      };
    },
  });
}

export function useUpdateAgentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: "is_active" | "accepts_new_leads";
      value: boolean;
    }) => {
      const { error } = await supabase
        .from("crm_agents")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
      toast({ title: "Agent updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating agent",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CrmAgent>;
    }) => {
      const { error } = await supabase
        .from("crm_agents")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
      toast({ title: "Agent updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating agent",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      phone?: string;
      role: string;
      languages: string[];
      max_active_leads: number;
      slack_channel_id?: string;
      email_notifications: boolean;
      timezone: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke("create-crm-agent", {
        body: data,
      });

      // Parse error from response body if available
      if (error) {
        // Try to extract error message from the response context
        let errorMessage = error.message;
        try {
          if (error.context && typeof error.context === 'object' && 'json' in error.context) {
            const body = await (error.context as Response).json();
            if (body?.error) {
              errorMessage = body.error;
            }
          }
        } catch {
          // Use original error message if parsing fails
        }
        throw new Error(errorMessage);
      }
      
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agent-stats"] });
      toast({ title: "Agent created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error creating agent",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const { data: result, error } = await supabase.functions.invoke("delete-crm-agent", {
        body: { agent_id: agentId },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
      queryClient.invalidateQueries({ queryKey: ["crm-agent-stats"] });
      toast({ title: "Agent deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error deleting agent",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
