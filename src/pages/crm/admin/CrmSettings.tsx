import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Hash, RefreshCw, Loader2, CheckCircle2, XCircle, Mail, Send, AlertCircle } from "lucide-react";
import { useSlackChannels, useSyncSlackChannels } from "@/hooks/useSlackChannels";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: 'ok' | 'error'; latency_ms?: number; error?: string };
    storage: { status: 'ok' | 'error'; error?: string };
    resend?: { status: 'ok' | 'error' | 'not_configured'; error?: string };
  };
  version: string;
}

export default function CrmSettings() {
  const { data: channels = [], isLoading: isLoadingChannels } = useSlackChannels();
  const syncChannels = useSyncSlackChannels();
  const [testEmailSent, setTestEmailSent] = useState(false);

  const lastSynced = channels.length > 0 && channels[0].last_synced_at
    ? format(new Date(channels[0].last_synced_at), "MMM d, yyyy 'at' h:mm a")
    : null;

  // Fetch health status including Resend
  const { data: healthStatus, isLoading: isLoadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ["health-check"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<HealthStatus>("health-check");
      if (error) throw error;
      return data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Send test urgent email mutation
  const sendTestEmail = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the current agent's info
      const { data: agent, error: agentError } = await supabase
        .from("crm_agents")
        .select("id, email, first_name, last_name")
        .eq("email", user.email)
        .single();

      if (agentError || !agent) throw new Error("Could not find agent profile");

      // Send test urgent email
      const { data, error } = await supabase.functions.invoke("send-lead-notification", {
        body: {
          notification_type: "test_urgent",
          lead: {
            id: "test-lead-id",
            first_name: "Test",
            last_name: "Lead",
            email: "test@example.com",
            phone: "+34 600 000 000",
            preferred_language: "en",
            lead_segment: "hot",
            budget_range: "€500K - €1M",
            property_type: "Villa",
            areas_of_interest: ["Marbella", "Puerto Banús"],
            timeline: "3-6 months",
            source: "Website Form",
            created_at: new Date().toISOString(),
          },
          agents: [{
            id: agent.id,
            email: agent.email,
            first_name: agent.first_name,
            last_name: agent.last_name,
            urgent_emails_enabled: true,
          }],
          claimWindowMinutes: 15,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setTestEmailSent(true);
      toast({
        title: "Test email sent!",
        description: "Check your inbox for the urgent lead notification.",
      });
      setTimeout(() => setTestEmailSent(false), 5000);
    },
    onError: (error) => {
      toast({
        title: "Failed to send test email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendStatus = healthStatus?.checks?.resend?.status;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM Settings</h1>
        <p className="text-muted-foreground">Configure CRM system settings and integrations</p>
      </div>

      {/* Email Integration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Integration
          </CardTitle>
          <CardDescription>
            Configure Resend email notifications for lead alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {isLoadingHealth ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <div>
                    <p className="font-medium">Checking status...</p>
                  </div>
                </>
              ) : resendStatus === 'ok' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Resend API is configured and working
                    </p>
                  </div>
                </>
              ) : resendStatus === 'not_configured' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">Not Configured</p>
                    <p className="text-sm text-muted-foreground">
                      RESEND_API_KEY is not set
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">Error</p>
                    <p className="text-sm text-muted-foreground">
                      {healthStatus?.checks?.resend?.error || "Connection failed"}
                    </p>
                  </div>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchHealth()}
              disabled={isLoadingHealth}
            >
              {isLoadingHealth ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Test Urgent Email */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Test Urgent Email Template</h4>
            <p className="text-xs text-muted-foreground">
              Send a sample urgent lead notification to verify the template renders correctly.
            </p>
            <Button
              variant={testEmailSent ? "outline" : "default"}
              className={testEmailSent ? "border-green-500 text-green-600" : "bg-red-600 hover:bg-red-700"}
              onClick={() => sendTestEmail.mutate()}
              disabled={sendTestEmail.isPending || resendStatus !== 'ok'}
            >
              {sendTestEmail.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : testEmailSent ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Email Sent!
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  🔥 Send Test Urgent Email
                </>
              )}
            </Button>
          </div>

          {/* Sender Info */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Sender Configuration</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>From: crm@notifications.delsolprimehomes.com</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slack Integration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
            Slack Integration
          </CardTitle>
          <CardDescription>
            Configure Slack notifications for lead alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {channels.length > 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      {channels.length} channel{channels.length !== 1 ? "s" : ""} available
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Click "Sync Channels" to connect
                    </p>
                  </div>
                </>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => syncChannels.mutate()}
              disabled={syncChannels.isPending}
            >
              {syncChannels.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Channels
                </>
              )}
            </Button>
          </div>

          {lastSynced && (
            <p className="text-xs text-muted-foreground">
              Last synced: {lastSynced}
            </p>
          )}

          {/* Channel List */}
          {isLoadingChannels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : channels.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Channels</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm"
                  >
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{channel.name}</span>
                    {channel.member_count !== null && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {channel.member_count}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">How it works</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Sync channels from your Slack workspace</li>
              <li>Assign channels to agents in their profile settings</li>
              <li>Agents receive lead alerts in their assigned Slack channels</li>
              <li>Click "Claim This Lead" button in Slack to claim directly</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* General Settings Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Additional settings coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
