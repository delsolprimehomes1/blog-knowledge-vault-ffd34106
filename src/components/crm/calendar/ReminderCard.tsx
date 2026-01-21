import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, Clock, MoreHorizontal, Phone, Mail, Eye } from "lucide-react";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { 
  getExtendedUrgency, 
  EXTENDED_URGENCY_STYLES,
  REMINDER_TYPE_CONFIG,
} from "@/lib/crm-conditional-styles";
import { cn } from "@/lib/utils";
import type { ReminderWithLead } from "@/hooks/useReminders";

interface ReminderCardProps {
  reminder: ReminderWithLead;
  onClick: () => void;
  onComplete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  compact?: boolean;
}

export function ReminderCard({
  reminder,
  onClick,
  onComplete,
  onSnooze,
  compact = false,
}: ReminderCardProps) {
  const countdown = useCountdownTimer(reminder.reminder_datetime);
  const urgency = getExtendedUrgency(reminder.reminder_datetime);
  const styles = EXTENDED_URGENCY_STYLES[urgency];
  const typeConfig = REMINDER_TYPE_CONFIG[reminder.reminder_type as keyof typeof REMINDER_TYPE_CONFIG] 
    || REMINDER_TYPE_CONFIG.callback;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "p-2 rounded-md cursor-pointer border transition-all",
          styles.bg,
          styles.border,
          "hover:shadow-sm"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{typeConfig.icon}</span>
            <span className="text-sm font-medium truncate">{reminder.title}</span>
          </div>
          <Badge 
            variant="secondary" 
            className={cn("text-xs shrink-0", urgency === "overdue" && "animate-pulse", styles.badge)}
          >
            {countdown.display}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer border-l-4 transition-all",
        styles.bg,
        `border-l-[${styles.hex}]`,
        styles.border,
        "hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{typeConfig.icon}</span>
            <p className={cn("font-medium text-sm truncate", styles.text)}>
              {reminder.title}
            </p>
          </div>
          
          {reminder.lead && (
            <p className="text-xs text-muted-foreground truncate">
              {reminder.lead.first_name} {reminder.lead.last_name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(reminder.id);
            }}
          >
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSnooze(reminder.id, 15)}>
                <Clock className="h-4 w-4 mr-2" />
                Snooze 15min
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(reminder.id, 30)}>
                <Clock className="h-4 w-4 mr-2" />
                Snooze 30min
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(reminder.id, 60)}>
                <Clock className="h-4 w-4 mr-2" />
                Snooze 1 hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(reminder.id, 240)}>
                <Clock className="h-4 w-4 mr-2" />
                Snooze 4 hours
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {reminder.lead && (
                <>
                  <DropdownMenuItem>
                    <Phone className="h-4 w-4 mr-2" />
                    Call Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Mail className="h-4 w-4 mr-2" />
                    Email Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Lead
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <Badge 
          variant="outline" 
          className={cn("text-xs", typeConfig.color)}
        >
          {typeConfig.label}
        </Badge>
        
        <Badge 
          className={cn(
            "text-xs font-mono",
            urgency === "overdue" && "animate-pulse",
            styles.badge
          )}
        >
          {countdown.display}
        </Badge>
      </div>
    </div>
  );
}
