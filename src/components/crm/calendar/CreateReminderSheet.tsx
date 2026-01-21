import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Plus, 
  Save, 
  Loader2, 
  Calendar as CalendarIcon,
  Clock,
  Mail,
  Bell,
} from "lucide-react";
import { format, addHours, addDays, setHours, setMinutes, nextMonday } from "date-fns";
import { REMINDER_TYPE_CONFIG } from "@/lib/crm-conditional-styles";
import { useCreateReminder } from "@/hooks/useReminders";

interface CreateReminderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  leadId?: string;
  leadName?: string;
  initialDatetime?: Date;
}

// Generate time slots (08:00 - 21:00, 15-minute intervals)
const TIME_SLOTS = Array.from({ length: 53 }, (_, i) => {
  const hour = Math.floor(i / 4) + 8;
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

export function CreateReminderSheet({
  isOpen,
  onClose,
  agentId,
  leadId,
  leadName,
  initialDatetime,
}: CreateReminderSheetProps) {
  const createReminder = useCreateReminder();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reminderType, setReminderType] = useState("callback");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(initialDatetime);
  const [reminderTime, setReminderTime] = useState(
    initialDatetime ? format(initialDatetime, "HH:mm") : ""
  );
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSlack, setSendSlack] = useState(true);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setReminderType("callback");
      setReminderDate(initialDatetime);
      setReminderTime(initialDatetime ? format(initialDatetime, "HH:mm") : "");
      setSendEmail(true);
      setSendSlack(true);
    }
  }, [isOpen, initialDatetime]);

  // Quick presets
  const setQuickPreset = (preset: string) => {
    const now = new Date();
    let targetDate: Date;

    switch (preset) {
      case "1_hour":
        targetDate = addHours(now, 1);
        break;
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
    if (!reminderDate || !reminderTime || !title.trim()) {
      return;
    }

    const [hours, minutes] = reminderTime.split(":").map(Number);
    const reminderDatetime = new Date(reminderDate);
    reminderDatetime.setHours(hours, minutes, 0, 0);

    await createReminder.mutateAsync({
      agentId,
      leadId,
      title: title.trim(),
      description: description.trim() || undefined,
      reminderType,
      reminderDatetime,
      sendEmail,
      sendSlack,
    });

    onClose();
  };

  const typeConfig = REMINDER_TYPE_CONFIG[reminderType as keyof typeof REMINDER_TYPE_CONFIG];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            New Reminder
            {leadName && (
              <Badge variant="secondary" className="ml-2">
                {leadName}
              </Badge>
            )}
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
                onClick={() => setQuickPreset("1_hour")}
              >
                <Clock className="w-3 h-3 mr-1" />
                In 1 hour
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setQuickPreset("2_hours")}
              >
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

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Follow up on property inquiry"
            />
          </div>

          {/* Reminder Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={reminderType} onValueChange={setReminderType}>
              <SelectTrigger>
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span>{typeConfig.icon}</span>
                    <span>{typeConfig.label}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REMINDER_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
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
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time *</Label>
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Notification Settings */}
          <div className="space-y-3">
            <Label>Notifications</Label>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Email Reminder</p>
                  <p className="text-xs text-muted-foreground">1 hour before</p>
                </div>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Slack Notification</p>
                  <p className="text-xs text-muted-foreground">At reminder time</p>
                </div>
              </div>
              <Switch checked={sendSlack} onCheckedChange={setSendSlack} />
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createReminder.isPending || !title.trim() || !reminderDate || !reminderTime}
          >
            {createReminder.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Reminder
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
