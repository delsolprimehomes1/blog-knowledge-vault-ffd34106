import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  Trash2,
  ExternalLink,
  User,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { 
  getExtendedUrgency, 
  EXTENDED_URGENCY_STYLES,
  REMINDER_TYPE_CONFIG,
  getLanguageFlag,
} from "@/lib/crm-conditional-styles";
import { cn } from "@/lib/utils";
import type { ReminderWithLead } from "@/hooks/useReminders";
import { useNavigate } from "react-router-dom";

interface ReminderDetailSheetProps {
  reminder: ReminderWithLead | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
}

export function ReminderDetailSheet({
  reminder,
  isOpen,
  onClose,
  onComplete,
  onSnooze,
  onDelete,
}: ReminderDetailSheetProps) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const countdown = useCountdownTimer(reminder?.reminder_datetime || null);
  
  if (!reminder) return null;

  const urgency = getExtendedUrgency(reminder.reminder_datetime);
  const styles = EXTENDED_URGENCY_STYLES[urgency];
  const typeConfig = REMINDER_TYPE_CONFIG[reminder.reminder_type as keyof typeof REMINDER_TYPE_CONFIG] 
    || REMINDER_TYPE_CONFIG.callback;

  const handleComplete = () => {
    onComplete(reminder.id);
    onClose();
  };

  const handleDelete = () => {
    onDelete(reminder.id);
    onClose();
  };

  const handleViewLead = () => {
    if (reminder.lead_id) {
      navigate(`/crm/agent/leads/${reminder.lead_id}`);
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{typeConfig.icon}</span>
            <div className="flex-1">
              <SheetTitle className="text-xl">{reminder.title}</SheetTitle>
              <Badge className={cn("mt-1", typeConfig.color)}>
                {typeConfig.label}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Countdown Timer */}
          <div className={cn(
            "p-4 rounded-lg text-center",
            styles.bg,
            "border",
            styles.border
          )}>
            <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
            <p className={cn(
              "text-3xl font-mono font-bold",
              styles.text,
              urgency === "overdue" && "animate-pulse"
            )}>
              {countdown.display}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              {format(new Date(reminder.reminder_datetime), "PPpp")}
            </p>
          </div>

          {/* Description */}
          {reminder.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{reminder.description}</p>
            </div>
          )}

          <Separator />

          {/* Lead Information */}
          {reminder.lead && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Lead Details</p>
              
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {reminder.lead.first_name} {reminder.lead.last_name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{getLanguageFlag(reminder.lead.language || "en")}</span>
                        <span>{reminder.lead.lead_status}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleViewLead}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>

                {/* Quick Contact Actions */}
                <div className="flex gap-2 mt-4">
                  {reminder.lead.phone_number && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(`tel:${reminder.lead!.phone_number}`)}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  )}
                  {reminder.lead.email && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(`mailto:${reminder.lead!.email}`)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                  )}
                  {reminder.lead.phone_number && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(`https://wa.me/${reminder.lead!.phone_number?.replace(/\D/g, "")}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Snooze indicator */}
          {reminder.snoozed_until && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <Clock className="h-4 w-4 inline mr-2" />
              Snoozed until {format(new Date(reminder.snoozed_until), "PPp")}
            </div>
          )}
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button 
              className="flex-1"
              onClick={handleComplete}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Snooze
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onSnooze(reminder.id, 15)}>
                  15 minutes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSnooze(reminder.id, 30)}>
                  30 minutes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSnooze(reminder.id, 60)}>
                  1 hour
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSnooze(reminder.id, 240)}>
                  4 hours
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSnooze(reminder.id, 24 * 60)}>
                  Tomorrow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Reminder
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{reminder.title}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
