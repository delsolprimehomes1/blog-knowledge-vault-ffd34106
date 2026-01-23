import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, User, Zap } from "lucide-react";
import { useCrmAgents } from "@/hooks/useCrmAgents";
import { 
  useRoutingRule,
  useCreateRoutingRule, 
  useUpdateRoutingRule,
  CreateRoutingRulePayload 
} from "@/hooks/useRoutingRules";

const LANGUAGES = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "fr", flag: "🇫🇷", name: "French" },
  { code: "fi", flag: "🇫🇮", name: "Finnish" },
  { code: "pl", flag: "🇵🇱", name: "Polish" },
  { code: "nl", flag: "🇳🇱", name: "Dutch" },
  { code: "de", flag: "🇩🇪", name: "German" },
  { code: "es", flag: "🇪🇸", name: "Spanish" },
  { code: "sv", flag: "🇸🇪", name: "Swedish" },
  { code: "da", flag: "🇩🇰", name: "Danish" },
  { code: "hu", flag: "🇭🇺", name: "Hungarian" },
];

const LEAD_SOURCES = [
  { value: "Emma Chatbot", label: "💬 Emma Chatbot" },
  { value: "Landing Form", label: "📄 Landing Form" },
  { value: "Property Inquiry", label: "🏠 Property Inquiry" },
  { value: "Brochure Download", label: "📥 Brochure Download" },
  { value: "Website", label: "🌐 Website" },
];

const PAGE_TYPES = [
  { value: "landing", label: "🎯 Landing Page" },
  { value: "city", label: "🏙️ City Page" },
  { value: "property", label: "🏠 Property Page" },
];

const LEAD_SEGMENTS = [
  { value: "Hot", label: "🔥 Hot", color: "bg-red-100 text-red-800" },
  { value: "Warm", label: "☀️ Warm", color: "bg-orange-100 text-orange-800" },
  { value: "Cool", label: "❄️ Cool", color: "bg-blue-100 text-blue-800" },
  { value: "Cold", label: "🧊 Cold", color: "bg-gray-100 text-gray-800" },
];

const BUDGET_RANGES = [
  "€200K-€500K",
  "€500K-€1M",
  "€1M-€2M",
  "€2M-€5M",
  "€5M+",
];

const PROPERTY_TYPES = [
  "Villa",
  "Apartment",
  "Penthouse",
  "Townhouse",
  "Plot",
];

const TIMEFRAMES = [
  { value: "within_6_months", label: "🔥 Within 6 months (Urgent)" },
  { value: "within_1_year", label: "⭐ Within 1 year" },
  { value: "within_2_years", label: "📅 Within 2 years" },
  { value: "just_exploring", label: "👀 Just exploring" },
];

interface CreateRoutingRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRuleId?: string | null;
}

