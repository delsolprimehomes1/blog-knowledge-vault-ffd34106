import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgentLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string;
  language: string;
  lead_source: string;
  lead_source_detail: string | null;
  page_type: string | null;
  page_url: string | null;
  lead_segment: string;
  lead_status: string;
  lead_priority: string;
  budget_range: string | null;
  location_preference: string[] | null;
  property_type: string[] | null;
  timeframe: string | null;
  current_lead_score: number;
  assigned_agent_id: string;
  created_at: string;
  last_contact_at: string | null;
  days_since_last_contact: number | null;
  total_contacts: number;
  qa_pairs: any[] | null;
  archived: boolean;
  archived_at: string | null;
}

export interface FilterState {
  search: string;
  status: string[];
  language: string[];
  segment: string[];
  priority: string[];
  source: string[];
  timeframe: string[];
}

export interface SortState {
  column: string;
  direction: "asc" | "desc";
}

export interface ColumnVisibility {
  priority: boolean;
  name: boolean;
  contact: boolean;
  language: boolean;
  segment: boolean;
  budget: boolean;
  location: boolean;
  source: boolean;
  score: boolean;
  lastContact: boolean;
  status: boolean;
  actions: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  status: [],
  language: [],
  segment: [],
  priority: [],
  source: [],
  timeframe: [],
};

const DEFAULT_COLUMNS: ColumnVisibility = {
  priority: true,
  name: true,
  contact: true,
  language: true,
  segment: true,
  budget: true,
  location: true,
  source: true,
  score: true,
  lastContact: true,
  status: true,
  actions: true,
};

export function useAgentLeadsTable(agentId: string | null) {
  const queryClient = useQueryClient();
  
  // State
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>({ column: "created_at", direction: "desc" });
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>(DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fetch leads
  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["agent-leads-table", agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("assigned_agent_id", agentId)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AgentLead[];
    },
    enabled: !!agentId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`agent-leads-list-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_leads",
          filter: `assigned_agent_id=eq.${agentId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            queryClient.invalidateQueries({ queryKey: ["agent-leads-table"] });
            toast.info(`New lead assigned: ${(payload.new as AgentLead).first_name}`);
          } else if (payload.eventType === "UPDATE") {
            queryClient.setQueryData(
              ["agent-leads-table", agentId],
              (old: AgentLead[] | undefined) =>
                old?.map((lead) =>
                  lead.id === payload.new.id ? (payload.new as AgentLead) : lead
                )
            );
          } else if (payload.eventType === "DELETE") {
            queryClient.setQueryData(
              ["agent-leads-table", agentId],
              (old: AgentLead[] | undefined) =>
                old?.filter((lead) => lead.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [agentId, queryClient]);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.first_name.toLowerCase().includes(search) ||
          lead.last_name.toLowerCase().includes(search) ||
          lead.email?.toLowerCase().includes(search) ||
          lead.phone_number.includes(search)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter((lead) => filters.status.includes(lead.lead_status));
    }

    // Language filter
    if (filters.language.length > 0) {
      filtered = filtered.filter((lead) => filters.language.includes(lead.language));
    }

    // Segment filter
    if (filters.segment.length > 0) {
      filtered = filtered.filter((lead) => filters.segment.includes(lead.lead_segment));
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter((lead) => filters.priority.includes(lead.lead_priority));
    }

    // Source filter
    if (filters.source.length > 0) {
      filtered = filtered.filter((lead) => filters.source.includes(lead.lead_source));
    }

    // Timeframe filter
    if (filters.timeframe.length > 0) {
      filtered = filtered.filter(
        (lead) => lead.timeframe && filters.timeframe.includes(lead.timeframe)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sort.column as keyof AgentLead];
      let bVal: any = b[sort.column as keyof AgentLead];

      // Handle null values
      if (aVal === null) aVal = "";
      if (bVal === null) bVal = "";

      // Handle dates
      if (sort.column.includes("at") || sort.column.includes("date")) {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      // Handle numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const comparison = String(aVal).localeCompare(String(bVal));
      return sort.direction === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [leads, filters, sort]);

  // Pagination
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredLeads.slice(start, end);
  }, [filteredLeads, page, pageSize]);

  const totalPages = Math.ceil(filteredLeads.length / pageSize);

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedLeads.size === paginatedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(paginatedLeads.map((lead) => lead.id)));
    }
  }, [selectedLeads.size, paginatedLeads]);

  const toggleSelectLead = useCallback((leadId: string) => {
    setSelectedLeads((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(leadId)) {
        newSelected.delete(leadId);
      } else {
        newSelected.add(leadId);
      }
      return newSelected;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeads(new Set());
  }, []);

  // Expand row handler
  const toggleExpandRow = useCallback((leadId: string) => {
    setExpandedRows((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(leadId)) {
        newExpanded.delete(leadId);
      } else {
        newExpanded.add(leadId);
      }
      return newExpanded;
    });
  }, []);

  // Sort handler
  const handleSort = useCallback((column: string) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  // Update filter
  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1); // Reset to first page on filter change
    },
    []
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.status.length > 0 ||
      filters.language.length > 0 ||
      filters.segment.length > 0 ||
      filters.priority.length > 0 ||
      filters.source.length > 0 ||
      filters.timeframe.length > 0
    );
  }, [filters]);

  // Inline edit mutation
  const updateLeadField = useMutation({
    mutationFn: async ({ leadId, field, value }: { leadId: string; field: string; value: any }) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({ [field]: value })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        ["agent-leads-table", agentId],
        (old: AgentLead[] | undefined) =>
          old?.map((lead) =>
            lead.id === variables.leadId
              ? { ...lead, [variables.field]: variables.value }
              : lead
          )
      );
      toast.success("Lead updated");
    },
    onError: () => {
      toast.error("Failed to update lead");
    },
  });

  // Bulk status update mutation
  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ leadIds, status }: { leadIds: string[]; status: string }) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({ lead_status: status })
        .in("id", leadIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        ["agent-leads-table", agentId],
        (old: AgentLead[] | undefined) =>
          old?.map((lead) =>
            variables.leadIds.includes(lead.id)
              ? { ...lead, lead_status: variables.status }
              : lead
          )
      );
      clearSelection();
      toast.success(`${variables.leadIds.length} leads updated`);
    },
    onError: () => {
      toast.error("Failed to update leads");
    },
  });

  // Bulk archive mutation
  const bulkArchive = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({ archived: true, archived_at: new Date().toISOString() })
        .in("id", leadIds);

      if (error) throw error;
    },
    onSuccess: (_, leadIds) => {
      queryClient.setQueryData(
        ["agent-leads-table", agentId],
        (old: AgentLead[] | undefined) => old?.filter((lead) => !leadIds.includes(lead.id))
      );
      clearSelection();
      toast.success(`${leadIds.length} leads archived`);
    },
    onError: () => {
      toast.error("Failed to archive leads");
    },
  });

  return {
    // Data
    leads,
    filteredLeads,
    paginatedLeads,
    isLoading,
    
    // Filters
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    
    // Sort
    sort,
    handleSort,
    
    // Selection
    selectedLeads,
    toggleSelectAll,
    toggleSelectLead,
    clearSelection,
    
    // Expand
    expandedRows,
    toggleExpandRow,
    
    // Columns
    visibleColumns,
    setVisibleColumns,
    
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    
    // Mutations
    updateLeadField,
    bulkUpdateStatus,
    bulkArchive,
    
    // Refresh
    refetch,
  };
}
