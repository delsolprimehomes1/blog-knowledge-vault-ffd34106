import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe2 } from "lucide-react";

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  nl: '🇳🇱',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  it: '🇮🇹',
  sv: '🇸🇪',
  da: '🇩🇰',
  no: '🇳🇴',
  fi: '🇫🇮',
  pl: '🇵🇱',
  ru: '🇷🇺',
  tr: '🇹🇷',
  hu: '🇭🇺',
};

interface LanguageStats {
  language: string;
  blog: number;
  qa: number;
  compare: number;
  location: number;
  total: number;
}

export const LanguageMatrix = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['seo-monitor', 'language-matrix'],
    queryFn: async (): Promise<LanguageStats[]> => {
      const [blogRes, qaRes, compRes, locRes] = await Promise.all([
        supabase.from('blog_articles').select('language').eq('status', 'published'),
        supabase.from('qa_pages').select('language').eq('status', 'published'),
        supabase.from('comparison_pages').select('language').eq('status', 'published'),
        supabase.from('location_pages').select('language').eq('status', 'published'),
      ]);

      const countByLanguage = (data: any[] | null): Record<string, number> => {
        return (data || []).reduce((acc, item) => {
          const lang = item.language || 'en';
          acc[lang] = (acc[lang] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      };

      const blogCounts = countByLanguage(blogRes.data);
      const qaCounts = countByLanguage(qaRes.data);
      const compCounts = countByLanguage(compRes.data);
      const locCounts = countByLanguage(locRes.data);

      const allLanguages = new Set([
        ...Object.keys(blogCounts),
        ...Object.keys(qaCounts),
        ...Object.keys(compCounts),
        ...Object.keys(locCounts),
      ]);

      return Array.from(allLanguages)
        .map(lang => ({
          language: lang,
          blog: blogCounts[lang] || 0,
          qa: qaCounts[lang] || 0,
          compare: compCounts[lang] || 0,
          location: locCounts[lang] || 0,
          total: (blogCounts[lang] || 0) + (qaCounts[lang] || 0) + (compCounts[lang] || 0) + (locCounts[lang] || 0),
        }))
        .sort((a, b) => b.total - a.total);
    },
    staleTime: 60000,
  });

  const getCellColor = (count: number, max: number) => {
    if (count === 0) return 'bg-muted/50 text-muted-foreground';
    const intensity = Math.min(count / Math.max(max, 1), 1);
    if (intensity > 0.7) return 'bg-green-500/20 text-green-700 font-semibold';
    if (intensity > 0.3) return 'bg-green-500/10 text-green-600';
    return 'bg-green-500/5 text-foreground';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Language Coverage Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxBlog = Math.max(...(stats?.map(s => s.blog) || [1]));
  const maxQA = Math.max(...(stats?.map(s => s.qa) || [1]));
  const maxComp = Math.max(...(stats?.map(s => s.compare) || [1]));
  const maxLoc = Math.max(...(stats?.map(s => s.location) || [1]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="h-5 w-5" />
          Language Coverage Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Language</TableHead>
                <TableHead className="text-center">Blog</TableHead>
                <TableHead className="text-center">Q&A</TableHead>
                <TableHead className="text-center">Compare</TableHead>
                <TableHead className="text-center">Location</TableHead>
                <TableHead className="text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.map((row) => (
                <TableRow key={row.language}>
                  <TableCell className="font-medium">
                    <span className="mr-2">{LANGUAGE_FLAGS[row.language] || '🌐'}</span>
                    {row.language.toUpperCase()}
                  </TableCell>
                  <TableCell className={`text-center ${getCellColor(row.blog, maxBlog)}`}>
                    {row.blog}
                  </TableCell>
                  <TableCell className={`text-center ${getCellColor(row.qa, maxQA)}`}>
                    {row.qa}
                  </TableCell>
                  <TableCell className={`text-center ${getCellColor(row.compare, maxComp)}`}>
                    {row.compare}
                  </TableCell>
                  <TableCell className={`text-center ${getCellColor(row.location, maxLoc)}`}>
                    {row.location}
                  </TableCell>
                  <TableCell className="text-center font-bold">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
