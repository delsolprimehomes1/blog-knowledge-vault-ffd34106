import React, { useState, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Save, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { ActivityType } from "@/hooks/useLeadActivities";

interface LogEmailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  onLogActivity: (data: {
    activityType: ActivityType;
    outcome?: string;
    notes?: string;
    subject?: string;
  }) => void;
  onSuccess?: () => void;
}

const EMAIL_OUTCOMES = [
  { value: "sent", label: "Email Sent" },
  { value: "replied", label: "Replied" },
  { value: "bounced", label: "Bounced" },
  { value: "opened", label: "Opened (tracking)" },
];

export function LogEmailDrawer({
  isOpen,
  onClose,
  lead,
  onLogActivity,
  onSuccess,
}: LogEmailDrawerProps) {
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState("sent");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = useCallback(() => {
    setOutcome("sent");
    setSubject("");
    setNotes("");
  }, []);

  const handleOpenEmail = () => {
    const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}`;
    window.location.href = mailtoLink;
  };

  const handleSave = async () => {
    if (!notes) {
      toast.error("Please add notes about the email");
      return;
    }

    setSaving(true);

    try {
      onLogActivity({
        activityType: "email",
        outcome,
        notes,
        subject: subject || undefined,
      });

      toast.success("Email activity logged");
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error logging email:", error);
      toast.error("Failed to log email");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Log Email - {lead.first_name} {lead.last_name}
          </SheetTitle>
          <SheetDescription>
            <a
              href={`mailto:${lead.email}`}
              className="flex items-center text-primary hover:underline font-medium"
            >
              <Mail className="w-4 h-4 mr-1" />
              {lead.email}
            </a>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Quick Action */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleOpenEmail}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Email Client
          </Button>

          {/* Email Outcome */}
          <div className="space-y-2">
            <Label>Email Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_OUTCOMES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject (optional)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes *</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was the email about? Key points discussed..."
              rows={5}
              className="resize-none"
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !notes}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Log Email
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
