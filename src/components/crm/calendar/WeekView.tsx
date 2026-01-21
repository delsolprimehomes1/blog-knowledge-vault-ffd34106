import React, { useMemo } from "react";
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  format,
} from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReminderBlock } from "./ReminderBlock";
import { cn } from "@/lib/utils";
import type { ReminderWithLead } from "@/hooks/useReminders";

interface WeekViewProps {
  reminders: ReminderWithLead[];
  currentDate: Date;
  onReminderClick: (reminder: ReminderWithLead) => void;
  onTimeSlotClick?: (datetime: Date) => void;
}

export function WeekView({ 
  reminders, 
  currentDate, 
  onReminderClick,
  onTimeSlotClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });

  const hours = useMemo(() => 
    Array.from({ length: 13 }, (_, i) => i + 9), // 9 AM to 9 PM
    []
  );

  // Group reminders by day and hour
  const remindersByDayHour = useMemo(() => {
    const grouped: Record<string, Record<number, ReminderWithLead[]>> = {};
    
    weekDays.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      grouped[dayKey] = {};
      hours.forEach((hour) => {
        grouped[dayKey][hour] = [];
      });
    });

    reminders.forEach((reminder) => {
      const reminderDate = new Date(reminder.reminder_datetime);
      const dayKey = format(reminderDate, "yyyy-MM-dd");
      const hour = reminderDate.getHours();
      
      if (grouped[dayKey] && hour >= 9 && hour <= 21) {
        grouped[dayKey][hour].push(reminder);
      }
    });

    return grouped;
  }, [reminders, weekDays, hours]);

  const handleTimeSlotClick = (day: Date, hour: number) => {
    if (onTimeSlotClick) {
      const datetime = new Date(day);
      datetime.setHours(hour, 0, 0, 0);
      onTimeSlotClick(datetime);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30 sticky top-0 z-10">
        <div className="p-2 border-r" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "p-2 text-center border-r last:border-r-0",
              isToday(day) && "bg-primary/10"
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">
              {format(day, "EEE")}
            </p>
            <p className={cn(
              "text-lg font-semibold",
              isToday(day) && "text-primary"
            )}>
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <ScrollArea className="flex-1">
        <div className="min-h-[650px]">
          {hours.map((hour) => (
            <div 
              key={hour} 
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[50px]"
            >
              <div className="p-1 border-r text-xs text-muted-foreground text-right pr-2 pt-1">
                {format(new Date().setHours(hour, 0, 0, 0), "h a")}
              </div>
              
              {weekDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayReminders = remindersByDayHour[dayKey]?.[hour] || [];
                
                return (
                  <div
                    key={`${dayKey}-${hour}`}
                    className={cn(
                      "border-r last:border-r-0 p-0.5 cursor-pointer hover:bg-muted/50 transition-colors",
                      isToday(day) && "bg-primary/5"
                    )}
                    onClick={() => handleTimeSlotClick(day, hour)}
                  >
                    <div className="space-y-0.5">
                      {dayReminders.map((reminder) => (
                        <ReminderBlock
                          key={reminder.id}
                          reminder={reminder}
                          onClick={() => onReminderClick(reminder)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
