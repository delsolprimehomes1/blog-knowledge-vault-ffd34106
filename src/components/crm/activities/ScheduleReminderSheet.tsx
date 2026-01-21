import React, { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Save,
  Loader2,
  Calendar as CalendarIcon,
  Mail,
  Clock,
} from "lucide-react";
import { format, addHours, addDays, setHours, setMinutes, nextMonday } from "date-fns";
import { toast } from "sonner";
import type { ActivityType } from "@/hooks/useLeadActivities";

interface ScheduleReminderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    first_name: string;
    last_name: string;
  };
  onLogActivity: (data: {
    activityType: ActivityType;
    notes?: string;
    callbackRequested?: boolean;
    callbackDatetime?: string;
    callbackNotes?: string;
  }) => void;
  onSuccess?: () => void;
}

const REMINDER_TYPES = [
  { value: "callback", label: "📞 Callback" },
  { value: "follow_up", label: "🔄 Follow-up" },
  { value: "viewing", label: "🏠 Viewing" },
  { value: "deadline", label: "⏰ Deadline" },
];

// Generate time slots (09:00 - 21:00, 15-minute intervals)
const TIME_SLOTS = Array.from({ length: 49 }, (_, i) => {
  const hour = Math.floor(i / 4) + 9;
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

export function ScheduleReminderSheet({
  isOpen,
  onClose,
  lead,
  onLogActivity,
  onSuccess,
}: ScheduleReminderSheetProps) {
  const [saving, setSaving] = useState(false);
  const [reminderType, setReminderType] = useState("callback");
  const [reminderDate, setReminderDate] = useState<Date | undefined>();
  const [reminderTime, setReminderTime] = useState("");
  const [notes, setNotes] = useState("");
  const [emailReminder, setEmailReminder] = useState(true);

  const resetForm = useCallback(() => {
    setReminderType("callback");
    setReminderDate(undefined);
    setReminderTime("");
    setNotes("");
    setEmailReminder(true);
  }, []);

  // Quick presets
  const setQuickPreset = (preset: string) => {
    const now = new Date();
    let targetDate: Date;

    switch (preset) {
      case "2_hours":
        targetDate = addHours(now, 2);
        break;
      case "tomorrow_10am":
        targetDate = setMinutes(setHours(addDays(now, 1), 10), 0);
        break;
      case "tomorrow_2pm":
        targetDate = setMinutes(setHours(addDays(now, 1), 14), 0);
        break;
      case "next_monday":
        targetDate = setMinutes(setHours(nextMonday(now), 10), 0);
        break;
      default:
        return;
    }

    setReminderDate(targetDate);
    setReminderTime(format(targetDate, "HH:mm"));
  };

  const handleSave = async () => {
    if (!reminderDate || !reminderTime) {
      toast.error("Please set date and time");
      return;
    }

    setSaving(true);

    try {
      const dateStr = format(reminderDate, "yyyy-MM-dd");
      const callbackDatetime = new Date(`${dateStr}T${reminderTime}`).toISOString();

      onLogActivity({
        activityType: "callback",
        notes: `[${reminderType.toUpperCase()}] ${notes || "Reminder scheduled"}`,
        callbackRequested: true,
        callbackDatetime,
        callbackNotes: notes,
      });

      toast.success("Reminder scheduled", {
        description: `${format(reminderDate, "PPP")} at ${reminderTime}`,
      });

      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error scheduling reminder:", error);
      toast.error("Failed to schedule reminder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-600" />
            Set Reminder - {lead.first_name} {lead.last_name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label>Quick Set</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setQuickPreset("2_hours")}
              >
                <Clock className="w-3 h-3 mr-1" />
                In 2 hours
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setQuickPreset("tomorrow_10am")}
              >
                Tomorrow 10am
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setQuickPreset("tomorrow_2pm")}
              >
                Tomorrow 2pm
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setQuickPreset("next_monday")}
              >
                Next Monday
              </Badge>
            </div>
          </div>

          {/* Reminder Type */}
          <div className="space-y-2">
            <Label>Reminder Type</Label>
            <Select value={reminderType} onValueChange={setReminderType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {reminderDate ? format(reminderDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reminderDate}
                    onSelect={setReminderDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={reminderTime} onValueChange={setReminderTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What should you remember about this?"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Email Reminder */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-primary" />
              <div>
                <p className="font-medium text-sm">Email Reminder</p>
                <p className="text-xs text-muted-foreground">1 hour before</p>
              </div>
            </div>
            <Switch checked={emailReminder} onCheckedChange={setEmailReminder} />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !reminderDate || !reminderTime}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Set Reminder
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
