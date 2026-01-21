import React, { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Phone,
  CheckCircle2,
  XCircle,
  PhoneOff,
  PhoneMissed,
  MessageSquare,
  Calendar as CalendarIcon,
  Save,
  ChevronDown,
  Clock,
  Mail,
  Play,
  Square,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  WHATSAPP_TEMPLATES,
  replaceTemplateTokens,
  openWhatsApp,
} from "@/lib/whatsapp-templates";
import type { CallOutcome, ActivityType } from "@/hooks/useLeadActivities";

interface LogCallDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    full_phone?: string;
    language: string;
    lead_status: string;
  };
  agentName: string;
  onLogActivity: (data: {
    activityType: ActivityType;
    outcome?: CallOutcome | string;
    notes?: string;
    callDuration?: number;
    callbackRequested?: boolean;
    callbackDatetime?: string;
    callbackNotes?: string;
    interestLevel?: string;
    sentimentScore?: number;
    whatsappTemplateUsed?: string;
    autoStatusUpdate?: string;
  }) => void;
  onUpdateLeadStatus?: (status: string) => void;
  onSuccess?: () => void;
}

const CALL_OUTCOMES = [
  {
    value: "answered" as CallOutcome,
    label: "Answered",
    description: "Lead picked up the call",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-800 border-green-200",
  },
  {
    value: "no_answer" as CallOutcome,
    label: "No Answer",
    description: "No response from lead",
    icon: PhoneMissed,
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    value: "voicemail" as CallOutcome,
    label: "Voicemail Left",
    description: "Left a message",
    icon: Phone,
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    value: "busy" as CallOutcome,
    label: "Busy",
    description: "Line was busy",
    icon: PhoneOff,
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    value: "wrong_number" as CallOutcome,
    label: "Wrong Number",
    description: "Incorrect number",
    icon: XCircle,
    color: "bg-red-100 text-red-800 border-red-200",
  },
];

const INTEREST_LEVELS = [
  { value: "very_interested", label: "Very Interested", emoji: "🤩", score: 0.9 },
  { value: "interested", label: "Interested", emoji: "😊", score: 0.7 },
  { value: "neutral", label: "Neutral", emoji: "😐", score: 0.5 },
  { value: "not_interested", label: "Not Interested", emoji: "😞", score: 0.2 },
];

