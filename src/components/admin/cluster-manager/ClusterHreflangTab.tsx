import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Languages, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Wrench } from "lucide-react";
import { toast } from "sonner";
import { ClusterData, getLanguageFlag, getAllExpectedLanguages } from "./types";

interface ClusterHreflangTabProps {
  cluster: ClusterData;
}

export const ClusterHreflangTab = ({ cluster }: ClusterHreflangTabProps) => {
  const queryClient = useQueryClient();
  const [syncResult, setSyncResult] = useState<any>(null);

  const syncTranslationsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-translations-jsonb", {
        body: { clusterId: cluster.cluster_id, dryRun: false },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSyncResult(data);
      toast.success(`Synced translations for ${data.updated || 0} articles`);
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const repairBlogHreflangMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("repair-blog-hreflang-groups", {
        body: { dryRun: false, cluster_id: cluster.cluster_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Repaired hreflang for ${data.stats?.fixed || 0} articles`);
      queryClient.invalidateQueries({ queryKey: ["cluster-articles"] });
    },
    onError: (error) => {
      toast.error(`Repair failed: ${error.message}`);
    },
  });

  const fixDuplicateHreflangMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fix-duplicate-hreflang", {
        body: { dryRun: false, cluster_id: cluster.cluster_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Fixed ${data.summary?.updates_applied || 0} Q&A pages`);
      queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
    },
    onError: (error) => {
      toast.error(`Fix failed: ${error.message}`);
    },
  });

  const repairQAHreflangMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("repair-hreflang-groups", {
        body: { dryRun: false, clusterId: cluster.cluster_id, contentType: "qa" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Repaired hreflang for ${data.stats?.fixed || data.updated || 0} Q&A pages`);
      queryClient.invalidateQueries({ queryKey: ["cluster-qa-pages"] });
    },
    onError: (error) => {
      toast.error(`Repair failed: ${error.message}`);
    },
  });

  const expectedLanguages = getAllExpectedLanguages(cluster);
  const existingLanguages = Object.keys(cluster.languages);
  const missingLanguages = expectedLanguages.filter((l) => !existingLanguages.includes(l));
  const languageCoverage = Math.round((existingLanguages.length / expectedLanguages.length) * 100);

  return (
    <div className="space-y-4">
      {/* Language Coverage */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{existingLanguages.length}/10</div>
          <div className="text-xs text-muted-foreground">Languages</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{languageCoverage}%</div>
          <div className="text-xs text-muted-foreground">Coverage</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div
            className={`text-2xl font-bold ${
              missingLanguages.length === 0 ? "text-green-600" : "text-amber-600"
            }`}
          >
            {missingLanguages.length === 0 ? "✓" : missingLanguages.length}
          </div>
          <div className="text-xs text-muted-foreground">Missing</div>
        </div>
      </div>

      {/* Language Grid */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">Hreflang Language Map:</p>
          <div className="grid grid-cols-5 gap-2">
            {expectedLanguages.map((lang) => {
              const exists = existingLanguages.includes(lang);
              const articleCount = cluster.languages[lang]?.total || 0;

              return (
                <div
                  key={lang}
                  className={`p-2 rounded-lg border text-center ${
                    exists
                      ? articleCount === 6
                        ? "bg-green-50 border-green-200 dark:bg-green-950/30"
                        : "bg-amber-50 border-amber-200 dark:bg-amber-950/30"
                      : "bg-red-50 border-dashed border-red-200 dark:bg-red-950/20"
                  }`}
                >
                  <div className="text-lg">{getLanguageFlag(lang)}</div>
                  <div className="text-xs font-medium">{lang.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">
                    {exists ? `${articleCount} articles` : "Missing"}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {syncResult && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <span className="font-medium">Translations synced!</span>
              <p className="text-sm text-muted-foreground">
                Updated {syncResult.updated || 0} articles
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {missingLanguages.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Missing languages for complete hreflang:
            </span>
            <span className="text-amber-700 dark:text-amber-400 ml-1">
              {missingLanguages.map((l) => l.toUpperCase()).join(", ")}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncTranslationsMutation.mutate()}
          disabled={syncTranslationsMutation.isPending}
        >
          {syncTranslationsMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync Translations JSONB
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => repairBlogHreflangMutation.mutate()}
          disabled={repairBlogHreflangMutation.isPending}
        >
          {repairBlogHreflangMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wrench className="mr-2 h-4 w-4" />
          )}
          Repair Blog Hreflang
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fixDuplicateHreflangMutation.mutate()}
          disabled={fixDuplicateHreflangMutation.isPending}
        >
          {fixDuplicateHreflangMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Languages className="mr-2 h-4 w-4" />
          )}
          Fix Q&A Duplicates
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => repairQAHreflangMutation.mutate()}
          disabled={repairQAHreflangMutation.isPending}
        >
          {repairQAHreflangMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Repair Q&A Hreflang
        </Button>
      </div>
    </div>
  );
};
