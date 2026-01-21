import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Shield,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { getLanguageFlag } from "@/lib/crm-conditional-styles";

interface RoundConfig {
  id: string;
  language: string;
  round_number: number;
  agent_ids: string[];
  claim_window_minutes: number;
  is_admin_fallback: boolean;
  is_active: boolean;
  created_at: string;
}

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  languages: string[];
  role: string;
  is_active: boolean;
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "nl", name: "Dutch" },
  { code: "fi", name: "Finnish" },
  { code: "pl", name: "Polish" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "hu", name: "Hungarian" },
];

export default function RoundRobinConfig() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RoundConfig | null>(null);
  const [formData, setFormData] = useState({
    language: "",
    round_number: 1,
    agent_ids: [] as string[],
    claim_window_minutes: 5,
    is_admin_fallback: false,
    is_active: true,
  });

  // Fetch round robin configs
  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ["round-robin-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_round_robin_config")
        .select("*")
        .order("language")
        .order("round_number");

      if (error) throw error;
      return data as RoundConfig[];
    },
  });

  // Fetch all agents
  const { data: agents } = useQuery({
    queryKey: ["crm-agents-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_agents")
        .select("id, first_name, last_name, email, languages, role, is_active")
        .eq("is_active", true)
        .order("first_name");

      if (error) throw error;
      return data as Agent[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        // Update
        const { error } = await supabase
          .from("crm_round_robin_config")
          .update({
            language: data.language,
            round_number: data.round_number,
            agent_ids: data.agent_ids,
            claim_window_minutes: data.claim_window_minutes,
            is_admin_fallback: data.is_admin_fallback,
            is_active: data.is_active,
          })
          .eq("id", data.id);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from("crm_round_robin_config")
          .insert({
            language: data.language,
            round_number: data.round_number,
            agent_ids: data.agent_ids,
            claim_window_minutes: data.claim_window_minutes,
            is_admin_fallback: data.is_admin_fallback,
            is_active: data.is_active,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["round-robin-configs"] });
      setIsDialogOpen(false);
      setEditingConfig(null);
      resetForm();
      toast.success(editingConfig ? "Round updated successfully" : "Round created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_round_robin_config")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["round-robin-configs"] });
      toast.success("Round deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      language: "",
      round_number: 1,
      agent_ids: [],
      claim_window_minutes: 5,
      is_admin_fallback: false,
      is_active: true,
    });
  };

  const handleEdit = (config: RoundConfig) => {
    setEditingConfig(config);
    setFormData({
      language: config.language,
      round_number: config.round_number,
      agent_ids: config.agent_ids || [],
      claim_window_minutes: config.claim_window_minutes,
      is_admin_fallback: config.is_admin_fallback,
      is_active: config.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.language) {
      toast.error("Please select a language");
      return;
    }
    if (formData.agent_ids.length === 0) {
      toast.error("Please select at least one agent");
      return;
    }

    // Check for duplicate when creating new (not editing)
    if (!editingConfig) {
      const existingRound = configs?.find(
        (c) => c.language === formData.language && c.round_number === formData.round_number
      );
      if (existingRound) {
        toast.error(
          `Round ${formData.round_number} for ${LANGUAGES.find(l => l.code === formData.language)?.name || formData.language.toUpperCase()} already exists. Please edit the existing round or choose a different round number.`
        );
        return;
      }
    }

    saveMutation.mutate({
      ...formData,
      id: editingConfig?.id,
    });
  };

  const toggleAgentSelection = (agentId: string) => {
    setFormData((prev) => ({
      ...prev,
      agent_ids: prev.agent_ids.includes(agentId)
        ? prev.agent_ids.filter((id) => id !== agentId)
        : [...prev.agent_ids, agentId],
    }));
  };

  // Group configs by language
  const configsByLanguage = configs?.reduce((acc, config) => {
    if (!acc[config.language]) {
      acc[config.language] = [];
    }
    acc[config.language].push(config);
    return acc;
  }, {} as Record<string, RoundConfig[]>) || {};

  // Get agent name by ID
  const getAgentName = (agentId: string) => {
    const agent = agents?.find((a) => a.id === agentId);
    return agent ? `${agent.first_name} ${agent.last_name}` : "Unknown";
  };

  // Filter agents by selected language
  const filteredAgents = agents?.filter(
    (agent) => !formData.language || agent.languages?.includes(formData.language)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Round Robin Configuration</h1>
          <p className="text-muted-foreground">
            Configure lead assignment rounds per language
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingConfig(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Round
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Edit Round" : "Add New Round"}
              </DialogTitle>
              <DialogDescription>
                Configure agents for a specific language and round
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => {
                      // Find the highest round number for this language and auto-increment
                      const existingRoundsForLanguage = configs?.filter(c => c.language === value) || [];
                      const maxRound = existingRoundsForLanguage.length > 0 
                        ? Math.max(...existingRoundsForLanguage.map(c => c.round_number))
                        : 0;
                      
                      setFormData((prev) => ({ 
                        ...prev, 
                        language: value, 
                        agent_ids: [],
                        round_number: editingConfig ? prev.round_number : maxRound + 1,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {getLanguageFlag(lang.code)} {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Round Number</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.round_number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        round_number: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                  {formData.language && !editingConfig && (
                    <p className="text-xs text-muted-foreground">
                      Existing rounds: {configs?.filter(c => c.language === formData.language)
                        .map(c => c.round_number)
                        .sort((a, b) => a - b)
                        .join(", ") || "None"}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Claim Window (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={formData.claim_window_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      claim_window_minutes: parseInt(e.target.value) || 5,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Agents</Label>
                <p className="text-sm text-muted-foreground">
                  Select agents who will compete for leads in this round
                </p>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {filteredAgents?.map((agent) => (
                    <div
                      key={agent.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        formData.agent_ids.includes(agent.id)
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleAgentSelection(agent.id)}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            formData.agent_ids.includes(agent.id)
                              ? "text-primary"
                              : "text-muted-foreground/30"
                          }`}
                        />
                        <span>
                          {agent.first_name} {agent.last_name}
                        </span>
                        {agent.role === "admin" && (
                          <Badge variant="secondary" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {agent.languages?.map((lang) => (
                          <span key={lang} className="text-sm">
                            {getLanguageFlag(lang)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!filteredAgents || filteredAgents.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {formData.language
                        ? "No agents found for this language"
                        : "Select a language first"}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Admin Fallback Round</Label>
                  <p className="text-sm text-muted-foreground">
                    If enabled, leads are auto-assigned here (no competition)
                  </p>
                </div>
                <Switch
                  checked={formData.is_admin_fallback}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_admin_fallback: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this round
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Round"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Configs by Language */}
      {configsLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading configurations...
          </CardContent>
        </Card>
      ) : Object.keys(configsByLanguage).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Round Robin Configs</h3>
            <p className="text-muted-foreground mb-4">
              Create round robin configurations to control lead assignment per language.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Round
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Object.entries(configsByLanguage).map(([language, rounds]) => (
            <Card key={language}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-2xl">{getLanguageFlag(language)}</span>
                  {LANGUAGES.find((l) => l.code === language)?.name || language.toUpperCase()}
                  <Badge variant="outline">{rounds.length} round{rounds.length > 1 ? "s" : ""}</Badge>
                </CardTitle>
                <CardDescription>
                  Lead assignment flow for {language.toUpperCase()} leads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rounds
                    .sort((a, b) => a.round_number - b.round_number)
                    .map((round, idx) => (
                      <div
                        key={round.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          !round.is_active ? "opacity-50" : ""
                        } ${round.is_admin_fallback ? "bg-orange-50 border-orange-200" : "bg-muted/30"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                            {round.round_number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                Round {round.round_number}
                              </span>
                              {round.is_admin_fallback && (
                                <Badge className="bg-orange-500">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Admin Fallback
                                </Badge>
                              )}
                              {!round.is_active && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {round.agent_ids?.length || 0} agent
                                {(round.agent_ids?.length || 0) !== 1 ? "s" : ""}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {round.claim_window_minutes} min
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {round.agent_ids?.map((agentId) => (
                                <Badge key={agentId} variant="outline" className="text-xs">
                                  {getAgentName(agentId)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(round)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Round {round.round_number}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the round configuration. Leads will skip this round.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(round.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {idx < rounds.length - 1 && (
                          <ArrowUpDown className="absolute right-1/2 -bottom-3 w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900">How Round Robin Works</p>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>New leads are broadcast to all agents in Round 1</li>
                <li>Agents compete to claim - first to click wins</li>
                <li>If unclaimed within the window, lead escalates to next round</li>
                <li>Admin fallback rounds auto-assign without competition</li>
                <li>Agents only see leads they can claim or own</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
