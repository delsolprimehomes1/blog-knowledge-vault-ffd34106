import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  member_count: number | null;
  last_synced_at: string;
}

export interface AgentSlackChannel {
  id: string;
  agent_id: string;
  channel_id: string;
  channel_name: string | null;
  is_active: boolean;
  created_at: string;
}

export function useSlackChannels() {
  return useQuery({
    queryKey: ["slack-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slack_channels")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as SlackChannel[];
    },
  });
}

export function useAgentSlackChannels(agentId: string) {
  return useQuery({
    queryKey: ["agent-slack-channels", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_slack_channels")
        .select("*")
        .eq("agent_id", agentId)
        .eq("is_active", true);

      if (error) throw error;
      return data as AgentSlackChannel[];
    },
    enabled: !!agentId,
  });
}

export function useSyncSlackChannels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-slack-channels");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["slack-channels"] });
      if (data.channels?.length > 0) {
        toast({ title: `Synced ${data.channels.length} Slack channels` });
      } else {
        toast({ 
          title: "No channels found",
          description: data.message || "Please connect Slack integration first.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error syncing Slack channels",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateAgentSlackChannels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      channelIds,
      channels,
    }: {
      agentId: string;
      channelIds: string[];
      channels: SlackChannel[];
    }) => {
      // Delete existing channel assignments
      const { error: deleteError } = await supabase
        .from("agent_slack_channels")
        .delete()
        .eq("agent_id", agentId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (channelIds.length > 0) {
        const assignments = channelIds.map((channelId) => {
          const channel = channels.find((c) => c.id === channelId);
          return {
            agent_id: agentId,
            channel_id: channelId,
            channel_name: channel?.name || null,
            is_active: true,
          };
        });

        const { error: insertError } = await supabase
          .from("agent_slack_channels")
          .insert(assignments);

        if (insertError) throw insertError;
      }

      return { agentId, channelIds };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent-slack-channels", variables.agentId] });
      queryClient.invalidateQueries({ queryKey: ["crm-agents"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating Slack channels",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
