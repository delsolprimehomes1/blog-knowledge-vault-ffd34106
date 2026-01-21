import { useCallback } from "react";
import { toast } from "sonner";
import type { AgentLead } from "./useAgentLeadsTable";

export function useLeadsExport() {
  const exportToCsv = useCallback((leads: AgentLead[]) => {
    if (leads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Language",
      "Status",
      "Segment",
      "Priority",
      "Budget",
      "Location",
      "Property Type",
      "Timeframe",
      "Source",
      "Score",
      "Created",
      "Last Contact",
      "Total Contacts",
    ];

    const rows = leads.map((lead) => [
      `${lead.first_name} ${lead.last_name}`,
      lead.email || "",
      lead.phone_number,
      lead.language.toUpperCase(),
      lead.lead_status,
      lead.lead_segment,
      lead.lead_priority,
      lead.budget_range || "",
      lead.location_preference?.join("; ") || "",
      lead.property_type?.join("; ") || "",
      lead.timeframe?.replace(/_/g, " ") || "",
      lead.lead_source,
      lead.current_lead_score,
      new Date(lead.created_at).toLocaleDateString(),
      lead.last_contact_at
        ? new Date(lead.last_contact_at).toLocaleDateString()
        : "Never",
      lead.total_contacts,
    ]);

    // Escape CSV values properly
    const escapeCell = (value: any): string => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${leads.length} leads to CSV`);
  }, []);

  return { exportToCsv };
}
