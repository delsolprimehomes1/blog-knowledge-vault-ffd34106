import React, { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Download, Columns, Eye, EyeOff } from "lucide-react";
import { useAgentLeadsTable, ColumnVisibility, AgentLead } from "@/hooks/useAgentLeadsTable";
import { useLeadsExport } from "@/hooks/useLeadsExport";
import { useTableNavigation } from "@/hooks/useKeyboardShortcuts";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { LeadsFilterBar } from "@/components/crm/LeadsFilterBar";
import { LeadsTable } from "@/components/crm/LeadsTable";
import { LeadsPagination } from "@/components/crm/LeadsPagination";
import { BulkActionsBar } from "@/components/crm/BulkActionsBar";
import { CreateReminderSheet } from "@/components/crm/calendar/CreateReminderSheet";
import { MobileLeadsList } from "@/components/crm/MobileLeadsList";
import { MobileFilterSheet } from "@/components/crm/MobileFilterSheet";

export default function AgentLeads() {
  const isMobile = useIsMobile();

  // Get current agent
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
  });

  const agentId = session?.user?.id || null;

  // Initialize table hook
  const {
    filteredLeads,
    paginatedLeads,
    isLoading,
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    sort,
    handleSort,
    selectedLeads,
    toggleSelectAll,
    toggleSelectLead,
    clearSelection,
    expandedRows,
    toggleExpandRow,
    visibleColumns,
    setVisibleColumns,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    updateLeadField,
    bulkUpdateStatus,
    bulkArchive,
    refetch,
  } = useAgentLeadsTable(agentId);

  // Schedule reminder state
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [selectedLeadForSchedule, setSelectedLeadForSchedule] = useState<AgentLead | null>(null);

  // Export hook
  const { exportToCsv } = useLeadsExport();

  // Keyboard navigation (desktop only)
  useTableNavigation({
    enabled: !isMobile && paginatedLeads.length > 0,
  });

  // Handle schedule reminder
  const handleScheduleReminder = useCallback((lead: AgentLead) => {
    setSelectedLeadForSchedule(lead);
    setScheduleSheetOpen(true);
  }, []);

  // Handle field update
  const handleUpdateField = useCallback(
    (leadId: string, field: string, value: any) => {
      updateLeadField.mutate({ leadId, field, value });
    },
    [updateLeadField]
  );

  // Handle bulk status update
  const handleBulkStatusUpdate = useCallback(
    (status: string) => {
      bulkUpdateStatus.mutate({
        leadIds: Array.from(selectedLeads),
        status,
      });
    },
    [selectedLeads, bulkUpdateStatus]
  );

  // Handle bulk archive
  const handleBulkArchive = useCallback(() => {
    bulkArchive.mutate(Array.from(selectedLeads));
  }, [selectedLeads, bulkArchive]);

  // Handle single archive
  const handleArchive = useCallback(
    (leadId: string) => {
      bulkArchive.mutate([leadId]);
    },
    [bulkArchive]
  );

  // Handle export
  const handleExport = useCallback(() => {
    exportToCsv(filteredLeads);
  }, [exportToCsv, filteredLeads]);

  // Column visibility toggle handler
  const toggleColumnVisibility = useCallback(
    (column: keyof ColumnVisibility, visible: boolean) => {
      setVisibleColumns((prev) => ({ ...prev, [column]: visible }));
    },
    [setVisibleColumns]
  );

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">My Leads</h1>
            <p className="text-muted-foreground text-sm">
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}{" "}
              {selectedLeads.size > 0 && (
                <span className="text-primary">
                  • {selectedLeads.size} selected
                </span>
              )}
            </p>
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Columns className="w-4 h-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(visibleColumns).map(([key, visible]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={visible}
                    onCheckedChange={(checked) =>
                      toggleColumnVisibility(
                        key as keyof ColumnVisibility,
                        checked
                      )
                    }
                  >
                    {visible ? (
                      <Eye className="w-3 h-3 mr-2" />
                    ) : (
                      <EyeOff className="w-3 h-3 mr-2" />
                    )}
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {/* Mobile actions */}
          <div className="flex sm:hidden items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="h-10 w-10"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile: Filter Sheet + Export */}
        {isMobile && (
          <div className="flex items-center gap-2">
            <MobileFilterSheet
              filters={filters}
              onFilterChange={updateFilter}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
            <Button
              variant="outline"
              size="lg"
              onClick={handleExport}
              className="h-12 gap-2"
            >
              <Download className="w-5 h-5" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Filter Bar */}
      {!isMobile && (
        <LeadsFilterBar
          filters={filters}
          onFilterChange={updateFilter}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedLeads.size}
        onClearSelection={clearSelection}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkArchive={handleBulkArchive}
        isUpdating={bulkUpdateStatus.isPending || bulkArchive.isPending}
      />

      {/* Mobile: Card List */}
      {isMobile ? (
        <MobileLeadsList
          leads={paginatedLeads}
          isLoading={isLoading}
          selectedLeads={selectedLeads}
          onToggleSelect={toggleSelectLead}
          onUpdateField={handleUpdateField}
          onArchive={handleArchive}
          onScheduleReminder={handleScheduleReminder}
        />
      ) : (
        /* Desktop: Table */
        <LeadsTable
          leads={paginatedLeads}
          isLoading={isLoading}
          selectedLeads={selectedLeads}
          expandedRows={expandedRows}
          visibleColumns={visibleColumns}
          sort={sort}
          onSort={handleSort}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelect={toggleSelectLead}
          onToggleExpand={toggleExpandRow}
          onUpdateField={handleUpdateField}
          onArchive={handleArchive}
          onScheduleReminder={handleScheduleReminder}
        />
      )}

      {/* Pagination */}
      <LeadsPagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredLeads.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {/* Schedule Reminder Sheet */}
      {agentId && (
        <CreateReminderSheet
          isOpen={scheduleSheetOpen}
          onClose={() => {
            setScheduleSheetOpen(false);
            setSelectedLeadForSchedule(null);
          }}
          agentId={agentId}
          leadId={selectedLeadForSchedule?.id}
          leadName={selectedLeadForSchedule ? `${selectedLeadForSchedule.first_name} ${selectedLeadForSchedule.last_name}` : undefined}
        />
      )}
    </div>
  );
}
