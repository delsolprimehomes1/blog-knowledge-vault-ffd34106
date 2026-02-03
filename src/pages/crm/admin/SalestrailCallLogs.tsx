import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllSalestrailCalls } from "@/hooks/useAllSalestrailCalls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CallRecordingPlayer } from "@/components/crm/detail/CallRecordingPlayer";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  CheckCircle,
  XCircle,
  Clock,
  Mic,
  Filter,
  RefreshCw,
  User,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { Link } from "react-router-dom";

export default function SalestrailCallLogs() {
  // Filter state
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");

  // Fetch agents for filter dropdown
  const { data: agents = [] } = useQuery({
    queryKey: ["crm-agents-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_agents")
        .select("id, first_name, last_name, email")
        .eq("is_active", true)
        .order("first_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Compute filter dates
  const dateFrom = dateFromFilter ? new Date(dateFromFilter) : undefined;
  const dateTo = dateToFilter ? new Date(dateToFilter) : undefined;

  // Fetch calls with filters
  const { calls, isLoading, refetch, stats } = useAllSalestrailCalls({
    agentId: agentFilter !== "all" ? agentFilter : undefined,
    dateFrom,
    dateTo,
    outcome: outcomeFilter,
  });

  // Format duration
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Clear all filters
  const clearFilters = () => {
    setAgentFilter("all");
    setOutcomeFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
  };

  // Set quick date ranges
  const setQuickDateRange = (days: number) => {
    const from = subDays(new Date(), days);
    setDateFromFilter(format(from, "yyyy-MM-dd"));
    setDateToFilter(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            Salestrail Call Logs
          </h1>
          <p className="text-muted-foreground">
            All auto-logged calls from Salestrail integration
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.answered}</div>
            <p className="text-xs text-muted-foreground">Answered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{stats.missed}</div>
            <p className="text-xs text-muted-foreground">Missed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inbound}</div>
            <p className="text-xs text-muted-foreground">Inbound</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{stats.outbound}</div>
            <p className="text-xs text-muted-foreground">Outbound</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</div>
            <p className="text-xs text-muted-foreground">Total Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Agent Filter */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <User className="h-3 w-3" />
                Agent
              </Label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.first_name} {agent.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Outcome Filter */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Outcome
              </Label>
              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All outcomes</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                From Date
              </Label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                To Date
              </Label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label className="text-xs">Quick Range</Label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange(7)}
                >
                  7d
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange(30)}
                >
                  30d
                </Button>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Call Records ({calls.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No calls found</p>
              <p className="text-sm text-muted-foreground/70">
                Calls will appear here when logged via Salestrail
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Recording</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow key={call.id}>
                      {/* Date/Time */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-sm">
                            {format(new Date(call.created_at), "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(call.created_at), "HH:mm")} •{" "}
                            {formatDistanceToNow(new Date(call.created_at), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </TableCell>

                      {/* Direction */}
                      <TableCell>
                        {call.call_direction === "inbound" ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            <PhoneIncoming className="h-3 w-3 mr-1" />
                            Inbound
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-700 border-purple-200"
                          >
                            <PhoneOutgoing className="h-3 w-3 mr-1" />
                            Outbound
                          </Badge>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {call.call_answered ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Answered
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200"
                          >
                            <PhoneMissed className="h-3 w-3 mr-1" />
                            No Answer
                          </Badge>
                        )}
                      </TableCell>

                      {/* Duration */}
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDuration(call.call_duration)}
                        </div>
                      </TableCell>

                      {/* Agent */}
                      <TableCell>
                        {call.agent ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {call.agent.first_name} {call.agent.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {call.agent.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Lead */}
                      <TableCell>
                        {call.lead ? (
                          <Link
                            to={`/crm/admin/leads/${call.lead.id}`}
                            className="text-sm hover:underline"
                          >
                            <div className="font-medium text-primary">
                              {call.lead.first_name} {call.lead.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {call.lead.phone_number || call.lead.full_phone}
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">
                            Unmatched
                          </span>
                        )}
                      </TableCell>

                      {/* Recording */}
                      <TableCell>
                        {call.salestrail_recording_url ? (
                          <CallRecordingPlayer
                            url={call.salestrail_recording_url}
                            compact
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No recording
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
