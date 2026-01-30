import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Merge, CheckCircle, AlertCircle, HelpCircle, Search } from "lucide-react";
import type { DuplicatePair } from "@/hooks/useDuplicateDetection";

interface DuplicatePairsTableProps {
  pairs: DuplicatePair[];
  isLoading: boolean;
  onViewPair: (pair: DuplicatePair) => void;
  onMergePair: (pair: DuplicatePair, keepArticle: 'a' | 'b') => void;
}

export function DuplicatePairsTable({
  pairs,
  isLoading,
  onViewPair,
  onMergePair,
}: DuplicatePairsTableProps) {
  const [search, setSearch] = useState("");
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");

  const languages = [...new Set(pairs.map(p => p.articleA.language))];

  const filteredPairs = pairs.filter(pair => {
    const matchesSearch = 
      pair.articleA.headline.toLowerCase().includes(search.toLowerCase()) ||
      pair.articleB.headline.toLowerCase().includes(search.toLowerCase()) ||
      pair.articleA.slug.toLowerCase().includes(search.toLowerCase()) ||
      pair.articleB.slug.toLowerCase().includes(search.toLowerCase());

    const matchesType = matchTypeFilter === "all" || pair.matchType === matchTypeFilter;
    const matchesLanguage = languageFilter === "all" || pair.articleA.language === languageFilter;

    return matchesSearch && matchesType && matchesLanguage;
  });

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'keep-a':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'keep-b':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1000) return `${bytes} chars`;
    return `${(bytes / 1000).toFixed(1)}k chars`;
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Loading duplicate pairs...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by headline or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Match Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="near-duplicate-slug">Near-Duplicate Slug</SelectItem>
            <SelectItem value="identical-headline">Identical Headline</SelectItem>
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {languages.map(lang => (
              <SelectItem key={lang} value={lang}>{lang.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredPairs.length} of {pairs.length} duplicate pairs
      </p>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Article A</TableHead>
              <TableHead>Article B</TableHead>
              <TableHead className="w-[100px]">Match</TableHead>
              <TableHead className="w-[80px]">Lang</TableHead>
              <TableHead className="w-[100px]">Recommendation</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {pairs.length === 0 ? "No duplicate pairs found!" : "No matches for current filters"}
                </TableCell>
              </TableRow>
            ) : (
              filteredPairs.map((pair) => (
                <TableRow key={pair.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm line-clamp-1">{pair.articleA.headline}</p>
                      <p className="text-xs text-muted-foreground">/{pair.articleA.slug}</p>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {formatBytes(pair.articleA.contentLength)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {pair.articleA.citationsCount} citations
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm line-clamp-1">{pair.articleB.headline}</p>
                      <p className="text-xs text-muted-foreground">/{pair.articleB.slug}</p>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {formatBytes(pair.articleB.contentLength)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {pair.articleB.citationsCount} citations
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pair.matchType === 'near-duplicate-slug' ? 'secondary' : 'destructive'}>
                      {pair.matchType === 'near-duplicate-slug' ? 'Slug' : 'Headline'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{pair.articleA.language.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(pair.recommendation)}
                      <span className="text-xs">
                        {pair.recommendation === 'keep-a' && 'Keep A'}
                        {pair.recommendation === 'keep-b' && 'Keep B'}
                        {pair.recommendation === 'review' && 'Review'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewPair(pair)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMergePair(pair, 'a')}
                        title="Keep A, remove B"
                      >
                        <Merge className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMergePair(pair, 'b')}
                        title="Keep B, remove A"
                      >
                        <Merge className="h-4 w-4 text-blue-500 rotate-180" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
