import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, HelpCircle, Link2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SummaryStats {
  totalArticles: number;
  articlesWithQAs: number;
  articlesWithoutQAs: number;
  totalQAPages: number;
  linkedQAPages: number;
  orphanedQAPages: number;
  schemaCompleteness: number;
}

export function SummaryCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["schema-health-summary"],
    queryFn: async (): Promise<SummaryStats> => {
      // Fetch articles with and without QA pages
      const { data: articles, error: articlesError } = await supabase
        .from("blog_articles")
        .select("id, generated_qa_page_ids, status")
        .eq("status", "published");

      if (articlesError) throw articlesError;

      const totalArticles = articles?.length || 0;
      const articlesWithQAs = articles?.filter(
        (a) => a.generated_qa_page_ids && a.generated_qa_page_ids.length > 0
      ).length || 0;
      const articlesWithoutQAs = totalArticles - articlesWithQAs;

      // Fetch QA pages
      const { data: qaPages, error: qaPagesError } = await supabase
        .from("qa_pages")
        .select("id, source_article_id, source_article_slug, status")
        .eq("status", "published");

      if (qaPagesError) throw qaPagesError;

      const totalQAPages = qaPages?.length || 0;
      const linkedQAPages = qaPages?.filter(
        (qa) => qa.source_article_id && qa.source_article_slug
      ).length || 0;
      const orphanedQAPages = totalQAPages - linkedQAPages;

      // Calculate schema completeness percentage
      const schemaCompleteness = totalArticles > 0
        ? Math.round((articlesWithQAs / totalArticles) * 100)
        : 0;

      return {
        totalArticles,
        articlesWithQAs,
        articlesWithoutQAs,
        totalQAPages,
        linkedQAPages,
        orphanedQAPages,
        schemaCompleteness,
      };
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Articles with QAs",
      value: `${stats?.articlesWithQAs || 0}/${stats?.totalArticles || 0}`,
      subtitle: `${stats?.articlesWithoutQAs || 0} articles missing QA pages`,
      icon: FileText,
      iconColor: "text-blue-500",
    },
    {
      title: "Total QA Pages",
      value: stats?.totalQAPages || 0,
      subtitle: `${stats?.linkedQAPages || 0} properly linked`,
      icon: HelpCircle,
      iconColor: "text-purple-500",
    },
    {
      title: "Orphaned QA Pages",
      value: stats?.orphanedQAPages || 0,
      subtitle: stats?.orphanedQAPages === 0 ? "All QAs linked correctly" : "Missing source article link",
      icon: stats?.orphanedQAPages === 0 ? CheckCircle2 : AlertTriangle,
      iconColor: stats?.orphanedQAPages === 0 ? "text-green-500" : "text-amber-500",
    },
    {
      title: "Schema Completeness",
      value: `${stats?.schemaCompleteness || 0}%`,
      subtitle: "Articles with bidirectional links",
      icon: Link2,
      iconColor: stats?.schemaCompleteness === 100 ? "text-green-500" : "text-orange-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
