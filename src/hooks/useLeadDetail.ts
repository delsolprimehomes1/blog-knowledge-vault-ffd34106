import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type CrmLead = Database["public"]["Tables"]["crm_leads"]["Row"];

interface UseLeadDetailOptions {
  leadId: string | undefined;
  agentId: string | undefined;
}

export function useLeadDetail({ leadId, agentId }: UseLeadDetailOptions) {
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  // Fetch lead data
  const {
    data: lead,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["lead-detail", leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("id", leadId)
        .single();

      if (error) throw error;
      return data as CrmLead;
    },
    enabled: !!leadId,
  });

  // Real-time subscription for lead updates
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-detail-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "crm_leads",
          filter: `id=eq.${leadId}`,
        },
        (payload) => {
          queryClient.setQueryData(["lead-detail", leadId], payload.new as CrmLead);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [leadId, queryClient]);

  // Start inline editing
  const startEdit = useCallback((field: string, currentValue: unknown) => {
    setEditingField(field);
    setEditValue(currentValue);
  }, []);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue(null);
  }, []);

  // Update lead field mutation
  const updateFieldMutation = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: string;
      value: unknown;
    }) => {
      if (!leadId) throw new Error("No lead ID");

      const { error } = await supabase
        .from("crm_leads")
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;
      return { field, value };
    },
    onMutate: async ({ field, value }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["lead-detail", leadId] });

      // Snapshot previous value
      const previousLead = queryClient.getQueryData<CrmLead>(["lead-detail", leadId]);

      // Optimistically update
      if (previousLead) {
        queryClient.setQueryData(["lead-detail", leadId], {
          ...previousLead,
          [field]: value,
        });
      }

      return { previousLead };
    },
    onSuccess: () => {
      setEditingField(null);
      setEditValue(null);
      toast.success("Updated successfully", { icon: "✓" });
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousLead) {
        queryClient.setQueryData(["lead-detail", leadId], context.previousLead);
      }
      toast.error("Failed to update");
      console.error("Update error:", error);
    },
  });

  // Save current edit
  const saveEdit = useCallback(
    async (field: string) => {
      if (editValue === undefined || editValue === null) return;
      setSaving(true);
      try {
        await updateFieldMutation.mutateAsync({ field, value: editValue });
      } finally {
        setSaving(false);
      }
    },
    [editValue, updateFieldMutation]
  );

  // Quick update (for selects that save immediately)
  const quickUpdate = useCallback(
    async (field: string, value: unknown) => {
      setSaving(true);
      try {
        await updateFieldMutation.mutateAsync({ field, value });
      } finally {
        setSaving(false);
      }
    },
    [updateFieldMutation]
  );

  // Archive lead
  const archiveMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!leadId) throw new Error("No lead ID");

      const { error } = await supabase
        .from("crm_leads")
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_reason: reason || "Archived by agent",
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead archived");
      queryClient.invalidateQueries({ queryKey: ["agent-leads-table"] });
    },
    onError: () => {
      toast.error("Failed to archive lead");
    },
  });

  // Log contact (updates last_contact_at and total_contacts)
  const logContactMutation = useMutation({
    mutationFn: async () => {
      if (!leadId || !lead) throw new Error("No lead");

      const { error } = await supabase
        .from("crm_leads")
        .update({
          last_contact_at: new Date().toISOString(),
          total_contacts: (lead.total_contacts || 0) + 1,
          first_contact_at: lead.first_contact_at || new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
    },
  });

  return {
    // Data
    lead,
    isLoading,
    error,
    refetch,

    // Inline editing state
    editingField,
    editValue,
    setEditValue,
    saving,

    // Inline editing actions
    startEdit,
    cancelEdit,
    saveEdit,
    quickUpdate,

    // Mutations
    updateField: updateFieldMutation.mutate,
    archiveLead: archiveMutation.mutate,
    logContact: logContactMutation.mutate,
  };
}
