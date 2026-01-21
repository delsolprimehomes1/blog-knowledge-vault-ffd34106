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
import { FileText, Save, Loader2, Pin } from "lucide-react";
import { toast } from "sonner";
import type { ActivityType } from "@/hooks/useLeadActivities";

interface QuickNoteSheetProps {
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
  }) => void;
  onAddNote?: (text: string, isPinned: boolean) => void;
  onSuccess?: () => void;
}

const NOTE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "requirement_update", label: "Requirement Update" },
  { value: "concern", label: "Concern / Issue" },
  { value: "positive_feedback", label: "Positive Feedback" },
  { value: "follow_up", label: "Follow-up Item" },
];

export function QuickNoteSheet({
  isOpen,
  onClose,
  lead,
  onLogActivity,
  onAddNote,
  onSuccess,
}: QuickNoteSheetProps) {
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [category, setCategory] = useState("general");
  const [isPinned, setIsPinned] = useState(false);

  const resetForm = useCallback(() => {
    setNoteText("");
    setCategory("general");
    setIsPinned(false);
  }, []);

  const handleSave = async () => {
    if (!noteText.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setSaving(true);

    try {
      // Log as activity
      onLogActivity({
        activityType: "note",
        notes: `[${category.replace(/_/g, " ").toUpperCase()}] ${noteText}`,
      });

      // Also add to notes if handler provided
      if (onAddNote) {
        onAddNote(noteText, isPinned);
      }

      toast.success("Note added");
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            Add Note - {lead.first_name} {lead.last_name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note Text */}
          <div className="space-y-2">
            <Label>Note *</Label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note..."
              rows={6}
              className="resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {noteText.length} / 500 characters
            </p>
          </div>

          {/* Pin Option */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center space-x-3">
              <Pin className="w-4 h-4 text-primary" />
              <div>
                <p className="font-medium text-sm">Pin this note</p>
                <p className="text-xs text-muted-foreground">
                  Keep it visible at the top
                </p>
              </div>
            </div>
            <Switch checked={isPinned} onCheckedChange={setIsPinned} />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !noteText.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Add Note
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
