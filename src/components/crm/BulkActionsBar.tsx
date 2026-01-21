import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Archive, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ALL_STATUSES,
  formatStatus,
  getStatusBadgeClass,
} from "@/lib/crm-conditional-styles";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkArchive: () => void;
  isUpdating?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkArchive,
  isUpdating = false,
}: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="bg-primary text-primary-foreground rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Left: Selection info */}
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
                  {selectedCount} lead{selectedCount !== 1 ? "s" : ""} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear selection
                </Button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {/* Update Status Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isUpdating}
                      className="gap-2"
                    >
                      Update Status
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Set Status To</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ALL_STATUSES.filter((s) => s !== "new").map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => onBulkStatusUpdate(status)}
                      >
                        <Badge
                          variant="outline"
                          className={cn("mr-2 text-xs", getStatusBadgeClass(status))}
                        >
                          {formatStatus(status)}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Archive Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onBulkArchive}
                  disabled={isUpdating}
                  className="gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
