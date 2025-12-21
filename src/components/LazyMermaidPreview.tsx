import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const MermaidPreview = lazy(() => 
  import("./MermaidPreview").then(module => ({ default: module.MermaidPreview }))
);

interface LazyMermaidPreviewProps {
  code: string;
  className?: string;
}

export const LazyMermaidPreview = ({ code, className = "" }: LazyMermaidPreviewProps) => {
  return (
    <Suspense 
      fallback={
        <div className={`bg-muted p-4 rounded border ${className}`}>
          <Skeleton className="h-48 w-full" />
          <p className="text-xs text-muted-foreground mt-2 text-center">Loading diagram...</p>
        </div>
      }
    >
      <MermaidPreview code={code} className={className} />
    </Suspense>
  );
};
