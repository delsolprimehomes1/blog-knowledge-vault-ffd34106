import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import type { DuplicatePair } from "@/hooks/useDuplicateDetection";

interface MergeConfirmDialogProps {
  pair: DuplicatePair | null;
  keepArticle: 'a' | 'b' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mergeCitations: boolean) => void;
  isLoading: boolean;
}

export function MergeConfirmDialog({
  pair,
  keepArticle,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: MergeConfirmDialogProps) {
  const [mergeCitations, setMergeCitations] = useState(true);

  if (!pair || !keepArticle) return null;

  const primary = keepArticle === 'a' ? pair.articleA : pair.articleB;
  const duplicate = keepArticle === 'a' ? pair.articleB : pair.articleA;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Merge</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>This action will:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Mark <strong>/{duplicate.slug}</strong> as 410 (Gone)</li>
              <li>Update internal links pointing to the duplicate</li>
              <li>Archive the duplicate article</li>
              {mergeCitations && duplicate.citationsCount > 0 && (
                <li>Transfer {duplicate.citationsCount} unique citations to the primary article</li>
              )}
            </ul>

            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Primary (Keep):</p>
              <p className="text-sm">{primary.headline}</p>
              <p className="text-xs text-muted-foreground">/{primary.slug}</p>
            </div>

            <div className="p-4 bg-destructive/10 rounded-lg space-y-2">
              <p className="text-sm font-medium text-destructive">Duplicate (Remove):</p>
              <p className="text-sm">{duplicate.headline}</p>
              <p className="text-xs text-muted-foreground">/{duplicate.slug}</p>
            </div>

            {duplicate.citationsCount > 0 && (
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="merge-citations"
                  checked={mergeCitations}
                  onCheckedChange={(checked) => setMergeCitations(checked === true)}
                />
                <Label htmlFor="merge-citations" className="text-sm">
                  Merge unique citations from duplicate ({duplicate.citationsCount} available)
                </Label>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(mergeCitations)}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Merging...' : 'Confirm Merge'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
