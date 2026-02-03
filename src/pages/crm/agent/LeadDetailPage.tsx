import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Hooks
import { useLeadDetail } from "@/hooks/useLeadDetail";
import { useLeadActivities } from "@/hooks/useLeadActivities";
import { useLeadNotes } from "@/hooks/useLeadNotes";

// Components
import { LeadDetailHeader } from "@/components/crm/detail/LeadDetailHeader";
import { ContactInfoCard } from "@/components/crm/detail/ContactInfoCard";
import { PropertyCriteriaCard } from "@/components/crm/detail/PropertyCriteriaCard";
import { EmmaConversationCard } from "@/components/crm/detail/EmmaConversationCard";
import { ActivityTimeline } from "@/components/crm/detail/ActivityTimeline";
import { LeadSourceCard, AssignmentCard, FormSubmissionCard } from "@/components/crm/detail/LeadSourceCard";
import { QuickNotesCard } from "@/components/crm/detail/QuickNotesCard";
import { QuickActionButtons } from "@/components/crm/activities/QuickActionButtons";
import { AdminLeadActions } from "@/components/crm/admin/AdminLeadActions";
import { SalestrailCallsCard } from "@/components/crm/detail/SalestrailCallsCard";

export default function LeadDetailPage() {
  const { id: leadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get agent info
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });
  const agentId = session?.user?.id;

  // Get agent name
  const { data: agentData } = useQuery({
    queryKey: ["agent-profile", agentId],
    queryFn: async () => {
      if (!agentId) return null;
      const { data } = await supabase
        .from("crm_agents")
        .select("first_name, last_name")
        .eq("id", agentId)
        .single();
      return data;
    },
    enabled: !!agentId,
  });
  const agentName = agentData?.first_name || "Agent";

  // Lead data hook
  const {
    lead,
    isLoading,
    editingField,
    editValue,
    setEditValue,
    saving,
    startEdit,
    cancelEdit,
    saveEdit,
    quickUpdate,
    archiveLead,
    logContact,
  } = useLeadDetail({ leadId, agentId });

  // Activities hook
  const {
    activities,
    pendingCallbacks,
    createActivity,
    completeCallback,
  } = useLeadActivities({ leadId, agentId });

  // Notes hook
  const {
    notes,
    pinnedNotes,
    isAdding,
    addNote,
    togglePin,
    deleteNote,
  } = useLeadNotes({ leadId, agentId });

  // Action handlers
  const handleCall = useCallback(() => {
    if (lead?.phone_number) {
      window.location.href = `tel:${lead.phone_number}`;
      logContact();
    }
  }, [lead, logContact]);

  const handleEmail = useCallback(() => {
    if (lead?.email) {
      window.location.href = `mailto:${lead.email}`;
      logContact();
    }
  }, [lead, logContact]);

  const handleWhatsApp = useCallback(() => {
    if (lead?.full_phone || lead?.phone_number) {
      const phone = lead.full_phone || lead.phone_number;
      const message = encodeURIComponent(
        `Hello ${lead.first_name}, I wanted to follow up on your property inquiry.`
      );
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${message}`, "_blank");
      logContact();
    }
  }, [lead, logContact]);

  const handleArchive = useCallback(() => {
    if (confirm("Are you sure you want to archive this lead?")) {
      archiveLead("Archived by agent");
      navigate("/crm/agent/leads");
    }
  }, [archiveLead, navigate]);

  const handleUpdateLeadStatus = useCallback((status: string) => {
    if (lead) {
      quickUpdate("lead_status", status);
    }
  }, [lead, quickUpdate]);

  const handleAddNote = useCallback((text: string, isPinned: boolean) => {
    addNote(text);
    // Note: isPinned would need additional logic in the hook
  }, [addNote]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Lead not found</p>
        <button
          className="text-primary hover:underline"
          onClick={() => navigate("/crm/agent/leads")}
        >
          Back to Leads
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <LeadDetailHeader
        lead={lead}
        editingField={editingField}
        editValue={editValue}
        setEditValue={setEditValue}
        saving={saving}
        startEdit={startEdit}
        cancelEdit={cancelEdit}
        saveEdit={saveEdit}
        quickUpdate={quickUpdate}
        onCall={handleCall}
        onEmail={handleEmail}
        onWhatsApp={handleWhatsApp}
        onArchive={handleArchive}
      />

      {/* Quick Action Buttons */}
      <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
        <QuickActionButtons
          lead={{
            id: lead.id,
            first_name: lead.first_name || "",
            last_name: lead.last_name || "",
            phone_number: lead.phone_number || "",
            full_phone: lead.full_phone || "",
            email: lead.email || "",
            language: lead.language || "en",
            lead_status: lead.lead_status || "new",
          }}
          agentName={agentName}
          onLogActivity={createActivity}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onAddNote={handleAddNote}
        />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="p-4 sm:p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <ContactInfoCard
              lead={lead}
              editingField={editingField}
              editValue={editValue}
              setEditValue={setEditValue}
              saving={saving}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              saveEdit={saveEdit}
              onCall={handleCall}
              onEmail={handleEmail}
            />

            <PropertyCriteriaCard
              lead={lead}
              editingField={editingField}
              editValue={editValue}
              setEditValue={setEditValue}
              saving={saving}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              saveEdit={saveEdit}
            />

            {/* Emma Conversation (conditional) */}
            {lead.lead_source === "Emma Chatbot" && (
              <EmmaConversationCard lead={lead} />
            )}

            {/* Form Submission (conditional) */}
            <FormSubmissionCard lead={lead} />

            {/* Activity Timeline */}
            <ActivityTimeline
              activities={activities}
              pendingCallbacks={pendingCallbacks}
              onCompleteCallback={completeCallback}
            />
          </div>

          {/* RIGHT COLUMN (1/3 width) */}
          <div className="space-y-6">
            {/* Admin Controls - only visible to admins */}
            <AdminLeadActions 
              leadId={lead.id}
              currentAgentId={lead.assigned_agent_id || undefined}
              onLeadUpdated={() => queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] })}
            />
            
            {/* Salestrail Call History */}
            <SalestrailCallsCard 
              leadId={lead.id}
              phoneNumber={lead.full_phone || lead.phone_number || undefined}
            />
            
            <LeadSourceCard lead={lead} />
            <AssignmentCard lead={lead} />
            <QuickNotesCard
              notes={notes}
              pinnedNotes={pinnedNotes}
              isAdding={isAdding}
              onAddNote={addNote}
              onTogglePin={togglePin}
              onDeleteNote={deleteNote}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
