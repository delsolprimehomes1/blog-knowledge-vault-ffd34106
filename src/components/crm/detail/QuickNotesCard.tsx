import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Save,
  Pin,
  PinOff,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type CrmLeadNote = Database["public"]["Tables"]["crm_lead_notes"]["Row"];

interface QuickNotesCardProps {
  notes: CrmLeadNote[];
  pinnedNotes: CrmLeadNote[];
  isAdding: boolean;
  onAddNote: (noteText: string, noteType?: string) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export function QuickNotesCard({
  notes,
  pinnedNotes,
  isAdding,
  onAddNote,
  onTogglePin,
  onDeleteNote,
}: QuickNotesCardProps) {
  const [newNote, setNewNote] = useState("");

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onAddNote(newNote.trim());
    setNewNote("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddNote();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Quick Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add Note Form */}
        <div className="space-y-2">
          <Textarea
            placeholder="Add a quick note... (Cmd/Ctrl + Enter to save)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] text-sm resize-none"
          />
          <Button
            size="sm"
            className="w-full"
            onClick={handleAddNote}
            disabled={!newNote.trim() || isAdding}
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Note
          </Button>
        </div>

        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Pin className="w-3 h-3" />
              Pinned Notes
            </p>
            {pinnedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onTogglePin={onTogglePin}
                onDelete={onDeleteNote}
              />
            ))}
          </div>
        )}

        {/* Recent Notes */}
        {notes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Recent Notes
            </p>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-2">
                {notes
                  .filter((n) => !n.is_pinned)
                  .slice(0, 10)
                  .map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      onTogglePin={onTogglePin}
                      onDelete={onDeleteNote}
                    />
                  ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet. Add your first note above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NoteItem({
  note,
  onTogglePin,
  onDelete,
}: {
  note: CrmLeadNote;
  onTogglePin: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}) {
  return (
    <div
      className={cn(
        "p-2 rounded-md text-sm group",
        note.is_pinned ? "bg-yellow-50 border border-yellow-200" : "bg-muted"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 whitespace-pre-wrap">{note.note_text}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onTogglePin(note.id)}
          >
            {note.is_pinned ? (
              <PinOff className="w-3 h-3" />
            ) : (
              <Pin className="w-3 h-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={() => onDelete(note.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {formatDistanceToNow(new Date(note.created_at || ""), { addSuffix: true })}
      </p>
    </div>
  );
}
