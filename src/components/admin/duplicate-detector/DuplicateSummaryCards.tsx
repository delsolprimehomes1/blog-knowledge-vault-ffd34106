import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, AlertTriangle, Globe, TrendingDown } from "lucide-react";
import type { DuplicateStats } from "@/hooks/useDuplicateDetection";

interface DuplicateSummaryCardsProps {
  stats: DuplicateStats;
  isLoading: boolean;
}

export function DuplicateSummaryCards({ stats, isLoading }: DuplicateSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const topLanguages = Object.entries(stats.byLanguage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([lang]) => lang.toUpperCase())
    .join(', ');

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Duplicate Pairs</CardTitle>
          <Copy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPairs}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalPairs * 2} total affected URLs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Near-Duplicate Slugs</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byMatchType.nearDuplicateSlug}</div>
          <p className="text-xs text-muted-foreground">
            e.g. slug vs slug-1
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Identical Headlines</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byMatchType.identicalHeadline}</div>
          <p className="text-xs text-muted-foreground">
            Same title, different pages
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Languages</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{topLanguages || 'N/A'}</div>
          <p className="text-xs text-muted-foreground">
            Most affected languages
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
