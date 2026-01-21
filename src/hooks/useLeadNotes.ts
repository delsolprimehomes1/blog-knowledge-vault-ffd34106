import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type CrmLeadNote = Database["public"]["Tables"]["crm_lead_notes"]["Row"];

interface UseLeadNotesOptions {
  leadId: string | undefined;
  agentId: string | undefined;
}

export function useLeadNotes({ leadId, agentId }: UseLeadNotesOptions) {
  const queryClient = useQueryClient();

  // Fetch notes
  const {
    data: notes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["lead-notes", leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from("crm_lead_notes")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CrmLeadNote[];
    },
    enabled: !!leadId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-notes-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crm_lead_notes",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            queryClient.setQueryData<CrmLeadNote[]>(
              ["lead-notes", leadId],
              (old) => [payload.new as CrmLeadNote, ...(old || [])]
            );
          } else if (payload.eventType === "UPDATE") {
            queryClient.setQueryData<CrmLeadNote[]>(
              ["lead-notes", leadId],
              (old) =>
                old?.map((note) =>
                  note.id === payload.new.id ? (payload.new as CrmLeadNote) : note
                ) || []
            );
          } else if (payload.eventType === "DELETE") {
            queryClient.setQueryData<CrmLeadNote[]>(
              ["lead-notes", leadId],
              (old) => old?.filter((note) => note.id !== payload.old.id) || []
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [leadId, queryClient]);

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({
      noteText,
      noteType = "general",
    }: {
      noteText: string;
      noteType?: string;
    }) => {
      if (!leadId || !agentId) throw new Error("Missing lead or agent ID");

      const { data, error } = await supabase
        .from("crm_lead_notes")
        .insert({
          lead_id: leadId,
          agent_id: agentId,
          note_text: noteText,
          note_type: noteType,
          is_pinned: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", leadId] });
      toast.success("Note added");
    },
    onError: () => {
      toast.error("Failed to add note");
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({
      noteId,
      noteText,
    }: {
      noteId: string;
      noteText: string;
    }) => {
      const { error } = await supabase
        .from("crm_lead_notes")
        .update({
          note_text: noteText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", leadId] });
      toast.success("Note updated");
    },
    onError: () => {
      toast.error("Failed to update note");
    },
  });

  // Toggle pin mutation
  const togglePinMutation = useMutation({
    mutationFn: async (noteId: string) => {
      // Get current pin state
      const note = notes.find((n) => n.id === noteId);
      if (!note) throw new Error("Note not found");

      const { error } = await supabase
        .from("crm_lead_notes")
        .update({ is_pinned: !note.is_pinned })
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", leadId] });
    },
    onError: () => {
      toast.error("Failed to pin note");
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("crm_lead_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", leadId] });
      toast.success("Note deleted");
    },
    onError: () => {
      toast.error("Failed to delete note");
    },
  });

  // Get pinned notes
  const pinnedNotes = notes.filter((n) => n.is_pinned);

  // Add note helper
  const addNote = useCallback(
    (noteText: string, noteType?: string) =>
      addNoteMutation.mutate({ noteText, noteType }),
    [addNoteMutation]
  );

  return {
    // Data
    notes,
    pinnedNotes,
    isLoading,
    error,
    refetch,

    // Actions
    addNote,
    updateNote: updateNoteMutation.mutate,
    togglePin: togglePinMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    isAdding: addNoteMutation.isPending,
  };
}
