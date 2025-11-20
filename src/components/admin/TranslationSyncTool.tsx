import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Languages, RefreshCw, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncStats {
  totalArticles: number;
  articlesWithTranslations: number;
  articlesFixed: number;
  errors: string[];
}

export const TranslationSyncTool = () => {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [dryRun, setDryRun] = useState(true);

  const syncTranslations = async (isDryRun: boolean) => {
    setSyncing(true);
    setProgress(0);
    
    const stats: SyncStats = {
      totalArticles: 0,
      articlesWithTranslations: 0,
      articlesFixed: 0,
      errors: []
    };

    try {
      // 1. Fetch all articles with their translations
      const { data: articles, error } = await supabase
        .from('blog_articles')
        .select('id, slug, language, translations');

      if (error) throw error;
      if (!articles) return;

      stats.totalArticles = articles.length;
      console.log(`📊 Found ${articles.length} total articles`);

      // 2. Build translation networks
      const translationNetworks = new Map<string, Map<string, string>>();
      
      for (const article of articles) {
        if (!article.translations || Object.keys(article.translations).length === 0) {
          continue;
        }

        stats.articlesWithTranslations++;

        // Build network for this article
        const network = new Map<string, string>();
        network.set(article.language, article.slug);
        
        Object.entries(article.translations).forEach(([lang, slug]) => {
          network.set(lang as string, slug as string);
        });

        // Store network keyed by all slugs in the network
        for (const [, slug] of network) {
          translationNetworks.set(slug as string, network);
        }
      }

      console.log(`🔍 Found ${stats.articlesWithTranslations} articles with translation data`);

      // 3. Fix bidirectional links
      let processed = 0;
      for (const article of articles) {
        const network = translationNetworks.get(article.slug);
        if (!network) {
          processed++;
          setProgress((processed / articles.length) * 100);
          continue;
        }

        // Build correct translations for this article
        const correctTranslations: Record<string, string> = {};
        for (const [lang, slug] of network) {
          if (lang !== article.language) {
            correctTranslations[lang] = slug as string;
          }
        }

        // Check if current translations are incorrect/incomplete
        const currentTranslations = article.translations || {};
        const needsUpdate = 
          Object.keys(correctTranslations).length !== Object.keys(currentTranslations).length ||
          Object.entries(correctTranslations).some(([lang, slug]) => currentTranslations[lang] !== slug);

        if (needsUpdate) {
          console.log(`🔧 ${isDryRun ? '[DRY RUN]' : 'Fixing'} article: ${article.slug}`);
          console.log(`   Current: ${JSON.stringify(currentTranslations)}`);
          console.log(`   Correct: ${JSON.stringify(correctTranslations)}`);

          if (!isDryRun) {
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ translations: correctTranslations })
              .eq('id', article.id);

            if (updateError) {
              console.error(`❌ Error updating ${article.slug}:`, updateError);
              stats.errors.push(`${article.slug}: ${updateError.message}`);
            } else {
              stats.articlesFixed++;
            }
          } else {
            stats.articlesFixed++;
          }
        }

        processed++;
        setProgress((processed / articles.length) * 100);
      }

      setStats(stats);
      
      if (!isDryRun) {
        toast.success(`✅ Synced ${stats.articlesFixed} articles with bidirectional translations`);
      } else {
        toast.info(`📋 Dry run complete: ${stats.articlesFixed} articles would be fixed`);
      }

    } catch (error) {
      console.error('Sync error:', error);
      toast.error("Failed to sync translations");
      stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
      setStats(stats);
    } finally {
      setSyncing(false);
      setProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Translation Sync Tool
            </CardTitle>
            <CardDescription>
              Fix bidirectional translation links across all articles for proper hreflang implementation
            </CardDescription>
          </div>
          <Badge variant={stats?.articlesFixed ? "default" : "secondary"}>
            {stats ? `${stats.articlesFixed} fixed` : 'Ready'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This tool ensures all articles in a translation group reference each other bidirectionally.
            Run a dry run first to preview changes before applying them.
          </AlertDescription>
        </Alert>

        {stats && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Articles</p>
                <p className="text-2xl font-bold">{stats.totalArticles}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Translations</p>
                <p className="text-2xl font-bold">{stats.articlesWithTranslations}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Articles Fixed</p>
                <p className="text-2xl font-bold text-primary">{stats.articlesFixed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-destructive">{stats.errors.length}</p>
              </div>
            </div>

            {stats.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Errors encountered:</p>
                  <ul className="text-xs space-y-1">
                    {stats.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                  {stats.errors.length > 5 && (
                    <p className="text-xs mt-1">...and {stats.errors.length - 5} more</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {stats.articlesFixed > 0 && stats.errors.length === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {dryRun 
                    ? `Preview complete. ${stats.articlesFixed} articles would be updated with correct bidirectional links.`
                    : `Success! ${stats.articlesFixed} articles now have correct bidirectional translation links.`
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {syncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing articles...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setDryRun(true);
              syncTranslations(true);
            }}
            disabled={syncing}
            variant="outline"
          >
            <Info className="h-4 w-4 mr-2" />
            Dry Run (Preview)
          </Button>
          <Button
            onClick={() => {
              setDryRun(false);
              syncTranslations(false);
            }}
            disabled={syncing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {syncing ? "Syncing..." : "Sync All Translations"}
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>How it works:</strong> For each article with translations, this tool ensures all linked articles 
            reference each other. Example: If EN→NL and NL→FR exist, all three (EN, NL, FR) will reference each other.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
