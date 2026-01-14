import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle,
  Wrench,
  Layers,
  ImageIcon,
  Activity
} from "lucide-react";

interface FunnelPositionHealth {
  funnelStage: string;
  uniqueImages: number;
  isHealthy: boolean;
}

interface ClusterAuditInfo {
  clusterId: string;
  theme: string | null;
  status: 'healthy' | 'needs_fix';
  totalUniqueImages: number;
  expectedImages: number;
  positions: FunnelPositionHealth[];
}

interface AuditSummary {
  totalCompleteClusters: number;
  healthyClusters: number;
  clustersNeedingFix: number;
  issueRate: number;
}

interface ImageAuditViewProps {
  onFixClusters: (clusterIds: string[]) => void;
}

type FilterType = 'all' | 'needs_fix' | 'healthy';

const FUNNEL_STAGES = ['TOFU', 'TOFU', 'TOFU', 'MOFU', 'MOFU', 'BOFU'];
const FUNNEL_LABELS = ['TOFU-1', 'TOFU-2', 'TOFU-3', 'MOFU-1', 'MOFU-2', 'BOFU'];

export function ImageAuditView({ onFixClusters }: ImageAuditViewProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [clusters, setClusters] = useState<ClusterAuditInfo[]>([]);
  const [filter, setFilter] = useState<FilterType>('needs_fix');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      // Query all published articles with cluster info
      const { data, error } = await supabase
        .from('blog_articles')
        .select('cluster_id, cluster_theme, language, funnel_stage, featured_image_url')
        .not('cluster_id', 'is', null)
        .eq('status', 'published');

      if (error) throw error;

      // Group by cluster_id
      const clusterMap = new Map<string, {
        theme: string | null;
        languages: Set<string>;
        positions: Map<string, Set<string>>; // funnel_stage -> Set of image URLs
      }>();

      (data || []).forEach(article => {
        const clusterId = article.cluster_id!;
        
        if (!clusterMap.has(clusterId)) {
          clusterMap.set(clusterId, {
            theme: article.cluster_theme,
            languages: new Set(),
            positions: new Map()
          });
        }

        const cluster = clusterMap.get(clusterId)!;
        cluster.languages.add(article.language);

        // Track unique images per funnel stage
        const stage = article.funnel_stage || 'unknown';
        if (!cluster.positions.has(stage)) {
          cluster.positions.set(stage, new Set());
        }
        if (article.featured_image_url) {
          cluster.positions.get(stage)!.add(article.featured_image_url);
        }
      });

      // Filter to complete clusters (10 languages) and analyze health
      const auditClusters: ClusterAuditInfo[] = [];
      
      // Expected funnel stages in the database
      const EXPECTED_STAGES = ['TOFU-1', 'TOFU-2', 'TOFU-3', 'MOFU-1', 'MOFU-2', 'BOFU'];
      
      clusterMap.forEach((cluster, clusterId) => {
        // Only audit complete clusters (10 languages)
        if (cluster.languages.size !== 10) return;

        // Build positions array - check each expected stage directly
        const positionHealthList: FunnelPositionHealth[] = [];
        
        EXPECTED_STAGES.forEach(stageKey => {
          // Get unique images for this exact funnel stage
          const imagesForStage = cluster.positions.get(stageKey) || new Set<string>();
          const uniqueCount = imagesForStage.size;
          
          // A position is healthy ONLY if exactly 1 image is shared by all 10 languages
          positionHealthList.push({
            funnelStage: stageKey,
            uniqueImages: uniqueCount,
            isHealthy: uniqueCount === 1
          });
        });

        // Calculate total unique images across all positions
        const allImages = new Set<string>();
        cluster.positions.forEach(urls => urls.forEach(url => allImages.add(url)));
        const actualUnique = allImages.size;

        // A cluster is healthy ONLY if ALL 6 positions have exactly 1 shared image
        const isHealthy = positionHealthList.every(p => p.isHealthy);

        auditClusters.push({
          clusterId,
          theme: cluster.theme,
          status: isHealthy ? 'healthy' : 'needs_fix',
          totalUniqueImages: actualUnique,
          expectedImages: 6,
          positions: positionHealthList
        });
      });

      // Sort: needs_fix first, then by theme
      auditClusters.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'needs_fix' ? -1 : 1;
        }
        return (a.theme || '').localeCompare(b.theme || '');
      });

      setClusters(auditClusters);

      const healthyCount = auditClusters.filter(c => c.status === 'healthy').length;
      const needsFixCount = auditClusters.filter(c => c.status === 'needs_fix').length;

      setSummary({
        totalCompleteClusters: auditClusters.length,
        healthyClusters: healthyCount,
        clustersNeedingFix: needsFixCount,
        issueRate: auditClusters.length > 0 
          ? Math.round((needsFixCount / auditClusters.length) * 100) 
          : 0
      });

    } catch (err) {
      console.error('Error fetching audit data:', err);
      toast.error('Failed to fetch audit data');
    } finally {
      setLoading(false);
    }
  };

  const filteredClusters = clusters.filter(c => {
    if (filter === 'needs_fix') return c.status === 'needs_fix';
    if (filter === 'healthy') return c.status === 'healthy';
    return true;
  });

  const toggleCluster = (clusterId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(clusterId)) {
      newSelected.delete(clusterId);
    } else {
      newSelected.add(clusterId);
    }
    setSelected(newSelected);
  };

  const selectAllNeedingFix = () => {
    const needsFixIds = clusters.filter(c => c.status === 'needs_fix').map(c => c.clusterId);
    if (selected.size === needsFixIds.length && needsFixIds.every(id => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(needsFixIds));
    }
  };

  const handleFixSelected = () => {
    if (selected.size === 0) {
      toast.error('Please select at least one cluster');
      return;
    }
    onFixClusters(Array.from(selected));
  };

  const renderHealthIcon = (uniqueImages: number, expected: number = 1) => {
    if (uniqueImages === expected) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return (
      <div className="flex items-center gap-1 text-red-500">
        <XCircle className="h-4 w-4" />
        <span className="text-xs font-mono">{uniqueImages}</span>
      </div>
    );
  };

  const needsFixCount = clusters.filter(c => c.status === 'needs_fix').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summary?.totalCompleteClusters || 0}</p>
                <p className="text-sm text-muted-foreground">Complete Clusters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{summary?.healthyClusters || 0}</p>
                <p className="text-sm text-muted-foreground">Healthy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{summary?.clustersNeedingFix || 0}</p>
                <p className="text-sm text-muted-foreground">Need Fix</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summary?.issueRate || 0}%</p>
                <p className="text-sm text-muted-foreground">Issue Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cluster Image Health</CardTitle>
              <CardDescription>
                Each cluster should have 6 unique images shared across all 10 languages
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAuditData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({clusters.length})</SelectItem>
                  <SelectItem value="needs_fix">
                    Needs Fix ({needsFixCount})
                  </SelectItem>
                  <SelectItem value="healthy">
                    Healthy ({clusters.length - needsFixCount})
                  </SelectItem>
                </SelectContent>
              </Select>

              {needsFixCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllNeedingFix}
                >
                  <Checkbox
                    checked={selected.size === needsFixCount && needsFixCount > 0}
                    className="mr-2"
                  />
                  Select All Needing Fix ({needsFixCount})
                </Button>
              )}
            </div>

            {selected.size > 0 && (
              <Button onClick={handleFixSelected}>
                <Wrench className="h-4 w-4 mr-2" />
                Fix Selected ({selected.size})
              </Button>
            )}
          </div>

          {/* Health Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              1 image shared by all 10 languages
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              Multiple images (number = unique count)
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading audit data...
            </div>
          ) : filteredClusters.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {filter === 'needs_fix' ? (
                <div className="space-y-2">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                  <p className="font-medium text-foreground">All clusters are healthy!</p>
                  <p>Every cluster has proper image sharing across languages.</p>
                </div>
              ) : (
                <p>No clusters found</p>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead className="min-w-[200px]">Cluster</TableHead>
                    <TableHead className="text-center w-16">
                      <span className="text-xs">TOFU-1</span>
                    </TableHead>
                    <TableHead className="text-center w-16">
                      <span className="text-xs">TOFU-2</span>
                    </TableHead>
                    <TableHead className="text-center w-16">
                      <span className="text-xs">TOFU-3</span>
                    </TableHead>
                    <TableHead className="text-center w-16">
                      <span className="text-xs">MOFU-1</span>
                    </TableHead>
                    <TableHead className="text-center w-16">
                      <span className="text-xs">MOFU-2</span>
                    </TableHead>
                    <TableHead className="text-center w-16">
                      <span className="text-xs">BOFU</span>
                    </TableHead>
                    <TableHead className="text-center w-20">
                      <span className="text-xs">Total</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClusters.map((cluster) => (
                    <TableRow 
                      key={cluster.clusterId}
                      className={cluster.status === 'needs_fix' ? 'bg-amber-50/50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(cluster.clusterId)}
                          onCheckedChange={() => toggleCluster(cluster.clusterId)}
                          disabled={cluster.status === 'healthy'}
                        />
                      </TableCell>
                      <TableCell>
                        {cluster.status === 'healthy' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Fix
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">
                            {cluster.theme || 'Unnamed Cluster'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cluster.clusterId.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      {/* Funnel Position Cells */}
                      {[0, 1, 2, 3, 4, 5].map((idx) => {
                        const position = cluster.positions[idx];
                        if (!position) {
                          return (
                            <TableCell key={idx} className="text-center">
                              <span className="text-muted-foreground">-</span>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={idx} className="text-center">
                            {renderHealthIcon(position.uniqueImages, 1)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <Badge 
                          variant={cluster.totalUniqueImages === 6 ? "default" : "destructive"}
                          className="font-mono"
                        >
                          {cluster.totalUniqueImages}/6
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
