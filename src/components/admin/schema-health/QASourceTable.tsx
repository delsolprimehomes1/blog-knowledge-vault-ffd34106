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
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, Search } from "lucide-react";
import { Link } from "react-router-dom";

interface QAPageWithSource {
  id: string;
  slug: string;
  question_main: string;
  language: string;
  qa_type: string;
  status: string;
  source_article_id: string | null;
  source_article_slug: string | null;
  actual_source_slug: string | null;
  link_status: "valid" | "missing" | "mismatch";
}

export function QASourceTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: qaPages, isLoading } = useQuery({
    queryKey: ["schema-health-qa-sources"],
    queryFn: async (): Promise<QAPageWithSource[]> => {
      // First get QA pages
      const { data: qas, error: qasError } = await supabase
        .from("qa_pages")
        .select("id, slug, question_main, language, qa_type, status, source_article_id, source_article_slug")
        .order("created_at", { ascending: false });

      if (qasError) throw qasError;

      // Get source article slugs for verification
      const sourceIds = (qas || [])
        .filter((qa) => qa.source_article_id)
        .map((qa) => qa.source_article_id);

      let articleMap: Record<string, string> = {};
      if (sourceIds.length > 0) {
        const { data: articles, error: articlesError } = await supabase
          .from("blog_articles")
          .select("id, slug")
          .in("id", sourceIds);

        if (articlesError) throw articlesError;

        articleMap = (articles || []).reduce((acc, article) => {
          acc[article.id] = article.slug;
          return acc;
        }, {} as Record<string, string>);
      }

      return (qas || []).map((qa) => {
        const actualSlug = qa.source_article_id ? articleMap[qa.source_article_id] || null : null;
        
        let linkStatus: "valid" | "missing" | "mismatch" = "missing";
        if (qa.source_article_id && qa.source_article_slug) {
          linkStatus = qa.source_article_slug === actualSlug ? "valid" : "mismatch";
        } else if (qa.source_article_id && !qa.source_article_slug) {
          linkStatus = "missing";
        }

        return {
          ...qa,
          actual_source_slug: actualSlug,
          link_status: linkStatus,
        };
      });
    },
    staleTime: 60000,
  });

  const filteredQAs = qaPages?.filter((qa) => {
    const matchesSearch =
      qa.question_main.toLowerCase().includes(search.toLowerCase()) ||
      qa.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "valid" && qa.link_status === "valid") ||
      (statusFilter === "missing" && qa.link_status === "missing") ||
      (statusFilter === "mismatch" && qa.link_status === "mismatch");
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    valid: qaPages?.filter((qa) => qa.link_status === "valid").length || 0,
    missing: qaPages?.filter((qa) => qa.link_status === "missing").length || 0,
    mismatch: qaPages?.filter((qa) => qa.link_status === "mismatch").length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
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
            placeholder="Search QA pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Link Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({qaPages?.length || 0})</SelectItem>
            <SelectItem value="valid">✓ Valid ({statusCounts.valid})</SelectItem>
            <SelectItem value="missing">⚠ Missing ({statusCounts.missing})</SelectItem>
            <SelectItem value="mismatch">✗ Mismatch ({statusCounts.mismatch})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead className="w-20">Type</TableHead>
              <TableHead className="w-20">Lang</TableHead>
              <TableHead>Source Article</TableHead>
              <TableHead className="w-28">Link Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQAs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No QA pages found
                </TableCell>
              </TableRow>
            ) : (
              filteredQAs?.map((qa) => (
                <TableRow key={qa.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium line-clamp-1">{qa.question_main}</p>
                      <p className="text-xs text-muted-foreground">{qa.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {qa.qa_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{qa.language.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    {qa.source_article_slug ? (
                      <span className="text-sm text-muted-foreground">{qa.source_article_slug}</span>
                    ) : (
                      <span className="text-sm text-amber-600">Not linked</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {qa.link_status === "valid" && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">Valid</span>
                      </div>
                    )}
                    {qa.link_status === "missing" && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">Missing</span>
                      </div>
                    )}
                    {qa.link_status === "mismatch" && (
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs">Mismatch</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link to={`/${qa.language}/qa/${qa.slug}`} target="_blank">
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
        Showing {filteredQAs?.length || 0} of {qaPages?.length || 0} QA pages
      </p>
    </div>
  );
}
