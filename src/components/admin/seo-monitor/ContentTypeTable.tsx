import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, HelpCircle, Scale, MapPin } from "lucide-react";

interface ContentTypeStats {
  type: string;
  icon: React.ElementType;
  total: number;
  published: number;
  draft: number;
  hasMeta: number;
  hasCanonical: number;
  hasHreflang: number;
}

export const ContentTypeTable = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['seo-monitor', 'content-types'],
    queryFn: async (): Promise<ContentTypeStats[]> => {
      const [blogRes, qaRes, compRes, locRes] = await Promise.all([
        supabase.from('blog_articles').select('id, status, meta_title, meta_description, canonical_url, hreflang_group_id'),
        supabase.from('qa_pages').select('id, status, meta_title, meta_description, canonical_url, hreflang_group_id'),
        supabase.from('comparison_pages').select('id, status, meta_title, meta_description, canonical_url, hreflang_group_id'),
        supabase.from('location_pages').select('id, status, meta_title, meta_description, hreflang_group_id'),
      ]);

      const calculateStats = (data: any[] | null, type: string, icon: React.ElementType, hasCanonicalField = true): ContentTypeStats => {
        const items = data || [];
        return {
          type,
          icon,
          total: items.length,
          published: items.filter(i => i.status === 'published').length,
          draft: items.filter(i => i.status !== 'published').length,
          hasMeta: items.filter(i => i.meta_title && i.meta_description).length,
          hasCanonical: hasCanonicalField ? items.filter(i => i.canonical_url).length : -1,
          hasHreflang: items.filter(i => i.hreflang_group_id).length,
        };
      };

      return [
        calculateStats(blogRes.data, 'Blog Articles', FileText),
        calculateStats(qaRes.data, 'Q&A Pages', HelpCircle),
        calculateStats(compRes.data, 'Comparisons', Scale),
        calculateStats(locRes.data, 'Locations', MapPin, false),
      ];
    },
    staleTime: 60000,
  });

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30">🟢 {percentage}%</Badge>;
    if (percentage >= 70) return <Badge className="bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30">🟡 {percentage}%</Badge>;
    return <Badge className="bg-red-500/20 text-red-600 hover:bg-red-500/30">🔴 {percentage}%</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Content Type Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content Type</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Published</TableHead>
              <TableHead className="text-center">Draft</TableHead>
              <TableHead className="text-center">Has Meta</TableHead>
              <TableHead className="text-center">Has Canonical</TableHead>
              <TableHead className="text-center">Has Hreflang</TableHead>
              <TableHead className="text-center">SEO Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats?.map((row) => {
              const seoScore = Math.round(
                (getPercentage(row.hasMeta, row.total) + 
                 (row.hasCanonical >= 0 ? getPercentage(row.hasCanonical, row.total) : 100) + 
                 getPercentage(row.hasHreflang, row.total)) / 3
              );
              
              return (
                <TableRow key={row.type}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <row.icon className="h-4 w-4 text-muted-foreground" />
                      {row.type}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{row.total}</TableCell>
                  <TableCell className="text-center text-green-600">{row.published}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{row.draft}</TableCell>
                  <TableCell className="text-center">
                    <span className={row.hasMeta === row.total ? 'text-green-600' : 'text-yellow-600'}>
                      {getPercentage(row.hasMeta, row.total)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {row.hasCanonical >= 0 ? (
                      <span className={row.hasCanonical === row.total ? 'text-green-600' : 'text-yellow-600'}>
                        {getPercentage(row.hasCanonical, row.total)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={row.hasHreflang === row.total ? 'text-green-600' : 'text-yellow-600'}>
                      {getPercentage(row.hasHreflang, row.total)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getScoreBadge(seoScore)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
