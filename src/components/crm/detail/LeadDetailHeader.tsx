import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Mail,
  MessageSquare,
  ChevronLeft,
  Archive,
  Check,
  X,
  Flame,
  Star,
  Circle,
  Minus,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  getLanguageFlag,
  formatStatus,
  formatSegment,
  getStatusBadgeClass,
  getSegmentStyle,
  ALL_STATUSES,
  ALL_SEGMENTS,
  ALL_PRIORITIES,
} from "@/lib/crm-conditional-styles";
import type { Database } from "@/integrations/supabase/types";

type CrmLead = Database["public"]["Tables"]["crm_leads"]["Row"];

interface LeadDetailHeaderProps {
  lead: CrmLead;
  editingField: string | null;
  editValue: unknown;
  setEditValue: (value: unknown) => void;
  saving: boolean;
  startEdit: (field: string, value: unknown) => void;
  cancelEdit: () => void;
  saveEdit: (field: string) => Promise<void>;
  quickUpdate: (field: string, value: unknown) => Promise<void>;
  onCall: () => void;
  onEmail: () => void;
  onWhatsApp: () => void;
  onArchive: () => void;
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "urgent":
      return <Flame className="w-4 h-4" />;
    case "high":
      return <Star className="w-4 h-4" />;
    case "medium":
      return <Circle className="w-4 h-4" />;
    default:
      return <Minus className="w-4 h-4" />;
  }
};

const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-500 text-white animate-pulse";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-yellow-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-amber-600";
  return "text-gray-400";
};

export function LeadDetailHeader({
  lead,
  editingField,
  editValue,
  setEditValue,
  saving,
  startEdit,
  cancelEdit,
  saveEdit,
  quickUpdate,
  onCall,
  onEmail,
  onWhatsApp,
  onArchive,
}: LeadDetailHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-40 bg-background border-b">
      <div className="px-4 py-4 sm:px-6">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/crm/agent/leads")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Leads
            </Button>

            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {lead.first_name?.[0]}
                  {lead.last_name?.[0]}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  {lead.first_name} {lead.last_name}
                  <span className="text-lg">{getLanguageFlag(lead.language)}</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Created{" "}
                  {formatDistanceToNow(new Date(lead.created_at || ""), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={onCall} className="bg-green-600 hover:bg-green-700">
              <Phone className="w-4 h-4 mr-1" />
              Call Now
            </Button>
            {lead.email && (
              <Button size="sm" variant="outline" onClick={onEmail}>
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onWhatsApp}>
              <MessageSquare className="w-4 h-4 mr-1" />
              WhatsApp
            </Button>
            <Button size="sm" variant="destructive" onClick={onArchive}>
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Priority:</span>
            {editingField === "lead_priority" ? (
              <div className="flex items-center gap-1">
                <Select
                  value={editValue as string}
                  onValueChange={(v) => setEditValue(v)}
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-1">
                          {getPriorityIcon(p)}
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => saveEdit("lead_priority")}
                  disabled={saving}
                >
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={cancelEdit}
                >
                  <X className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <Badge
                className={cn("cursor-pointer gap-1", getPriorityStyle(lead.lead_priority || "medium"))}
                onClick={() => startEdit("lead_priority", lead.lead_priority)}
              >
                {getPriorityIcon(lead.lead_priority || "medium")}
                {(lead.lead_priority || "medium").toUpperCase()}
              </Badge>
            )}
          </div>

          <span className="text-muted-foreground">|</span>

          {/* Segment */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Segment:</span>
            {editingField === "lead_segment" ? (
              <div className="flex items-center gap-1">
                <Select
                  value={editValue as string}
                  onValueChange={(v) => setEditValue(v)}
                >
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SEGMENTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatSegment(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => saveEdit("lead_segment")}
                  disabled={saving}
                >
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={cancelEdit}
                >
                  <X className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <Badge
                className={cn("cursor-pointer", getSegmentStyle(lead.lead_segment || ""))}
                onClick={() => startEdit("lead_segment", lead.lead_segment)}
              >
                {formatSegment(lead.lead_segment || "Unknown")}
              </Badge>
            )}
          </div>

          <span className="text-muted-foreground">|</span>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            {editingField === "lead_status" ? (
              <div className="flex items-center gap-1">
                <Select
                  value={editValue as string}
                  onValueChange={(v) => setEditValue(v)}
                >
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => saveEdit("lead_status")}
                  disabled={saving}
                >
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={cancelEdit}
                >
                  <X className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <Badge
                variant="outline"
                className={cn("cursor-pointer", getStatusBadgeClass(lead.lead_status || "new"))}
                onClick={() => startEdit("lead_status", lead.lead_status)}
              >
                {formatStatus(lead.lead_status || "new")}
              </Badge>
            )}
          </div>

          <span className="text-muted-foreground">|</span>

          {/* Lead Score */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Score:</span>
            <div className="flex items-center gap-1">
              <TrendingUp className={cn("w-4 h-4", getScoreColor(lead.current_lead_score || 0))} />
              <span className={cn("font-bold", getScoreColor(lead.current_lead_score || 0))}>
                {lead.current_lead_score || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