// Generate time slots (09:00 - 21:00, 15-minute intervals)
const TIME_SLOTS = Array.from({ length: 49 }, (_, i) => {
  const hour = Math.floor(i / 4) + 9;
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

export function LogCallDrawer({
  isOpen,
  onClose,
  lead,
  agentName,
  onLogActivity,
  onUpdateLeadStatus,
  onSuccess,
}: LogCallDrawerProps) {
  const [saving, setSaving] = useState(false);

  // Form state
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [interestLevel, setInterestLevel] = useState("");

  // WhatsApp follow-up
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState("follow_up");
  const [whatsappMessage, setWhatsappMessage] = useState("");

  // Callback scheduling
  const [scheduleCallback, setScheduleCallback] = useState(false);
  const [callbackDate, setCallbackDate] = useState<Date | undefined>();
  const [callbackTime, setCallbackTime] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");
  const [emailReminder, setEmailReminder] = useState(true);

  // Status update
  const [newStatus, setNewStatus] = useState("");

  // Timer
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Auto-suggest WhatsApp when no answer
  useEffect(() => {
    if (outcome === "no_answer" || outcome === "voicemail") {
      setSendWhatsApp(true);
      setScheduleCallback(true);
    } else {
      setSendWhatsApp(false);
    }
  }, [outcome]);

  // Auto-populate WhatsApp message
  useEffect(() => {
    if (whatsappTemplate && whatsappTemplate !== "custom") {
      const template = WHATSAPP_TEMPLATES.find((t) => t.id === whatsappTemplate);
      if (template) {
        const message = replaceTemplateTokens(template.message, {
          firstName: lead.first_name,
          agentName: agentName,
        });
        setWhatsappMessage(message);
      }
    }
  }, [whatsappTemplate, lead.first_name, agentName]);

  // Auto-suggest status update
  useEffect(() => {
    if (outcome === "answered") {
      setNewStatus("contacted");
    } else if (outcome === "no_answer" || outcome === "voicemail") {
      setNewStatus("contacted");
    } else if (interestLevel === "not_interested") {
      setNewStatus("not_interested");
    }
  }, [outcome, interestLevel]);

  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const startTimer = useCallback(() => {
    setIsTimerRunning(true);
    setTimerSeconds(0);
  }, []);

  const stopTimer = useCallback(() => {
    setIsTimerRunning(false);
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    setMinutes(mins);
    setSeconds(secs);
  }, [timerSeconds]);

  const resetForm = useCallback(() => {
    setOutcome("");
    setMinutes(0);
    setSeconds(0);
    setNotes("");
    setInterestLevel("");
    setSendWhatsApp(false);
    setWhatsappTemplate("follow_up");
    setWhatsappMessage("");
    setScheduleCallback(false);
    setCallbackDate(undefined);
    setCallbackTime("");
    setCallbackNotes("");
    setEmailReminder(true);
    setNewStatus("");
    setIsTimerRunning(false);
    setTimerSeconds(0);
  }, []);

  const handleSave = async () => {
    // Validation
    if (!outcome) {
      toast.error("Please select a call outcome");
      return;
    }

    if (!notes) {
      toast.error("Please add call notes");
      return;
    }

    if (outcome === "answered" && !interestLevel) {
      toast.error("Please indicate their interest level");
      return;
    }

    if (scheduleCallback && (!callbackDate || !callbackTime)) {
      toast.error("Please set callback date and time");
      return;
    }

    setSaving(true);

    try {
      const callDuration = minutes * 60 + seconds;
      const interestData = INTEREST_LEVELS.find((l) => l.value === interestLevel);

      // Build callback datetime
      let callbackDatetime: string | undefined;
      if (scheduleCallback && callbackDate && callbackTime) {
        const dateStr = format(callbackDate, "yyyy-MM-dd");
        callbackDatetime = new Date(`${dateStr}T${callbackTime}`).toISOString();
      }

      // Log call activity
      onLogActivity({
        activityType: "call",
        outcome,
        notes,
        callDuration: callDuration > 0 ? callDuration : undefined,
        callbackRequested: scheduleCallback,
        callbackDatetime,
        callbackNotes: callbackNotes || undefined,
        interestLevel: interestLevel || undefined,
        sentimentScore: interestData?.score,
        whatsappTemplateUsed: sendWhatsApp ? whatsappTemplate : undefined,
        autoStatusUpdate: newStatus || undefined,
      });

      // Update lead status if changed
      if (newStatus && onUpdateLeadStatus) {
        onUpdateLeadStatus(newStatus);
      }

      // Send WhatsApp if requested
      if (sendWhatsApp && whatsappMessage) {
        const phone = lead.full_phone || lead.phone_number;
        openWhatsApp(phone, whatsappMessage);

        // Log WhatsApp activity
        onLogActivity({
          activityType: "whatsapp",
          outcome: "sent",
          notes: `WhatsApp follow-up: ${whatsappMessage.substring(0, 100)}...`,
          whatsappTemplateUsed: whatsappTemplate,
        });
      }

      toast.success("Call logged successfully", {
        description: scheduleCallback ? "Callback reminder created" : undefined,
      });

      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error logging call:", error);
      toast.error("Failed to log call");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            Log Call - {lead.first_name} {lead.last_name}
          </SheetTitle>
          <SheetDescription>
            <a
              href={`tel:${lead.phone_number}`}
              className="flex items-center text-primary hover:underline font-medium"
            >
              <Phone className="w-4 h-4 mr-1" />
              {lead.phone_number}
            </a>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Call Timer */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Call Duration</p>
                  <p className="text-2xl font-mono font-bold">
                    {Math.floor(timerSeconds / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(timerSeconds % 60).toString().padStart(2, "0")}
                  </p>
                </div>
              </div>
              <div>
                {!isTimerRunning ? (
                  <Button size="sm" variant="outline" onClick={startTimer}>
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={stopTimer}>
                    <Square className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Call Outcome */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Call Outcome *</Label>
            <div className="grid grid-cols-2 gap-2">
              {CALL_OUTCOMES.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOutcome(option.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-left",
                      outcome === option.value
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-md", option.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interest Level (if answered) */}
          <AnimatePresence>
            {outcome === "answered" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3"
              >
                <Label className="text-base font-semibold">Interest Level *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {INTEREST_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setInterestLevel(level.value)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-center",
                        interestLevel === level.value
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <p className="text-2xl mb-1">{level.emoji}</p>
                      <p className="text-xs font-medium">{level.label}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual Duration Input */}
          {!isTimerRunning && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min={0}
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                  className="text-center font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Seconds</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={seconds}
                  onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
                  className="text-center font-mono"
                />
              </div>
            </div>
          )}

          {/* Call Notes */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Call Notes *</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you discuss? Key points, concerns, next steps..."
              rows={4}
              className="resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length} / 1000 characters
            </p>
          </div>

          {/* WhatsApp Follow-up (if no answer) */}
          <AnimatePresence>
            {(outcome === "no_answer" || outcome === "voicemail") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Send WhatsApp Follow-up?</p>
                      <p className="text-sm text-muted-foreground">
                        Recommended after no answer
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={sendWhatsApp}
                    onCheckedChange={setSendWhatsApp}
                  />
                </div>

                <AnimatePresence>
                  {sendWhatsApp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3"
                    >
                      <Label>WhatsApp Template</Label>
                      <Select
                        value={whatsappTemplate}
                        onValueChange={setWhatsappTemplate}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WHATSAPP_TEMPLATES.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="space-y-2">
                        <Label>Message Preview</Label>
                        <Textarea
                          value={whatsappMessage}
                          onChange={(e) => setWhatsappMessage(e.target.value)}
                          rows={4}
                          className="bg-white"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Schedule Callback */}
          <Collapsible open={scheduleCallback} onOpenChange={setScheduleCallback}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Schedule Callback
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    scheduleCallback && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {callbackDate
                          ? format(callbackDate, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={callbackDate}
                        onSelect={setCallbackDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select value={callbackTime} onValueChange={setCallbackTime}>
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

              <div className="space-y-2">
                <Label>Callback Notes</Label>
                <Textarea
                  value={callbackNotes}
                  onChange={(e) => setCallbackNotes(e.target.value)}
                  placeholder="What should you discuss in this callback?"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Email Reminder</p>
                    <p className="text-xs text-muted-foreground">1 hour before</p>
                  </div>
                </div>
                <Switch
                  checked={emailReminder}
                  onCheckedChange={setEmailReminder}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Update Lead Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Update Lead Status</Label>
              <Badge variant="outline" className="text-xs">
                Current: {lead.lead_status.replace(/_/g, " ")}
              </Badge>
            </div>
            <Select
              value={newStatus}
              onValueChange={setNewStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Keep current status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contacted">📞 Contacted</SelectItem>
                <SelectItem value="qualified">✅ Qualified</SelectItem>
                <SelectItem value="nurture">🌱 Nurture</SelectItem>
                <SelectItem value="not_interested">🚫 Not Interested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="sticky bottom-0 bg-background border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !outcome || !notes}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Call Log
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
