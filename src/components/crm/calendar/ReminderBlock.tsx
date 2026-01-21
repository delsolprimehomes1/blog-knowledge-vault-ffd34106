import React from "react";
import { cn } from "@/lib/utils";
import { 
  getExtendedUrgency, 
  EXTENDED_URGENCY_STYLES,
  REMINDER_TYPE_CONFIG,
} from "@/lib/crm-conditional-styles";
import type { ReminderWithLead } from "@/hooks/useReminders";

interface ReminderBlockProps {
  reminder: ReminderWithLead;
  onClick: () => void;
}

export function ReminderBlock({ reminder, onClick }: ReminderBlockProps) {
  const urgency = getExtendedUrgency(reminder.reminder_datetime);
  const styles = EXTENDED_URGENCY_STYLES[urgency];
  const typeConfig = REMINDER_TYPE_CONFIG[reminder.reminder_type as keyof typeof REMINDER_TYPE_CONFIG] 
    || REMINDER_TYPE_CONFIG.callback;

  return (
    <div
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded text-xs cursor-pointer truncate border transition-all",
        styles.bg,
        styles.border,
        styles.text,
        urgency === "overdue" && "animate-pulse",
        "hover:shadow-sm hover:scale-[1.02]"
      )}
      title={`${reminder.title} - ${reminder.lead?.first_name || ""} ${reminder.lead?.last_name || ""}`}
    >
      <div className="flex items-center gap-1">
        <span>{typeConfig.icon}</span>
        <span className="truncate font-medium">{reminder.title}</span>
      </div>
      {reminder.lead && (
        <p className="text-[10px] opacity-75 truncate">
          {reminder.lead.first_name} {reminder.lead.last_name}
        </p>
      )}
    </div>
  );
}
