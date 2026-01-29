import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FileText, AlertTriangle, Image, Link2, Globe, ExternalLink, FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UnifiedDashboardStats } from "@/hooks/useUnifiedDashboardStats";

interface ContentSectionProps {
  stats: UnifiedDashboardStats;
}

const STATUS_COLORS = {
  published: "#10B981",
  draft: "#F59E0B",
  archived: "#6B7280",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  nl: "Dutch",
  de: "German",
  fr: "French",
  es: "Spanish",
  pl: "Polish",
  sv: "Swedish",
  da: "Danish",
  hu: "Hungarian",
  fi: "Finnish",
  no: "Norwegian",
};

export function ContentSection({ stats }: ContentSectionProps) {
  const navigate = useNavigate();

  const statusData = [
    { name: "Published", value: stats.articlesByStatus.published, color: STATUS_COLORS.published },
    { name: "Draft", value: stats.articlesByStatus.draft, color: STATUS_COLORS.draft },
    { name: "Archived", value: stats.articlesByStatus.archived, color: STATUS_COLORS.archived },
  ];

  const languageData = Object.entries(stats.articlesByLanguage)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => ({
      name: LANGUAGE_NAMES[lang] || lang.toUpperCase(),
      value: count,
    }));

  const contentHealthIssues = [
    {
      label: "Missing Translations",
      count: stats.articlesMissingTranslations,
      icon: Globe,
      color: "text-amber-600",
      onClick: () => navigate("/admin/articles"),
    },
    {
      label: "Missing Images",
      count: stats.articlesMissingImages,
      icon: Image,
      color: "text-purple-600",
      onClick: () => navigate("/admin/image-health"),
    },
    {
      label: "Missing Citations",
      count: stats.articlesMissingCitations,
      icon: Link2,
      color: "text-blue-600",
      onClick: () => navigate("/admin/citation-health"),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Content Overview
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/clusters")}>
            <FolderKanban className="h-4 w-4 mr-2" />
            Clusters
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/articles")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Articles
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalArticles}</p>
            <p className="text-xs text-muted-foreground">Blog Articles</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.totalQAPages}</p>
            <p className="text-xs text-muted-foreground">Q&A Pages</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.totalComparisons}</p>
            <p className="text-xs text-muted-foreground">Comparisons</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.totalLocationPages}</p>
            <p className="text-xs text-muted-foreground">Locations</p>
          </div>
        </div>

        {/* Status & Language charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div>
            <h4 className="text-sm font-medium mb-3">Articles by Status</h4>
            <div className="flex items-center gap-4">
              <div className="h-28 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={45}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Language Distribution */}
          <div>
            <h4 className="text-sm font-medium mb-3">Published by Language</h4>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {languageData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(item.value / Math.max(...languageData.map(d => d.value))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="font-medium w-10 text-right">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content health alerts */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Content Health Issues
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {contentHealthIssues.map((issue) => (
              <button
                key={issue.label}
                onClick={issue.onClick}
                className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <issue.icon className={`h-4 w-4 ${issue.color}`} />
                  <span className={`text-lg font-bold ${issue.count > 0 ? issue.color : "text-green-600"}`}>
                    {issue.count}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{issue.label}</p>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
