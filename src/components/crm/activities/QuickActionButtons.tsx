import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Phone, Mail, MessageSquare, FileText, Bell } from "lucide-react";
import { LogCallDrawer } from "./LogCallDrawer";
import { LogEmailDrawer } from "./LogEmailDrawer";
import { QuickNoteSheet } from "./QuickNoteSheet";
import { ScheduleReminderSheet } from "./ScheduleReminderSheet";
import { openWhatsApp, WHATSAPP_TEMPLATES, replaceTemplateTokens } from "@/lib/whatsapp-templates";
import type { ActivityType, CallOutcome } from "@/hooks/useLeadActivities";

interface QuickActionButtonsProps {
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    full_phone?: string;
    email: string;
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
    subject?: string;
  }) => void;
  onUpdateLeadStatus?: (status: string) => void;
  onAddNote?: (text: string, isPinned: boolean) => void;
  onSuccess?: () => void;
  variant?: "default" | "compact";
}

export function QuickActionButtons({
  lead,
  agentName,
  onLogActivity,
  onUpdateLeadStatus,
  onAddNote,
  onSuccess,
  variant = "default",
}: QuickActionButtonsProps) {
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [logEmailOpen, setLogEmailOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Only respond if no modifiers are pressed
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "c":
          e.preventDefault();
          setLogCallOpen(true);
          break;
        case "e":
          e.preventDefault();
          setLogEmailOpen(true);
          break;
        case "n":
          e.preventDefault();
          setQuickNoteOpen(true);
          break;
        case "r":
          e.preventDefault();
          setReminderOpen(true);
          break;
        case "w":
          e.preventDefault();
          handleQuickWhatsApp();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lead]);

  const handleQuickWhatsApp = useCallback(() => {
    const template = WHATSAPP_TEMPLATES.find((t) => t.id === "follow_up");
    if (template) {
      const message = replaceTemplateTokens(template.message, {
        firstName: lead.first_name,
        agentName: agentName,
      });
      const phone = lead.full_phone || lead.phone_number;
      openWhatsApp(phone, message);

      // Log activity
      onLogActivity({
        activityType: "whatsapp",
        outcome: "sent",
        notes: `Quick WhatsApp: ${message.substring(0, 100)}...`,
        whatsappTemplateUsed: "follow_up",
      });
    }
  }, [lead, agentName, onLogActivity]);

  const isCompact = variant === "compact";

  return (
    <TooltipProvider>
      <div className={isCompact ? "flex gap-1" : "flex gap-2 flex-wrap"}>
        {/* Log Call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={isCompact ? "icon" : "default"}
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setLogCallOpen(true)}
            >
              <Phone className="h-4 w-4" />
              {!isCompact && <span className="ml-2">Log Call</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Log Call (C)</p>
          </TooltipContent>
        </Tooltip>

        {/* Log Email */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={isCompact ? "icon" : "default"}
              variant="outline"
              onClick={() => setLogEmailOpen(true)}
            >
              <Mail className="h-4 w-4" />
              {!isCompact && <span className="ml-2">Log Email</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Log Email (E)</p>
          </TooltipContent>
        </Tooltip>

        {/* Quick WhatsApp */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={isCompact ? "icon" : "default"}
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={handleQuickWhatsApp}
            >
              <MessageSquare className="h-4 w-4" />
              {!isCompact && <span className="ml-2">WhatsApp</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Send WhatsApp (W)</p>
          </TooltipContent>
        </Tooltip>

        {/* Add Note */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={isCompact ? "icon" : "default"}
              variant="outline"
              onClick={() => setQuickNoteOpen(true)}
            >
              <FileText className="h-4 w-4" />
              {!isCompact && <span className="ml-2">Note</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Note (N)</p>
          </TooltipContent>
        </Tooltip>

        {/* Set Reminder */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={isCompact ? "icon" : "default"}
              variant="outline"
              onClick={() => setReminderOpen(true)}
            >
              <Bell className="h-4 w-4" />
              {!isCompact && <span className="ml-2">Reminder</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Set Reminder (R)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Drawers/Sheets */}
      <LogCallDrawer
        isOpen={logCallOpen}
        onClose={() => setLogCallOpen(false)}
        lead={lead}
        agentName={agentName}
        onLogActivity={onLogActivity}
        onUpdateLeadStatus={onUpdateLeadStatus}
        onSuccess={onSuccess}
      />

      <LogEmailDrawer
        isOpen={logEmailOpen}
        onClose={() => setLogEmailOpen(false)}
        lead={lead}
        onLogActivity={onLogActivity}
        onSuccess={onSuccess}
      />

      <QuickNoteSheet
        isOpen={quickNoteOpen}
        onClose={() => setQuickNoteOpen(false)}
        lead={lead}
        onLogActivity={onLogActivity}
        onAddNote={onAddNote}
        onSuccess={onSuccess}
      />

      <ScheduleReminderSheet
        isOpen={reminderOpen}
        onClose={() => setReminderOpen(false)}
        lead={lead}
        onLogActivity={onLogActivity}
        onSuccess={onSuccess}
      />
    </TooltipProvider>
  );
}
