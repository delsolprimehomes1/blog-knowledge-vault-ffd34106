import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  useCrmAgents,
  useUpdateAgentStatus,
  useDeleteAgent,
  CrmAgent,
} from "@/hooks/useCrmAgents";
import { getLanguageFlag } from "@/lib/crm-validations";
import { AddAgentModal } from "@/components/crm/AddAgentModal";
import { EditAgentModal } from "@/components/crm/EditAgentModal";
import { formatDistanceToNow } from "date-fns";
import { Plus, Search, Pencil, Trash2, Eye, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AgentManagement() {
  const navigate = useNavigate();
  const { data: agents, isLoading } = useCrmAgents();
  const updateStatus = useUpdateAgentStatus();
  const deleteAgent = useDeleteAgent();

  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<CrmAgent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<CrmAgent | null>(null);

  const filteredAgents = agents?.filter((agent) => {
    const search = searchQuery.toLowerCase();
    return (
      agent.first_name.toLowerCase().includes(search) ||
      agent.last_name.toLowerCase().includes(search) ||
      agent.email.toLowerCase().includes(search)
    );
  });

  const handleEditClick = (agent: CrmAgent) => {
    setSelectedAgent(agent);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (agent: CrmAgent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (agentToDelete) {
      await deleteAgent.mutateAsync(agentToDelete.id);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Never";
    return formatDistanceToNow(new Date(lastLogin), { addSuffix: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Agent Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your CRM agents and their permissions
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Agent
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredAgents?.length ?? 0} agents found
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>Active Leads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Accepting</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents?.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">
                        {agent.first_name} {agent.last_name}
                        {agent.role === "admin" && (
                          <Badge variant="secondary" className="ml-2">
                            Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {agent.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {agent.languages.map((lang) => (
                            <span key={lang} className="text-lg" title={lang}>
                              {getLanguageFlag(lang)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {agent.current_lead_count} / {agent.max_active_leads}
                          </div>
                          <Progress
                            value={
                              (agent.current_lead_count / agent.max_active_leads) *
                              100
                            }
                            className="h-1.5 w-20"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={agent.is_active}
                          onCheckedChange={(checked) =>
                            updateStatus.mutate({
                              id: agent.id,
                              field: "is_active",
                              value: checked,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={agent.accepts_new_leads}
                          onCheckedChange={(checked) =>
                            updateStatus.mutate({
                              id: agent.id,
                              field: "accepts_new_leads",
                              value: checked,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastLogin(agent.last_login)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              navigate(`/crm/admin/agents/${agent.id}`)
                            }
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(agent)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(agent)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgents?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No agents found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddAgentModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <EditAgentModal
        agent={selectedAgent}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {agentToDelete?.first_name} {agentToDelete?.last_name}
              </strong>
              ? This will archive all their assigned leads and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAgent.isPending}
            >
              {deleteAgent.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Agent"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
