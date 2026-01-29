import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pause, Play, X, ChevronDown, AlertTriangle } from "lucide-react";
import { ProgressState } from "@/lib/rateLimiter";
import { useState } from "react";

interface BulkOperationProgressProps {
  progress: ProgressState;
  isPaused: boolean;
  errors: Array<{ index: number; id: string; error: string }>;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function BulkOperationProgress({
  progress,
  isPaused,
  errors,
  onPause,
  onResume,
  onCancel,
}: BulkOperationProgressProps) {
  const [showErrors, setShowErrors] = useState(false);

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardContent className="pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-blue-500 animate-pulse'}`} />
            <span className="font-medium">
              {isPaused ? 'Paused' : 'Processing...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isPaused ? onResume : onPause}
            >
              {isPaused ? (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress.percentComplete} className="h-2" />
          <div className="flex justify-between text-sm">
            <span>
              {progress.currentIndex} of {progress.totalCount}
            </span>
            <span className="text-muted-foreground">
              {progress.percentComplete}%
            </span>
          </div>
        </div>

        {/* Current Article */}
        {progress.currentItem && (
          <div className="text-sm">
            <span className="text-muted-foreground">Current: </span>
            <span className="font-medium truncate">
              {progress.currentItem.length > 50 
                ? progress.currentItem.slice(0, 50) + '...' 
                : progress.currentItem}
            </span>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              ✓ {progress.successCount}
            </Badge>
            <span className="text-muted-foreground">succeeded</span>
          </div>
          {progress.failCount > 0 && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                ✗ {progress.failCount}
              </Badge>
              <span className="text-muted-foreground">failed</span>
            </div>
          )}
        </div>

        {/* Estimated Time */}
        {progress.estimatedTimeRemaining && (
          <div className="text-xs text-muted-foreground">
            {progress.estimatedTimeRemaining}
          </div>
        )}

        {/* Error Log */}
        {errors.length > 0 && (
          <Collapsible open={showErrors} onOpenChange={setShowErrors}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
              <AlertTriangle className="h-3 w-3" />
              {errors.length} error{errors.length > 1 ? 's' : ''}
              <ChevronDown className={`h-3 w-3 transition-transform ${showErrors ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 max-h-32 overflow-y-auto bg-red-50 p-3 rounded-lg text-xs space-y-1">
                {errors.map((err, i) => (
                  <div key={i} className="text-red-600">
                    <span className="font-mono">{err.id.slice(0, 8)}</span>: {err.error.slice(0, 60)}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
