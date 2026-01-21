import { useState } from "react";
import { Plus, Route, Target, TrendingUp, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoutingRules, useRoutingRuleStats } from "@/hooks/useRoutingRules";
import { RoutingRuleCard } from "@/components/crm/admin/RoutingRuleCard";
import { CreateRoutingRuleDialog } from "@/components/crm/admin/CreateRoutingRuleDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoutingRulesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);

  const { data: rules, isLoading: rulesLoading } = useRoutingRules();
  const { data: stats, isLoading: statsLoading } = useRoutingRuleStats();

  const handleEdit = (ruleId: string) => {
    setEditRuleId(ruleId);
    setIsCreateOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateOpen(false);
    setEditRuleId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Route className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Lead Routing Rules</h1>
            <p className="text-sm text-muted-foreground">
              Auto-assign leads to agents based on criteria - bypasses claim window
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeRules || 0}</div>
                <p className="text-xs text-muted-foreground">
                  of {stats?.totalRules || 0} total rules
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalMatches || 0}</div>
                <p className="text-xs text-muted-foreground">leads auto-assigned</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.matchesToday || 0}</div>
                <p className="text-xs text-muted-foreground">instant assignments</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Assignment</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">&lt;1s</div>
            <p className="text-xs text-muted-foreground">vs 15min claim window</p>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rules (sorted by priority)</h2>
          <p className="text-sm text-muted-foreground">
            Higher priority rules are checked first
          </p>
        </div>

        {rulesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !rules || rules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No routing rules yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first rule to start auto-assigning leads to agents
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <RoutingRuleCard
                key={rule.id}
                rule={rule}
                position={index + 1}
                onEdit={() => handleEdit(rule.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <CreateRoutingRuleDialog
        open={isCreateOpen}
        onOpenChange={handleCloseDialog}
        editRuleId={editRuleId}
      />
    </div>
  );
}
