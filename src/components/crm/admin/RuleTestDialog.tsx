import { useState, useMemo } from "react";
import { FlaskConical, CheckCircle, AlertTriangle, User, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useRoutingRules, RoutingRule } from "@/hooks/useRoutingRules";

interface RuleTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LANGUAGE_OPTIONS = [
  { value: "en", label: "🇬🇧 English" },
  { value: "fr", label: "🇫🇷 French" },
  { value: "nl", label: "🇳🇱 Dutch" },
  { value: "de", label: "🇩🇪 German" },
  { value: "es", label: "🇪🇸 Spanish" },
  { value: "sv", label: "🇸🇪 Swedish" },
  { value: "da", label: "🇩🇰 Danish" },
  { value: "fi", label: "🇫🇮 Finnish" },
  { value: "pl", label: "🇵🇱 Polish" },
  { value: "hu", label: "🇭🇺 Hungarian" },
];

const BUDGET_OPTIONS = [
  { value: "€100K-€200K", label: "€100K - €200K" },
  { value: "€200K-€500K", label: "€200K - €500K" },
  { value: "€500K-€1M", label: "€500K - €1M" },
  { value: "€1M-€2M", label: "€1M - €2M" },
  { value: "€2M+", label: "€2M+" },
];

const SOURCE_OPTIONS = [
  { value: "emma_chatbot", label: "Emma Chatbot" },
  { value: "landing_form", label: "Landing Form" },
  { value: "property_inquiry", label: "Property Inquiry" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
];

const SEGMENT_OPTIONS = [
  { value: "hot", label: "🔥 Hot" },
  { value: "warm", label: "🌡️ Warm" },
  { value: "cool", label: "❄️ Cool" },
  { value: "cold", label: "🧊 Cold" },
];

const PAGE_TYPE_OPTIONS = [
  { value: "landing", label: "Landing Page" },
  { value: "city", label: "City Page" },
  { value: "property", label: "Property Page" },
  { value: "blog", label: "Blog Article" },
];

interface TestCriteria {
  language: string;
  budget_range: string;
  lead_source: string;
  lead_segment: string;
  page_type: string;
}

function ruleMatches(criteria: TestCriteria, rule: RoutingRule): boolean {
  // Empty array = no filter on that field (matches everything)
  
  // Check language
  if (rule.match_language?.length > 0 && !rule.match_language.includes(criteria.language)) {
    return false;
  }
  
  // Check budget range
  if (rule.match_budget_range?.length > 0 && criteria.budget_range && !rule.match_budget_range.includes(criteria.budget_range)) {
    return false;
  }
  
  // Check lead source
  if (rule.match_lead_source?.length > 0 && criteria.lead_source && !rule.match_lead_source.includes(criteria.lead_source)) {
    return false;
  }
  
  // Check lead segment
  if (rule.match_lead_segment?.length > 0 && criteria.lead_segment && !rule.match_lead_segment.includes(criteria.lead_segment)) {
    return false;
  }
  
  // Check page type
  if (rule.match_page_type?.length > 0 && criteria.page_type && !rule.match_page_type.includes(criteria.page_type)) {
    return false;
  }
  
  return true;
}

export function RuleTestDialog({ open, onOpenChange }: RuleTestDialogProps) {
  const { data: rules } = useRoutingRules();
  
  const [criteria, setCriteria] = useState<TestCriteria>({
    language: "",
    budget_range: "",
    lead_source: "",
    lead_segment: "",
    page_type: "",
  });
  
  const [hasRun, setHasRun] = useState(false);

  const matchedRule = useMemo(() => {
    if (!hasRun || !criteria.language || !rules) return null;
    
    // Filter active rules, sort by priority (descending), find first match
    const activeRules = rules
      .filter(r => r.is_active)
      .sort((a, b) => b.priority - a.priority);
    
    for (const rule of activeRules) {
      if (ruleMatches(criteria, rule)) {
        return rule;
      }
    }
    
    return null;
  }, [criteria, rules, hasRun]);

  const handleTest = () => {
    setHasRun(true);
  };

  const handleReset = () => {
    setCriteria({
      language: "",
      budget_range: "",
      lead_source: "",
      lead_segment: "",
      page_type: "",
    });
    setHasRun(false);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Test Routing Rules
          </DialogTitle>
          <DialogDescription>
            Simulate which rule would match a lead without creating one
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Language - Required */}
          <div className="grid gap-2">
            <Label htmlFor="language">Language *</Label>
            <Select
              value={criteria.language}
              onValueChange={(v) => {
                setCriteria(prev => ({ ...prev, language: v }));
                setHasRun(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language..." />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget Range */}
          <div className="grid gap-2">
            <Label htmlFor="budget">Budget Range</Label>
            <Select
              value={criteria.budget_range}
              onValueChange={(v) => {
                setCriteria(prev => ({ ...prev, budget_range: v }));
                setHasRun(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any budget..." />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead Source */}
          <div className="grid gap-2">
            <Label htmlFor="source">Lead Source</Label>
            <Select
              value={criteria.lead_source}
              onValueChange={(v) => {
                setCriteria(prev => ({ ...prev, lead_source: v }));
                setHasRun(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any source..." />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead Segment */}
          <div className="grid gap-2">
            <Label htmlFor="segment">Lead Segment</Label>
            <Select
              value={criteria.lead_segment}
              onValueChange={(v) => {
                setCriteria(prev => ({ ...prev, lead_segment: v }));
                setHasRun(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any segment..." />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page Type */}
          <div className="grid gap-2">
            <Label htmlFor="pageType">Page Type</Label>
            <Select
              value={criteria.page_type}
              onValueChange={(v) => {
                setCriteria(prev => ({ ...prev, page_type: v }));
                setHasRun(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any page type..." />
              </SelectTrigger>
              <SelectContent>
                {PAGE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          {hasRun && (
            <div className="mt-2">
              {matchedRule ? (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Match Found!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Rule:</span>
                        <span>"{matchedRule.rule_name}"</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Priority:</span>
                        <Badge variant="secondary">P{matchedRule.priority}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Assigns to:</span>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{matchedRule.agent?.first_name} {matchedRule.agent?.last_name}</span>
                        </div>
                      </div>
                      {matchedRule.fallback_to_broadcast ? (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-amber-700 text-sm">
                            Fallback enabled → Tier 2 broadcast
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Zap className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 text-sm">
                            Instant assignment (bypasses claim window)
                          </span>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-amber-500 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">No Match</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    No active rules match these criteria. Lead would go to Tier 2 (Broadcast) 
                    and be available for all matching agents to claim.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button 
            onClick={handleTest} 
            disabled={!criteria.language}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            Test Routing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
