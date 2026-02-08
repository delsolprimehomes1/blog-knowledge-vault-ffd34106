import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ReminderRow = Database["public"]["Tables"]["crm_reminders"]["Row"];
type LeadRow = Database["public"]["Tables"]["crm_leads"]["Row"];

export interface ReminderWithLead extends ReminderRow {
  lead: Pick<LeadRow, 
    "id" | "first_name" | "last_name" | "phone_number" | "email" | 
    "language" | "lead_status" | "lead_segment"
  > | null;
}

export interface UseRemindersOptions {
  agentId: string | null;
  dateRange?: { start: Date; end: Date };
  filterType?: string;
  filterStatus?: "all" | "pending" | "overdue" | "completed";
  enabled?: boolean;
}

export function useReminders({
  agentId,
  dateRange,
  filterType,
  filterStatus = "all",
  enabled = true,
}: UseRemindersOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["reminders", agentId, dateRange, filterType, filterStatus],
    queryFn: async (): Promise<ReminderWithLead[]> => {
      if (!agentId) return [];

      let queryBuilder = supabase
        .from("crm_reminders")
        .select(`
          *,
          lead:crm_leads(
            id, first_name, last_name, phone_number, email, 
            language, lead_status, lead_segment
          )
        `)
        .eq("agent_id", agentId)
        .order("reminder_datetime", { ascending: true });

      // Apply date range filter
      if (dateRange) {
        queryBuilder = queryBuilder
          .gte("reminder_datetime", dateRange.start.toISOString())
          .lte("reminder_datetime", dateRange.end.toISOString());
      }

      // Apply type filter
      if (filterType && filterType !== "all") {
        queryBuilder = queryBuilder.eq("reminder_type", filterType);
      }

      // Apply status filter
      if (filterStatus === "pending") {
        queryBuilder = queryBuilder.eq("is_completed", false);
      } else if (filterStatus === "completed") {
        queryBuilder = queryBuilder.eq("is_completed", true);
      } else if (filterStatus === "overdue") {
        queryBuilder = queryBuilder
          .eq("is_completed", false)
          .lt("reminder_datetime", new Date().toISOString());
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return (data as ReminderWithLead[]) || [];
    },
    enabled: enabled && !!agentId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return query;
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("crm_reminders")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["agent-reminders"] });
      toast.success("Reminder completed");
    },
    onError: () => {
      toast.error("Failed to complete reminder");
    },
  });
}

export function useSnoozeReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      reminderId, 
      minutes,
      newDatetime,
    }: { 
      reminderId: string; 
      minutes?: number;
      newDatetime?: Date;
    }) => {
      const snoozeUntil = newDatetime 
        ? newDatetime.toISOString()
        : new Date(Date.now() + (minutes || 30) * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("crm_reminders")
        .update({
          reminder_datetime: snoozeUntil,
          snoozed_until: snoozeUntil,
        })
        .eq("id", reminderId);

      if (error) throw error;
      return snoozeUntil;
    },
    onSuccess: (snoozeUntil) => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["agent-reminders"] });
      const snoozeDate = new Date(snoozeUntil);
      toast.success(`Snoozed until ${snoozeDate.toLocaleTimeString()}`);
    },
    onError: () => {
      toast.error("Failed to snooze reminder");
    },
  });
}

export function useRescheduleReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      reminderId, 
      newDatetime,
    }: { 
      reminderId: string; 
      newDatetime: Date;
    }) => {
      const { error } = await supabase
        .from("crm_reminders")
        .update({
          reminder_datetime: newDatetime.toISOString(),
        })
        .eq("id", reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["agent-reminders"] });
      toast.success("Reminder rescheduled");
    },
    onError: () => {
      toast.error("Failed to reschedule reminder");
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("crm_reminders")
        .delete()
        .eq("id", reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["agent-reminders"] });
      toast.success("Reminder deleted");
    },
    onError: () => {
      toast.error("Failed to delete reminder");
    },
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      agentId: string;
      leadId?: string;
      title: string;
      description?: string;
      reminderType: string;
      reminderDatetime: Date;
      sendEmail?: boolean;
      sendSlack?: boolean;
    }) => {
      const { error, data: reminder } = await supabase
        .from("crm_reminders")
        .insert({
          agent_id: data.agentId,
          lead_id: data.leadId || null,
          title: data.title,
          description: data.description || null,
          reminder_type: data.reminderType,
          reminder_datetime: data.reminderDatetime.toISOString(),
          send_email: data.sendEmail ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["agent-reminders"] });
      toast.success("Reminder created");
    },
    onError: () => {
      toast.error("Failed to create reminder");
    },
  });
}

export function useRemindersRealtime(agentId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`reminders-realtime-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_reminders",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          // Invalidate queries to refetch with latest data
          queryClient.invalidateQueries({ queryKey: ["reminders"] });
          queryClient.invalidateQueries({ queryKey: ["agent-reminders"] });

          // Show toast for new reminders
          if (payload.eventType === "INSERT") {
            const newReminder = payload.new as ReminderRow;
            toast.info(`New reminder: ${newReminder.title}`, {
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [agentId, queryClient]);
}

// Helper to get reminders count by urgency
export function useReminderStats(agentId: string | null) {
  return useQuery({
    queryKey: ["reminder-stats", agentId],
    queryFn: async () => {
      if (!agentId) return { overdue: 0, urgent: 0, today: 0, total: 0 };

      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("crm_reminders")
        .select("reminder_datetime")
        .eq("agent_id", agentId)
        .eq("is_completed", false);

      if (error) throw error;

      const stats = {
        overdue: 0,
        urgent: 0,
        today: 0,
        total: data?.length || 0,
      };

      data?.forEach((reminder) => {
        const reminderTime = new Date(reminder.reminder_datetime);
        const minutesUntil = (reminderTime.getTime() - now.getTime()) / 60000;

        if (minutesUntil < 0) {
          stats.overdue++;
        } else if (minutesUntil < 60) {
          stats.urgent++;
        } else if (reminderTime <= endOfToday) {
          stats.today++;
        }
      });

      return stats;
    },
    enabled: !!agentId,
    refetchInterval: 60000, // Refresh every minute
  });
}
