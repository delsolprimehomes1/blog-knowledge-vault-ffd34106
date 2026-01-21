import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react";
import type { ActivityType, CallOutcome } from "@/hooks/useLeadActivities";

interface LogActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogActivity: (data: {
    activityType: ActivityType;
    outcome?: CallOutcome | string;
    notes?: string;
    callDuration?: number;
    callbackRequested?: boolean;
    callbackDatetime?: string;
    callbackNotes?: string;
  }) => void;
  defaultType?: ActivityType;
}

const CALL_OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: "answered", label: "Answered" },
  { value: "no_answer", label: "No Answer" },
  { value: "voicemail", label: "Left Voicemail" },
  { value: "busy", label: "Busy" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "not_interested", label: "Not Interested" },
  { value: "callback_scheduled", label: "Callback Scheduled" },
];

export function LogActivityDialog({
  open,
  onOpenChange,
  onLogActivity,
  defaultType = "call",
}: LogActivityDialogProps) {
  const [activeTab, setActiveTab] = useState<ActivityType>(defaultType);
  const [loading, setLoading] = useState(false);

  // Call form state
  const [callOutcome, setCallOutcome] = useState<CallOutcome>("answered");
  const [callDuration, setCallDuration] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [callbackRequested, setCallbackRequested] = useState(false);
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");

  // Email form state
  const [emailNotes, setEmailNotes] = useState("");

  // Note form state
  const [noteText, setNoteText] = useState("");

  const resetForm = () => {
    setCallOutcome("answered");
    setCallDuration("");
    setCallNotes("");
    setCallbackRequested(false);
    setCallbackDate("");
    setCallbackTime("");
    setCallbackNotes("");
    setEmailNotes("");
    setNoteText("");
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const baseData = {
        activityType: activeTab,
      };

      if (activeTab === "call") {
        const durationSeconds = callDuration ? parseInt(callDuration) * 60 : undefined;
        const callbackDatetime = callbackRequested && callbackDate && callbackTime
          ? new Date(`${callbackDate}T${callbackTime}`).toISOString()
          : undefined;

        await onLogActivity({
          ...baseData,
          outcome: callOutcome,
          notes: callNotes || undefined,
          callDuration: durationSeconds,
          callbackRequested,
          callbackDatetime,
          callbackNotes: callbackNotes || undefined,
        });
      } else if (activeTab === "email") {
        await onLogActivity({
          ...baseData,
          outcome: "sent",
          notes: emailNotes || undefined,
        });
      } else if (activeTab === "whatsapp") {
        await onLogActivity({
          ...baseData,
          outcome: "sent",
          notes: emailNotes || undefined,
        });
      } else if (activeTab === "note") {
        await onLogActivity({
          ...baseData,
          notes: noteText,
        });
      }

      resetForm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActivityType)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="call" className="gap-1">
              <Phone className="w-4 h-4" />
              Call
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="note" className="gap-1">
              <FileText className="w-4 h-4" />
              Note
            </TabsTrigger>
          </TabsList>

          {/* Call Tab */}
          <TabsContent value="call" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={callOutcome} onValueChange={(v) => setCallOutcome(v as CallOutcome)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALL_OUTCOMES.map((outcome) => (
                    <SelectItem key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                placeholder="e.g., 5"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Call notes..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="callback"
                checked={callbackRequested}
                onCheckedChange={setCallbackRequested}
              />
              <Label htmlFor="callback">Schedule Callback</Label>
            </div>

            {callbackRequested && (
              <div className="space-y-3 p-3 bg-muted rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time</Label>
                    <Input
                      type="time"
                      value={callbackTime}
                      onChange={(e) => setCallbackTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Callback Notes</Label>
                  <Input
                    placeholder="Why calling back..."
                    value={callbackNotes}
                    onChange={(e) => setCallbackNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="What was the email about..."
                value={emailNotes}
                onChange={(e) => setEmailNotes(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="What was the message about..."
                value={emailNotes}
                onChange={(e) => setEmailNotes(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* Note Tab */}
          <TabsContent value="note" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                placeholder="Add your note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Log Activity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
