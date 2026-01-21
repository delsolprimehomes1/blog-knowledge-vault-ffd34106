import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, Link2, FileText, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type CrmLead = Database["public"]["Tables"]["crm_leads"]["Row"];

interface LeadSourceCardProps {
  lead: CrmLead;
}

export function LeadSourceCard({ lead }: LeadSourceCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Lead Source Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Source</dt>
            <dd className="font-medium">{lead.lead_source}</dd>
          </div>

          {lead.lead_source_detail && (
            <>
              <hr className="border-dashed" />
              <div>
                <dt className="text-xs text-muted-foreground">Source Detail</dt>
                <dd>
                  <Badge variant="secondary" className="text-xs">
                    {lead.lead_source_detail}
                  </Badge>
                </dd>
              </div>
            </>
          )}

          {lead.page_type && (
            <div>
              <dt className="text-xs text-muted-foreground">Page Type</dt>
              <dd className="font-medium capitalize">{lead.page_type}</dd>
            </div>
          )}

          {lead.page_url && (
            <div>
              <dt className="text-xs text-muted-foreground mb-1">Page URL</dt>
              <dd>
                <a
                  href={lead.page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1 break-all"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  {lead.page_url.length > 40
                    ? `${lead.page_url.substring(0, 40)}...`
                    : lead.page_url}
                </a>
              </dd>
            </div>
          )}

          {lead.page_title && (
            <div>
              <dt className="text-xs text-muted-foreground">Page Title</dt>
              <dd className="text-xs">{lead.page_title}</dd>
            </div>
          )}

          {lead.referrer && (
            <div>
              <dt className="text-xs text-muted-foreground">Referrer</dt>
              <dd className="text-xs break-all">{lead.referrer}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

interface AssignmentCardProps {
  lead: CrmLead;
}

export function AssignmentCard({ lead }: AssignmentCardProps) {
  const getAssignmentMethodLabel = (method: string | null) => {
    switch (method) {
      case "claimed":
        return "🏆 Claimed";
      case "admin_assigned":
        return "👤 Admin Assigned";
      case "auto_fallback":
        return "⚡ Auto Fallback";
      default:
        return "Unknown";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Assignment Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Assignment Method</dt>
            <dd className="font-medium">
              {getAssignmentMethodLabel(lead.assignment_method)}
            </dd>
          </div>

          {lead.assigned_at && (
            <>
              <hr className="border-dashed" />
              <div>
                <dt className="text-xs text-muted-foreground">Assigned At</dt>
                <dd className="font-medium">
                  {format(new Date(lead.assigned_at), "PPp")}
                </dd>
                <dd className="text-xs text-muted-foreground">
                  ({formatDistanceToNow(new Date(lead.assigned_at), { addSuffix: true })})
                </dd>
              </div>
            </>
          )}

          <hr className="border-dashed" />

          <div>
            <dt className="text-xs text-muted-foreground">Created At</dt>
            <dd className="font-medium">
              {format(new Date(lead.created_at || ""), "PPp")}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

interface FormSubmissionCardProps {
  lead: CrmLead;
}

export function FormSubmissionCard({ lead }: FormSubmissionCardProps) {
  // Only show if there's form-related data
  if (!lead.message && !lead.property_ref && !lead.city_name && !lead.interest) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Form Submission Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          {lead.property_ref && (
            <div>
              <dt className="text-xs text-muted-foreground">Property Reference</dt>
              <dd className="font-medium">{lead.property_ref}</dd>
              {lead.property_price && (
                <dd className="text-xs text-muted-foreground">
                  Price: {lead.property_price}
                </dd>
              )}
            </div>
          )}

          {lead.city_name && (
            <div>
              <dt className="text-xs text-muted-foreground">City Interest</dt>
              <dd className="font-medium flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {lead.city_name}
              </dd>
            </div>
          )}

          {lead.interest && (
            <div>
              <dt className="text-xs text-muted-foreground">Property Interest</dt>
              <dd className="font-medium text-primary flex items-center gap-1">
                🏠 {lead.interest}
              </dd>
            </div>
          )}

          {lead.message && (
            <div>
              <dt className="text-xs text-muted-foreground mb-1">Their Message</dt>
              <dd className="bg-muted rounded-md p-3 text-sm italic">
                "{lead.message}"
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
