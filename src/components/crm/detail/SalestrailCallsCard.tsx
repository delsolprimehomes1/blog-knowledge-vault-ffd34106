import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { useSalestrailCalls, SalestrailCall } from "@/hooks/useSalestrailCalls";
import { CallRecordingPlayer } from "./CallRecordingPlayer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { sanitizePhone } from "@/lib/phone-utils";

interface SalestrailCallsCardProps {
  leadId: string;
  phoneNumber?: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function CallItem({ call }: { call: SalestrailCall }) {
  const isInbound = call.call_direction === "inbound";
  const isAnswered = call.call_answered;

  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Direction Icon */}
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isInbound ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
            )}
          >
            {isAnswered ? (
              isInbound ? (
                <PhoneIncoming className="w-4 h-4" />
              ) : (
                <PhoneOutgoing className="w-4 h-4" />
              )
            ) : (
              <PhoneMissed className="w-4 h-4 text-amber-600" />
            )}
          </div>

          <div>
            {/* Direction & Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs capitalize",
                  isInbound ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
                )}
              >
                {isInbound ? "Inbound" : "Outbound"}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  isAnswered ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                )}
              >
                {isAnswered ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Answered
                  </>
                ) : (
                  "Missed"
                )}
              </Badge>
              {call.call_duration !== null && call.call_duration > 0 && (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(call.call_duration)}
                </span>
              )}
            </div>

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(call.created_at), "MMM d, yyyy 'at' h:mm a")} · {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Auto-logged badge */}
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 shrink-0">
          Auto-logged
        </Badge>
      </div>

      {/* Recording Player */}
      {call.salestrail_recording_url && (
        <div className="mt-2 ml-10">
          <CallRecordingPlayer url={call.salestrail_recording_url} />
        </div>
      )}

      {/* Notes */}
      {call.notes && (
        <p className="text-sm text-muted-foreground mt-2 ml-10">{call.notes}</p>
      )}
    </div>
  );
}

export function SalestrailCallsCard({ leadId, phoneNumber }: SalestrailCallsCardProps) {
  const { calls, isLoading, callCount } = useSalestrailCalls({ leadId });
  const [isOpen, setIsOpen] = React.useState(true);

  // Show first 3 calls, rest in collapsible
  const visibleCalls = calls.slice(0, 3);
  const hiddenCalls = calls.slice(3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Call History
            {callCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {callCount}
              </Badge>
            )}
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">
            Salestrail
          </Badge>
        </div>
        {phoneNumber && (
          <p className="text-xs text-muted-foreground mt-1">
            Tracking: {sanitizePhone(phoneNumber)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No calls logged yet</p>
            <p className="text-xs">Calls will appear here automatically via Salestrail</p>
          </div>
        ) : (
          <div>
            {visibleCalls.map((call) => (
              <CallItem key={call.id} call={call} />
            ))}

            {hiddenCalls.length > 0 && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs text-muted-foreground"
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Show {hiddenCalls.length} more calls
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {hiddenCalls.map((call) => (
                    <CallItem key={call.id} call={call} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
