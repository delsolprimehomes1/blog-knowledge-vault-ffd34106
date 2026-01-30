import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useDuplicateDetection, type DuplicatePair } from "@/hooks/useDuplicateDetection";
import { useDuplicateMerge } from "@/hooks/useDuplicateMerge";
import { DuplicateSummaryCards } from "@/components/admin/duplicate-detector/DuplicateSummaryCards";
import { DuplicatePairsTable } from "@/components/admin/duplicate-detector/DuplicatePairsTable";
import { ComparisonModal } from "@/components/admin/duplicate-detector/ComparisonModal";
import { MergeConfirmDialog } from "@/components/admin/duplicate-detector/MergeConfirmDialog";

export default function DuplicateDetector() {
  const { data, isLoading, refetch } = useDuplicateDetection();
  const mergeMutation = useDuplicateMerge();

  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [keepArticle, setKeepArticle] = useState<'a' | 'b' | null>(null);

  const handleViewPair = (pair: DuplicatePair) => {
    setSelectedPair(pair);
    setComparisonOpen(true);
  };

  const handleMergePair = (pair: DuplicatePair, keep: 'a' | 'b') => {
    setSelectedPair(pair);
    setKeepArticle(keep);
    setComparisonOpen(false);
    setMergeConfirmOpen(true);
  };

  const handleConfirmMerge = async (mergeCitations: boolean) => {
    if (!selectedPair || !keepArticle) return;

    const primary = keepArticle === 'a' ? selectedPair.articleA : selectedPair.articleB;
    const duplicate = keepArticle === 'a' ? selectedPair.articleB : selectedPair.articleA;

    await mergeMutation.mutateAsync({
      primaryArticleId: primary.id,
      duplicateArticleId: duplicate.id,
      duplicateSlug: duplicate.slug,
      duplicateLanguage: duplicate.language,
      mergeCitations,
    });

    setMergeConfirmOpen(false);
    setSelectedPair(null);
    setKeepArticle(null);
  };

  const stats = data?.stats || {
    totalPairs: 0,
    byMatchType: { nearDuplicateSlug: 0, identicalHeadline: 0 },
    byLanguage: {},
    potentialImpact: 0,
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Duplicate Content Detector</h1>
            <p className="text-muted-foreground">
              Find and resolve duplicate articles causing GSC indexing issues
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Rescan
          </Button>
        </div>

        {/* Summary Cards */}
        <DuplicateSummaryCards stats={stats} isLoading={isLoading} />

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Duplicate Pairs</CardTitle>
            <CardDescription>
              Review each pair and decide which article to keep. The duplicate will be marked as 410 (Gone).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DuplicatePairsTable
              pairs={data?.pairs || []}
              isLoading={isLoading}
              onViewPair={handleViewPair}
              onMergePair={handleMergePair}
            />
          </CardContent>
        </Card>

        {/* Comparison Modal */}
        <ComparisonModal
          pair={selectedPair}
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
          onMerge={(keep) => handleMergePair(selectedPair!, keep)}
        />

        {/* Merge Confirmation Dialog */}
        <MergeConfirmDialog
          pair={selectedPair}
          keepArticle={keepArticle}
          open={mergeConfirmOpen}
          onOpenChange={setMergeConfirmOpen}
          onConfirm={handleConfirmMerge}
          isLoading={mergeMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
}
