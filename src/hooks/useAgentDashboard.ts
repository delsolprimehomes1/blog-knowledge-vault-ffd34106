import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

// Types for the agent dashboard - matching actual DB schema
export interface AgentLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  language: string;
  lead_status: string;
  lead_segment: string;
  budget_range: string | null;
  property_type: string[] | null;
  location_preference: string[] | null;
  bedrooms_desired: string | null;
  timeframe: string | null;
  created_at: string;
  last_contact_at: string | null;
  assigned_agent_id: string;
  updated_at?: string;
}

export interface AgentReminder {
  id: string;
  lead_id: string;
  agent_id: string;
  reminder_datetime: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
  lead?: AgentLead;
}

export interface AgentStats {
  newLeads: number;
  callbacksDueToday: number;
  activeLeads: number;
  responseRate: number;
  nextCallbackMinutes: number | null;
}

// Hook to fetch current agent profile
export function useAgentProfile() {
  return useQuery({
    queryKey: ["agent-profile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("crm_agents")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

// Hook to fetch agent's assigned leads
export function useAgentLeads() {
  return useQuery({
    queryKey: ["agent-leads"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("assigned_agent_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AgentLead[];
    },
  });
}

// Hook to fetch agent's reminders/callbacks
export function useAgentReminders() {
  return useQuery({
    queryKey: ["agent-reminders"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("crm_reminders")
        .select(`
          *,
          lead:crm_leads(*)
        `)
        .eq("agent_id", session.user.id)
        .eq("is_completed", false)
        .order("reminder_datetime", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as AgentReminder[];
    },
  });
}

// Hook to calculate agent stats
export function useAgentStats() {
  const { data: leads } = useAgentLeads();
  const { data: reminders } = useAgentReminders();

  return useQuery({
    queryKey: ["agent-stats", leads?.length, reminders?.length],
    queryFn: async (): Promise<AgentStats> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const newLeads = leads?.filter(l => l.lead_status === 'new').length || 0;
      
      const callbacksDueToday = reminders?.filter(r => {
        const reminderDate = new Date(r.reminder_datetime);
        return reminderDate >= todayStart && reminderDate < todayEnd;
      }).length || 0;

      const activeLeads = leads?.filter(l => 
        !['closed_won', 'closed_lost', 'not_interested'].includes(l.lead_status)
      ).length || 0;

      // Calculate response rate (leads contacted within 24h)
      const recentLeads = leads?.filter(l => {
        const created = new Date(l.created_at);
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return created > dayAgo;
      }) || [];
      
      const contactedInTime = recentLeads.filter(l => l.last_contact_at).length;
      const responseRate = recentLeads.length > 0 
        ? Math.round((contactedInTime / recentLeads.length) * 100) 
        : 100;

      // Next callback in minutes
      const upcomingReminders = reminders?.filter(r => new Date(r.reminder_datetime) > now);
      const nextReminder = upcomingReminders?.[0];
      const nextCallbackMinutes = nextReminder 
        ? Math.round((new Date(nextReminder.reminder_datetime).getTime() - now.getTime()) / 60000)
        : null;

      return {
        newLeads,
        callbacksDueToday,
        activeLeads,
        responseRate,
        nextCallbackMinutes,
      };
    },
    enabled: !!leads && !!reminders,
  });
}

// Complete a reminder
export function useCompleteReminder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("crm_reminders")
        .update({ is_completed: true })
        .eq("id", reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["agent-stats"] });
      toast({ title: "Callback marked complete" });
    },
    onError: (error) => {
      toast({ 
        title: "Error completing callback", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

// Snooze a reminder
export function useSnoozeReminder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ reminderId, minutes }: { reminderId: string; minutes: number }) => {
      const newTime = new Date(Date.now() + minutes * 60000).toISOString();
      
      const { error } = await supabase
        .from("crm_reminders")
        .update({ reminder_datetime: newTime })
        .eq("id", reminderId);

      if (error) throw error;
    },
    onSuccess: (_, { minutes }) => {
      queryClient.invalidateQueries({ queryKey: ["agent-reminders"] });
      toast({ title: `Snoozed for ${minutes} minutes` });
    },
    onError: (error) => {
      toast({ 
        title: "Error snoozing callback", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

// Update lead status
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({ 
          lead_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-leads"] });
      queryClient.invalidateQueries({ queryKey: ["agent-stats"] });
      toast({ title: "Lead status updated" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating lead", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

// Real-time subscriptions hook
export function useAgentRealtimeSubscriptions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    let leadsChannel: ReturnType<typeof supabase.channel> | null = null;
    let remindersChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscriptions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Subscribe to leads changes
      leadsChannel = supabase
        .channel('agent-leads-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crm_leads',
            filter: `assigned_agent_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newLead = payload.new as AgentLead;
              toast({
                title: "New Lead Assigned!",
                description: `${newLead.first_name} ${newLead.last_name}`,
              });
              // Play notification sound (optional)
              // playNotificationSound();
            }
            queryClient.invalidateQueries({ queryKey: ["agent-leads"] });
            queryClient.invalidateQueries({ queryKey: ["agent-stats"] });
          }
        )
        .subscribe();

      // Subscribe to reminders changes
      remindersChannel = supabase
        .channel('agent-reminders-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crm_reminders',
            filter: `agent_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["agent-reminders"] });
            queryClient.invalidateQueries({ queryKey: ["agent-stats"] });
          }
        )
        .subscribe();

      setIsSubscribed(true);
    };

    setupSubscriptions();

    return () => {
      if (leadsChannel) supabase.removeChannel(leadsChannel);
      if (remindersChannel) supabase.removeChannel(remindersChannel);
      setIsSubscribed(false);
    };
  }, [queryClient, toast]);

  return { isSubscribed };
}
