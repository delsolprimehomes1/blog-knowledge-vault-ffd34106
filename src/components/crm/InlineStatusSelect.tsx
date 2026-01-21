import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ALL_STATUSES,
  formatStatus,
  getStatusBadgeClass,
} from "@/lib/crm-conditional-styles";

interface InlineStatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function InlineStatusSelect({
  value,
  onChange,
  disabled = false,
}: InlineStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 w-auto">
        <SelectValue>
          <Badge
            variant="outline"
            className={cn("text-xs cursor-pointer", getStatusBadgeClass(value))}
          >
            {formatStatus(value)}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            <Badge
              variant="outline"
              className={cn("text-xs", getStatusBadgeClass(status))}
            >
              {formatStatus(status)}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