export function CreateRoutingRuleDialog({
  open,
  onOpenChange,
  editRuleId,
}: CreateRoutingRuleDialogProps) {
  const { data: agents } = useCrmAgents();
  const { data: editRule, isLoading: editLoading } = useRoutingRule(editRuleId || "");
  const createRule = useCreateRoutingRule();
  const updateRule = useUpdateRoutingRule();

  // Form state
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [priority, setPriority] = useState(0);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedPageTypes, setSelectedPageTypes] = useState<string[]>([]);
  const [pageSlugs, setPageSlugs] = useState("");
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>([]);
  const [assignToAgentId, setAssignToAgentId] = useState("");
  const [fallbackToBroadcast, setFallbackToBroadcast] = useState(true);

  // Reset form when dialog opens/closes or edit rule changes
  useEffect(() => {
    if (!open) {
      resetForm();
    } else if (editRule) {
      setRuleName(editRule.rule_name);
      setRuleDescription(editRule.rule_description || "");
      setPriority(editRule.priority);
      setSelectedLanguages(editRule.match_language || []);
      setSelectedSources(editRule.match_lead_source || []);
      setSelectedPageTypes(editRule.match_page_type || []);
      setPageSlugs((editRule.match_page_slug || []).join(", "));
      setSelectedSegments(editRule.match_lead_segment || []);
      setSelectedBudgets(editRule.match_budget_range || []);
      setSelectedPropertyTypes(editRule.match_property_type || []);
      setSelectedTimeframes(editRule.match_timeframe || []);
      setAssignToAgentId(editRule.assign_to_agent_id);
      setFallbackToBroadcast(editRule.fallback_to_broadcast);
    }
  }, [open, editRule]);

  const resetForm = () => {
    setRuleName("");
    setRuleDescription("");
    setPriority(0);
    setSelectedLanguages([]);
    setSelectedSources([]);
    setSelectedPageTypes([]);
    setPageSlugs("");
    setSelectedSegments([]);
    setSelectedBudgets([]);
    setSelectedPropertyTypes([]);
    setSelectedTimeframes([]);
    setAssignToAgentId("");
    setFallbackToBroadcast(true);
  };

  const toggleArray = <T,>(arr: T[], item: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    setter(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  const handleSubmit = () => {
    if (!ruleName.trim() || !assignToAgentId) return;

    const payload: CreateRoutingRulePayload = {
      rule_name: ruleName.trim(),
      rule_description: ruleDescription.trim() || undefined,
      priority,
      match_language: selectedLanguages,
      match_lead_source: selectedSources,
      match_page_type: selectedPageTypes,
      match_page_slug: pageSlugs ? pageSlugs.split(",").map(s => s.trim()).filter(Boolean) : [],
      match_lead_segment: selectedSegments,
      match_budget_range: selectedBudgets,
      match_property_type: selectedPropertyTypes,
      match_timeframe: selectedTimeframes,
      assign_to_agent_id: assignToAgentId,
      fallback_to_broadcast: fallbackToBroadcast,
    };

    if (editRuleId) {
      updateRule.mutate({ id: editRuleId, ...payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createRule.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const selectedAgent = agents?.find(a => a.id === assignToAgentId);
  const isSubmitting = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editRuleId ? "Edit Routing Rule" : "Create Routing Rule"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="space-y-6 pb-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name *</Label>
                  <Input
                    id="rule-name"
                    placeholder="e.g., French Luxury Properties"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min={0}
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher = checked first
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe when this rule should apply..."
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Matching Criteria */}
            <Tabs defaultValue="language" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="language">Language</TabsTrigger>
                <TabsTrigger value="source">Source</TabsTrigger>
                <TabsTrigger value="quality">Lead Quality</TabsTrigger>
                <TabsTrigger value="property">Property</TabsTrigger>
              </TabsList>

              <TabsContent value="language" className="space-y-4 pt-4">
                <Label>Match Languages (select one or more)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {LANGUAGES.map((lang) => (
                    <Button
                      key={lang.code}
                      type="button"
                      variant={selectedLanguages.includes(lang.code) ? "default" : "outline"}
                      onClick={() => toggleArray(selectedLanguages, lang.code, setSelectedLanguages)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.code.toUpperCase()}</span>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Lead must be in one of these languages to match
                </p>
              </TabsContent>

              <TabsContent value="source" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Lead Source</Label>
                    <div className="space-y-2">
                      {LEAD_SOURCES.map((source) => (
                        <div key={source.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`source-${source.value}`}
                            checked={selectedSources.includes(source.value)}
                            onCheckedChange={() => toggleArray(selectedSources, source.value, setSelectedSources)}
                          />
                          <label htmlFor={`source-${source.value}`} className="text-sm cursor-pointer">
                            {source.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Page Type</Label>
                    <div className="space-y-2">
                      {PAGE_TYPES.map((type) => (
                        <div key={type.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`page-${type.value}`}
                            checked={selectedPageTypes.includes(type.value)}
                            onCheckedChange={() => toggleArray(selectedPageTypes, type.value, setSelectedPageTypes)}
                          />
                          <label htmlFor={`page-${type.value}`} className="text-sm cursor-pointer">
                            {type.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="page-slugs">Specific Page Slugs (Optional)</Label>
                    <Input
                      id="page-slugs"
                      placeholder="e.g., marbella, malaga, estepona (comma-separated)"
                      value={pageSlugs}
                      onChange={(e) => setPageSlugs(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to match all pages of selected types
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="quality" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Lead Segment</Label>
                    <div className="flex flex-wrap gap-2">
                      {LEAD_SEGMENTS.map((seg) => (
                        <Badge
                          key={seg.value}
                          variant={selectedSegments.includes(seg.value) ? "default" : "outline"}
                          className={`cursor-pointer ${selectedSegments.includes(seg.value) ? "" : seg.color}`}
                          onClick={() => toggleArray(selectedSegments, seg.value, setSelectedSegments)}
                        >
                          {seg.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Budget Range</Label>
                    <div className="flex flex-wrap gap-2">
                      {BUDGET_RANGES.map((budget) => (
                        <Badge
                          key={budget}
                          variant={selectedBudgets.includes(budget) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleArray(selectedBudgets, budget, setSelectedBudgets)}
                        >
                          {budget}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Timeframe</Label>
                    <div className="space-y-2">
                      {TIMEFRAMES.map((tf) => (
                        <div key={tf.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tf-${tf.value}`}
                            checked={selectedTimeframes.includes(tf.value)}
                            onCheckedChange={() => toggleArray(selectedTimeframes, tf.value, setSelectedTimeframes)}
                          />
                          <label htmlFor={`tf-${tf.value}`} className="text-sm cursor-pointer">
                            {tf.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="property" className="space-y-4 pt-4">
                <div>
                  <Label className="mb-2 block">Property Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPES.map((type) => (
                      <Badge
                        key={type}
                        variant={selectedPropertyTypes.includes(type) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArray(selectedPropertyTypes, type, setSelectedPropertyTypes)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Assignment Target */}
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Assign To Agent *</Label>
                <Select value={assignToAgentId} onValueChange={setAssignToAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.filter(a => a.is_active).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{agent.first_name} {agent.last_name}</span>
                          <span className="text-muted-foreground">
                            ({agent.languages?.map((l: string) => l.toUpperCase()).join(", ")})
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {agent.current_lead_count}/{agent.max_active_leads}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Fallback to Broadcast</p>
                  <p className="text-xs text-muted-foreground">
                    If agent is unavailable/at capacity, broadcast to all eligible agents
                  </p>
                </div>
                <Switch
                  checked={fallbackToBroadcast}
                  onCheckedChange={setFallbackToBroadcast}
                />
              </div>

              <Alert>
                <Zap className="h-4 w-4" />
                <AlertTitle>Instant Assignment</AlertTitle>
                <AlertDescription>
                  When a lead matches this rule, it will be instantly assigned to{" "}
                  {selectedAgent ? `${selectedAgent.first_name} ${selectedAgent.last_name}` : "the selected agent"}.
                  No 15-minute claim window - direct assignment.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-auto flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!ruleName.trim() || !assignToAgentId || isSubmitting}
          >
            {isSubmitting ? "Saving..." : editRuleId ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
