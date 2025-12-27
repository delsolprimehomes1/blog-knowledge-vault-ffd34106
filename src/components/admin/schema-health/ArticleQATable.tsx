import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, ExternalLink, Search } from "lucide-react";
import { Link } from "react-router-dom";

interface ArticleWithQACount {
  id: string;
  slug: string;
  headline: string;
  language: string;
  status: string;
  generated_qa_page_ids: string[] | null;
  qa_count: number;
}

export function ArticleQATable() {
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["schema-health-articles"],
    queryFn: async (): Promise<ArticleWithQACount[]> => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, language, status, generated_qa_page_ids")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((article) => ({
        ...article,
        qa_count: article.generated_qa_page_ids?.length || 0,
      }));
    },
    staleTime: 60000,
  });

  const filteredArticles = articles?.filter((article) => {
    const matchesSearch =
      article.headline.toLowerCase().includes(search.toLowerCase()) ||
      article.slug.toLowerCase().includes(search.toLowerCase());
    const matchesLanguage = languageFilter === "all" || article.language === languageFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "with-qa" && article.qa_count > 0) ||
      (statusFilter === "without-qa" && article.qa_count === 0);
    return matchesSearch && matchesLanguage && matchesStatus;
  });

  const languages = [...new Set(articles?.map((a) => a.language) || [])].sort();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border-b last:border-0">
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {languages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="QA Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Articles</SelectItem>
            <SelectItem value="with-qa">With QA Pages</SelectItem>
            <SelectItem value="without-qa">Missing QA Pages</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Article</TableHead>
              <TableHead className="w-24">Language</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32">QA Pages</TableHead>
              <TableHead className="w-24">Schema</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredArticles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No articles found
                </TableCell>
              </TableRow>
            ) : (
              filteredArticles?.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium line-clamp-1">{article.headline}</p>
                      <p className="text-xs text-muted-foreground">{article.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{article.language.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={article.status === "published" ? "default" : "secondary"}>
                      {article.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {article.qa_count > 0 ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>{article.qa_count} pages</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-muted-foreground">None</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {article.qa_count > 0 ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        Valid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                        Incomplete
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link to={`/${article.language}/blog/${article.slug}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filteredArticles?.length || 0} of {articles?.length || 0} articles
      </p>
    </div>
  );
}
