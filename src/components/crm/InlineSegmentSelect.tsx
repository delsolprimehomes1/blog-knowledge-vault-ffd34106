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
  ALL_SEGMENTS,
  formatSegment,
  getSegmentStyle,
} from "@/lib/crm-conditional-styles";

interface InlineSegmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function InlineSegmentSelect({
  value,
  onChange,
  disabled = false,
}: InlineSegmentSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 w-auto">
        <SelectValue>
          <Badge className={cn("text-xs cursor-pointer", getSegmentStyle(value))}>
            {formatSegment(value)}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ALL_SEGMENTS.map((segment) => (
          <SelectItem key={segment} value={segment}>
            <Badge className={cn("text-xs", getSegmentStyle(segment))}>
              {formatSegment(segment)}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
