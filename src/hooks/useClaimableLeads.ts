import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Claimable leads do NOT include phone/email - these are protected until claimed
export interface ClaimableLead {
  id: string;
  first_name: string;
  last_name: string;
  // phone_number and email EXCLUDED - protected until lead is claimed
  language: string;
  lead_segment: string;
  budget_range: string | null;
  location_preference: string[] | null;
  timeframe: string | null;
  claim_window_expires_at: string | null;
  lead_source: string | null;
  current_lead_score: number | null;
  lead_priority: string | null;
  created_at: string;
}

export interface CrmNotification {
  id: string;
  agent_id: string;
  lead_id: string | null;
  notification_type: string;
  title: string;
  message: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
}

export function useClaimableLeads(agentId: string | null, agentLanguages: string[] = []) {
  const queryClient = useQueryClient();
  const [claimableLeads, setClaimableLeads] = useState<ClaimableLead[]>([]);

  // Fetch claimable leads from notifications
  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["crm-notifications", agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from("crm_notifications")
        .select("*")
        .eq("agent_id", agentId)
        .eq("notification_type", "new_lead_available")
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CrmNotification[];
    },
    enabled: !!agentId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch lead details for each notification
  useEffect(() => {
    async function fetchLeadDetails() {
      if (!notifications?.length) {
        setClaimableLeads([]);
        return;
      }

      const leadIds = notifications
        .map((n) => n.lead_id)
        .filter((id): id is string => id !== null);

      if (leadIds.length === 0) {
        setClaimableLeads([]);
        return;
      }

      // Only select non-sensitive columns - phone_number and email are PROTECTED
      const { data: leads, error } = await supabase
        .from("crm_leads")
        .select(`
          id,
          first_name,
          last_name,
          language,
          lead_segment,
          budget_range,
          location_preference,
          timeframe,
          claim_window_expires_at,
          lead_source,
          current_lead_score,
          lead_priority,
          created_at
        `)
        .in("id", leadIds)
        .eq("lead_claimed", false);

      if (error) {
        console.error("Error fetching claimable leads:", error);
        return;
      }

      setClaimableLeads(leads as ClaimableLead[]);
    }

    fetchLeadDetails();
  }, [notifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`agent-notifications-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crm_notifications",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          if (payload.new.notification_type === "new_lead_available") {
            console.log("New lead notification received:", payload.new);
            refetchNotifications();
            
            // Play notification sound
            try {
              const audio = new Audio("/sounds/notification.mp3");
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch (e) {
              // Ignore audio errors
            }

            // Show browser notification if permitted
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(payload.new.title, {
                body: payload.new.message,
                icon: "/logo.png",
                tag: "new-lead",
                requireInteraction: true,
              });
            }

            toast.info(payload.new.title, {
              description: payload.new.message,
              action: {
                label: "View",
                onClick: () => {
                  if (payload.new.action_url) {
                    window.location.href = payload.new.action_url;
                  }
                },
              },
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "crm_leads",
        },
        (payload) => {
          // If a lead was claimed, remove it from claimable leads
          if (payload.new.lead_claimed) {
            setClaimableLeads((prev) =>
              prev.filter((lead) => lead.id !== payload.new.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [agentId, refetchNotifications]);

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const dismissLead = useCallback((leadId: string) => {
    setClaimableLeads((prev) => prev.filter((lead) => lead.id !== leadId));
  }, []);

  return {
    claimableLeads,
    notifications,
    dismissLead,
    refetch: refetchNotifications,
  };
}

export function useClaimLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: string; agentId: string }) => {
      const { data, error } = await supabase.functions.invoke("claim-lead", {
        body: { leadId, agentId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to claim lead");
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["agent-leads"] });
      queryClient.invalidateQueries({ queryKey: ["agent-stats"] });
      toast.success("Lead claimed successfully! 🎉");
    },
    onError: (error: Error) => {
      toast.error("Failed to claim lead", {
        description: error.message,
      });
    },
  });
}

export function useAgentNotifications(agentId: string | null) {
  return useQuery({
    queryKey: ["crm-all-notifications", agentId],
    queryFn: async () => {
      if (!agentId) return [];

      const { data, error } = await supabase
        .from("crm_notifications")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as CrmNotification[];
    },
    enabled: !!agentId,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("crm_notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["crm-all-notifications"] });
    },
  });
}
