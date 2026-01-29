import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, Link2, Image, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UnifiedDashboardStats } from "@/hooks/useUnifiedDashboardStats";

interface SEOHealthSectionProps {
  stats: UnifiedDashboardStats;
}

export function SEOHealthSection({ stats }: SEOHealthSectionProps) {
  const navigate = useNavigate();

  const healthItems = [
    {
      label: "Citation Health",
      score: stats.citationHealthScore,
      issues: stats.brokenCitations,
      icon: Link2,
      onClick: () => navigate("/admin/citation-health"),
    },
    {
      label: "Image Health",
      score: stats.imageIssues === 0 ? 100 : Math.max(0, 100 - stats.imageIssues * 5),
      issues: stats.imageIssues,
      icon: Image,
      onClick: () => navigate("/admin/image-health"),
    },
  ];

  const overallScore = Math.round(
    healthItems.reduce((sum, item) => sum + item.score, 0) / healthItems.length
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          SEO Health
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/seo-monitor")}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Full Report
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall score */}
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-2 mb-2">
            {overallScore >= 90 ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : overallScore >= 70 ? (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            )}
            <span
              className={`text-4xl font-bold ${
                overallScore >= 90
                  ? "text-green-600"
                  : overallScore >= 70
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              {overallScore}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Overall SEO Health</p>
        </div>

        {/* Individual metrics */}
        <div className="space-y-4">
          {healthItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full p-3 rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                <span
                  className={`text-sm font-bold ${
                    item.score >= 90
                      ? "text-green-600"
                      : item.score >= 70
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {item.score}%
                </span>
              </div>
              <Progress
                value={item.score}
                className="h-2"
              />
              {item.issues > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.issues} issue{item.issues !== 1 ? "s" : ""} to fix
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => navigate("/admin/schema-health")}
          >
            Schema Health
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => navigate("/admin/broken-links")}
          >
            Broken Links
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
