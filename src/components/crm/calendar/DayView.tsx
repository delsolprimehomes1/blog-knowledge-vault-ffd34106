import React, { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReminderCard } from "./ReminderCard";
import { cn } from "@/lib/utils";
import type { ReminderWithLead } from "@/hooks/useReminders";

interface DayViewProps {
  reminders: ReminderWithLead[];
  currentDate: Date;
  onReminderClick: (reminder: ReminderWithLead) => void;
  onComplete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onTimeSlotClick?: (datetime: Date) => void;
}

export function DayView({
  reminders,
  currentDate,
  onReminderClick,
  onComplete,
  onSnooze,
  onTimeSlotClick,
}: DayViewProps) {
  // Generate 15-minute time slots from 8 AM to 9 PM
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; label: string }[] = [];
    for (let hour = 8; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push({
          hour,
          minute,
          label: format(time, "h:mm a"),
        });
      }
    }
    return slots;
  }, []);

  // Group reminders by time slot
  const remindersBySlot = useMemo(() => {
    const grouped: Record<string, ReminderWithLead[]> = {};
    
    timeSlots.forEach((slot) => {
      const key = `${slot.hour}:${slot.minute}`;
      grouped[key] = [];
    });

    reminders
      .filter((r) => isSameDay(new Date(r.reminder_datetime), currentDate))
      .forEach((reminder) => {
        const reminderTime = new Date(reminder.reminder_datetime);
        const hour = reminderTime.getHours();
        const minute = Math.floor(reminderTime.getMinutes() / 15) * 15;
        const key = `${hour}:${minute}`;
        
        if (grouped[key]) {
          grouped[key].push(reminder);
        }
      });

    return grouped;
  }, [reminders, currentDate, timeSlots]);

  const handleTimeSlotClick = (hour: number, minute: number) => {
    if (onTimeSlotClick) {
      const datetime = new Date(currentDate);
      datetime.setHours(hour, minute, 0, 0);
      onTimeSlotClick(datetime);
    }
  };

  // Current time indicator position
  const now = new Date();
  const isCurrentDay = isSameDay(now, currentDate);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimePosition = isCurrentDay && currentHour >= 8 && currentHour <= 21
    ? ((currentHour - 8) * 60 + currentMinute) / (14 * 60) * 100
    : null;

  return (
    <div className="h-full flex flex-col relative">
      {/* Day header */}
      <div className="p-4 border-b bg-muted/30 text-center">
        <p className="text-2xl font-bold">{format(currentDate, "EEEE")}</p>
        <p className="text-muted-foreground">{format(currentDate, "MMMM d, yyyy")}</p>
      </div>

      {/* Time slots */}
      <ScrollArea className="flex-1 relative">
        {/* Current time indicator */}
        {currentTimePosition !== null && (
          <div 
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${currentTimePosition}%` }}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          </div>
        )}

        <div className="min-h-full">
          {timeSlots.map((slot, index) => {
            const key = `${slot.hour}:${slot.minute}`;
            const slotReminders = remindersBySlot[key] || [];
            const isHourStart = slot.minute === 0;
            
            return (
              <div
                key={`${slot.hour}-${slot.minute}`}
                className={cn(
                  "flex border-b min-h-[60px] hover:bg-muted/30 transition-colors cursor-pointer",
                  isHourStart && "border-t-2 border-t-muted"
                )}
                onClick={() => handleTimeSlotClick(slot.hour, slot.minute)}
              >
                {/* Time label */}
                <div className={cn(
                  "w-20 shrink-0 p-2 text-right text-sm border-r",
                  isHourStart ? "text-foreground font-medium" : "text-muted-foreground text-xs"
                )}>
                  {isHourStart ? slot.label : slot.label.replace(/:00/g, "")}
                </div>
                
                {/* Reminder content */}
                <div className="flex-1 p-2">
                  {slotReminders.length > 0 && (
                    <div className="space-y-2">
                      {slotReminders.map((reminder) => (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          onClick={() => onReminderClick(reminder)}
                          onComplete={onComplete}
                          onSnooze={onSnooze}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
