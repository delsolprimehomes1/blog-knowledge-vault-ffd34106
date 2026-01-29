import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ImageIcon, Link2, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { ClusterManagerStats } from "@/hooks/useClusterManagerStats";
import { useBulkOperation } from "@/hooks/useBulkOperation";
import { BulkOperationProgress } from "./BulkOperationProgress";

interface BulkOperationsPanelProps {
  stats: ClusterManagerStats | undefined;
}

export function BulkOperationsPanel({ stats }: BulkOperationsPanelProps) {
  const [confirmAction, setConfirmAction] = useState<'regenerate_all_images' | 'refresh_all_citations' | null>(null);
  
  const {
    state,
    pendingCheckpoint,
    pause,
    resume,
    reset,
    dismissCheckpoint,
    fixMissingImages,
    fixMissingCitations,
    regenerateAllImages,
    refreshAllCitations,
    isFixingImages,
    isFixingCitations,
    isRegeneratingAll,
    isRefreshingAll,
  } = useBulkOperation();

  const isAnyRunning = state.isRunning || isFixingImages || isFixingCitations || isRegeneratingAll || isRefreshingAll;
  const missingImages = stats?.articlesMissingImages || 0;
  const missingCitations = stats?.articlesMissingCitations || 0;

  // Show progress panel if operation is running
  if (state.isRunning && state.progress) {
    return (
      <BulkOperationProgress
        progress={state.progress}
        isPaused={state.isPaused}
        errors={state.errors}
        onPause={pause}
        onResume={resume}
        onCancel={reset}
      />
    );
  }

  // Show result panel after completion
  if (state.result) {
    return (
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-2xl">
              {state.result.failed === 0 ? "✅" : "⚠️"}
            </div>
            <div>
              <div className="text-lg font-semibold">
                Operation Complete
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {state.result.success} succeeded, {state.result.failed} failed
              </div>
            </div>
            {state.errors.length > 0 && (
              <div className="text-left max-h-32 overflow-y-auto bg-red-50 p-3 rounded-lg text-xs">
                {state.errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="text-red-600">
                    • {err.id.slice(0, 8)}: {err.error.slice(0, 50)}
                  </div>
                ))}
                {state.errors.length > 5 && (
                  <div className="text-muted-foreground mt-1">
                    + {state.errors.length - 5} more errors
                  </div>
                )}
              </div>
            )}
            <Button onClick={reset} variant="outline">
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show resume prompt if there's a pending checkpoint
  if (pendingCheckpoint) {
    return (
      <Card className="border-2 border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
            <div>
              <div className="text-lg font-semibold">
                Previous Operation Interrupted
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {pendingCheckpoint.completedIds.length} of {pendingCheckpoint.articleIds.length} completed
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => {
                  // Resume from where we left off
                  const remainingIds = pendingCheckpoint.articleIds.filter(
                    id => !pendingCheckpoint.completedIds.includes(id)
                  );
                  if (pendingCheckpoint.operationType === 'fix_images' || pendingCheckpoint.operationType === 'regenerate_all_images') {
                    fixMissingImages(remainingIds);
                  } else {
                    fixMissingCitations(remainingIds);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Resume Operation
              </Button>
              <Button onClick={dismissCheckpoint} variant="outline">
                Discard & Start Fresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Bulk Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fix Missing Operations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fix Missing Images */}
            <div className="space-y-2">
              <Button
                onClick={() => fixMissingImages(undefined)}
                disabled={isAnyRunning || missingImages === 0}
                className="w-full"
                variant={missingImages > 0 ? "default" : "outline"}
              >
                {isFixingImages ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4 mr-2" />
                )}
                Fix Missing Images
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                {missingImages > 0 ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {missingImages} articles need images
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    All articles have images ✓
                  </Badge>
                )}
              </div>
            </div>

            {/* Fix Missing Citations */}
            <div className="space-y-2">
              <Button
                onClick={() => fixMissingCitations(undefined)}
                disabled={isAnyRunning || missingCitations === 0}
                className="w-full"
                variant={missingCitations > 0 ? "default" : "outline"}
              >
                {isFixingCitations ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Fix Missing Citations
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                {missingCitations > 0 ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {missingCitations} articles need citations
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    All articles have citations ✓
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Regenerate All Operations */}
          <div className="border-t pt-4 mt-4">
            <div className="text-xs text-muted-foreground mb-3">
              Full refresh (requires confirmation):
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setConfirmAction('regenerate_all_images')}
                disabled={isAnyRunning || !stats?.totalArticles}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <ImageIcon className="h-3 w-3 mr-1" />
                Regenerate All Images
              </Button>
              <Button
                onClick={() => setConfirmAction('refresh_all_citations')}
                disabled={isAnyRunning}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Link2 className="h-3 w-3 mr-1" />
                Refresh All Citations
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'regenerate_all_images' 
                ? 'Regenerate All Images?' 
                : 'Refresh All Citations?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'regenerate_all_images' ? (
                <>
                  This will regenerate images for <strong>all {stats?.totalArticles || 0} articles</strong>.
                  <br /><br />
                  • Takes approximately {Math.ceil((stats?.totalArticles || 0) * 3 / 60)} minutes
                  <br />
                  • Rate limited to 20 images per minute
                  <br />
                  • You can pause and resume at any time
                </>
              ) : (
                <>
                  This will refresh citations for <strong>all {stats?.totalArticles || 0} articles</strong>.
                  <br /><br />
                  • Takes approximately {Math.ceil((stats?.totalArticles || 0) * 2 / 60)} minutes
                  <br />
                  • Rate limited to 30 requests per minute
                  <br />
                  • You can pause and resume at any time
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === 'regenerate_all_images') {
                  regenerateAllImages(undefined);
                } else {
                  refreshAllCitations(undefined);
                }
                setConfirmAction(null);
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Start Operation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
