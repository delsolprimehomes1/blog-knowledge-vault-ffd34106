import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SEOIssue {
  type: 'missing_meta' | 'missing_canonical' | 'missing_hreflang' | 'orphan_content';
  severity: 'warning' | 'error';
  contentType: string;
  count: number;
  items: Array<{ id: string; title: string; language: string; slug?: string }>;
}

export const SEOIssuesPanel = () => {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const { data: issues, isLoading } = useQuery({
    queryKey: ['seo-monitor', 'issues'],
    queryFn: async (): Promise<SEOIssue[]> => {
      const [blogRes, qaRes, compRes, locRes] = await Promise.all([
        supabase.from('blog_articles').select('id, headline, language, slug, meta_title, meta_description, canonical_url, hreflang_group_id, status').eq('status', 'published'),
        supabase.from('qa_pages').select('id, title, language, slug, meta_title, meta_description, canonical_url, hreflang_group_id, status').eq('status', 'published'),
        supabase.from('comparison_pages').select('id, headline, language, slug, meta_title, meta_description, canonical_url, hreflang_group_id, status').eq('status', 'published'),
        supabase.from('location_pages').select('id, headline, language, city_slug, topic_slug, meta_title, meta_description, hreflang_group_id, status').eq('status', 'published'),
      ]);

      const foundIssues: SEOIssue[] = [];

      // Check blog articles for missing metadata
      const blogMissingMeta = (blogRes.data || []).filter(a => !a.meta_title || !a.meta_description);
      if (blogMissingMeta.length > 0) {
        foundIssues.push({
          type: 'missing_meta',
          severity: 'error',
          contentType: 'Blog Articles',
          count: blogMissingMeta.length,
          items: blogMissingMeta.map(a => ({ id: a.id, title: a.headline, language: a.language, slug: a.slug })),
        });
      }

      // Check comparisons for missing canonical
      const compMissingCanonical = (compRes.data || []).filter(c => !c.canonical_url);
      if (compMissingCanonical.length > 0) {
        foundIssues.push({
          type: 'missing_canonical',
          severity: 'warning',
          contentType: 'Comparisons',
          count: compMissingCanonical.length,
          items: compMissingCanonical.map(c => ({ id: c.id, title: c.headline, language: c.language, slug: c.slug })),
        });
      }

      // Check for missing hreflang across all content types
      const allContent = [
        ...(blogRes.data || []).map(a => ({ id: a.id, title: a.headline, language: a.language, slug: a.slug, hreflang_group_id: a.hreflang_group_id, type: 'blog' })),
        ...(qaRes.data || []).map(q => ({ id: q.id, title: q.title, language: q.language, slug: q.slug, hreflang_group_id: q.hreflang_group_id, type: 'qa' })),
        ...(compRes.data || []).map(c => ({ id: c.id, title: c.headline, language: c.language, slug: c.slug, hreflang_group_id: c.hreflang_group_id, type: 'compare' })),
        ...(locRes.data || []).map(l => ({ id: l.id, title: l.headline, language: l.language, slug: `${l.city_slug}/${l.topic_slug}`, hreflang_group_id: l.hreflang_group_id, type: 'location' })),
      ];

      const missingHreflang = allContent.filter(c => !c.hreflang_group_id);
      if (missingHreflang.length > 0) {
        foundIssues.push({
          type: 'missing_hreflang',
          severity: 'warning',
          contentType: 'All Content',
          count: missingHreflang.length,
          items: missingHreflang.slice(0, 20).map(c => ({ id: c.id, title: c.title, language: c.language, slug: c.slug })),
        });
      }

      // Check QA pages for missing metadata
      const qaMissingMeta = (qaRes.data || []).filter(q => !q.meta_title || !q.meta_description);
      if (qaMissingMeta.length > 0) {
        foundIssues.push({
          type: 'missing_meta',
          severity: 'error',
          contentType: 'Q&A Pages',
          count: qaMissingMeta.length,
          items: qaMissingMeta.map(q => ({ id: q.id, title: q.title, language: q.language, slug: q.slug })),
        });
      }

      return foundIssues;
    },
    staleTime: 60000,
  });

  const toggleIssue = (issueKey: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueKey)) {
        next.delete(issueKey);
      } else {
        next.add(issueKey);
      }
      return next;
    });
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'missing_meta':
        return '📝';
      case 'missing_canonical':
        return '🔗';
      case 'missing_hreflang':
        return '🌐';
      default:
        return '⚠️';
    }
  };

  const getIssueLabel = (type: string) => {
    switch (type) {
      case 'missing_meta':
        return 'Missing Meta Title/Description';
      case 'missing_canonical':
        return 'Missing Canonical URL';
      case 'missing_hreflang':
        return 'Missing Hreflang Group';
      default:
        return 'Unknown Issue';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SEO Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasIssues = issues && issues.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasIssues ? (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          SEO Issues
          {hasIssues && (
            <Badge variant="secondary" className="ml-2">
              {issues.reduce((sum, i) => sum + i.count, 0)} total
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasIssues ? (
          <div className="flex items-center gap-2 text-green-600 py-4">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All content has complete SEO metadata!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue, index) => {
              const issueKey = `${issue.type}-${issue.contentType}`;
              const isExpanded = expandedIssues.has(issueKey);

              return (
                <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleIssue(issueKey)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getIssueIcon(issue.type)}</span>
                        <div>
                          <p className="font-medium text-sm">{getIssueLabel(issue.type)}</p>
                          <p className="text-xs text-muted-foreground">{issue.contentType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'}>
                          {issue.count} items
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 pl-10 pr-3 pb-3 space-y-1">
                      {issue.items.slice(0, 10).map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-1 text-sm">
                          <div className="flex items-center gap-2 truncate flex-1">
                            <span className="text-xs text-muted-foreground uppercase">{item.language}</span>
                            <span className="truncate">{item.title}</span>
                          </div>
                          <a
                            href={`/admin/articles/${item.id}/edit`}
                            className="text-primary hover:underline text-xs flex items-center gap-1"
                          >
                            Edit <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                      {issue.items.length > 10 && (
                        <p className="text-xs text-muted-foreground pt-2">
                          ...and {issue.items.length - 10} more items
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
