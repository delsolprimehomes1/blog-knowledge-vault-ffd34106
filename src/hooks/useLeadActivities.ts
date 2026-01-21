import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type CrmActivity = Database["public"]["Tables"]["crm_activities"]["Row"];

interface UseLeadActivitiesOptions {
  leadId: string | undefined;
  agentId: string | undefined;
}

export type ActivityType = "call" | "email" | "whatsapp" | "note" | "meeting" | "callback";
export type CallOutcome =
  | "answered"
  | "no_answer"
  | "voicemail"
  | "busy"
  | "wrong_number"
  | "not_interested"
  | "callback_scheduled"
  | "sent"
  | "initiated";

interface CreateActivityInput {
  activityType: ActivityType;
  outcome?: CallOutcome | string;
  notes?: string;
  subject?: string;
  callDuration?: number;
  callbackRequested?: boolean;
  callbackDatetime?: string;
  callbackNotes?: string;
  interestLevel?: "very_interested" | "interested" | "neutral" | "not_interested";
  sentimentScore?: number;
  whatsappTemplateUsed?: string;
  autoStatusUpdate?: string;
}

export function useLeadActivities({ leadId, agentId }: UseLeadActivitiesOptions) {
  const queryClient = useQueryClient();

  // Fetch activities
  const {
    data: activities = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CrmActivity[];
    },
    enabled: !!leadId,
  });

  // Real-time subscription for new activities
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-activities-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crm_activities",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          queryClient.setQueryData<CrmActivity[]>(
            ["lead-activities", leadId],
            (old) => [payload.new as CrmActivity, ...(old || [])]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "crm_activities",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          queryClient.setQueryData<CrmActivity[]>(
            ["lead-activities", leadId],
            (old) =>
              old?.map((activity) =>
                activity.id === payload.new.id
                  ? (payload.new as CrmActivity)
                  : activity
              ) || []
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [leadId, queryClient]);

  // Create activity mutation
  const createActivityMutation = useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      if (!leadId || !agentId) throw new Error("Missing lead or agent ID");

      const { error } = await supabase.from("crm_activities").insert({
        lead_id: leadId,
        agent_id: agentId,
        activity_type: input.activityType,
        outcome: input.outcome || null,
        notes: input.notes || `${input.activityType} logged`,
        subject: input.subject || null,
        call_duration: input.callDuration || null,
        callback_requested: input.callbackRequested || false,
        callback_datetime: input.callbackDatetime || null,
        callback_notes: input.callbackNotes || null,
        callback_completed: false,
        interest_level: input.interestLevel || null,
        sentiment_score: input.sentimentScore || null,
        whatsapp_template_used: input.whatsappTemplateUsed || null,
        auto_status_update: input.autoStatusUpdate || null,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Also update lead's last_contact_at
      await updateLeadContact();

      // STOP SLA TIMER: Mark first action completed for meaningful contact activities
      // This prevents SLA breach when agent takes action on the lead
      const meaningfulActions: ActivityType[] = ["call", "email", "whatsapp", "meeting"];
      if (meaningfulActions.includes(input.activityType)) {
        const { error: slaError } = await supabase
          .from("crm_leads")
          .update({ first_action_completed: true })
          .eq("id", leadId)
          .eq("first_action_completed", false); // Only update if not already set

        if (slaError) {
          console.error("[useLeadActivities] Error updating SLA status:", slaError);
        } else {
          console.log("[useLeadActivities] SLA timer stopped - first action completed");
        }
      }

      return input;
    },
    onSuccess: (input) => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });

      const typeLabels: Record<ActivityType, string> = {
        call: "Call logged",
        email: "Email logged",
        whatsapp: "WhatsApp logged",
        note: "Note added",
        meeting: "Meeting logged",
        callback: "Callback scheduled",
      };
      toast.success(typeLabels[input.activityType]);
    },
    onError: () => {
      toast.error("Failed to log activity");
    },
  });

  // Update lead's contact info
  const updateLeadContact = useCallback(async () => {
    if (!leadId) return;

    // Get current lead data
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("total_contacts, first_contact_at")
      .eq("id", leadId)
      .single();

    if (lead) {
      await supabase
        .from("crm_leads")
        .update({
          last_contact_at: new Date().toISOString(),
          total_contacts: (lead.total_contacts || 0) + 1,
          first_contact_at: lead.first_contact_at || new Date().toISOString(),
        })
        .eq("id", leadId);
    }
  }, [leadId]);

  // Complete callback mutation
  const completeCallbackMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from("crm_activities")
        .update({ callback_completed: true })
        .eq("id", activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      toast.success("Callback marked complete");
    },
    onError: () => {
      toast.error("Failed to update callback");
    },
  });

  // Quick activity loggers
  const logCall = useCallback(
    (outcome?: CallOutcome, notes?: string, duration?: number) =>
      createActivityMutation.mutate({
        activityType: "call",
        outcome,
        notes,
        callDuration: duration,
      }),
    [createActivityMutation]
  );

  const logEmail = useCallback(
    (notes?: string) =>
      createActivityMutation.mutate({
        activityType: "email",
        outcome: "sent",
        notes,
      }),
    [createActivityMutation]
  );

  const logWhatsApp = useCallback(
    (notes?: string) =>
      createActivityMutation.mutate({
        activityType: "whatsapp",
        outcome: "sent",
        notes,
      }),
    [createActivityMutation]
  );

  const addNote = useCallback(
    (noteText: string) =>
      createActivityMutation.mutate({
        activityType: "note",
        notes: noteText,
      }),
    [createActivityMutation]
  );

  const scheduleCallback = useCallback(
    (datetime: string, notes?: string) =>
      createActivityMutation.mutate({
        activityType: "callback",
        callbackRequested: true,
        callbackDatetime: datetime,
        callbackNotes: notes,
        notes: `Callback scheduled for ${new Date(datetime).toLocaleString()}`,
      }),
    [createActivityMutation]
  );

  // Get pending callbacks
  const pendingCallbacks = activities.filter(
    (a) => a.callback_requested && !a.callback_completed
  );

  return {
    // Data
    activities,
    isLoading,
    error,
    refetch,
    pendingCallbacks,

    // Actions
    createActivity: createActivityMutation.mutate,
    logCall,
    logEmail,
    logWhatsApp,
    addNote,
    scheduleCallback,
    completeCallback: completeCallbackMutation.mutate,
  };
}
