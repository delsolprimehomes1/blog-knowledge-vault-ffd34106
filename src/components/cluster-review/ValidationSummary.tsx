import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Zap } from "lucide-react";
import { LinkValidationResult } from "@/lib/linkValidation";

interface ValidationSummaryProps {
  validationResults: Map<string, LinkValidationResult>;
  onAutoFix: () => Promise<void>;
  isFixing: boolean;
}

export const ValidationSummary = ({ validationResults, onAutoFix, isFixing }: ValidationSummaryProps) => {
  const results = Array.from(validationResults.values());
  const validArticles = results.filter(r => r.isValid).length;
  const invalidArticles = results.filter(r => !r.isValid).length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const articlesWithMissingLinks = results.filter(r => r.missingInternalLinks).length;
  const articlesWithMissingCitations = results.filter(r => r.missingExternalCitations).length;
  
  const isClusterValid = results.every(r => r.isValid);

  if (isClusterValid) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">All Articles Validated ✓</AlertTitle>
        <AlertDescription className="text-green-700">
          All {results.length} articles have sufficient internal links and external citations. Ready to publish!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-destructive">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Validation Failed - Cannot Publish
            </CardTitle>
            <CardDescription className="mt-2">
              {invalidArticles} of {results.length} articles need fixes before publishing
            </CardDescription>
          </div>
          <Button 
            onClick={onAutoFix}
            disabled={isFixing}
            variant="default"
            className="gap-2"
          >
            {isFixing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Auto-Fix All Links
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Error Summary */}
          <div className="grid grid-cols-2 gap-4">
            {articlesWithMissingLinks > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm">Missing Internal Links</AlertTitle>
                <AlertDescription className="text-xs">
                  {articlesWithMissingLinks} article{articlesWithMissingLinks !== 1 ? 's need' : ' needs'} more internal links (min. 3)
                </AlertDescription>
              </Alert>
            )}
            {articlesWithMissingCitations > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm">Missing External Citations</AlertTitle>
                <AlertDescription className="text-xs">
                  {articlesWithMissingCitations} article{articlesWithMissingCitations !== 1 ? 's need' : ' needs'} more external citations (min. 2)
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Detailed Errors */}
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Issues to Fix:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
              {Array.from(validationResults.entries())
                .filter(([_, result]) => !result.isValid)
                .map(([slug, result]) => (
                  <div key={slug} className="text-xs text-destructive">
                    • <span className="font-medium">{slug}:</span> {result.errors.join(', ')}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
