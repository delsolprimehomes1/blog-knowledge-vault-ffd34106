import { useState, useMemo } from "react";
import { sanitizePhone } from "@/lib/phone-utils";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  Search,
  MoreHorizontal,
  Eye,
  UserCheck,
  RotateCcw,
  Archive,
  RefreshCw,
  AlertCircle,
  Clock,
  Users,
  Zap,
  Phone,
  Mail,
  PhoneOff,
} from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminLeads,
  useEligibleAgents,
  useAssignLead,
  useRestartRoundRobin,
  useArchiveLead,
  useBulkAssignLeads,
  useBulkDeleteLeads,
  useAdminStats,
  getSuggestedAgent,
  AdminLead,
} from "@/hooks/useAdminLeads";
import { AssignLeadDialog } from "@/components/crm/admin/AssignLeadDialog";
import { BulkAssignmentBar } from "@/components/crm/admin/BulkAssignmentBar";
import {
  getLanguageFlag,
  getSegmentVariant,
  getPriorityConfig,
  formatStatus,
} from "@/lib/crm-conditional-styles";

export default function LeadsOverview() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterSegment, setFilterSegment] = useState("all");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(null);
  const [adminId, setAdminId] = useState<string>("");

  // Fetch admin ID
  useState(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.id) setAdminId(data.session.user.id);
    });
  });

  const { data: leads, isLoading, refetch } = useAdminLeads({
    filterStatus: filterStatus as any,
    filterLanguage,
    filterSegment,
    searchQuery,
  });

  const { data: stats } = useAdminStats();
  const { data: agents = [] } = useEligibleAgents();
  const assignLead = useAssignLead();
  const bulkAssign = useBulkAssignLeads();
  const bulkDelete = useBulkDeleteLeads();
  const restartRoundRobin = useRestartRoundRobin();
  const archiveLead = useArchiveLead();

  const filteredLeads = leads || [];

  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleAssign = (leadId: string, agentId: string, reason: string) => {
    const lead = filteredLeads.find((l) => l.id === leadId);
    assignLead.mutate({
      leadId,
      agentId,
      reason,
      adminId,
      previousAgentId: lead?.assigned_agent_id,
    });
    setAssignDialogOpen(false);
    setSelectedLead(null);
  };

  const handleBulkAssign = (agentId: string) => {
    bulkAssign.mutate({
      leadIds: Array.from(selectedLeads),
      agentId,
      reason: "Bulk assignment by admin",
      adminId,
    });
    setSelectedLeads(new Set());
  };

  const handleBulkDelete = () => {
    bulkDelete.mutate({
      leadIds: Array.from(selectedLeads),
      adminId,
    });
    setSelectedLeads(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            Leads Overview
          </h1>
          <p className="text-muted-foreground">
            Manage and assign leads across your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            {stats?.unclaimed || 0} Unclaimed
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3 text-red-500" />
            {stats?.slaBreaches || 0} SLA Breach
          </Badge>
          <Badge variant="outline" className="gap-1">
            <PhoneOff className="h-3 w-3 text-orange-500" />
            {stats?.incomplete || 0} Incomplete
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="unclaimed">⚠️ Unclaimed</SelectItem>
                <SelectItem value="claimed">✅ Claimed</SelectItem>
                <SelectItem value="incomplete">📵 Incomplete (No Contact)</SelectItem>
                <SelectItem value="sla_breach">🔥 SLA Breach</SelectItem>
                <SelectItem value="expired_claim">⏰ Expired Claims</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLanguage} onValueChange={setFilterLanguage}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="fr">🇫🇷 French</SelectItem>
                <SelectItem value="fi">🇫🇮 Finnish</SelectItem>
                <SelectItem value="de">🇩🇪 German</SelectItem>
                <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSegment} onValueChange={setFilterSegment}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="Hot_Investor">🔥 Hot Investor</SelectItem>
                <SelectItem value="Warm_Family">👨‍👩‍👧 Warm Family</SelectItem>
                <SelectItem value="Cool_Holiday">🏖️ Cool Holiday</SelectItem>
                <SelectItem value="Cold_General">❄️ Cold General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <BulkAssignmentBar
        selectedCount={selectedLeads.size}
        agents={agents}
        onClearSelection={() => setSelectedLeads(new Set())}
        onBulkAssign={handleBulkAssign}
        onBulkDelete={handleBulkDelete}
        isAssigning={bulkAssign.isPending}
        isDeleting={bulkDelete.isPending}
      />

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Age</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ClipboardList className="h-8 w-8 opacity-50" />
                      <p>No leads found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const isUnclaimed = !lead.lead_claimed && !lead.assigned_agent_id;
                  const isIncomplete = (lead as any).contact_complete === false;
                  const isSLABreach = lead.assigned_at &&
                    differenceInHours(new Date(), new Date(lead.assigned_at)) > 24 &&
                    !lead.last_contact_at;
                  const suggested = getSuggestedAgent(agents, lead.language);
                  const priority = getPriorityConfig(lead.lead_priority);

                  return (
                    <TableRow
                      key={lead.id}
                      className={isIncomplete ? "bg-orange-50/50" : isUnclaimed ? "bg-amber-50/50" : isSLABreach ? "bg-red-50/50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {lead.first_name[0]}{lead.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Score: {lead.current_lead_score}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.phone_number ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {(lead as any).country_flag && (lead as any).country_prefix?.startsWith('+') && (
                                <span className="text-base">{(lead as any).country_flag}</span>
                              )}
                              {(lead as any).country_prefix?.startsWith('+') && (
                                <span className="font-medium">{(lead as any).country_prefix}</span>
                              )}
                              {sanitizePhone(lead.phone_number)}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <PhoneOff className="h-3 w-3 mr-1" />
                              No Phone
                            </Badge>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-lg">{getLanguageFlag(lead.language)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSegmentVariant(lead.lead_segment) as any}>
                          {lead.lead_segment.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.agent ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {lead.agent.first_name[0]}{lead.agent.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{lead.agent.first_name}</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-amber-600">
                              Unclaimed
                            </Badge>
                            {suggested && (
                              <p className="text-xs text-muted-foreground">
                                Suggest: {suggested.first_name}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary">
                            {formatStatus(lead.lead_status)}
                          </Badge>
                          {isSLABreach && (
                            <Badge variant="destructive" className="text-xs">
                              SLA Breach
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/crm/admin/leads/${lead.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedLead(lead);
                              setAssignDialogOpen(true);
                            }}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              {lead.assigned_agent_id ? "Reassign" : "Assign"} Lead
                            </DropdownMenuItem>
                            {suggested && !lead.assigned_agent_id && (
                              <DropdownMenuItem onClick={() => handleAssign(lead.id, suggested.id, "Auto-suggested")}>
                                <Zap className="h-4 w-4 mr-2" />
                                Quick Assign to {suggested.first_name}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => restartRoundRobin.mutate({ leadId: lead.id, adminId })}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restart Round Robin
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => archiveLead.mutate({ leadId: lead.id, archive: true, adminId })}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive Lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <AssignLeadDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        lead={selectedLead}
        agents={agents}
        onAssign={handleAssign}
        isAssigning={assignLead.isPending}
      />
    </div>
  );
}
