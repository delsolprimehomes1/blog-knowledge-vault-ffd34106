import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  MapPin,
  Home,
  DollarSign,
  Calendar,
  ExternalLink,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentLead } from "@/hooks/useAgentLeadsTable";

interface ExpandedLeadRowProps {
  lead: AgentLead;
  onCall?: () => void;
  onEmail?: () => void;
  onWhatsApp?: () => void;
  onAddNote?: () => void;
  onSchedule?: () => void;
}

export function ExpandedLeadRow({
  lead,
  onCall,
  onEmail,
  onWhatsApp,
  onAddNote,
  onSchedule,
}: ExpandedLeadRowProps) {
  return (
    <div className="p-4 bg-muted/30 border-t">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Emma Q&A & Details */}
        <div className="space-y-4">
          {/* Emma Conversation */}
          {lead.qa_pairs && lead.qa_pairs.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Emma Conversation ({lead.qa_pairs.length} questions)
                </h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {lead.qa_pairs.map((qa: any, index: number) => (
                    <div key={index} className="text-sm">
                      <p className="font-medium text-muted-foreground">
                        Q{index + 1}: {qa.question}
                      </p>
                      <p className="mt-1 text-foreground">{qa.answer}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Property Criteria */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-3">Property Criteria</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Budget
                  </dt>
                  <dd className="font-medium">{lead.budget_range || "Not specified"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Timeframe
                  </dt>
                  <dd className="font-medium">
                    {lead.timeframe?.replace(/_/g, " ") || "Not specified"}
                  </dd>
                </div>
                <Separator className="my-2" />
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3" />
                    Preferred Locations
                  </dt>
                  <dd className="flex flex-wrap gap-1">
                    {lead.location_preference?.length ? (
                      lead.location_preference.map((loc) => (
                        <Badge key={loc} variant="secondary" className="text-xs">
                          {loc}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">Any location</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1 mb-1">
                    <Home className="w-3 h-3" />
                    Property Types
                  </dt>
                  <dd className="flex flex-wrap gap-1">
                    {lead.property_type?.length ? (
                      lead.property_type.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">Any type</span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick Actions & Source */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-3">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCall}
                  className="justify-start"
                >
                  <Phone className="w-4 h-4 mr-2 text-green-600" />
                  Call Now
                </Button>
                {lead.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEmail}
                    className="justify-start"
                  >
                    <Mail className="w-4 h-4 mr-2 text-blue-600" />
                    Send Email
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onWhatsApp}
                  className="justify-start"
                >
                  <MessageSquare className="w-4 h-4 mr-2 text-green-500" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddNote}
                  className="justify-start"
                >
                  <FileText className="w-4 h-4 mr-2 text-amber-600" />
                  Add Note
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSchedule}
                  className="justify-start col-span-2"
                >
                  <Bell className="w-4 h-4 mr-2 text-primary" />
                  Schedule Reminder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Source Details */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-3">Lead Source</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="font-medium">{lead.lead_source || "Website"}</dd>
                </div>
                {lead.lead_source_detail && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Detail</dt>
                    <dd className="font-medium">{lead.lead_source_detail}</dd>
                  </div>
                )}
                {lead.page_type && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Page Type</dt>
                    <dd className="font-medium">{lead.page_type}</dd>
                  </div>
                )}
                {lead.page_url && (
                  <div>
                    <dt className="text-muted-foreground mb-1">Page URL</dt>
                    <dd>
                      <a
                        href={lead.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {lead.page_url.length > 50
                          ? lead.page_url.substring(0, 50) + "..."
                          : lead.page_url}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
