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
import { Check, ImageIcon } from "lucide-react";
import { ClusterData } from "./types";

interface ImageSharingFixDialogProps {
  cluster: ClusterData | null;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImageSharingFixDialog = ({
  cluster,
  isOpen,
  onConfirm,
  onCancel,
}: ImageSharingFixDialogProps) => {
  if (!cluster) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-amber-600" />
            Fix Image Sharing for This Cluster?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-foreground truncate max-w-[350px]">
                  {cluster.cluster_theme || "Untitled Cluster"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Current: <span className="font-mono text-amber-600">{cluster.unique_images || 60}</span> unique images
                  → After: <span className="font-mono text-green-600">6</span> unique images
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium mb-2 text-foreground">This will:</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    Keep existing English article images
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    Copy to all 9 translations per funnel stage
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    Generate localized alt text & captions
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    Share images across all 10 languages
                  </li>
                </ul>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Estimated time: ~10 seconds
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Fix Images
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
