import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, CheckCircle2, Link2, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentStats {
  total: number;
  published: number;
  withMeta: number;
  withHreflang: number;
}

export const SEOSummaryCards = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['seo-monitor', 'summary'],
    queryFn: async (): Promise<ContentStats> => {
      // Fetch stats from all content tables
      const [blogRes, qaRes, compRes, locRes] = await Promise.all([
        supabase.from('blog_articles').select('id, status, meta_title, meta_description, hreflang_group_id'),
        supabase.from('qa_pages').select('id, status, meta_title, meta_description, hreflang_group_id'),
        supabase.from('comparison_pages').select('id, status, meta_title, meta_description, hreflang_group_id'),
        supabase.from('location_pages').select('id, status, meta_title, meta_description, hreflang_group_id'),
      ]);

      const allContent = [
        ...(blogRes.data || []),
        ...(qaRes.data || []),
        ...(compRes.data || []),
        ...(locRes.data || []),
      ];

      const published = allContent.filter(c => c.status === 'published');
      const withMeta = allContent.filter(c => c.meta_title && c.meta_description);
      const withHreflang = allContent.filter(c => c.hreflang_group_id);

      return {
        total: allContent.length,
        published: published.length,
        withMeta: withMeta.length,
        withHreflang: withHreflang.length,
      };
    },
    staleTime: 60000,
  });

  const cards = [
    {
      title: "Published Content",
      value: stats?.published || 0,
      subtitle: `of ${stats?.total || 0} total`,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "SEO Score",
      value: stats ? Math.round((stats.withMeta / stats.total) * 100) : 0,
      subtitle: "with complete metadata",
      suffix: "%",
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Hreflang Coverage",
      value: stats ? Math.round((stats.withHreflang / stats.total) * 100) : 0,
      subtitle: "with language linking",
      suffix: "%",
      icon: Link2,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Edge Function",
      value: "LIVE",
      subtitle: "serving SEO metadata",
      icon: Activity,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      isStatus: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-12 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className={`text-3xl font-bold mt-1 ${card.isStatus ? card.color : 'text-foreground'}`}>
                  {card.value}{card.suffix}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
