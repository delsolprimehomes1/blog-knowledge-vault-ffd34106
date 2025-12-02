import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Circle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Language = 'en' | 'nl' | 'fr' | 'de' | 'fi' | 'pl' | 'hu' | 'sv' | 'da' | 'no';

const ALL_LANGUAGES: Language[] = ['en', 'nl', 'fr', 'de', 'fi', 'pl', 'hu', 'sv', 'da', 'no'];

const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇬🇧',
  nl: '🇳🇱',
  fr: '🇫🇷',
  de: '🇩🇪',
  fi: '🇫🇮',
  pl: '🇵🇱',
  hu: '🇭🇺',
  sv: '🇸🇪',
  da: '🇩🇰',
  no: '🇳🇴',
};

interface ClusterData {
  cluster_id: string;
  cluster_theme: string;
  languages: Record<Language, boolean>;
  language_count: number;
  sample_headline: string;
  article_ids: string[];
  is_legacy: boolean;
}

export default function ClusterCoverage() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    complete: 0,
    partial: 0,
    legacy: 0,
  });

  useEffect(() => {
    fetchClusters();
  }, []);

  const fetchClusters = async () => {
    setIsLoading(true);
    try {
      const { data: articles, error } = await supabase
        .from('blog_articles')
        .select('id, cluster_id, cluster_theme, language, headline, status')
        .eq('status', 'published')
        .order('cluster_id');

      if (error) throw error;

      // Group articles by cluster_id
      const clusterMap = new Map<string, ClusterData>();

      for (const article of articles || []) {
        const clusterId = article.cluster_id || `legacy-${article.id}`;
        const isLegacy = !article.cluster_id;

        if (!clusterMap.has(clusterId)) {
          clusterMap.set(clusterId, {
            cluster_id: clusterId,
            cluster_theme: article.cluster_theme || article.headline,
            languages: {} as Record<Language, boolean>,
            language_count: 0,
            sample_headline: article.headline,
            article_ids: [],
            is_legacy: isLegacy,
          });
        }

        const cluster = clusterMap.get(clusterId)!;
        cluster.languages[article.language as Language] = true;
        cluster.article_ids.push(article.id);
      }

      // Calculate language counts
      const clustersArray = Array.from(clusterMap.values()).map(cluster => ({
        ...cluster,
        language_count: Object.keys(cluster.languages).length,
      }));

      // Sort: complete first, then partial, then legacy
      clustersArray.sort((a, b) => {
        if (a.is_legacy && !b.is_legacy) return 1;
        if (!a.is_legacy && b.is_legacy) return -1;
        return b.language_count - a.language_count;
      });

      setClusters(clustersArray);

      // Calculate stats
      const complete = clustersArray.filter(c => c.language_count === 10 && !c.is_legacy).length;
      const partial = clustersArray.filter(c => c.language_count < 10 && !c.is_legacy).length;
      const legacy = clustersArray.filter(c => c.is_legacy).length;

      setStats({
        total: clustersArray.length,
        complete,
        partial,
        legacy,
      });
    } catch (error) {
      console.error('Error fetching clusters:', error);
      toast.error('Failed to load cluster data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (cluster: ClusterData) => {
    if (cluster.is_legacy) {
      return (
        <Badge variant="outline" className="gap-1">
          <Circle className="h-3 w-3 text-gray-400" />
          Legacy
        </Badge>
      );
    }
    if (cluster.language_count === 10) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-yellow-600 text-white">
        <AlertCircle className="h-3 w-3" />
        Partial
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Cluster Coverage Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor multilingual coverage across all content clusters
          </p>
        </div>

        {/* Summary Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Clusters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Complete (10/10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.complete}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Partial (&lt;10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.partial}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Legacy (Single)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">{stats.legacy}</div>
            </CardContent>
          </Card>
        </div>

        {/* Clusters Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cluster Details</CardTitle>
            <CardDescription>
              View language coverage for each content cluster
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading clusters...
              </div>
            ) : clusters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No clusters found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Status</TableHead>
                      <TableHead>Topic / Theme</TableHead>
                      <TableHead className="text-center">Languages</TableHead>
                      <TableHead className="text-center">Coverage</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clusters.map((cluster) => (
                      <TableRow key={cluster.cluster_id}>
                        <TableCell>{getStatusBadge(cluster)}</TableCell>
                        <TableCell className="font-medium max-w-md truncate">
                          <div className="truncate" title={cluster.cluster_theme}>
                            {cluster.cluster_theme}
                          </div>
                          <div className="text-xs text-muted-foreground truncate" title={cluster.sample_headline}>
                            {cluster.sample_headline}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center flex-wrap">
                            {ALL_LANGUAGES.map((lang) => (
                              <span
                                key={lang}
                                className={`text-lg ${
                                  cluster.languages[lang] ? 'opacity-100' : 'opacity-20 grayscale'
                                }`}
                                title={`${lang.toUpperCase()}: ${cluster.languages[lang] ? 'Available' : 'Missing'}`}
                              >
                                {LANGUAGE_FLAGS[lang]}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-lg font-semibold">
                            {cluster.language_count}/10
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/articles?cluster_id=${cluster.cluster_id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
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
    </AdminLayout>
  );
}
