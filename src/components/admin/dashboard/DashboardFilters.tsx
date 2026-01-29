import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";

interface DashboardFiltersProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DashboardFilters({ onRefresh, isRefreshing }: DashboardFiltersProps) {
  const [dateRange, setDateRange] = useState("7d");

  const handleExport = () => {
    // Navigate to export page
    window.location.href = "/admin/export";
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
        Refresh
      </Button>

      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>
  );
}
