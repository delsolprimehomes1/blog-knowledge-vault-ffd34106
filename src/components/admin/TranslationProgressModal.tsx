import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

interface TranslationResult {
  success: boolean;
  headline?: string;
  error?: string;
}

interface TranslationProgressModalProps {
  open: boolean;
  onClose: () => void;
  clusterTheme: string;
  targetLanguage: string;
  languageName: string;
  languageFlag: string;
  isTranslating: boolean;
  progress: {
    current: number;
    total: number;
    currentHeadline?: string;
  };
  results?: TranslationResult[];
  error?: string | null;
  duration?: string;
  onRetry?: () => void;
}

export function TranslationProgressModal({
  open,
  onClose,
  clusterTheme,
  targetLanguage,
  languageName,
  languageFlag,
  isTranslating,
  progress,
  results = [],
  error = null,
  duration,
  onRetry,
}: TranslationProgressModalProps) {
  const progressPercent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const isComplete = !isTranslating && results.length > 0;
  const hasErrors = failCount > 0 || error;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{languageFlag}</span>
            {isTranslating 
              ? `Translating to ${languageName}...` 
              : hasErrors 
                ? 'Translation Completed with Errors'
                : 'Translation Complete!'}
          </DialogTitle>
          <DialogDescription className="truncate">
            {clusterTheme}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Section */}
          {isTranslating && (
            <>
              <Progress value={progressPercent} className="w-full" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Translating article {progress.current} of {progress.total}...
                </span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              {progress.currentHeadline && (
                <p className="text-xs text-muted-foreground truncate">
                  Current: "{progress.currentHeadline}"
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Estimated time: ~{Math.ceil((progress.total - progress.current) * 30 / 60)} minutes remaining</span>
              </div>
            </>
          )}

          {/* Results Section */}
          {isComplete && (
            <div className="space-y-3">
              {/* Summary */}
              <div className={`p-3 rounded-lg ${hasErrors ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
                <div className="flex items-center gap-2">
                  {hasErrors ? (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  <span className="font-medium">
                    {successCount} article{successCount !== 1 ? 's' : ''} translated
                    {failCount > 0 && `, ${failCount} failed`}
                  </span>
                </div>
                {duration && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration: {duration}
                  </p>
                )}
              </div>

              {/* Detailed Results */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {results.map((result, i) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-2 text-sm p-2 rounded ${
                      result.success ? 'bg-muted/50' : 'bg-destructive/10'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate">{result.headline || 'Unknown article'}</p>
                      {result.error && (
                        <p className="text-xs text-destructive truncate">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Section */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Translation Failed</span>
              </div>
              <p className="text-sm text-destructive mt-1">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {hasErrors && onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Retry Failed
              </Button>
            )}
            <Button 
              onClick={onClose}
              disabled={isTranslating}
            >
              {isTranslating ? 'Please wait...' : 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
