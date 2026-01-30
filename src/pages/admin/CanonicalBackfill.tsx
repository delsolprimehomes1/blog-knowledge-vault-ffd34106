import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, FileText, HelpCircle, Scale, MapPin } from "lucide-react";
import { useMissingCanonicals, useCanonicalBackfill, type MissingCanonical } from "@/hooks/useCanonicalBackfill";
import { MissingCanonicalTable } from "@/components/admin/canonical-backfill/MissingCanonicalTable";
import { BackfillProgress } from "@/components/admin/canonical-backfill/BackfillProgress";

export default function CanonicalBackfill() {
  const { data, isLoading, refetch } = useMissingCanonicals();
  const backfillMutation = useCanonicalBackfill();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, success: 0, failed: 0 });

  const handleBackfill = async () => {
    if (!data?.items) return;

    const itemsToProcess = selectedIds.size > 0
      ? data.items.filter(i => selectedIds.has(i.id))
      : data.items;

    if (itemsToProcess.length === 0) return;

    setIsRunning(true);
    setProgress({ processed: 0, success: 0, failed: 0 });

    const result = await backfillMutation.mutateAsync(itemsToProcess);
    
    setProgress({
      processed: itemsToProcess.length,
      success: result.success,
      failed: result.failed,
    });
    setIsRunning(false);
    setSelectedIds(new Set());
  };

  const stats = data?.stats || {
    total: 0,
    byType: { blog: 0, qa: 0, comparison: 0, location: 0 },
    byLanguage: {},
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'blog': return FileText;
      case 'qa': return HelpCircle;
      case 'comparison': return Scale;
      case 'location': return MapPin;
      default: return FileText;
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Canonical URL Backfill</h1>
            <p className="text-muted-foreground">
              Fix missing or incorrect canonical URLs across all content types
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRunning}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Rescan
            </Button>
            <Button 
              onClick={handleBackfill} 
              disabled={isLoading || isRunning || stats.total === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              {selectedIds.size > 0 ? `Fix ${selectedIds.size} Selected` : `Fix All ${stats.total}`}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Missing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">canonical URLs to fix</p>
            </CardContent>
          </Card>

          {(['blog', 'qa', 'comparison', 'location'] as const).map(type => {
            const Icon = getIcon(type);
            const count = stats.byType[type];
            return (
              <Card key={type}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium capitalize">{type}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">
                    {count === 0 ? 'All set!' : 'missing'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Progress (when running) */}
        {(isRunning || progress.processed > 0) && (
          <BackfillProgress
            total={selectedIds.size > 0 ? selectedIds.size : stats.total}
            processed={progress.processed}
            success={progress.success}
            failed={progress.failed}
            isRunning={isRunning}
          />
        )}

        {/* Language Distribution */}
        {Object.keys(stats.byLanguage).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Language</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byLanguage)
                  .sort(([, a], [, b]) => b - a)
                  .map(([lang, count]) => (
                    <Badge key={lang} variant="secondary">
                      {lang.toUpperCase()}: {count}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Content with Missing/Invalid Canonical URLs</CardTitle>
            <CardDescription>
              Select specific items to fix or use "Fix All" to update everything at once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MissingCanonicalTable
              items={data?.items || []}
              isLoading={isLoading}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
