import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Play, 
  Target, 
  TrendingUp,
  FileText,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface IncompleteCluster {
  cluster_id: string;
  headline: string;
  cluster_theme: string | null;
  category: string;
  funnel_stage: string;
  current_languages: number;
  qa_pages: number;
  priority_score: number;
  english_articles: number;
}

const ClusterPriorities = () => {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [funnelFilter, setFunnelFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [completingCluster, setCompletingCluster] = useState<string | null>(null);

  // Real-time subscription to blog_articles changes
  useEffect(() => {
    const channel = supabase
      .channel('cluster-priority-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blog_articles'
        },
        (payload) => {
          // Only refresh if the inserted article has a cluster_id
          if (payload.new && payload.new.cluster_id) {
            console.log('[ClusterPriorities] New article inserted, refreshing...');
            queryClient.invalidateQueries({ queryKey: ["incomplete-clusters-priority"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch incomplete clusters with priority scoring
  const { data: incompleteData, isLoading } = useQuery({
    queryKey: ["incomplete-clusters-priority"],
    queryFn: async () => {
      // Get clusters that have less than 6 English articles
      const { data: articles, error: articlesError } = await supabase
        .from("blog_articles")
        .select("cluster_id, headline, cluster_theme, category, funnel_stage, language, external_citations")
        .eq("status", "published")
        .not("cluster_id", "is", null);

      if (articlesError) throw articlesError;

      // Group by cluster_id
      const clusterMap = new Map<string, any>();
      
      for (const article of articles || []) {
        if (!article.cluster_id) continue;
        
        if (!clusterMap.has(article.cluster_id)) {
          clusterMap.set(article.cluster_id, {
            cluster_id: article.cluster_id,
            headline: '',
            cluster_theme: article.cluster_theme,
            category: article.category,
            funnel_stage: '',
            languages: new Set<string>(),
            english_articles: 0,
            citations_count: 0,
          });
        }
        
        const cluster = clusterMap.get(article.cluster_id)!;
        cluster.languages.add(article.language);
        
        if (article.language === 'en') {
          cluster.english_articles++;
          if (!cluster.headline) {
            cluster.headline = article.headline;
            cluster.funnel_stage = article.funnel_stage;
          }
          // Count citations
          const citations = article.external_citations as any[];
          if (Array.isArray(citations)) {
            cluster.citations_count += citations.length;
          }
        }
      }

      // Filter to only incomplete clusters (less than 6 English articles)
      const incompleteClusters: IncompleteCluster[] = [];
      
      for (const [clusterId, data] of clusterMap.entries()) {
        if (data.english_articles < 6 && data.english_articles >= 1) {
          incompleteClusters.push({
            cluster_id: clusterId,
            headline: data.headline,
            cluster_theme: data.cluster_theme,
            category: data.category,
            funnel_stage: data.funnel_stage,
            current_languages: data.languages.size,
            qa_pages: 0, // Will be populated below
            priority_score: 0, // Will be calculated below
            english_articles: data.english_articles,
          });
        }
      }

      // Fetch QA page counts
      const clusterIds = incompleteClusters.map(c => c.cluster_id);
      
      if (clusterIds.length > 0) {
        // Get source_article_ids for these clusters
        const { data: clusterArticles } = await supabase
          .from("blog_articles")
          .select("id, cluster_id")
          .in("cluster_id", clusterIds)
          .eq("language", "en");

        if (clusterArticles) {
          const articleIds = clusterArticles.map(a => a.id);
          
          // Count QA pages per source article
          const { data: qaCounts } = await supabase
            .from("qa_pages")
            .select("source_article_id")
            .in("source_article_id", articleIds);

          if (qaCounts) {
            const qaCountMap = new Map<string, number>();
            for (const qa of qaCounts) {
              const clusterId = clusterArticles.find(a => a.id === qa.source_article_id)?.cluster_id;
              if (clusterId) {
                qaCountMap.set(clusterId, (qaCountMap.get(clusterId) || 0) + 1);
              }
            }

            for (const cluster of incompleteClusters) {
              cluster.qa_pages = qaCountMap.get(cluster.cluster_id) || 0;
            }
          }
        }
      }

      // Calculate priority scores
      for (const cluster of incompleteClusters) {
        let score = 0;
        
        // Funnel stage bonus
        if (cluster.funnel_stage === 'BOFU') score += 30;
        else if (cluster.funnel_stage === 'MOFU') score += 20;
        else score += 10;
        
        // QA pages bonus (5 points per QA page, max 50)
        score += Math.min(cluster.qa_pages * 5, 50);
        
        // Category bonus
        if (cluster.category === 'Buying Guides') score += 20;
        else if (cluster.category === 'Legal & Regulations') score += 15;
        else if (cluster.category === 'Investment Strategies') score += 15;
        else if (cluster.category === 'Location Insights') score += 10;
        else score += 5;
        
        cluster.priority_score = score;
      }

      // Sort by priority score descending
      incompleteClusters.sort((a, b) => b.priority_score - a.priority_score);

      return incompleteClusters;
    },
    refetchInterval: 30000,
  });

  // Complete cluster mutation
  const completeClusterMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      setCompletingCluster(clusterId);
      const { data, error } = await supabase.functions.invoke('complete-cluster', {
        body: { clusterId, dryRun: false }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.articlesToGenerate === 0) {
        toast.info(`Cluster already complete`, {
          description: `This cluster already has ${data.existingCount} English articles`
        });
      } else {
        toast.success(`Generated ${data.generatedArticles || data.articlesToGenerate || 0} articles`, {
          description: `Cluster now has ${data.totalArticles || data.existingCount || 'all'} total articles`
        });
      }
      queryClient.invalidateQueries({ queryKey: ["incomplete-clusters-priority"] });
      setCompletingCluster(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to complete cluster: ${error.message}`);
      setCompletingCluster(null);
    }
  });

  // Get unique categories and funnel stages for filters
  const { categories, funnelStages } = useMemo(() => {
    const cats = new Set<string>();
    const stages = new Set<string>();
    
    for (const cluster of incompleteData || []) {
      if (cluster.category) cats.add(cluster.category);
      if (cluster.funnel_stage) stages.add(cluster.funnel_stage);
    }
    
    return {
      categories: Array.from(cats).sort(),
      funnelStages: Array.from(stages).sort(),
    };
  }, [incompleteData]);

  // Filter clusters
  const filteredClusters = useMemo(() => {
    return (incompleteData || []).filter(cluster => {
      if (categoryFilter !== "all" && cluster.category !== categoryFilter) return false;
      if (funnelFilter !== "all" && cluster.funnel_stage !== funnelFilter) return false;
      
      if (tierFilter === "tier1" && cluster.priority_score < 50) return false;
      if (tierFilter === "tier2" && (cluster.priority_score < 30 || cluster.priority_score >= 50)) return false;
      if (tierFilter === "tier3" && cluster.priority_score >= 30) return false;
      
      return true;
    });
  }, [incompleteData, categoryFilter, funnelFilter, tierFilter]);

  // Stats
  const stats = useMemo(() => {
    const data = incompleteData || [];
    return {
      total: data.length,
      tier1: data.filter(c => c.priority_score >= 50).length,
      tier2: data.filter(c => c.priority_score >= 30 && c.priority_score < 50).length,
      tier3: data.filter(c => c.priority_score < 30).length,
      avgScore: data.length > 0 ? Math.round(data.reduce((sum, c) => sum + c.priority_score, 0) / data.length) : 0,
    };
  }, [incompleteData]);

  const getPriorityBadge = (score: number) => {
    if (score >= 50) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">High Priority</Badge>;
    }
    if (score >= 30) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Medium</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Low</Badge>;
  };

  const getFunnelBadge = (stage: string) => {
    const colors: Record<string, string> = {
      TOFU: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      MOFU: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      BOFU: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    };
    return <Badge className={colors[stage] || ""}>{stage}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cluster Priorities</h1>
            <p className="text-muted-foreground mt-1">
              Incomplete clusters ranked by business value for completion
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["incomplete-clusters-priority"] })}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Incomplete</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                Tier 1 (50+)
              </CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.tier1}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-amber-500" />
                Tier 2 (30-49)
              </CardDescription>
              <CardTitle className="text-2xl text-amber-600">{stats.tier2}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tier 3 (&lt;30)</CardDescription>
              <CardTitle className="text-2xl">{stats.tier3}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Score</CardDescription>
              <CardTitle className="text-2xl">{stats.avgScore}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="tier1">Tier 1 (50+)</SelectItem>
                    <SelectItem value="tier2">Tier 2 (30-49)</SelectItem>
                    <SelectItem value="tier3">Tier 3 (&lt;30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={funnelFilter} onValueChange={setFunnelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Funnel Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {funnelStages.map(stage => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clusters Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Priority Clusters ({filteredClusters.length})
            </CardTitle>
            <CardDescription>
              Click "Complete" to generate missing articles for a cluster
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClusters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All Clusters Complete!</h3>
                <p className="text-muted-foreground">No incomplete clusters match your filters.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Score</TableHead>
                    <TableHead>Headline</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-24">Funnel</TableHead>
                    <TableHead className="w-24 text-center">
                      <span className="flex items-center gap-1 justify-center">
                        <FileText className="h-3 w-3" />
                        Articles
                      </span>
                    </TableHead>
                    <TableHead className="w-24 text-center">
                      <span className="flex items-center gap-1 justify-center">
                        <HelpCircle className="h-3 w-3" />
                        QA Pages
                      </span>
                    </TableHead>
                    <TableHead className="w-32">Priority</TableHead>
                    <TableHead className="w-32 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClusters.map((cluster) => (
                    <TableRow key={cluster.cluster_id}>
                      <TableCell>
                        <span className="font-mono font-bold text-lg">
                          {cluster.priority_score}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="font-medium truncate">{cluster.headline}</p>
                          {cluster.cluster_theme && cluster.cluster_theme !== cluster.headline && (
                            <p className="text-xs text-muted-foreground truncate">
                              Theme: {cluster.cluster_theme}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{cluster.category}</span>
                      </TableCell>
                      <TableCell>{getFunnelBadge(cluster.funnel_stage)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {cluster.english_articles}/6
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono">{cluster.qa_pages}</span>
                      </TableCell>
                      <TableCell>{getPriorityBadge(cluster.priority_score)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => completeClusterMutation.mutate(cluster.cluster_id)}
                          disabled={completingCluster === cluster.cluster_id || completeClusterMutation.isPending}
                        >
                          {completingCluster === cluster.cluster_id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Working...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Complete
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Priority Scoring Explanation */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Scoring Formula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Funnel Stage</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>BOFU: +30 points</li>
                  <li>MOFU: +20 points</li>
                  <li>TOFU: +10 points</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">QA Pages</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>+5 points per QA page</li>
                  <li>Maximum: +50 points</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Category</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Buying Guides: +20 points</li>
                  <li>Legal/Investment: +15 points</li>
                  <li>Location Insights: +10 points</li>
                  <li>Other: +5 points</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ClusterPriorities;
