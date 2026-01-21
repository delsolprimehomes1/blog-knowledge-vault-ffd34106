import React, { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  getExtendedUrgency, 
  EXTENDED_URGENCY_STYLES,
  REMINDER_TYPE_CONFIG,
} from "@/lib/crm-conditional-styles";
import type { ReminderWithLead } from "@/hooks/useReminders";

interface MonthViewProps {
  reminders: ReminderWithLead[];
  currentDate: Date;
  onDayClick: (date: Date) => void;
  onReminderClick: (reminder: ReminderWithLead) => void;
}

export function MonthView({
  reminders,
  currentDate,
  onDayClick,
  onReminderClick,
}: MonthViewProps) {
  // Generate calendar days (including days from adjacent months to fill the grid)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group reminders by day
  const remindersByDay = useMemo(() => {
    const grouped: Record<string, ReminderWithLead[]> = {};
    
    reminders.forEach((reminder) => {
      const dayKey = format(new Date(reminder.reminder_datetime), "yyyy-MM-dd");
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(reminder);
    });

    return grouped;
  }, [reminders]);

  // Count overdue reminders per day
  const overdueByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    
    reminders.forEach((reminder) => {
      if (!reminder.is_completed && getExtendedUrgency(reminder.reminder_datetime) === "overdue") {
        const dayKey = format(new Date(reminder.reminder_datetime), "yyyy-MM-dd");
        counts[dayKey] = (counts[dayKey] || 0) + 1;
      }
    });

    return counts;
  }, [reminders]);

  const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="h-full flex flex-col">
      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDayLabels.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {calendarDays.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayReminders = remindersByDay[dayKey] || [];
          const overdueCount = overdueByDay[dayKey] || 0;
          const isCurrentMonth = isSameMonth(day, currentDate);
          
          return (
            <div
              key={dayKey}
              onClick={() => onDayClick(day)}
              className={cn(
                "border-b border-r p-1 cursor-pointer transition-colors min-h-[100px]",
                "hover:bg-muted/50",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isToday(day) && "bg-primary/10"
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday(day) && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1 animate-pulse">
                    {overdueCount} overdue
                  </Badge>
                )}
              </div>

              {/* Reminder dots/preview */}
              <div className="space-y-0.5">
                {dayReminders.slice(0, 3).map((reminder) => {
                  const urgency = getExtendedUrgency(reminder.reminder_datetime);
                  const styles = EXTENDED_URGENCY_STYLES[urgency];
                  const typeConfig = REMINDER_TYPE_CONFIG[reminder.reminder_type as keyof typeof REMINDER_TYPE_CONFIG];

                  return (
                    <div
                      key={reminder.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReminderClick(reminder);
                      }}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1",
                        styles.bg,
                        styles.text,
                        "hover:opacity-80 cursor-pointer"
                      )}
                    >
                      <span>{typeConfig?.icon || "📌"}</span>
                      <span className="truncate">{reminder.title}</span>
                    </div>
                  );
                })}
                
                {dayReminders.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    +{dayReminders.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
