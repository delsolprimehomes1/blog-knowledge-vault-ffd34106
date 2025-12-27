import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Save, Download, Loader2, ExternalLink, HelpCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkActionsProps {
  onPublishAll: () => Promise<void>;
  onSaveAllAsDrafts: () => Promise<void>;
  onExportCluster: () => void;
  onFixAllCitations?: () => Promise<void>;
  onGenerateAllQA?: () => Promise<void>;
  articleCount: number;
  citationsNeeded: number;
  articlesWithoutQA?: number;
  articles?: any[];
}

export const BulkActions = ({
  onPublishAll,
  onSaveAllAsDrafts,
  onExportCluster,
  onFixAllCitations,
  onGenerateAllQA,
  articleCount,
  citationsNeeded,
  articlesWithoutQA = 0,
  articles = [],
}: BulkActionsProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setLoading(action);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateAllQA = async () => {
    setLoading('qa');
    
    try {
      // Get articles without QA pages that have been saved (have an ID)
      const articlesNeedingQA = articles.filter(
        a => a.id && (!a.generated_qa_page_ids || a.generated_qa_page_ids.length === 0)
      );

      if (articlesNeedingQA.length === 0) {
        toast.info('All articles already have QA pages!');
        setLoading(null);
        return;
      }

      toast.info(`Generating QA pages for ${articlesNeedingQA.length} articles...`);

      let successCount = 0;
      let errorCount = 0;

      // Generate QA pages for each article
      for (const article of articlesNeedingQA) {
        try {
          const { error } = await supabase.functions.invoke('generate-qa-pages', {
            body: {
              articleIds: [article.id],
              languages: [article.language || 'en'],
              mode: 'standard'
            }
          });

          if (error) {
            console.error(`Failed to generate QA for article ${article.id}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to generate QA for article ${article.id}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`QA pages generated for ${successCount} article${successCount !== 1 ? 's' : ''}!`);
      }
      if (errorCount > 0) {
        toast.warning(`Failed to generate QA for ${errorCount} article${errorCount !== 1 ? 's' : ''}`);
      }
      
      // Trigger parent refresh
      if (onGenerateAllQA) {
        await onGenerateAllQA();
      }

    } catch (error: any) {
      toast.error(`Bulk QA generation failed: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  // Count articles that can have QA generated (have ID but no QA pages)
  const qaEligibleCount = articles.filter(
    a => a.id && (!a.generated_qa_page_ids || a.generated_qa_page_ids.length === 0)
  ).length;

  return (
    <Card className="sticky bottom-0 z-10 shadow-lg border-t-2">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">{articleCount} articles</span> in this cluster
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {citationsNeeded > 0 && onFixAllCitations && (
              <Button
                variant="secondary"
                onClick={() => handleAction("citations", onFixAllCitations)}
                disabled={loading !== null}
              >
                {loading === "citations" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Fix {citationsNeeded} Citation{citationsNeeded !== 1 ? 's' : ''}
              </Button>
            )}
            {qaEligibleCount > 0 && (
              <Button
                onClick={handleGenerateAllQA}
                disabled={loading !== null}
                variant="secondary"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading === 'qa' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating QA...
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Generate All QA Pages ({qaEligibleCount})
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onExportCluster}
              disabled={loading !== null}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Cluster
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction("draft", onSaveAllAsDrafts)}
              disabled={loading !== null}
            >
              {loading === "draft" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save All as Drafts
            </Button>
            <Button
              onClick={() => handleAction("publish", onPublishAll)}
              disabled={loading !== null}
            >
              {loading === "publish" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Publish All {articleCount} Articles
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
