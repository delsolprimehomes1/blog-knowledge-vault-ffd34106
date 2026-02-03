import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface SalestrailCallLog {
  id: string;
  lead_id: string | null;
  agent_id: string;
  activity_type: string;
  salestrail_call_id: string;
  salestrail_recording_url: string | null;
  salestrail_metadata: Record<string, unknown> | null;
  salestrail_transcription: string | null;
  call_direction: string | null;
  call_answered: boolean | null;
  call_duration: number | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  // Joined data
  lead?: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    full_phone: string | null;
  } | null;
  agent?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface UseAllSalestrailCallsOptions {
  agentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  outcome?: string;
  enabled?: boolean;
}

export function useAllSalestrailCalls({
  agentId,
  dateFrom,
  dateTo,
  outcome,
  enabled = true,
}: UseAllSalestrailCallsOptions = {}) {
  const queryClient = useQueryClient();

  const {
    data: calls = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["all-salestrail-calls", agentId, dateFrom?.toISOString(), dateTo?.toISOString(), outcome],
    queryFn: async () => {
      let query = supabase
        .from("crm_activities")
        .select(`
          *,
          lead:crm_leads(id, first_name, last_name, phone_number, full_phone),
          agent:crm_agents(id, first_name, last_name, email)
        `)
        .not("salestrail_call_id", "is", null)
        .order("created_at", { ascending: false });

      // Apply filters
      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }

      if (dateTo) {
        // Add 1 day to include the entire day
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("created_at", endDate.toISOString());
      }

      if (outcome && outcome !== "all") {
        query = query.eq("outcome", outcome);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;

      return (data || []) as SalestrailCallLog[];
    },
    enabled,
  });

  // Real-time subscription for new calls
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("all-salestrail-calls")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_activities",
        },
        (payload) => {
          // Only refetch if it's a Salestrail call
          const newRecord = payload.new as Record<string, unknown>;
          if (newRecord?.salestrail_call_id) {
            queryClient.invalidateQueries({ queryKey: ["all-salestrail-calls"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  // Compute stats
  const stats = {
    total: calls.length,
    answered: calls.filter((c) => c.call_answered === true).length,
    missed: calls.filter((c) => c.call_answered === false).length,
    inbound: calls.filter((c) => c.call_direction === "inbound").length,
    outbound: calls.filter((c) => c.call_direction === "outbound").length,
    totalDuration: calls.reduce((acc, c) => acc + (c.call_duration || 0), 0),
    withRecording: calls.filter((c) => c.salestrail_recording_url).length,
  };

  return {
    calls,
    isLoading,
    error,
    refetch,
    stats,
  };
}
