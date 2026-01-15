import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Check, ImageIcon } from "lucide-react";
import { ClusterData } from "./types";

interface ImageSharingProgressProps {
  cluster: ClusterData | null;
  isOpen: boolean;
  elapsedSeconds?: number;
}

export const ImageSharingProgress = ({
  cluster,
  isOpen,
  elapsedSeconds = 0,
}: ImageSharingProgressProps) => {
  if (!isOpen || !cluster) return null;

  // Estimate progress based on elapsed time (roughly 10 seconds total)
  const estimatedProgress = Math.min(95, (elapsedSeconds / 10) * 100);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[420px] p-6 bg-background">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950/30">
            <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold">
            Fixing Image Sharing...
          </h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1 truncate max-w-[350px]">
              {cluster.cluster_theme || "Untitled Cluster"}
            </p>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Processing...</span>
              <span className="font-mono">{Math.round(estimatedProgress)}%</span>
            </div>
            <Progress value={estimatedProgress} className="h-2" />
          </div>
          
          <div className="text-sm space-y-2 text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Preserving 6 English images</span>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span>Sharing to 54 translations...</span>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span>Generating localized metadata...</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            <span>Time elapsed: {elapsedSeconds}s</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
