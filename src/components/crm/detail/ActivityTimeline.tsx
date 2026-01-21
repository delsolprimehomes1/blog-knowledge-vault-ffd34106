import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  Activity,
  Bell,
  Check,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type CrmActivity = Database["public"]["Tables"]["crm_activities"]["Row"];

interface ActivityTimelineProps {
  activities: CrmActivity[];
  pendingCallbacks: CrmActivity[];
  onViewAll?: () => void;
  onCompleteCallback?: (activityId: string) => void;
  maxItems?: number;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "call":
      return <Phone className="w-4 h-4" />;
    case "email":
      return <Mail className="w-4 h-4" />;
    case "whatsapp":
      return <MessageSquare className="w-4 h-4" />;
    case "note":
      return <FileText className="w-4 h-4" />;
    case "meeting":
      return <Calendar className="w-4 h-4" />;
    case "callback":
      return <Bell className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "call":
      return "bg-green-100 text-green-600";
    case "email":
      return "bg-blue-100 text-blue-600";
    case "whatsapp":
      return "bg-emerald-100 text-emerald-600";
    case "note":
      return "bg-amber-100 text-amber-600";
    case "meeting":
      return "bg-purple-100 text-purple-600";
    case "callback":
      return "bg-orange-100 text-orange-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const getOutcomeColor = (outcome: string | null) => {
  if (!outcome) return "bg-gray-100 text-gray-800";
  if (outcome.includes("answer") || outcome.includes("sent") || outcome === "answered")
    return "bg-green-100 text-green-800";
  if (outcome.includes("no_answer") || outcome === "busy" || outcome === "voicemail")
    return "bg-amber-100 text-amber-800";
  if (outcome.includes("not_interested") || outcome === "wrong_number")
    return "bg-red-100 text-red-800";
  return "bg-blue-100 text-blue-800";
};

function ActivityTimelineItem({
  activity,
  isLast,
  onCompleteCallback,
}: {
  activity: CrmActivity;
  isLast: boolean;
  onCompleteCallback?: (activityId: string) => void;
}) {
  return (
    <div className="flex">
      <div className="flex flex-col items-center mr-4">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            getActivityColor(activity.activity_type)
          )}
        >
          {getActivityIcon(activity.activity_type)}
        </div>
        {!isLast && <div className="w-px h-full bg-border mt-2" />}
      </div>

      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-sm capitalize">
            {activity.activity_type}
            {activity.subject && `: ${activity.subject}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created_at || ""), {
              addSuffix: true,
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {activity.outcome && (
            <Badge
              variant="secondary"
              className={cn("text-xs", getOutcomeColor(activity.outcome))}
            >
              {activity.outcome.replace(/_/g, " ")}
            </Badge>
          )}
          {(activity as any).interest_level && (
            <Badge variant="outline" className="text-xs">
              {(activity as any).interest_level === "very_interested" && "🤩"}
              {(activity as any).interest_level === "interested" && "😊"}
              {(activity as any).interest_level === "neutral" && "😐"}
              {(activity as any).interest_level === "not_interested" && "😞"}
              {" "}{(activity as any).interest_level.replace(/_/g, " ")}
            </Badge>
          )}
          {(activity as any).whatsapp_template_used && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
              📱 WhatsApp sent
            </Badge>
          )}
        </div>

        {activity.notes && (
          <p className="text-sm text-muted-foreground mb-2">{activity.notes}</p>
        )}

        {activity.call_duration && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Duration: {Math.floor(activity.call_duration / 60)}m{" "}
            {activity.call_duration % 60}s
          </p>
        )}

        {activity.callback_requested && !activity.callback_completed && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-orange-50">
              <Bell className="w-3 h-3 mr-1" />
              Callback: {format(new Date(activity.callback_datetime || ""), "PPp")}
            </Badge>
            {onCompleteCallback && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => onCompleteCallback(activity.id)}
              >
                <Check className="w-3 h-3 mr-1" />
                Done
              </Button>
            )}
          </div>
        )}

        {activity.callback_completed && (
          <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
            <Check className="w-3 h-3 mr-1" />
            Callback completed
          </Badge>
        )}
      </div>
    </div>
  );
}

export function ActivityTimeline({
  activities,
  pendingCallbacks,
  onViewAll,
  onCompleteCallback,
  maxItems = 5,
}: ActivityTimelineProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Timeline
          </CardTitle>
          {activities.length > maxItems && onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All ({activities.length})
            </Button>
          )}
        </div>

        {/* Pending Callbacks Alert */}
        {pendingCallbacks.length > 0 && (
          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <p className="text-sm font-medium text-orange-800 flex items-center gap-1">
              <Bell className="w-4 h-4" />
              {pendingCallbacks.length} pending callback
              {pendingCallbacks.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {displayedActivities.length > 0 ? (
          <div>
            {displayedActivities.map((activity, index) => (
              <ActivityTimelineItem
                key={activity.id}
                activity={activity}
                isLast={index === displayedActivities.length - 1}
                onCompleteCallback={onCompleteCallback}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity yet</p>
            <p className="text-xs">Log your first interaction with this lead</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
