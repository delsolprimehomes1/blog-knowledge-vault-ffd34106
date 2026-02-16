import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  Copy,
  Edit2,
  Check,
  X,
  Clock,
  MessageSquare,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { getLanguageFlag } from "@/lib/crm-conditional-styles";
import { sanitizePhone } from "@/lib/phone-utils";
import type { Database } from "@/integrations/supabase/types";

type CrmLead = Database["public"]["Tables"]["crm_leads"]["Row"];

interface ContactInfoCardProps {
  lead: CrmLead;
  editingField: string | null;
  editValue: unknown;
  setEditValue: (value: unknown) => void;
  saving: boolean;
  startEdit: (field: string, value: unknown) => void;
  cancelEdit: () => void;
  saveEdit: (field: string) => Promise<void>;
  onCall: () => void;
  onEmail: () => void;
}

export function ContactInfoCard({
  lead,
  editingField,
  editValue,
  setEditValue,
  saving,
  startEdit,
  cancelEdit,
  saveEdit,
  onCall,
  onEmail,
}: ContactInfoCardProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Contact Information
          </CardTitle>
          {lead.last_contact_at && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Last contact:{" "}
              {formatDistanceToNow(new Date(lead.last_contact_at), {
                addSuffix: true,
              })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4">
          {/* Phone */}
          <div>
            <dt className="text-xs text-muted-foreground mb-1">Phone Number</dt>
            <dd className="flex items-center gap-2">
              <a
                href={`tel:${sanitizePhone(lead.phone_number)}`}
                onClick={onCall}
                className="text-lg font-semibold text-primary hover:underline flex items-center"
              >
                <Phone className="w-4 h-4 mr-2" />
                {sanitizePhone(lead.phone_number)}
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(sanitizePhone(lead.phone_number), "Phone")}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </dd>
          </div>

          {/* Email */}
          <div>
            <dt className="text-xs text-muted-foreground mb-1">Email Address</dt>
            {editingField === "email" ? (
              <dd className="flex items-center gap-1">
                <Input
                  type="email"
                  value={editValue as string}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Enter email address"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => saveEdit("email")}
                  disabled={saving}
                >
                  <Check className="w-3 h-3 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={cancelEdit}
                >
                  <X className="w-3 h-3 text-red-600" />
                </Button>
              </dd>
            ) : lead.email ? (
              <dd className="flex items-center gap-2">
                <a
                  href={`mailto:${lead.email}`}
                  onClick={onEmail}
                  className="text-sm font-medium text-primary hover:underline flex items-center"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {lead.email}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => startEdit("email", lead.email)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(lead.email || "", "Email")}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </dd>
            ) : (
              <dd>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit("email", "")}
                  className="text-muted-foreground"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Email
                </Button>
              </dd>
            )}
          </div>

          {/* Country/Origin */}
          <div>
            <dt className="text-xs text-muted-foreground mb-1">Country/Origin</dt>
            <dd className="flex items-center gap-2 text-sm font-medium">
              {lead.country_name && lead.country_name !== 'Unknown' ? (
                <>
                  <span className="text-lg">{lead.country_flag || '🌍'}</span>
                  {lead.country_name}
                  {lead.country_prefix && (
                    <span className="text-muted-foreground">({lead.country_prefix})</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">Not specified</span>
              )}
            </dd>
          </div>

          {/* Language */}
          <div>
            <dt className="text-xs text-muted-foreground mb-1">Language</dt>
            <dd className="flex items-center gap-2 text-sm font-medium">
              <span className="text-lg">{getLanguageFlag(lead.language)}</span>
              {lead.language.toUpperCase()}
            </dd>
          </div>

          {/* Total Contacts */}
          <div>
            <dt className="text-xs text-muted-foreground mb-1">Total Contacts</dt>
            <dd className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              {lead.total_contacts || 0} interactions
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
