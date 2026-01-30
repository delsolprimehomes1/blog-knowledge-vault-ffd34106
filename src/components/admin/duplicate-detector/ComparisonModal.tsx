import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Calendar, FileText, Link2, ExternalLink } from "lucide-react";
import type { DuplicatePair } from "@/hooks/useDuplicateDetection";

interface ComparisonModalProps {
  pair: DuplicatePair | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerge: (keepArticle: 'a' | 'b') => void;
}

export function ComparisonModal({ pair, open, onOpenChange, onMerge }: ComparisonModalProps) {
  if (!pair) return null;

  const { articleA, articleB, matchType, recommendation } = pair;

  const formatDate = (date: string | null) => {
    if (!date) return 'Not published';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getWinner = (field: 'content' | 'citations' | 'date' | 'hreflang') => {
    switch (field) {
      case 'content':
        if (articleA.contentLength > articleB.contentLength) return 'a';
        if (articleB.contentLength > articleA.contentLength) return 'b';
        return null;
      case 'citations':
        if (articleA.citationsCount > articleB.citationsCount) return 'a';
        if (articleB.citationsCount > articleA.citationsCount) return 'b';
        return null;
      case 'date':
        if (!articleA.datePublished && !articleB.datePublished) return null;
        if (!articleA.datePublished) return 'b';
        if (!articleB.datePublished) return 'a';
        return new Date(articleA.datePublished) < new Date(articleB.datePublished) ? 'a' : 'b';
      case 'hreflang':
        if (articleA.hreflangGroupId && !articleB.hreflangGroupId) return 'a';
        if (articleB.hreflangGroupId && !articleA.hreflangGroupId) return 'b';
        return null;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Compare Duplicate Articles</DialogTitle>
          <DialogDescription>
            Review both articles and decide which one to keep. The other will be marked as 410 (Gone).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant={matchType === 'near-duplicate-slug' ? 'secondary' : 'destructive'}>
            {matchType === 'near-duplicate-slug' ? 'Near-Duplicate Slug' : 'Identical Headline'}
          </Badge>
          <Badge variant="outline">
            Recommendation: {recommendation === 'keep-a' ? 'Keep A' : recommendation === 'keep-b' ? 'Keep B' : 'Manual Review'}
          </Badge>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Article A */}
            <Card className={recommendation === 'keep-a' ? 'ring-2 ring-green-500' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Article A</CardTitle>
                  {recommendation === 'keep-a' && (
                    <Badge className="bg-green-500">Recommended</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{articleA.headline}</p>
                  <p className="text-sm text-muted-foreground">/{articleA.slug}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" /> Content Length
                    </span>
                    <span className="flex items-center gap-1">
                      {(articleA.contentLength / 1000).toFixed(1)}k chars
                      {getWinner('content') === 'a' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {getWinner('content') === 'b' && <XCircle className="h-4 w-4 text-red-500" />}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Link2 className="h-4 w-4" /> Citations
                    </span>
                    <span className="flex items-center gap-1">
                      {articleA.citationsCount}
                      {getWinner('citations') === 'a' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {getWinner('citations') === 'b' && <XCircle className="h-4 w-4 text-red-500" />}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" /> Published
                    </span>
                    <span className="flex items-center gap-1">
                      {formatDate(articleA.datePublished)}
                      {getWinner('date') === 'a' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {getWinner('date') === 'b' && <XCircle className="h-4 w-4 text-red-500" />}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hreflang Group</span>
                    <span className="flex items-center gap-1">
                      {articleA.hreflangGroupId ? 'Linked' : 'None'}
                      {getWinner('hreflang') === 'a' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {getWinner('hreflang') === 'b' && <XCircle className="h-4 w-4 text-red-500" />}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant={articleA.status === 'published' ? 'default' : 'secondary'}>
                      {articleA.status}
                    </Badge>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={recommendation === 'keep-a' ? 'default' : 'outline'}
                  onClick={() => onMerge('a')}
                >
                  Keep A, Remove B
                </Button>
              </CardContent>
            </Card>

            {/* Article B */}
            <Card className={recommendation === 'keep-b' ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Article B</CardTitle>
                  {recommendation === 'keep-b' && (
                    <Badge className="bg-blue-500">Recommended</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{articleB.headline}</p>
                  <p className="text-sm text-muted-foreground">/{articleB.slug}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" /> Content Length
                    </span>
                    <span className="flex items-center gap-1">
                      {(articleB.contentLength / 1000).toFixed(1)}k chars
                      {getWinner('content') === 'b' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {getWinner('content') === 'a' && <XCircle className="h-4 w-4 text-red-500" />}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Link2 className="h-4 w-4" /> Citations
                    </span>
                    <span className="flex items-center gap-1">
                      {articleB.citationsCount}
                      {getWinner('citations') === 'b' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {getWinner('citations') === 'a' && <XCircle className="h-4 w-4 text-red-500" />}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" /> Published
                    </span>
                    <span className="flex items-center gap-1">
                      {formatDate(articleB.datePublished)}
                      {getWinner('date') === 'b' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {getWinner('date') === 'a' && <XCircle className="h-4 w-4 text-red-500" />}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hreflang Group</span>
                    <span className="flex items-center gap-1">
                      {articleB.hreflangGroupId ? 'Linked' : 'None'}
                      {getWinner('hreflang') === 'b' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {getWinner('hreflang') === 'a' && <XCircle className="h-4 w-4 text-red-500" />}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant={articleB.status === 'published' ? 'default' : 'secondary'}>
                      {articleB.status}
                    </Badge>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={recommendation === 'keep-b' ? 'default' : 'outline'}
                  onClick={() => onMerge('b')}
                >
                  Keep B, Remove A
                </Button>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
