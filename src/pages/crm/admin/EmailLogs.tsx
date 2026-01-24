import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Search, RefreshCw, Filter, CheckCircle, XCircle, User, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  template_type: string;
  lead_id: string | null;
  agent_id: string | null;
  triggered_by: string;
  trigger_reason: string | null;
  status: string;
  error_message: string | null;
  resend_message_id: string | null;
  sent_at: string;
  created_at: string;
  lead?: { first_name: string; last_name: string } | null;
  agent?: { first_name: string; last_name: string } | null;
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

export default function EmailLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: emailLogs, isLoading, refetch } = useQuery({
    queryKey: ["crm-email-logs", templateFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("crm_email_logs")
        .select(`
          *,
          lead:crm_leads(first_name, last_name),
          agent:crm_agents(first_name, last_name)
        `)
        .order("sent_at", { ascending: false })
        .limit(200);

      if (templateFilter !== "all") {
        query = query.eq("template_type", templateFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const filteredLogs = emailLogs?.filter((log) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.recipient_email.toLowerCase().includes(search) ||
      log.recipient_name?.toLowerCase().includes(search) ||
      log.subject.toLowerCase().includes(search) ||
      log.trigger_reason?.toLowerCase().includes(search) ||
      log.lead?.first_name?.toLowerCase().includes(search) ||
      log.lead?.last_name?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: emailLogs?.length || 0,
    sent: emailLogs?.filter((l) => l.status === "sent").length || 0,
    failed: emailLogs?.filter((l) => l.status === "failed").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Logs
          </h1>
          <p className="text-muted-foreground">Track all automated emails sent by the CRM</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" /> Sent Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" /> Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by recipient, subject, or lead..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Template type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                <SelectItem value="broadcast">Broadcast</SelectItem>
                <SelectItem value="admin_unclaimed">Admin Fallback</SelectItem>
                <SelectItem value="sla_warning">SLA Warning</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="direct_assignment">Direct Assignment</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email History</CardTitle>
          <CardDescription>
            {filteredLogs?.length || 0} emails {searchQuery || templateFilter !== "all" || statusFilter !== "all" ? "(filtered)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Trigger Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">{format(new Date(log.sent_at), "MMM d, yyyy")}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(log.sent_at), "HH:mm:ss")}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{log.recipient_name || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">{log.recipient_email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={templateTypeColors[log.template_type] || "bg-gray-100 text-gray-800"}>
                          {templateTypeLabels[log.template_type] || log.template_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.lead ? (
                          <Link
                            to={`/crm/admin/leads/${log.lead_id}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            {log.lead.first_name} {log.lead.last_name}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px] truncate text-sm" title={log.trigger_reason || undefined}>
                          {log.trigger_reason || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.status === "sent" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {log.triggered_by}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No email logs found</p>
              <p className="text-sm">Emails will appear here once the system starts sending notifications</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
