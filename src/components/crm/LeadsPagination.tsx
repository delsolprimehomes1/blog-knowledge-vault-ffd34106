import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LeadsPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function LeadsPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: LeadsPaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
      {/* Left: Items info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing {startItem} to {endItem} of {totalItems} leads
        </span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right: Page controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum, index) => (
            <React.Fragment key={index}>
              {pageNum === "..." ? (
                <span className="px-2 text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum as number)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
