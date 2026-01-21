import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Sun,
  AlertTriangle,
  UserCog,
  Loader2,
  Shield,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminLeadActionsProps {
  leadId: string;
  currentAgentId?: string;
  onLeadUpdated?: () => void;
}

export function AdminLeadActions({ leadId, currentAgentId, onLeadUpdated }: AdminLeadActionsProps) {
  const queryClient = useQueryClient();
  const [forceTransferAgent, setForceTransferAgent] = useState<string>("");

  // Check if current user is admin
  const { data: currentUser } = useQuery({
    queryKey: ["current-agent-role"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;
      
      const { data } = await supabase
        .from("crm_agents")
        .select("id, role")
        .eq("id", session.user.id)
        .single();
      return data;
    },
  });

  // Get all agents for force transfer
  const { data: agents } = useQuery({
    queryKey: ["all-crm-agents-for-transfer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_agents")
        .select("id, first_name, last_name, current_lead_count, max_active_leads")
        .eq("is_active", true)
        .order("first_name");
      return data || [];
    },
    enabled: currentUser?.role === "admin",
  });

  // 1. Release Night Leads NOW
  const releaseNightLeads = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("release-night-held-leads", {
        body: { triggered_by: "manual_admin" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Released ${data?.released || 0} night-held leads`);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail"] });
      onLeadUpdated?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to release leads: ${error.message}`);
    },
  });

  // 2. Check SLA Breaches NOW
  const checkSlaBreaches = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-sla-breaches", {
        body: { triggered_by: "manual_admin" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Processed ${data?.processed || 0} SLA breaches`);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail"] });
      onLeadUpdated?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to check SLA: ${error.message}`);
    },
  });

  // 3. Force Transfer Lead
  const forceTransfer = useMutation({
    mutationFn: async (targetAgentId: string) => {
      // Get target agent info
      const { data: targetAgent } = await supabase
        .from("crm_agents")
        .select("first_name, last_name, current_lead_count")
        .eq("id", targetAgentId)
        .single();

      if (!targetAgent) throw new Error("Target agent not found");

      // Update lead assignment directly (bypassing rules)
      const { error: updateError } = await supabase
        .from("crm_leads")
        .update({
          assigned_agent_id: targetAgentId,
          assigned_at: new Date().toISOString(),
          assignment_method: "admin_force_transfer",
          lead_claimed: true,
        })
        .eq("id", leadId);

      if (updateError) throw updateError;

      // Decrement old agent count if applicable
      if (currentAgentId && currentAgentId !== targetAgentId) {
        await supabase.rpc("decrement_agent_lead_count", { p_agent_id: currentAgentId });
      }

      // Increment new agent count
      await supabase
        .from("crm_agents")
        .update({ current_lead_count: (targetAgent.current_lead_count || 0) + 1 })
        .eq("id", targetAgentId);

      // Log activity
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from("crm_activities").insert({
        lead_id: leadId,
        agent_id: session?.user?.id || targetAgentId,
        activity_type: "note",
        notes: `⚠️ Lead force-transferred by Admin to ${targetAgent.first_name} ${targetAgent.last_name}`,
      });

      return { targetAgent };
    },
    onSuccess: (data) => {
      toast.success(`Lead transferred to ${data.targetAgent?.first_name}`);
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setForceTransferAgent("");
      onLeadUpdated?.();
    },
    onError: (error: Error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });

  // Only show to admins
  if (currentUser?.role !== "admin") {
    return null;
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Admin Controls</CardTitle>
        </div>
        <CardDescription className="text-destructive/70">
          Emergency overrides - use with caution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Actions */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            System Triggers
          </p>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-amber-400/50 hover:bg-amber-50 dark:hover:bg-amber-950/20"
            onClick={() => releaseNightLeads.mutate()}
            disabled={releaseNightLeads.isPending}
          >
            {releaseNightLeads.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sun className="h-4 w-4 text-amber-600" />
            )}
            Release Night Leads Now
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-orange-400/50 hover:bg-orange-50 dark:hover:bg-orange-950/20"
            onClick={() => checkSlaBreaches.mutate()}
            disabled={checkSlaBreaches.isPending}
          >
            {checkSlaBreaches.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            )}
            Check SLA Breaches
          </Button>
        </div>

        <Separator />

        {/* Force Transfer */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Force Transfer Lead
          </p>
          
          <Select value={forceTransferAgent} onValueChange={setForceTransferAgent}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select target agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents?.map((agent) => (
                <SelectItem 
                  key={agent.id} 
                  value={agent.id}
                  disabled={agent.id === currentAgentId}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{agent.first_name} {agent.last_name}</span>
                    <Badge variant="outline" className="text-xs ml-2">
                      {agent.current_lead_count}/{agent.max_active_leads}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="destructive"
            size="sm"
            className="w-full gap-2"
            onClick={() => forceTransfer.mutate(forceTransferAgent)}
            disabled={!forceTransferAgent || forceTransfer.isPending}
          >
            {forceTransfer.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCog className="h-4 w-4" />
            )}
            Force Transfer (Bypass Rules)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
