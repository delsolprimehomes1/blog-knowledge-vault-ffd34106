import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, CheckCircle, XCircle, Clock, User } from "lucide-react";

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  template_type: string;
  triggered_by: string;
  trigger_reason: string | null;
  status: string;
  sent_at: string;
}

interface EmailHistoryCardProps {
  leadId: string;
}

const templateTypeColors: Record<string, string> = {
  broadcast: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  admin_unclaimed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  sla_warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  direct_assignment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  reminder: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const templateTypeLabels: Record<string, string> = {
  broadcast: "Broadcast",
  admin_unclaimed: "Admin Fallback",
  sla_warning: "SLA Warning",
  urgent: "Urgent",
  direct_assignment: "Direct Assignment",
  reminder: "Reminder",
};

export function EmailHistoryCard({ leadId }: EmailHistoryCardProps) {
  const { data: emailLogs, isLoading } = useQuery({
    queryKey: ["lead-email-history", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_logs")
        .select("*")
        .eq("lead_id", leadId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data as EmailLog[];
    },
    enabled: !!leadId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Email History
        </CardTitle>
        <CardDescription>
          {emailLogs?.length || 0} email{(emailLogs?.length || 0) !== 1 ? "s" : ""} sent for this lead
        </CardDescription>
      </CardHeader>
      <CardContent>
        {emailLogs && emailLogs.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {emailLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-3 space-y-2 bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={templateTypeColors[log.template_type] || "bg-gray-100"}>
                        {templateTypeLabels[log.template_type] || log.template_type}
                      </Badge>
                      {log.status === "sent" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.sent_at), "MMM d, HH:mm")}
                    </div>
                  </div>

                  <div className="text-sm font-medium truncate" title={log.subject}>
                    {log.subject}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>To: {log.recipient_name || log.recipient_email}</span>
                  </div>

                  {log.trigger_reason && (
                    <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                      {log.trigger_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No emails sent for this lead yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
