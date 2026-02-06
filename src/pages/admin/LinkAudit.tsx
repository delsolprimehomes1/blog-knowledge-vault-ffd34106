import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Link2, 
  ExternalLink, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  Download,
  Trash2,
  Play,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";

type ScanType = 'internal' | 'external' | 'navigation';
type ContentType = 'blog' | 'qa' | 'comparison' | 'location';

interface LinkAudit {
  id: string;
  scan_types: string[];
  content_types: string[];
  status: string;
  total_links: number;
  healthy_links: number;
  broken_links: number;
  redirect_links: number;
  timeout_links: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface LinkResult {
  id: string;
  audit_id: string;
  link_url: string;
  link_type: string;
  source_type: string;
  source_id: string | null;
  source_slug: string | null;
  http_status: number | null;
  response_time_ms: number | null;
  is_broken: boolean;
  error_message: string | null;
  redirect_url: string | null;
  checked_at: string;
}

export default function LinkAudit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [scanTypes, setScanTypes] = useState<ScanType[]>(['internal', 'external', 'navigation']);
  const [contentTypes, setContentTypes] = useState<ContentType[]>(['blog', 'qa', 'comparison', 'location']);
  const [sampleSize, setSampleSize] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filterBroken, setFilterBroken] = useState(false);

  // Fetch latest audit
  const { data: latestAudit, isLoading: loadingAudit } = useQuery({
    queryKey: ['link-audit-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('link_audits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as LinkAudit | null;
    },
  });

  // Fetch audit results
  const { data: auditResults, isLoading: loadingResults } = useQuery({
    queryKey: ['link-audit-results', latestAudit?.id, activeTab, filterBroken],
    queryFn: async () => {
      if (!latestAudit?.id) return [];
      
      let query = supabase
        .from('link_audit_results')
        .select('*')
        .eq('audit_id', latestAudit.id)
        .order('is_broken', { ascending: false })
        .order('checked_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('link_type', activeTab);
      }

      if (filterBroken) {
        query = query.eq('is_broken', true);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as LinkResult[];
    },
    enabled: !!latestAudit?.id,
  });

  // Start new audit mutation
  const startAuditMutation = useMutation({
    mutationFn: async () => {
      // Create audit record
      const { data: audit, error: createError } = await supabase
        .from('link_audits')
        .insert({
          scan_types: scanTypes,
          content_types: contentTypes,
          status: 'pending',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Call edge function
      const { error: fnError } = await supabase.functions.invoke('audit-all-links', {
        body: {
          auditId: audit.id,
          scanTypes,
          contentTypes,
          sampleSize: sampleSize > 0 ? sampleSize : undefined,
        },
      });

      if (fnError) throw fnError;
      return audit;
    },
    onSuccess: () => {
      toast({
        title: "Audit Started",
        description: "Link audit is now running. This may take a few minutes.",
      });
      queryClient.invalidateQueries({ queryKey: ['link-audit-latest'] });
    },
    onError: (error) => {
      toast({
        title: "Audit Failed",
        description: error instanceof Error ? error.message : "Failed to start audit",
        variant: "destructive",
      });
    },
  });

  // Delete audit mutation
  const deleteAuditMutation = useMutation({
    mutationFn: async (auditId: string) => {
      await supabase.from('link_audit_results').delete().eq('audit_id', auditId);
      await supabase.from('link_audits').delete().eq('id', auditId);
    },
    onSuccess: () => {
      toast({ title: "Audit Deleted" });
      queryClient.invalidateQueries({ queryKey: ['link-audit-latest'] });
    },
  });

  const toggleScanType = (type: ScanType) => {
    setScanTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleContentType = (type: ContentType) => {
    setContentTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const exportResults = () => {
    if (!auditResults?.length) return;
    
    const csv = [
      ['URL', 'Type', 'Source', 'Status', 'Broken', 'Error', 'Response Time (ms)'].join(','),
      ...auditResults.map(r => [
        `"${r.link_url}"`,
        r.link_type,
        r.source_type || '',
        r.http_status || '',
        r.is_broken ? 'Yes' : 'No',
        `"${r.error_message || ''}"`,
        r.response_time_ms || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `link-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getStatusBadge = (result: LinkResult) => {
    if (result.is_broken) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Broken</Badge>;
    }
    if (result.http_status && result.http_status >= 300 && result.http_status < 400) {
      return <Badge variant="secondary"><ArrowRight className="h-3 w-3 mr-1" />Redirect</Badge>;
    }
    return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Healthy</Badge>;
  };

  const healthPercentage = latestAudit?.total_links 
    ? Math.round((latestAudit.healthy_links / latestAudit.total_links) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Link Audit</h1>
            <p className="text-muted-foreground">
              Comprehensive link health check for all website content
            </p>
          </div>
          <div className="flex gap-2">
            {latestAudit && (
              <Button variant="outline" onClick={exportResults} disabled={!auditResults?.length}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scan Configuration</CardTitle>
            <CardDescription>Select what to scan and how many items to sample</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="font-medium">Scan Types</Label>
                <div className="flex flex-wrap gap-2">
                  {(['internal', 'external', 'navigation'] as ScanType[]).map((type) => (
                    <Button
                      key={type}
                      variant={scanTypes.includes(type) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleScanType(type)}
                    >
                      {type === 'internal' && <Link2 className="h-4 w-4 mr-1" />}
                      {type === 'external' && <ExternalLink className="h-4 w-4 mr-1" />}
                      {type === 'navigation' && <Navigation className="h-4 w-4 mr-1" />}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-medium">Content Types</Label>
                <div className="flex flex-wrap gap-2">
                  {(['blog', 'qa', 'comparison', 'location'] as ContentType[]).map((type) => (
                    <Button
                      key={type}
                      variant={contentTypes.includes(type) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleContentType(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>Sample Size (0 = all)</Label>
                <Input
                  type="number"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(parseInt(e.target.value) || 0)}
                  className="w-32"
                  min={0}
                />
              </div>

              <Button 
                onClick={() => startAuditMutation.mutate()}
                disabled={startAuditMutation.isPending || scanTypes.length === 0}
              >
                {startAuditMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Start Audit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {latestAudit && (
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{latestAudit.total_links}</div>
                <div className="text-sm text-muted-foreground">Total Links</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{latestAudit.healthy_links}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Healthy
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">{latestAudit.broken_links}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> Broken
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{latestAudit.redirect_links}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <ArrowRight className="h-4 w-4" /> Redirects
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">{latestAudit.timeout_links}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Timeouts
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Health Progress */}
        {latestAudit && latestAudit.status === 'completed' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Health</span>
                <span className="text-sm font-bold">{healthPercentage}%</span>
              </div>
              <Progress value={healthPercentage} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>
                  Last scan: {latestAudit.completed_at 
                    ? format(new Date(latestAudit.completed_at), 'PPp')
                    : 'In progress...'}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => deleteAuditMutation.mutate(latestAudit.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Results
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Running Status */}
        {latestAudit?.status === 'running' && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <div>
                  <div className="font-medium">Audit in Progress</div>
                  <div className="text-sm text-muted-foreground">
                    Scanning {latestAudit.scan_types?.join(', ')} links...
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['link-audit-latest'] })}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {latestAudit?.status === 'completed' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Audit Results</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="filter-broken"
                    checked={filterBroken}
                    onCheckedChange={(checked) => setFilterBroken(!!checked)}
                  />
                  <Label htmlFor="filter-broken" className="text-sm cursor-pointer">
                    Show broken only
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="internal">
                    <Link2 className="h-4 w-4 mr-1" />
                    Internal
                  </TabsTrigger>
                  <TabsTrigger value="external">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    External
                  </TabsTrigger>
                  <TabsTrigger value="navigation">
                    <Navigation className="h-4 w-4 mr-1" />
                    Navigation
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                  {loadingResults ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : auditResults?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No results found
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>URL</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>HTTP</TableHead>
                            <TableHead>Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditResults?.map((result) => (
                            <TableRow key={result.id} className={result.is_broken ? 'bg-destructive/5' : ''}>
                              <TableCell className="max-w-md">
                                <a 
                                  href={result.link_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline truncate block"
                                >
                                  {result.link_url}
                                </a>
                                {result.error_message && (
                                  <span className="text-xs text-destructive">{result.error_message}</span>
                                )}
                                {result.redirect_url && (
                                  <span className="text-xs text-muted-foreground block">
                                    → {result.redirect_url}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge(result)}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="capitalize">{result.source_type}</div>
                                  {result.source_slug && (
                                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                      {result.source_slug}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={result.http_status && result.http_status < 400 ? "outline" : "destructive"}>
                                  {result.http_status || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {result.response_time_ms ? `${result.response_time_ms}ms` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* No audits yet */}
        {!latestAudit && !loadingAudit && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Audits Yet</h3>
              <p className="text-muted-foreground mb-4">
                Run your first link audit to check for broken links across your website.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
