import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface SalestrailCall {
  id: string;
  lead_id: string;
  activity_type: string;
  salestrail_call_id: string;
  salestrail_recording_url: string | null;
  salestrail_metadata: Record<string, unknown> | null;
  salestrail_transcription: string | null;
  call_direction: string | null;
  call_answered: boolean | null;
  call_duration: number | null;
  notes: string | null;
  created_at: string;
}

interface UseSalestrailCallsOptions {
  leadId: string | undefined;
  enabled?: boolean;
}

export function useSalestrailCalls({ leadId, enabled = true }: UseSalestrailCallsOptions) {
  const queryClient = useQueryClient();

  const {
    data: calls = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["salestrail-calls", leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("lead_id", leadId)
        .not("salestrail_call_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []) as SalestrailCall[];
    },
    enabled: enabled && !!leadId,
  });

  // Real-time subscription for new calls
  useEffect(() => {
    if (!leadId || !enabled) return;

    const channel = supabase
      .channel(`salestrail-calls-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_activities",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          // Only refetch if it's a Salestrail call (has salestrail_call_id)
          const newRecord = payload.new as Record<string, unknown>;
          if (newRecord?.salestrail_call_id) {
            queryClient.invalidateQueries({ queryKey: ["salestrail-calls", leadId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, enabled, queryClient]);

  return {
    calls,
    isLoading,
    error,
    refetch,
    callCount: calls.length,
  };
}
