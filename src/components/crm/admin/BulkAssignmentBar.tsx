import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, UserPlus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EligibleAgent } from "@/hooks/useAdminLeads";
import { motion, AnimatePresence } from "framer-motion";

interface BulkAssignmentBarProps {
  selectedCount: number;
  agents: EligibleAgent[];
  onClearSelection: () => void;
  onBulkAssign: (agentId: string) => void;
  onBulkDelete: () => void;
  isAssigning?: boolean;
  isDeleting?: boolean;
}

export function BulkAssignmentBar({
  selectedCount,
  agents,
  onClearSelection,
  onBulkAssign,
  onBulkDelete,
  isAssigning = false,
  isDeleting = false,
}: BulkAssignmentBarProps) {
  const [selectedAgent, setSelectedAgent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedCount === 0) return null;

  const eligibleAgents = agents.filter(
    (a) => a.current_lead_count + selectedCount <= a.max_active_leads
  );

  const handleBulkAssign = () => {
    if (selectedAgent) {
      onBulkAssign(selectedAgent);
      setSelectedAgent("");
    }
  };

  const handleConfirmDelete = () => {
    onBulkDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {selectedCount} lead{selectedCount !== 1 ? "s" : ""} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Selection
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[280px] bg-background">
                  <SelectValue placeholder="Select agent to assign..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleAgents.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No agents have capacity for {selectedCount} leads
                    </div>
                  ) : (
                    eligibleAgents.map((agent) => {
                      const capacityPercent =
                        (agent.current_lead_count / agent.max_active_leads) * 100;
                      const newCapacity =
                        ((agent.current_lead_count + selectedCount) /
                          agent.max_active_leads) *
                        100;

                      return (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {agent.first_name[0]}
                                  {agent.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {agent.first_name} {agent.last_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {agent.current_lead_count}/{agent.max_active_leads}
                                <span className="text-primary ml-1">
                                  → {agent.current_lead_count + selectedCount}
                                </span>
                              </span>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden relative">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all absolute",
                                    capacityPercent < 50 && "bg-green-500",
                                    capacityPercent >= 50 &&
                                      capacityPercent < 80 &&
                                      "bg-amber-500",
                                    capacityPercent >= 80 && "bg-red-500"
                                  )}
                                  style={{ width: `${capacityPercent}%` }}
                                />
                                <div
                                  className="h-full rounded-full bg-primary/50 absolute"
                                  style={{ width: `${newCapacity}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>

              <Button
                onClick={handleBulkAssign}
                disabled={!selectedAgent || isAssigning}
                className="gap-2"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Bulk Assign
                  </>
                )}
              </Button>

              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Lead{selectedCount !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              {selectedCount} lead{selectedCount !== 1 ? "s" : ""} and all associated
              activities, notes, and notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
