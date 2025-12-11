import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Link2, 
  Scan, 
  Check, 
  X, 
  AlertCircle, 
  Languages, 
  RotateCcw,
  Loader2,
  ChevronRight,
  Globe,
  FileText
} from 'lucide-react';

interface Article {
  id: string;
  language: string;
  headline: string;
  slug: string;
  cluster_id: string;
  category: string;
}

interface ProposedCluster {
  topic: string;
  confidence: number;
  articles: Article[];
  primaryArticleId: string;
  selected?: boolean;
}

interface RollbackRecord {
  key: string;
  timestamp: string;
  clusters: number;
  articles: number;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧', nl: '🇳🇱', fr: '🇫🇷', de: '🇩🇪', pl: '🇵🇱',
  sv: '🇸🇪', da: '🇩🇰', hu: '🇭🇺', fi: '🇫🇮', no: '🇳🇴'
};

export default function BulkArticleLinker() {
  const [activeTab, setActiveTab] = useState('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [proposedClusters, setProposedClusters] = useState<ProposedCluster[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState([0.60]);
  const [previewMode, setPreviewMode] = useState(true);
  const [rollbackRecords, setRollbackRecords] = useState<RollbackRecord[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalArticles: 0,
    standaloneArticles: 0,
    proposedGroups: 0,
    avgConfidence: 0
  });

  // Load rollback records on mount
  useEffect(() => {
    loadRollbackRecords();
  }, []);

  const loadRollbackRecords = async () => {
    const { data } = await supabase
      .from('content_settings')
      .select('setting_key, created_at, setting_value')
      .like('setting_key', 'bulk_linker_rollback_%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const records = data.map(d => {
        const value = JSON.parse(d.setting_value);
        return {
          key: d.setting_key,
          timestamp: d.created_at || '',
          clusters: value.length,
          articles: value.reduce((sum: number, c: any) => sum + c.articleCount, 0)
        };
      });
      setRollbackRecords(records);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setAllArticles([]);

    try {
      let offset = 0;
      const batchSize = 100;
      let hasMore = true;
      const collected: Article[] = [];

      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('link-articles-by-topic', {
          body: { action: 'scan', offset, batchSize }
        });

        if (error) throw error;

        collected.push(...data.articles);
        setScanProgress(Math.min(95, (collected.length / data.total) * 100));
        hasMore = data.hasMore;
        offset += batchSize;
      }

      setAllArticles(collected);
      
      // Calculate standalone articles (need to check cluster sizes)
      const clusterCounts: Record<string, number> = {};
      collected.forEach(a => {
        clusterCounts[a.cluster_id] = (clusterCounts[a.cluster_id] || 0) + 1;
      });
      const standalone = collected.filter(a => clusterCounts[a.cluster_id] === 1);

      setStats({
        totalArticles: collected.length,
        standaloneArticles: standalone.length,
        proposedGroups: 0,
        avgConfidence: 0
      });

      setScanProgress(100);
      toast.success(`Scanned ${collected.length} articles, ${standalone.length} standalone`);
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan articles');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAnalyze = async () => {
    if (allArticles.length === 0) {
      toast.error('Please scan articles first');
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    setProposedClusters([]);

    try {
      // Group by category for batch processing
      const categories = [...new Set(allArticles.map(a => a.category))];
      const allClusters: ProposedCluster[] = [];
      
      for (let i = 0; i < categories.length; i++) {
        const categoryArticles = allArticles.filter(a => a.category === categories[i]);
        
        if (categoryArticles.length < 2) {
          setAnalyzeProgress(((i + 1) / categories.length) * 100);
          continue;
        }

        const { data, error } = await supabase.functions.invoke('link-articles-by-topic', {
          body: { 
            action: 'analyze', 
            articles: categoryArticles,
            threshold: confidenceThreshold[0]
          }
        });

        if (error) {
          console.error(`Error analyzing category ${categories[i]}:`, error);
          continue;
        }

        if (data.clusters) {
          allClusters.push(...data.clusters.map((c: ProposedCluster) => ({ ...c, selected: true })));
        }

        setAnalyzeProgress(((i + 1) / categories.length) * 100);
      }

      setProposedClusters(allClusters);
      
      const avgConf = allClusters.length > 0
        ? allClusters.reduce((sum, c) => sum + c.confidence, 0) / allClusters.length
        : 0;

      setStats(prev => ({
        ...prev,
        proposedGroups: allClusters.length,
        avgConfidence: avgConf
      }));

      toast.success(`Found ${allClusters.length} potential cluster groups`);
      if (allClusters.length > 0) {
        setActiveTab('clusters');
      }
    } catch (error) {
      console.error('Analyze error:', error);
      toast.error('Failed to analyze articles');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleClusterSelection = (index: number) => {
    setProposedClusters(prev => 
      prev.map((c, i) => i === index ? { ...c, selected: !c.selected } : c)
    );
  };

  const selectAll = () => {
    setProposedClusters(prev => prev.map(c => ({ ...c, selected: true })));
  };

  const deselectAll = () => {
    setProposedClusters(prev => prev.map(c => ({ ...c, selected: false })));
  };

  const handleApply = async () => {
    const selectedClusters = proposedClusters.filter(c => c.selected);
    
    if (selectedClusters.length === 0) {
      toast.error('No clusters selected');
      return;
    }

    if (previewMode) {
      toast.info(`Preview: Would update ${selectedClusters.reduce((sum, c) => sum + c.articles.length, 0)} articles in ${selectedClusters.length} clusters`);
      return;
    }

    setIsApplying(true);

    try {
      const { data, error } = await supabase.functions.invoke('link-articles-by-topic', {
        body: { action: 'apply', clusters: selectedClusters }
      });

      if (error) throw error;

      toast.success(`Updated ${data.updated} articles in ${data.clusters} clusters`);
      
      // Refresh rollback records
      await loadRollbackRecords();
      
      // Clear applied clusters
      setProposedClusters(prev => prev.filter(c => !c.selected));
      setActiveTab('apply');
    } catch (error) {
      console.error('Apply error:', error);
      toast.error('Failed to apply changes');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRollback = async (rollbackKey: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('link-articles-by-topic', {
        body: { action: 'rollback', rollbackKey }
      });

      if (error) throw error;

      toast.success(`Rolled back ${data.rolledBack} articles`);
      await loadRollbackRecords();
    } catch (error) {
      console.error('Rollback error:', error);
      toast.error('Failed to rollback');
    }
  };

  const filteredClusters = proposedClusters.filter(c => c.confidence >= confidenceThreshold[0]);
  const selectedCount = filteredClusters.filter(c => c.selected).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Link2 className="h-8 w-8" />
              Bulk Article Linker
            </h1>
            <p className="text-muted-foreground mt-1">
              Automatically group articles into multilingual clusters for SEO hreflang
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalArticles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Standalone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.standaloneArticles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Proposed Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.proposedGroups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Scan & Analyze
            </TabsTrigger>
            <TabsTrigger value="clusters" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Proposed Clusters
              {filteredClusters.length > 0 && (
                <Badge variant="secondary">{filteredClusters.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="apply" className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Apply Changes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Scan Articles</CardTitle>
                <CardDescription>
                  Fetch all published articles and identify standalone clusters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleScan} 
                  disabled={isScanning}
                  size="lg"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Scan className="mr-2 h-4 w-4" />
                      Scan All Articles
                    </>
                  )}
                </Button>
                
                {isScanning && (
                  <div className="space-y-2">
                    <Progress value={scanProgress} />
                    <p className="text-sm text-muted-foreground">
                      Scanning... {Math.round(scanProgress)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step 2: Analyze for Matches</CardTitle>
                <CardDescription>
                  Use AI to find semantically similar articles across languages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Minimum Confidence Threshold: {(confidenceThreshold[0] * 100).toFixed(0)}%</Label>
                  <Slider
                    value={confidenceThreshold}
                    onValueChange={setConfidenceThreshold}
                    min={0.4}
                    max={0.95}
                    step={0.05}
                    className="w-full max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher threshold = more precise matches, fewer groups
                  </p>
                </div>

                <Button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing || allArticles.length === 0}
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Languages className="mr-2 h-4 w-4" />
                      Analyze Matches
                    </>
                  )}
                </Button>

                {isAnalyzing && (
                  <div className="space-y-2">
                    <Progress value={analyzeProgress} />
                    <p className="text-sm text-muted-foreground">
                      Analyzing categories... {Math.round(analyzeProgress)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clusters" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Proposed Cluster Groups</CardTitle>
                    <CardDescription>
                      Review and select clusters to link
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredClusters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No cluster groups found. Try lowering the confidence threshold or scan more articles.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {filteredClusters.map((cluster, index) => (
                        <Card 
                          key={index} 
                          className={`transition-all ${cluster.selected ? 'ring-2 ring-primary' : 'opacity-70'}`}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-4">
                              <Checkbox
                                checked={cluster.selected}
                                onCheckedChange={() => toggleClusterSelection(proposedClusters.indexOf(cluster))}
                              />
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{cluster.topic}</h4>
                                  <Badge 
                                    variant={cluster.confidence >= 0.8 ? 'default' : 'secondary'}
                                  >
                                    {(cluster.confidence * 100).toFixed(0)}% confidence
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  {cluster.articles.map((article) => (
                                    <div 
                                      key={article.id}
                                      className={`flex items-center gap-2 text-sm p-2 rounded ${
                                        article.id === cluster.primaryArticleId 
                                          ? 'bg-primary/10 border border-primary/20' 
                                          : 'bg-muted/50'
                                      }`}
                                    >
                                      <span className="text-lg">{LANGUAGE_FLAGS[article.language] || '🌐'}</span>
                                      <Badge variant="outline" className="uppercase text-xs">
                                        {article.language}
                                      </Badge>
                                      <span className="flex-1 truncate">{article.headline}</span>
                                      {article.id === cluster.primaryArticleId && (
                                        <Badge variant="default" className="text-xs">Primary</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {filteredClusters.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => setActiveTab('apply')}>
                  Continue to Apply
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="apply" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Apply Changes</CardTitle>
                <CardDescription>
                  Update database with selected cluster assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="preview-mode"
                    checked={previewMode}
                    onCheckedChange={setPreviewMode}
                  />
                  <Label htmlFor="preview-mode">Preview Mode (dry run)</Label>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium">Summary of Changes</h4>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {selectedCount} clusters selected
                    </li>
                    <li className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {filteredClusters.filter(c => c.selected).reduce((sum, c) => sum + c.articles.length, 0)} articles will be updated
                    </li>
                  </ul>
                </div>

                <Button 
                  onClick={handleApply}
                  disabled={isApplying || selectedCount === 0}
                  size="lg"
                  variant={previewMode ? 'secondary' : 'default'}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : previewMode ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Preview Changes
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Apply to Database
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Rollback History
                </CardTitle>
                <CardDescription>
                  Undo previous bulk linking operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rollbackRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rollback records available</p>
                ) : (
                  <div className="space-y-2">
                    {rollbackRecords.map((record) => (
                      <div 
                        key={record.key}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {record.clusters} clusters, {record.articles} articles
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRollback(record.key)}
                        >
                          <RotateCcw className="mr-2 h-3 w-3" />
                          Rollback
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
