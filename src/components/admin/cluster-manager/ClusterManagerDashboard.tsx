import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FolderOpen, 
  FileText, 
  CheckCircle, 
  Globe, 
  ImageIcon, 
  Link2,
  AlertTriangle
} from "lucide-react";
import { ClusterManagerStats } from "@/hooks/useClusterManagerStats";

interface ClusterManagerDashboardProps {
  stats: ClusterManagerStats | undefined;
  isLoading: boolean;
}

export function ClusterManagerDashboard({ stats, isLoading }: ClusterManagerDashboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const overviewCards = [
    {
      icon: FolderOpen,
      value: stats.totalClusters,
      label: "Total Clusters",
      color: "text-blue-600",
    },
    {
      icon: FileText,
      value: stats.totalArticles,
      label: "Total Articles",
      color: "text-purple-600",
    },
    {
      icon: CheckCircle,
      value: `${stats.publishedPercent}%`,
      label: "Published",
      color: "text-green-600",
      subtitle: `${stats.publishedArticles} of ${stats.totalArticles}`,
    },
    {
      icon: Globe,
      value: stats.languageCount,
      label: "Languages",
      color: "text-indigo-600",
    },
  ];

  const healthCards = [
    {
      icon: ImageIcon,
      title: "Images",
      healthy: stats.articlesWithImages,
      missing: stats.articlesMissingImages,
      healthyLabel: "have images",
      missingLabel: "missing",
      color: stats.articlesMissingImages > 0 ? "border-amber-200" : "border-green-200",
    },
    {
      icon: Link2,
      title: "External Links",
      healthy: stats.articlesWithCitations,
      missing: stats.articlesMissingCitations,
      healthyLabel: "have citations",
      missingLabel: "missing",
      color: stats.articlesMissingCitations > 0 ? "border-amber-200" : "border-green-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overviewCards.map((card, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs text-muted-foreground">{card.label}</div>
                  {card.subtitle && (
                    <div className="text-xs text-muted-foreground">{card.subtitle}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Health */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Content Health
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healthCards.map((card, i) => (
            <Card key={i} className={`border-2 ${card.color}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{card.title}</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ✓ {card.healthy}
                    </Badge>
                    <span className="text-muted-foreground">{card.healthyLabel}</span>
                  </div>
                  {card.missing > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        ⚠ {card.missing}
                      </Badge>
                      <span className="text-muted-foreground">{card.missingLabel}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Language Breakdown (collapsed by default, showing just counts) */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Language Distribution</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.languageBreakdown)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([lang, data]) => (
              <Badge 
                key={lang} 
                variant="outline" 
                className={`${
                  data.draft > 0 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-green-50 border-green-200'
                }`}
              >
                {lang.toUpperCase()}: {data.published}/{data.total}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}
