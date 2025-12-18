import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertCircle, Clock, TrendingUp, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CitationHealth {
  id: string;
  url: string;
  source_name: string;
  last_checked_at: string | null;
  status: 'healthy' | 'broken' | 'redirected' | 'slow' | 'unreachable' | null;
  http_status_code: number | null;
  response_time_ms: number;
  redirect_url: string | null;
  times_verified: number;
  times_failed: number;
}

interface ServerStats {
  total: number;
  healthy: number;
  broken: number;
  unreachable: number;
  redirected: number;
  slow: number;
  unchecked: number;
}

interface CitationHealthAnalysisProps {
  healthData: CitationHealth[];
  onFindReplacement: (url: string) => void;
  serverStats?: ServerStats;
}

const StatCard = ({ 
  label, 
  count, 
  icon, 
  description, 
  variant = 'default' 
}: { 
  label: string; 
  count: number; 
  icon: React.ReactNode; 
  description: string;
  variant?: 'default' | 'success' | 'destructive' | 'warning' | 'secondary';
}) => {
  const variantStyles = {
    default: 'border-border',
    success: 'border-green-500/50 bg-green-500/5',
    destructive: 'border-destructive/50 bg-destructive/5',
    warning: 'border-orange-500/50 bg-orange-500/5',
    secondary: 'border-blue-500/50 bg-blue-500/5',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="text-2xl">{icon}</div>
        </div>
        <div className="text-3xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
};

export const CitationHealthAnalysis = ({ healthData, onFindReplacement, serverStats }: CitationHealthAnalysisProps) => {
  // Use server stats if provided (accurate), otherwise fall back to client calculation (limited to 1000 rows)
  const stats = serverStats 
    ? {
        unchecked: serverStats.unchecked,
        healthy: serverStats.healthy,
        broken: serverStats.broken,
        unreachable: serverStats.unreachable,
        redirected: serverStats.redirected,
        slow: serverStats.slow
      }
    : healthData.reduce((acc, item) => {
        const key = item.status || 'unchecked';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

  const getStatusBadge = (status: CitationHealth['status']) => {
    if (status === null) return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Unchecked</Badge>;
    const badges = {
      healthy: <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Healthy</Badge>,
      broken: <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Broken</Badge>,
      unreachable: <Badge className="bg-orange-600"><AlertCircle className="mr-1 h-3 w-3" />Unreachable</Badge>,
      redirected: <Badge className="bg-blue-600"><TrendingUp className="mr-1 h-3 w-3" />Redirected</Badge>,
      slow: <Badge className="bg-yellow-600"><Clock className="mr-1 h-3 w-3" />Slow</Badge>,
    };
    return badges[status];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Citation Health Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <StatCard 
              label="Unchecked" 
              count={stats.unchecked || 0}
              icon="⏳"
              description="Never verified - run health check"
              variant="default"
            />
            <StatCard 
              label="Healthy" 
              count={stats.healthy || 0}
              icon="✅"
              description="Working citations with fast response"
              variant="success"
            />
            <StatCard 
              label="Broken" 
              count={stats.broken || 0}
              icon="❌"
              description="HTTP 4xx/5xx errors - needs replacement"
              variant="destructive"
            />
            <StatCard 
              label="Unreachable" 
              count={stats.unreachable || 0}
              icon="⚠️"
              description="Network errors, SSL issues, timeouts"
              variant="warning"
            />
            <StatCard 
              label="Redirected" 
              count={stats.redirected || 0}
              icon="↪️"
              description="Redirects to different URL (may need update)"
              variant="secondary"
            />
            <StatCard 
              label="Slow" 
              count={stats.slow || 0}
              icon="🐌"
              description="Response time > 5 seconds"
              variant="default"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Citation List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>HTTP Code</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead className="text-center">Verified</TableHead>
                <TableHead className="text-center">Failed</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {healthData.map(health => (
                <TableRow key={health.id}>
                  <TableCell className="max-w-xs">
                    <a 
                      href={health.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate flex items-center gap-1"
                    >
                      <span className="truncate">{health.url}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-sm">
                    {health.source_name || 'Unknown'}
                  </TableCell>
                  <TableCell>{getStatusBadge(health.status)}</TableCell>
                  <TableCell>
                    {health.http_status_code ? (
                      <Badge variant="outline">{health.http_status_code}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={health.response_time_ms > 5000 ? 'text-orange-600 font-semibold' : ''}>
                      {health.response_time_ms}ms
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-green-500/10">
                      {health.times_verified}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-red-500/10">
                      {health.times_failed}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {health.last_checked_at 
                      ? formatDistanceToNow(new Date(health.last_checked_at), { addSuffix: true })
                      : 'Never checked'}
                  </TableCell>
                  <TableCell>
                    {(health.status === 'broken' || health.status === 'unreachable') && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onFindReplacement(health.url)}
                      >
                        Find Replacement
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
