import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Phone,
  MessageCircle,
  Mail,
  MoreVertical,
  Calendar,
  Archive,
  Clock,
  Flame,
  Star,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

// Lead status options
const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "negotiating", label: "Negotiating" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

// Segment options
const SEGMENT_OPTIONS = [
  { value: "active_buyer", label: "Active Buyer" },
  { value: "investor", label: "Investor" },
  { value: "passive_looker", label: "Passive Looker" },
  { value: "seller", label: "Seller" },
];

// Language flag mapping
const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  nl: "🇳🇱",
  sv: "🇸🇪",
  da: "🇩🇰",
  no: "🇳🇴",
  fi: "🇫🇮",
};

// Priority config
const PRIORITY_CONFIG: Record<string, { icon: React.ReactNode; color: string; borderColor: string }> = {
  urgent: {
    icon: <Flame className="w-4 h-4" />,
    color: "text-red-600",
    borderColor: "border-l-red-500",
  },
  high: {
    icon: <Star className="w-4 h-4" />,
    color: "text-orange-500",
    borderColor: "border-l-orange-500",
  },
  normal: {
    icon: null,
    color: "text-muted-foreground",
    borderColor: "border-l-blue-500",
  },
  low: {
    icon: null,
    color: "text-muted-foreground",
    borderColor: "border-l-gray-300",
  },
};

export interface MobileLeadCardProps {
  lead: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    full_phone?: string | null;
    language?: string | null;
    lead_status?: string | null;
    lead_segment?: string | null;
    lead_priority?: string | null;
    priority?: string | null;
    budget_min?: number | null;
    budget_max?: number | null;
    budget_range?: string | null;
    property_type?: string | string[] | null;
    lead_source?: string | null;
    last_contacted_at?: string | null;
    last_contact_at?: string | null;
    created_at: string;
    interest?: string | null;
    property_ref?: string | null;
    country_name?: string | null;
    country_code?: string | null;
    country_flag?: string | null;
    country_prefix?: string | null;
  };
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateField: (leadId: string, field: string, value: any) => void;
  onArchive: (leadId: string) => void;
  onScheduleReminder: (lead: any) => void;
}

export function MobileLeadCard({
  lead,
  isSelected,
  onToggleSelect,
  onUpdateField,
  onArchive,
  onScheduleReminder,
}: MobileLeadCardProps) {
  const navigate = useNavigate();
  const priority = lead.priority || "normal";
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  const languageFlag = LANGUAGE_FLAGS[lead.language || "en"] || "🌐";

  // Format budget range
  const formatBudget = useCallback(() => {
    if (!lead.budget_min && !lead.budget_max) return null;
    const formatter = new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
    if (lead.budget_min && lead.budget_max) {
      return `${formatter.format(lead.budget_min)} - ${formatter.format(lead.budget_max)}`;
    }
    if (lead.budget_min) return `From ${formatter.format(lead.budget_min)}`;
    if (lead.budget_max) return `Up to ${formatter.format(lead.budget_max)}`;
    return null;
  }, [lead.budget_min, lead.budget_max]);

  // Handle quick call
  const handleCall = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = lead.full_phone || lead.phone_number;
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  }, [lead.full_phone, lead.phone_number]);

  // Handle WhatsApp
  const handleWhatsApp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = lead.full_phone || lead.phone_number;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const message = encodeURIComponent(
        `Hello ${lead.first_name}, I wanted to follow up on your property inquiry.`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
    }
  }, [lead.full_phone, lead.phone_number, lead.first_name]);

  // Handle email
  const handleEmail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.email) {
      window.location.href = `mailto:${lead.email}`;
    }
  }, [lead.email]);

  // Navigate to lead detail
  const handleCardClick = useCallback(() => {
    navigate(`/crm/agent/leads/${lead.id}`);
  }, [navigate, lead.id]);

  // Last contact info
  const lastContactText = lead.last_contacted_at
    ? `Last contact: ${formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}`
    : `Created: ${formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}`;

  const budget = formatBudget();

  return (
    <div
      className={cn(
        "bg-card border rounded-lg p-4 shadow-sm transition-all",
        "border-l-4",
        priorityConfig.borderColor,
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      {/* Header Row: Checkbox, Name, Quick Actions */}
      <div className="flex items-start gap-3 mb-3">
        {/* Checkbox - Large tap target */}
        <div 
          className="pt-1 -ml-1 -mt-1 p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(lead.id)}
            className="h-5 w-5"
          />
        </div>

        {/* Name and basic info */}
        <div className="flex-1 min-w-0" onClick={handleCardClick}>
          <div className="flex items-center gap-2 mb-1">
            {priorityConfig.icon && (
              <span className={priorityConfig.color}>{priorityConfig.icon}</span>
            )}
            <h3 className="font-semibold text-base truncate">
              {lead.first_name || "Unknown"} {lead.last_name || ""}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {lead.country_flag && lead.country_name && lead.country_prefix?.startsWith('+') && (
              <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                {lead.country_flag} {lead.country_name}
                {lead.country_prefix && ` (${lead.country_prefix})`}
              </span>
            )}
            <span>{languageFlag} {(lead.language || "en").toUpperCase()}</span>
            <span>•</span>
            <span className="capitalize">{lead.property_type || "Property"}</span>
            {budget && (
              <>
                <span>•</span>
                <span className="text-primary font-medium">{budget}</span>
              </>
            )}
          </div>
          {/* Property Interest - Show if available */}
          {lead.interest && (
            <div className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-0.5 inline-block">
              🏠 {lead.interest}
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Call Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full hover:bg-green-100 hover:text-green-600"
            onClick={handleCall}
            disabled={!lead.phone_number && !lead.full_phone}
          >
            <Phone className="h-5 w-5" />
          </Button>

          {/* WhatsApp Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full hover:bg-green-100 hover:text-green-600"
            onClick={handleWhatsApp}
            disabled={!lead.phone_number && !lead.full_phone}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEmail} disabled={!lead.email}>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onScheduleReminder(lead)}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Reminder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onArchive(lead.id)}
                className="text-destructive focus:text-destructive"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status and Segment Selects */}
      <div 
        className="flex gap-2 mb-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status Select */}
        <Select
          value={lead.lead_status || "new"}
          onValueChange={(value) => onUpdateField(lead.id, "lead_status", value)}
        >
          <SelectTrigger className="h-10 flex-1 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Segment Select */}
        <Select
          value={lead.lead_segment || ""}
          onValueChange={(value) => onUpdateField(lead.id, "lead_segment", value)}
        >
          <SelectTrigger className="h-10 flex-1 text-sm">
            <SelectValue placeholder="Segment" />
          </SelectTrigger>
          <SelectContent>
            {SEGMENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Footer: Source and Last Contact */}
      <div 
        className="flex items-center justify-between text-xs text-muted-foreground"
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{lastContactText}</span>
        </div>
        {lead.lead_source && (
          <Badge variant="outline" className="text-xs">
            {lead.lead_source}
          </Badge>
        )}
      </div>
    </div>
  );
}
