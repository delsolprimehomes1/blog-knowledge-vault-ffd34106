import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Zap, AlertCircle } from "lucide-react";
import { LinkValidationResult } from "@/lib/linkValidation";

interface ValidationSummaryProps {
  validationResults: Map<string, LinkValidationResult>;
  onAutoFix: () => Promise<void>;
  isFixing: boolean;
  onRefreshValidation?: () => void;
  articles?: any[];
}

export const ValidationSummary = ({ validationResults, onAutoFix, isFixing, onRefreshValidation, articles = [] }: ValidationSummaryProps) => {
  const results = Array.from(validationResults.values());
  const validArticles = results.filter(r => r.isValid).length;
  const invalidArticles = results.filter(r => !r.isValid).length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const articlesWithMissingLinks = results.filter(r => r.missingInternalLinks).length;
  const articlesWithMissingCitations = results.filter(r => r.missingExternalCitations).length;
  const totalLanguageMismatches = results.reduce((sum, r) => sum + r.languageMismatches, 0);
  
  // Check for failed citation status
  const hasFailedCitations = articles.some((a: any) => a.citation_status === 'failed');
  const failedCitationCount = articles.filter((a: any) => a.citation_status === 'failed').length;
  
  const isClusterValid = results.every(r => r.isValid) && !hasFailedCitations;

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
              {hasFailedCitations 
                ? `${failedCitationCount} article(s) have failed citation requirements`
                : `${invalidArticles} of ${results.length} articles need fixes before publishing`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {onRefreshValidation && (
              <Button 
                onClick={onRefreshValidation}
                disabled={isFixing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Refresh Validation
              </Button>
            )}
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Citation Status Alert */}
          {hasFailedCitations && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Blocking Issue: Failed Citations</AlertTitle>
              <AlertDescription>
                {failedCitationCount} article(s) failed to meet minimum citation requirements (2 verified, non-competitor sources).
                You must manually add proper citations before these articles can be published.
              </AlertDescription>
            </Alert>
          )}
          
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
            {totalLanguageMismatches > 0 && (
              <Alert variant="destructive" className="col-span-2">
                <XCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">❌ Language Mismatches Detected</AlertTitle>
                <AlertDescription className="text-xs">
                  {totalLanguageMismatches} citation{totalLanguageMismatches !== 1 ? 's don\'t' : ' doesn\'t'} match article language. 
                  Citations must use approved domains tagged for the article's language.
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
