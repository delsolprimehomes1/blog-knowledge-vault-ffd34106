import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  User, 
  Globe, 
  MessageSquare,
  Building,
  Target,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { 
  RoutingRule, 
  useDeleteRoutingRule, 
  useToggleRuleActive,
  useUpdateRulePriority 
} from "@/hooks/useRoutingRules";

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  fi: "🇫🇮",
  pl: "🇵🇱",
  nl: "🇳🇱",
  de: "🇩🇪",
  es: "🇪🇸",
  sv: "🇸🇪",
  da: "🇩🇰",
  hu: "🇭🇺",
};

interface RoutingRuleCardProps {
  rule: RoutingRule;
  position: number;
  onEdit: () => void;
}

export function RoutingRuleCard({ rule, position, onEdit }: RoutingRuleCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteRule = useDeleteRoutingRule();
  const toggleActive = useToggleRuleActive();
  const updatePriority = useUpdateRulePriority();

  const handleDelete = () => {
    deleteRule.mutate(rule.id);
    setShowDeleteDialog(false);
  };

  const handleToggle = (checked: boolean) => {
    toggleActive.mutate({ id: rule.id, is_active: checked });
  };

  const handlePriorityUp = () => {
    updatePriority.mutate({ id: rule.id, priority: rule.priority + 1 });
  };

  const handlePriorityDown = () => {
    updatePriority.mutate({ id: rule.id, priority: Math.max(0, rule.priority - 1) });
  };

  const getCriteriaSummary = () => {
    const parts: string[] = [];
    
    if (rule.match_language?.length) {
      parts.push(rule.match_language.map(l => LANGUAGE_FLAGS[l] || l).join(" "));
    }
    if (rule.match_lead_source?.length) {
      parts.push(rule.match_lead_source.join(", "));
    }
    if (rule.match_page_type?.length) {
      parts.push(rule.match_page_type.join(", "));
    }
    if (rule.match_budget_range?.length) {
      parts.push(rule.match_budget_range.join(", "));
    }
    if (rule.match_lead_segment?.length) {
      parts.push(rule.match_lead_segment.join(", "));
    }
    if (rule.match_property_type?.length) {
      parts.push(rule.match_property_type.join(", "));
    }
    if (rule.match_timeframe?.length) {
      parts.push(rule.match_timeframe.join(", "));
    }

    return parts;
  };

  const criteriaParts = getCriteriaSummary();

  return (
    <>
      <Card className={`transition-all ${!rule.is_active ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Priority & Main Info */}
            <div className="flex items-start gap-4 flex-1">
              {/* Priority Controls */}
              <div className="flex flex-col items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={handlePriorityUp}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Badge variant={rule.is_active ? "default" : "secondary"} className="px-2">
                  P{position}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={handlePriorityDown}
                  disabled={rule.priority <= 0}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Rule Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{rule.rule_name}</h3>
                  {rule.is_active && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                  )}
                </div>

                {rule.rule_description && (
                  <p className="text-sm text-muted-foreground">{rule.rule_description}</p>
                )}

                {/* Criteria Badges */}
                <div className="flex flex-wrap gap-2">
                  {rule.match_language?.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Globe className="h-3 w-3" />
                      {rule.match_language.map(l => LANGUAGE_FLAGS[l] || l.toUpperCase()).join(" ")}
                    </Badge>
                  )}
                  {rule.match_lead_source?.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {rule.match_lead_source.join(", ")}
                    </Badge>
                  )}
                  {rule.match_lead_segment?.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Target className="h-3 w-3" />
                      {rule.match_lead_segment.join(", ")}
                    </Badge>
                  )}
                  {rule.match_budget_range?.length > 0 && (
                    <Badge variant="secondary">
                      {rule.match_budget_range.join(", ")}
                    </Badge>
                  )}
                  {rule.match_property_type?.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Building className="h-3 w-3" />
                      {rule.match_property_type.join(", ")}
                    </Badge>
                  )}
                </div>

                {/* Assignment Target */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">→ Assigns to:</span>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {rule.agent?.first_name} {rule.agent?.last_name}
                    </span>
                    {rule.agent && (
                      <Badge variant="outline" className="text-xs">
                        {rule.agent.current_lead_count}/{rule.agent.max_active_leads}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <strong>{rule.total_matches}</strong> matches total
                  </span>
                  {rule.last_matched_at && (
                    <span>
                      Last used {formatDistanceToNow(new Date(rule.last_matched_at), { addSuffix: true })}
                    </span>
                  )}
                  {rule.fallback_to_broadcast && (
                    <Badge variant="outline" className="text-xs">
                      Fallback: Broadcast
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Switch
                checked={rule.is_active}
                onCheckedChange={handleToggle}
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Rule
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Rule
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Routing Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the rule "{rule.rule_name}". 
              Leads matching this criteria will fallback to the claim broadcast system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
