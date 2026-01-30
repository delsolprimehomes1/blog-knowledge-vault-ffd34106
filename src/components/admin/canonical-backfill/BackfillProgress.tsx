import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface BackfillProgressProps {
  total: number;
  processed: number;
  success: number;
  failed: number;
  isRunning: boolean;
}

export function BackfillProgress({
  total,
  processed,
  success,
  failed,
  isRunning,
}: BackfillProgressProps) {
  const progressPercent = total > 0 ? (processed / total) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isRunning && <Loader2 className="h-5 w-5 animate-spin" />}
          {!isRunning && processed === total && <CheckCircle className="h-5 w-5 text-green-500" />}
          Backfill Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercent} className="h-3" />
        
        <div className="flex justify-between text-sm">
          <span>{processed} / {total} processed</span>
          <span>{progressPercent.toFixed(0)}%</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">{success}</p>
              <p className="text-xs text-muted-foreground">Succeeded</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium">{failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
