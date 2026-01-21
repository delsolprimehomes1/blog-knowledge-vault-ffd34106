import React from "react";
import { MobileLeadCard } from "./MobileLeadCard";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileLeadsListProps {
  leads: Array<{
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
  }>;
  isLoading: boolean;
  selectedLeads: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdateField: (leadId: string, field: string, value: any) => void;
  onArchive: (leadId: string) => void;
  onScheduleReminder: (lead: any) => void;
}

export function MobileLeadsList({
  leads,
  isLoading,
  selectedLeads,
  onToggleSelect,
  onUpdateField,
  onArchive,
  onScheduleReminder,
}: MobileLeadsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h3 className="text-lg font-medium mb-1">No leads found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or check back later
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {leads.map((lead) => (
        <MobileLeadCard
          key={lead.id}
          lead={lead}
          isSelected={selectedLeads.has(lead.id)}
          onToggleSelect={onToggleSelect}
          onUpdateField={onUpdateField}
          onArchive={onArchive}
          onScheduleReminder={onScheduleReminder}
        />
      ))}
    </div>
  );
}
