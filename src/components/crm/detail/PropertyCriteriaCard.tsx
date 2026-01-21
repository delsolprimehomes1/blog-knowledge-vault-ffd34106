import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DollarSign,
  Home,
  Bed,
  MapPin,
  Calendar,
  Waves,
  Target,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type CrmLead = Database["public"]["Tables"]["crm_leads"]["Row"];

interface PropertyCriteriaCardProps {
  lead: CrmLead;
  editingField: string | null;
  editValue: unknown;
  setEditValue: (value: unknown) => void;
  saving: boolean;
  startEdit: (field: string, value: unknown) => void;
  cancelEdit: () => void;
  saveEdit: (field: string) => Promise<void>;
}

const BUDGET_OPTIONS = [
  "€100K - €300K",
  "€300K - €500K",
  "€500K - €750K",
  "€750K - €1M",
  "€1M - €2M",
  "€2M - €5M",
  "€5M+",
];

const BEDROOM_OPTIONS = [
  "1-2 Bedrooms",
  "3 Bedrooms",
  "4 Bedrooms",
  "5+ Bedrooms",
];

const TIMEFRAME_OPTIONS = [
  "immediate",
  "1-3_months",
  "3-6_months",
  "6-12_months",
  "12+_months",
];

const PURPOSE_OPTIONS = [
  "primary_residence",
  "holiday_home",
  "investment",
  "rental_income",
  "relocation",
];

const SEA_VIEW_OPTIONS = [
  "must_have",
  "nice_to_have",
  "not_important",
];

const getTimeframeStyle = (timeframe: string | null) => {
  if (!timeframe) return "bg-muted text-muted-foreground";
  if (timeframe === "immediate") return "bg-red-100 text-red-800";
  if (timeframe.includes("1-3")) return "bg-orange-100 text-orange-800";
  if (timeframe.includes("3-6")) return "bg-yellow-100 text-yellow-800";
  return "bg-blue-100 text-blue-800";
};

const formatTimeframe = (timeframe: string | null) => {
  if (!timeframe) return "Not specified";
  return timeframe.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatSeaView = (value: string | null) => {
  if (!value) return "Not specified";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatPurpose = (value: string | null) => {
  if (!value) return "Not specified";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export function PropertyCriteriaCard({
  lead,
  editingField,
  editValue,
  setEditValue,
  saving,
  startEdit,
  cancelEdit,
  saveEdit,
}: PropertyCriteriaCardProps) {
  const renderEditableField = (
    field: string,
    label: string,
    value: string | null,
    options: string[],
    icon: React.ReactNode,
    formatter: (v: string | null) => string
  ) => (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </dt>
      {editingField === field ? (
        <div className="flex items-center gap-1">
          <Select
            value={editValue as string}
            onValueChange={(v) => setEditValue(v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {formatter(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => saveEdit(field)}
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
        </div>
      ) : (
        <dd
          className="text-sm font-medium flex items-center gap-1 cursor-pointer hover:text-primary group"
          onClick={() => startEdit(field, value || "")}
        >
          {formatter(value)}
          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </dd>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Property Criteria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          {/* Budget Range */}
          {renderEditableField(
            "budget_range",
            "Budget Range",
            lead.budget_range,
            BUDGET_OPTIONS,
            <DollarSign className="w-3 h-3" />,
            (v) => v || "Not specified"
          )}

          {/* Bedrooms */}
          {renderEditableField(
            "bedrooms_desired",
            "Bedrooms",
            lead.bedrooms_desired,
            BEDROOM_OPTIONS,
            <Bed className="w-3 h-3" />,
            (v) => v || "Not specified"
          )}

          {/* Location Preference */}
          <div className="col-span-2 space-y-1">
            <dt className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Preferred Locations
            </dt>
            <dd className="flex flex-wrap gap-1">
              {lead.location_preference && lead.location_preference.length > 0 ? (
                lead.location_preference.map((loc) => (
                  <Badge key={loc} variant="secondary" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {loc}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Any location</span>
              )}
            </dd>
          </div>

          {/* Property Type */}
          <div className="col-span-2 space-y-1">
            <dt className="text-xs text-muted-foreground flex items-center gap-1">
              <Home className="w-3 h-3" />
              Property Types
            </dt>
            <dd className="flex flex-wrap gap-1">
              {lead.property_type && lead.property_type.length > 0 ? (
                lead.property_type.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Any type</span>
              )}
            </dd>
          </div>

          {/* Purpose */}
          {renderEditableField(
            "property_purpose",
            "Purpose",
            lead.property_purpose,
            PURPOSE_OPTIONS,
            <Home className="w-3 h-3" />,
            formatPurpose
          )}

          {/* Timeframe */}
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Timeframe
            </dt>
            {editingField === "timeframe" ? (
              <div className="flex items-center gap-1">
                <Select
                  value={editValue as string}
                  onValueChange={(v) => setEditValue(v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEFRAME_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {formatTimeframe(opt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => saveEdit("timeframe")}
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
              </div>
            ) : (
              <dd>
                <Badge
                  className={cn("cursor-pointer text-xs", getTimeframeStyle(lead.timeframe))}
                  onClick={() => startEdit("timeframe", lead.timeframe || "")}
                >
                  {formatTimeframe(lead.timeframe)}
                </Badge>
              </dd>
            )}
          </div>

          {/* Sea View */}
          {renderEditableField(
            "sea_view_importance",
            "Sea View",
            lead.sea_view_importance,
            SEA_VIEW_OPTIONS,
            <Waves className="w-3 h-3" />,
            formatSeaView
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
