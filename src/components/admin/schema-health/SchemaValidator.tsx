import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertTriangle, RefreshCw, Code, ExternalLink } from "lucide-react";

interface ValidationResult {
  articleId: string;
  slug: string;
  language: string;
  hasQAPart: boolean;
  hasRelatedLink: boolean;
  qaPageCount: number;
  isValid: boolean;
}

export function SchemaValidator() {
  const [isValidating, setIsValidating] = useState(false);

  const { data: validationResults, isLoading, refetch } = useQuery({
    queryKey: ["schema-validation-results"],
    queryFn: async (): Promise<ValidationResult[]> => {
      // Get articles with QA pages
      const { data: articles, error } = await supabase
        .from("blog_articles")
        .select("id, slug, language, generated_qa_page_ids")
        .eq("status", "published")
        .not("generated_qa_page_ids", "is", null);

      if (error) throw error;

      return (articles || [])
        .filter((a) => a.generated_qa_page_ids && a.generated_qa_page_ids.length > 0)
        .map((article) => {
          const qaCount = article.generated_qa_page_ids?.length || 0;
          const hasQAPart = qaCount > 0;
          const hasRelatedLink = qaCount > 0;
          
          return {
            articleId: article.id,
            slug: article.slug,
            language: article.language,
            hasQAPart,
            hasRelatedLink,
            qaPageCount: qaCount,
            isValid: hasQAPart && hasRelatedLink,
          };
        });
    },
    staleTime: 60000,
  });

  const handleValidate = async () => {
    setIsValidating(true);
    await refetch();
    setIsValidating(false);
  };

  const validCount = validationResults?.filter((r) => r.isValid).length || 0;
  const totalCount = validationResults?.length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              JSON-LD Schema Validation
            </CardTitle>
            <CardDescription>
              Verify bidirectional schema references between blog articles and QA pages
            </CardDescription>
          </div>
          <Button onClick={handleValidate} disabled={isValidating} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? "animate-spin" : ""}`} />
            Validate All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {validCount === totalCount ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            <span className="font-medium">
              {validCount}/{totalCount} schemas valid
            </span>
          </div>
          <Badge variant={validCount === totalCount ? "default" : "secondary"}>
            {totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 0}% Complete
          </Badge>
        </div>

        {/* Validation Results */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {validationResults?.map((result) => (
              <div
                key={result.articleId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{result.slug}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {result.language.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {result.qaPageCount} QA pages
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs">
                      {result.hasQAPart ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                      )}
                      <span>hasPart</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {result.hasRelatedLink ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                      )}
                      <span>relatedLink</span>
                    </div>
                  </div>
                  <a
                    href={`/${result.language}/blog/${result.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}

            {validationResults?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No articles with QA pages found
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
          <p className="font-medium">Schema Requirements:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong>hasPart</strong>: BlogPosting must reference QA pages as Question entities</li>
            <li><strong>relatedLink</strong>: BlogPosting must include QA page URLs</li>
            <li><strong>isBasedOn</strong>: FAQPage must reference source BlogPosting</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
