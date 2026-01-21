import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  Mail,
  MessageSquare,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  Archive,
  Flame,
  Star,
  Circle,
  Minus,
  AlertCircle,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentLead, SortState, ColumnVisibility } from "@/hooks/useAgentLeadsTable";
import { InlineStatusSelect } from "./InlineStatusSelect";
import { InlineSegmentSelect } from "./InlineSegmentSelect";
import { ExpandedLeadRow } from "./ExpandedLeadRow";
import {
  getLanguageFlag,
  getLeadRowStyle,
  PRIORITY_CONFIG,
} from "@/lib/crm-conditional-styles";

interface LeadsTableProps {
  leads: AgentLead[];
  isLoading: boolean;
  selectedLeads: Set<string>;
  expandedRows: Set<string>;
  visibleColumns: ColumnVisibility;
  sort: SortState;
  onSort: (column: string) => void;
  onToggleSelectAll: () => void;
  onToggleSelect: (leadId: string) => void;
  onToggleExpand: (leadId: string) => void;
  onUpdateField: (leadId: string, field: string, value: any) => void;
  onArchive: (leadId: string) => void;
  onScheduleReminder: (lead: AgentLead) => void;
}

export function LeadsTable({
  leads,
  isLoading,
  selectedLeads,
  expandedRows,
  visibleColumns,
  sort,
  onSort,
  onToggleSelectAll,
  onToggleSelect,
  onToggleExpand,
  onUpdateField,
  onArchive,
  onScheduleReminder,
}: LeadsTableProps) {
  const navigate = useNavigate();

  const getPriorityIcon = (priority: string) => {
    const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
    if (!config) return <Circle className="w-4 h-4 text-gray-400" />;

    switch (config.icon) {
      case "Flame":
        return <Flame className={cn("w-4 h-4", config.color, config.animation)} />;
      case "Star":
        return <Star className={cn("w-4 h-4", config.color)} />;
      case "Circle":
        return <Circle className={cn("w-4 h-4", config.color)} />;
      case "Minus":
        return <Minus className={cn("w-4 h-4", config.color)} />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className="-ml-3 h-8 gap-1 hover:bg-muted"
    >
      {children}
      <ArrowUpDown
        className={cn(
          "w-3 h-3",
          sort.column === column ? "opacity-100" : "opacity-40"
        )}
      />
    </Button>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <div className="p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading leads...</span>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (leads.length === 0) {
    return (
      <div className="border rounded-lg">
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No leads found</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            New leads will appear here when they are assigned to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="hover:bg-transparent">
              {/* Checkbox */}
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={leads.length > 0 && selectedLeads.size === leads.length}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>

              {/* Expand */}
              <TableHead className="w-[40px]" />

              {/* Priority */}
              {visibleColumns.priority && (
                <TableHead className="w-[50px]">
                  <SortableHeader column="lead_priority">Pri</SortableHeader>
                </TableHead>
              )}

              {/* Name */}
              {visibleColumns.name && (
                <TableHead className="min-w-[180px]">
                  <SortableHeader column="first_name">Lead</SortableHeader>
                </TableHead>
              )}

              {/* Contact */}
              {visibleColumns.contact && (
                <TableHead className="min-w-[160px]">Contact</TableHead>
              )}

              {/* Language */}
              {visibleColumns.language && (
                <TableHead className="w-[70px]">
                  <SortableHeader column="language">Lang</SortableHeader>
                </TableHead>
              )}

              {/* Segment */}
              {visibleColumns.segment && (
                <TableHead className="min-w-[100px]">
                  <SortableHeader column="lead_segment">Segment</SortableHeader>
                </TableHead>
              )}

              {/* Budget */}
              {visibleColumns.budget && (
                <TableHead className="min-w-[120px]">Budget</TableHead>
              )}

              {/* Location */}
              {visibleColumns.location && (
                <TableHead className="min-w-[140px]">Location</TableHead>
              )}

              {/* Source */}
              {visibleColumns.source && (
                <TableHead className="min-w-[120px]">Source</TableHead>
              )}

              {/* Score */}
              {visibleColumns.score && (
                <TableHead className="w-[80px]">
                  <SortableHeader column="current_lead_score">Score</SortableHeader>
                </TableHead>
              )}

              {/* Last Contact */}
              {visibleColumns.lastContact && (
                <TableHead className="min-w-[120px]">
                  <SortableHeader column="last_contact_at">Last Contact</SortableHeader>
                </TableHead>
              )}

              {/* Status */}
              {visibleColumns.status && (
                <TableHead className="min-w-[130px]">
                  <SortableHeader column="lead_status">Status</SortableHeader>
                </TableHead>
              )}

              {/* Actions */}
              {visibleColumns.actions && (
                <TableHead className="w-[60px]">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {leads.map((lead) => (
              <React.Fragment key={lead.id}>
                <TableRow
                  className={cn(
                    "cursor-pointer transition-colors",
                    getLeadRowStyle(lead),
                    selectedLeads.has(lead.id) && "bg-primary/5"
                  )}
                >
                  {/* Checkbox */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => onToggleSelect(lead.id)}
                    />
                  </TableCell>

                  {/* Expand button */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onToggleExpand(lead.id)}
                    >
                      {expandedRows.has(lead.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </TableCell>

                  {/* Priority */}
                  {visibleColumns.priority && (
                    <TableCell onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}>
                      {getPriorityIcon(lead.lead_priority)}
                    </TableCell>
                  )}

                  {/* Name */}
                  {visibleColumns.name && (
                    <TableCell onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {lead.first_name[0]}
                            {lead.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(lead.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* Contact */}
                  {visibleColumns.contact && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        <a
                          href={`tel:${lead.phone_number}`}
                          className="flex items-center gap-1 text-sm hover:text-primary"
                        >
                          <Phone className="w-3 h-3" />
                          {lead.phone_number}
                        </a>
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate max-w-[150px]"
                          >
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </a>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Language */}
                  {visibleColumns.language && (
                    <TableCell onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}>
                      <div className="flex items-center gap-1">
                        <span>{getLanguageFlag(lead.language)}</span>
                        <span className="text-xs font-medium">
                          {lead.language.toUpperCase()}
                        </span>
                      </div>
                    </TableCell>
                  )}

                  {/* Segment - Inline editable */}
                  {visibleColumns.segment && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <InlineSegmentSelect
                        value={lead.lead_segment}
                        onChange={(value) =>
                          onUpdateField(lead.id, "lead_segment", value)
                        }
                      />
                    </TableCell>
                  )}

                  {/* Budget */}
                  {visibleColumns.budget && (
                    <TableCell onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}>
                      {lead.budget_range ? (
                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          {lead.budget_range}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not specified</span>
                      )}
                    </TableCell>
                  )}

                  {/* Location */}
                  {visibleColumns.location && (
                    <TableCell onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}>
                      {lead.location_preference && lead.location_preference.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.location_preference.slice(0, 2).map((loc) => (
                            <Badge
                              key={loc}
                              variant="outline"
                              className="text-xs py-0"
                            >
                              <MapPin className="w-2 h-2 mr-0.5" />
                              {loc}
                            </Badge>
                          ))}
                          {lead.location_preference.length > 2 && (
                            <Badge variant="outline" className="text-xs py-0">
                              +{lead.location_preference.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Any</span>
                      )}
                    </TableCell>
                  )}

                  {/* Source */}
                  {visibleColumns.source && (
                    <TableCell onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}>
                      <div className="text-sm">
                        <p className="font-medium">{lead.lead_source}</p>
                        {lead.page_type && (
                          <p className="text-xs text-muted-foreground">{lead.page_type}</p>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Score */}
                  {visibleColumns.score && (
                    <TableCell onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}>
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8">
                          <svg className="w-8 h-8 transform -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r="12"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="transparent"
                              className="text-muted"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="12"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="transparent"
                              strokeDasharray={75}
                              strokeDashoffset={
                                75 - (75 * (lead.current_lead_score || 0)) / 100
                              }
                              className="text-primary"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                            {lead.current_lead_score || 0}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* Last Contact */}
                  {visibleColumns.lastContact && (
                    <TableCell onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}>
                      {lead.last_contact_at ? (
                        <div className="text-sm">
                          <p className="text-muted-foreground">
                            {formatDistanceToNow(new Date(lead.last_contact_at), {
                              addSuffix: true,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.total_contacts} contact{lead.total_contacts !== 1 ? "s" : ""}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">Never</span>
                        </div>
                      )}
                    </TableCell>
                  )}

                  {/* Status - Inline editable */}
                  {visibleColumns.status && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <InlineStatusSelect
                        value={lead.lead_status}
                        onChange={(value) =>
                          onUpdateField(lead.id, "lead_status", value)
                        }
                      />
                    </TableCell>
                  )}

                  {/* Actions */}
                  {visibleColumns.actions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/crm/agent/leads/${lead.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`tel:${lead.phone_number}`)}
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Call Now
                          </DropdownMenuItem>
                          {lead.email && (
                            <DropdownMenuItem
                              onClick={() => window.open(`mailto:${lead.email}`)}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(
                                `https://wa.me/${lead.phone_number.replace(/[^0-9]/g, "")}`
                              )
                            }
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onScheduleReminder(lead)}
                          >
                            <Bell className="w-4 h-4 mr-2" />
                            Schedule Reminder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onArchive(lead.id)}
                            className="text-destructive"
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>

                {/* Expanded Row */}
                <AnimatePresence>
                  {expandedRows.has(lead.id) && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={14} className="p-0">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ExpandedLeadRow
                            lead={lead}
                            onCall={() => window.open(`tel:${lead.phone_number}`)}
                            onEmail={() =>
                              lead.email && window.open(`mailto:${lead.email}`)
                            }
                            onWhatsApp={() =>
                              window.open(
                                `https://wa.me/${lead.phone_number.replace(/[^0-9]/g, "")}`
                              )
                            }
                            onSchedule={() => onScheduleReminder(lead)}
                          />
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
