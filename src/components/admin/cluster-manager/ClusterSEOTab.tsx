import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ClusterData, ClusterSEOAuditResult, getLanguageFlag } from "./types";

interface ClusterSEOTabProps {
  cluster: ClusterData;
  onAudit: () => void;
  isAuditing: boolean;
}

export const ClusterSEOTab = ({ cluster, onAudit, isAuditing }: ClusterSEOTabProps) => {
  const [lastAudit, setLastAudit] = useState<ClusterSEOAuditResult | null>(null);

  const auditMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("audit-cluster-seo", {
        body: { cluster_id: cluster.cluster_id },
      });
      if (error) throw error;
      return data as ClusterSEOAuditResult;
    },
    onSuccess: (data) => {
      setLastAudit(data);
      if (data.is_seo_ready) {
        toast.success("Cluster passes all SEO checks!");
      } else {
        toast.warning(`${data.issues_count} SEO issues found`);
      }
    },
    onError: (error) => {
      toast.error(`Audit failed: ${error.message}`);
    },
  });

  const handleAudit = () => {
    auditMutation.mutate();
  };

  const isRunning = auditMutation.isPending || isAuditing;

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{cluster.total_articles}</div>
          <div className="text-xs text-muted-foreground">Blog Articles</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{cluster.total_qa_pages}</div>
          <div className="text-xs text-muted-foreground">Q&A Pages</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div
            className={`text-2xl font-bold ${
              lastAudit
                ? lastAudit.is_seo_ready
                  ? "text-green-600"
                  : "text-amber-600"
                : ""
            }`}
          >
            {lastAudit ? `${lastAudit.overall_health_score}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Health Score</div>
        </div>
      </div>

      {/* Last Audit Summary */}
      {lastAudit && (
        <Card
          className={`${
            lastAudit.is_seo_ready
              ? "border-green-200 bg-green-50 dark:bg-green-950/30"
              : "border-amber-200 bg-amber-50 dark:bg-amber-950/30"
          }`}
        >
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              {lastAudit.is_seo_ready ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <span className="font-medium">
                {lastAudit.is_seo_ready
                  ? "SEO Ready!"
                  : `${lastAudit.issues_count} issues found`}
              </span>
            </div>

            {/* Blog Issues Summary */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Blog Articles ({lastAudit.blog_audit.health_score}%):</p>
              <div className="flex flex-wrap gap-2">
                {lastAudit.blog_audit.missing_canonicals.length > 0 && (
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    <XCircle className="h-3 w-3 mr-1" />
                    {lastAudit.blog_audit.missing_canonicals.length} missing canonicals
                  </Badge>
                )}
                {lastAudit.blog_audit.missing_hreflang_group.length > 0 && (
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    <XCircle className="h-3 w-3 mr-1" />
                    {lastAudit.blog_audit.missing_hreflang_group.length} missing hreflang groups
                  </Badge>
                )}
                {lastAudit.blog_audit.missing_translations.length > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {lastAudit.blog_audit.missing_translations.length} incomplete translations
                  </Badge>
                )}
                {lastAudit.blog_audit.health_score === 100 && (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    All checks passed
                  </Badge>
                )}
              </div>
            </div>

            {/* Q&A Issues Summary */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Q&A Pages ({lastAudit.qa_audit.health_score}%):</p>
              <div className="flex flex-wrap gap-2">
                {lastAudit.qa_audit.duplicate_language_groups.length > 0 && (
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    <XCircle className="h-3 w-3 mr-1" />
                    {lastAudit.qa_audit.duplicate_language_groups.length} duplicate groups
                  </Badge>
                )}
                {lastAudit.qa_audit.language_mismatch.length > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {lastAudit.qa_audit.language_mismatch.length} language mismatches
                  </Badge>
                )}
                {lastAudit.qa_audit.health_score === 100 && (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    All checks passed
                  </Badge>
                )}
              </div>
            </div>

            {/* Language Coverage */}
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Language Coverage:</p>
              <div className="flex flex-wrap gap-1">
                {lastAudit.blog_audit.languages_found.map((lang) => (
                  <Badge
                    key={lang}
                    variant="outline"
                    className="bg-green-50 border-green-200 dark:bg-green-950/30 text-xs"
                  >
                    {getLanguageFlag(lang)}
                  </Badge>
                ))}
                {lastAudit.blog_audit.missing_languages.map((lang) => (
                  <Badge
                    key={lang}
                    variant="outline"
                    className="bg-red-50 border-red-200 text-red-600 dark:bg-red-950/30 text-xs"
                  >
                    {getLanguageFlag(lang)} ✗
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button variant="default" size="sm" onClick={handleAudit} disabled={isRunning}>
          {isRunning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileCheck className="mr-2 h-4 w-4" />
          )}
          {lastAudit ? "Re-run SEO Audit" : "Run SEO Audit"}
        </Button>
      </div>
    </div>
  );
};
