import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Link2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
  Search,
  Ban,
  Clock
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

interface BrokenLink {
  id: string;
  sourceId: string;
  sourceTable: 'blog_articles' | 'qa_pages' | 'comparison_pages' | 'location_pages';
  sourceSlug: string;
  sourceLanguage: string;
  brokenUrl: string;
  linkText: string | null;
  linkLocation: 'internal_links' | 'content_body';
  linkIndex: number | null;
  targetStatus: string;
  fixed: boolean;
}

interface ScanResult {
  id: string;
  scanStartedAt: string;
  scanCompletedAt: string | null;
  totalLinksChecked: number;
  brokenLinksFound: number;
  fixedLinks: number;
  contentTypesScanned: string[];
  scanType: string;
}

interface ContentWithLinks {
  id: string;
  slug: string;
  language: string;
  internal_links: Array<{ url: string; text?: string }> | null;
}

interface LocationWithLinks {
  id: string;
  city_slug: string;
  topic_slug: string;
  language: string;
  internal_links: Array<{ url: string; text?: string }> | null;
}

const BrokenLinkChecker = () => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [brokenLinks, setBrokenLinks] = useState<BrokenLink[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [contentTypesToScan, setContentTypesToScan] = useState({
    blog_articles: true,
    qa_pages: true,
    comparison_pages: false,
    location_pages: false
  });
  const [summary, setSummary] = useState({
    totalLinks: 0,
    brokenCount: 0,
    fixedCount: 0,
    lastScan: null as string | null
  });

  // Load scan history on mount
  const loadScanHistory = useCallback(async () => {
    const { data } = await supabase
      .from('broken_link_scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setScanHistory(data.map(s => ({
        id: s.id,
        scanStartedAt: s.scan_started_at,
        scanCompletedAt: s.scan_completed_at,
        totalLinksChecked: s.total_links_checked,
        brokenLinksFound: s.broken_links_found,
        fixedLinks: s.fixed_links,
        contentTypesScanned: s.content_types_scanned || [],
        scanType: s.scan_type
      })));

      if (data[0]) {
        setSummary(prev => ({
          ...prev,
          lastScan: data[0].scan_started_at
        }));
      }
    }
  }, []);

  // Extract slug from internal URL
  const extractSlugFromUrl = (url: string): { type: string; slug: string; language: string } | null => {
    // Match patterns like /en/blog/slug, /nl/qa/slug, etc.
    const match = url.match(/^\/([a-z]{2})\/(blog|qa|compare|locations)\/(.+)$/);
    if (match) {
      return {
        language: match[1],
        type: match[2] === 'compare' ? 'comparison_pages' : 
              match[2] === 'blog' ? 'blog_articles' : 
              match[2] === 'qa' ? 'qa_pages' : 'location_pages',
        slug: match[3]
      };
    }
    return null;
  };

  // Check if target URL exists in database
  const checkTargetExists = async (
    type: string, 
    slug: string, 
    language: string
  ): Promise<boolean> => {
    // Also check gone_urls table
    const { data: goneData } = await supabase
      .from('gone_urls')
      .select('id')
      .eq('url_path', `/${language}/${type === 'blog_articles' ? 'blog' : type === 'qa_pages' ? 'qa' : 'compare'}/${slug}`)
      .maybeSingle();

    if (goneData) return false; // URL is in gone list

    if (type === 'blog_articles') {
      const { data } = await supabase
        .from('blog_articles')
        .select('id')
        .eq('slug', slug)
        .eq('language', language)
        .eq('status', 'published')
        .maybeSingle();
      return !!data;
    } else if (type === 'qa_pages') {
      const { data } = await supabase
        .from('qa_pages')
        .select('id')
        .eq('slug', slug)
        .eq('language', language)
        .eq('status', 'published')
        .maybeSingle();
      return !!data;
    } else if (type === 'comparison_pages') {
      const { data } = await supabase
        .from('comparison_pages')
        .select('id')
        .eq('slug', slug)
        .eq('language', language)
        .eq('status', 'published')
        .maybeSingle();
      return !!data;
    }
    return true; // Default to true for unknown types
  };

  // Scan content for broken links
  const scanContent = async () => {
    setScanning(true);
    setBrokenLinks([]);
    setSelectedLinks(new Set());
    setProgress({ current: 0, total: 0, percent: 0 });

    const typesToScan = Object.entries(contentTypesToScan)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type);

    if (typesToScan.length === 0) {
      toast.warning("Please select at least one content type to scan");
      setScanning(false);
      return;
    }

    // Create scan record
    const { data: scanRecord, error: scanError } = await supabase
      .from('broken_link_scans')
      .insert({
        content_types_scanned: typesToScan,
        scan_type: 'structured'
      })
      .select()
      .single();

    if (scanError) {
      toast.error("Failed to create scan record");
      setScanning(false);
      return;
    }

    const foundBrokenLinks: BrokenLink[] = [];
    let totalLinksChecked = 0;
    let itemsProcessed = 0;
    let totalItems = 0;

    try {
      // Count total items first
      for (const contentType of typesToScan) {
        if (contentType === 'location_pages') {
          const { count } = await supabase
            .from('location_pages')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .not('internal_links', 'is', null);
          totalItems += count || 0;
        } else {
          const { count } = await supabase
            .from(contentType as 'blog_articles' | 'qa_pages' | 'comparison_pages')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .not('internal_links', 'is', null);
          totalItems += count || 0;
        }
      }

      setProgress(prev => ({ ...prev, total: totalItems }));
      toast.info(`Scanning ${totalItems} items with internal links...`);

      // Scan each content type
      for (const contentType of typesToScan) {
        let content: (ContentWithLinks | LocationWithLinks)[] = [];

        if (contentType === 'location_pages') {
          const { data } = await supabase
            .from('location_pages')
            .select('id, city_slug, topic_slug, language, internal_links')
            .eq('status', 'published')
            .not('internal_links', 'is', null);
          content = (data || []) as LocationWithLinks[];
        } else {
          const { data } = await supabase
            .from(contentType as 'blog_articles' | 'qa_pages' | 'comparison_pages')
            .select('id, slug, language, internal_links')
            .eq('status', 'published')
            .not('internal_links', 'is', null);
          content = (data || []) as ContentWithLinks[];
        }

        for (const item of content) {
          const links = item.internal_links || [];
          const itemSlug = 'slug' in item ? item.slug : `${(item as LocationWithLinks).city_slug}/${(item as LocationWithLinks).topic_slug}`;

          for (let i = 0; i < links.length; i++) {
            const link = links[i];
            totalLinksChecked++;

            // Parse the link URL
            const parsed = extractSlugFromUrl(link.url);
            if (!parsed) continue;

            // Check if target exists
            const exists = await checkTargetExists(parsed.type, parsed.slug, parsed.language);

            if (!exists) {
              foundBrokenLinks.push({
                id: `${item.id}-${i}`,
                sourceId: item.id,
                sourceTable: contentType as BrokenLink['sourceTable'],
                sourceSlug: itemSlug,
                sourceLanguage: item.language,
                brokenUrl: link.url,
                linkText: link.text || null,
                linkLocation: 'internal_links',
                linkIndex: i,
                targetStatus: 'not_found',
                fixed: false
              });
            }
          }

          itemsProcessed++;
          setProgress({
            current: itemsProcessed,
            total: totalItems,
            percent: Math.round((itemsProcessed / totalItems) * 100)
          });

          // Batch UI updates
          if (foundBrokenLinks.length > 0 && itemsProcessed % 50 === 0) {
            setBrokenLinks([...foundBrokenLinks]);
          }
        }
      }

      // Save broken links to database
      if (foundBrokenLinks.length > 0) {
        const linksToInsert = foundBrokenLinks.map(link => ({
          scan_id: scanRecord.id,
          source_table: link.sourceTable,
          source_id: link.sourceId,
          source_slug: link.sourceSlug,
          source_language: link.sourceLanguage,
          broken_url: link.brokenUrl,
          link_text: link.linkText,
          link_location: link.linkLocation,
          link_index: link.linkIndex,
          target_status: link.targetStatus
        }));

        await supabase.from('broken_links').insert(linksToInsert);
      }

      // Update scan record
      await supabase
        .from('broken_link_scans')
        .update({
          scan_completed_at: new Date().toISOString(),
          total_links_checked: totalLinksChecked,
          broken_links_found: foundBrokenLinks.length
        })
        .eq('id', scanRecord.id);

      setBrokenLinks(foundBrokenLinks);
      setSummary({
        totalLinks: totalLinksChecked,
        brokenCount: foundBrokenLinks.length,
        fixedCount: 0,
        lastScan: new Date().toISOString()
      });

      toast.success(`Scan complete! Found ${foundBrokenLinks.length} broken links out of ${totalLinksChecked} checked.`);
      loadScanHistory();
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("An error occurred during scanning");
    } finally {
      setScanning(false);
    }
  };

  // Remove broken link from source page
  const removeBrokenLink = async (link: BrokenLink) => {
    if (link.linkLocation !== 'internal_links' || link.linkIndex === null) {
      toast.error("Can only remove structured internal links");
      return;
    }

    // Fetch current internal_links
    const { data } = await supabase
      .from(link.sourceTable)
      .select('internal_links')
      .eq('id', link.sourceId)
      .single();

    if (!data || !data.internal_links) {
      toast.error("Could not fetch source content");
      return;
    }

    // Remove the broken link
    const updatedLinks = (data.internal_links as Array<{ url: string; text?: string }>).filter((_, i) => i !== link.linkIndex);

    // Update database
    const { error } = await supabase
      .from(link.sourceTable)
      .update({ internal_links: updatedLinks })
      .eq('id', link.sourceId);

    if (error) {
      toast.error(`Failed to remove link: ${error.message}`);
      return;
    }

    // Mark as fixed in broken_links table
    await supabase
      .from('broken_links')
      .update({ fixed: true, fixed_at: new Date().toISOString(), fix_action: 'removed' })
      .eq('source_id', link.sourceId)
      .eq('broken_url', link.brokenUrl);

    setBrokenLinks(prev => prev.filter(l => l.id !== link.id));
    toast.success("Broken link removed successfully");
  };

  // Bulk remove selected broken links
  const bulkRemoveLinks = async () => {
    const linksToRemove = brokenLinks.filter(l => selectedLinks.has(l.id));
    
    if (linksToRemove.length === 0) {
      toast.warning("No links selected");
      return;
    }

    // Group by source for efficiency
    const groupedBySource = linksToRemove.reduce((acc, link) => {
      const key = `${link.sourceTable}-${link.sourceId}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(link);
      return acc;
    }, {} as Record<string, BrokenLink[]>);

    let removed = 0;
    for (const [_, links] of Object.entries(groupedBySource)) {
      const sourceLink = links[0];
      
      // Fetch current internal_links
      const { data } = await supabase
        .from(sourceLink.sourceTable)
        .select('internal_links')
        .eq('id', sourceLink.sourceId)
        .single();

      if (!data || !data.internal_links) continue;

      // Get indices to remove (sorted descending to maintain correct indices)
      const indicesToRemove = links
        .filter(l => l.linkIndex !== null)
        .map(l => l.linkIndex as number)
        .sort((a, b) => b - a);

      let updatedLinks = [...(data.internal_links as Array<{ url: string; text?: string }>)];
      for (const idx of indicesToRemove) {
        updatedLinks.splice(idx, 1);
      }

      // Update database
      await supabase
        .from(sourceLink.sourceTable)
        .update({ internal_links: updatedLinks })
        .eq('id', sourceLink.sourceId);

      removed += links.length;
    }

    // Mark as fixed
    for (const link of linksToRemove) {
      await supabase
        .from('broken_links')
        .update({ fixed: true, fixed_at: new Date().toISOString(), fix_action: 'removed' })
        .eq('source_id', link.sourceId)
        .eq('broken_url', link.brokenUrl);
    }

    setBrokenLinks(prev => prev.filter(l => !selectedLinks.has(l.id)));
    setSelectedLinks(new Set());
    toast.success(`Removed ${removed} broken links`);
  };

  // Convert broken URL targets to 410 Gone
  const convertToGone = async () => {
    const linksToConvert = brokenLinks.filter(l => selectedLinks.has(l.id));
    
    if (linksToConvert.length === 0) {
      toast.warning("No links selected");
      return;
    }

    // Get unique broken URLs
    const uniqueUrls = [...new Set(linksToConvert.map(l => l.brokenUrl))];

    // Add to gone_urls table
    const goneEntries = uniqueUrls.map(url => ({
      url_path: url,
      reason: 'broken_internal_link',
      pattern_match: false
    }));

    const { error } = await supabase
      .from('gone_urls')
      .upsert(goneEntries, { onConflict: 'url_path' });

    if (error) {
      toast.error(`Failed to add to gone list: ${error.message}`);
      return;
    }

    toast.success(`Added ${uniqueUrls.length} URLs to 410 Gone list. Remember to also remove the broken links from source pages!`);
  };

  // Export to CSV
  const exportToCsv = () => {
    if (brokenLinks.length === 0) {
      toast.warning("No broken links to export");
      return;
    }

    const csv = [
      ['Source Table', 'Source Slug', 'Language', 'Broken URL', 'Link Text', 'Status'].join(','),
      ...brokenLinks.map(l => 
        [l.sourceTable, l.sourceSlug, l.sourceLanguage, l.brokenUrl, l.linkText || '', l.targetStatus].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broken-links-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${brokenLinks.length} broken links to CSV`);
  };

  // Toggle all selection
  const toggleAllSelection = () => {
    if (selectedLinks.size === brokenLinks.length) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(brokenLinks.map(l => l.id)));
    }
  };

  const toggleLinkSelection = (id: string) => {
    const newSelected = new Set(selectedLinks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLinks(newSelected);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔗 Broken Link Checker</h1>
            <p className="text-muted-foreground">
              Scan internal links and fix broken references
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={scanContent} disabled={scanning}>
              <Search className="h-4 w-4 mr-2" />
              {scanning ? "Scanning..." : "Start Scan"}
            </Button>
            <Button variant="outline" onClick={exportToCsv} disabled={brokenLinks.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Links Checked</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalLinks.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Broken Links</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{brokenLinks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{selectedLinks.size}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Last Scan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">
                {summary.lastScan 
                  ? format(new Date(summary.lastScan), 'MMM d, HH:mm')
                  : 'Never'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Scan Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scan Options</CardTitle>
            <CardDescription>Select which content types to scan for broken internal links</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(contentTypesToScan).map(([type, enabled]) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={enabled}
                    onCheckedChange={(checked) => 
                      setContentTypesToScan(prev => ({ ...prev, [type]: !!checked }))
                    }
                  />
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        {scanning && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <Progress value={progress.percent} className="h-2" />
                </div>
                <span className="text-sm text-muted-foreground min-w-[100px] text-right">
                  {progress.current} / {progress.total} ({progress.percent}%)
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {brokenLinks.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    Broken Links Found ({brokenLinks.length})
                  </CardTitle>
                  <CardDescription>
                    These internal links point to non-existent or gone pages
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={convertToGone}
                    disabled={selectedLinks.size === 0}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Add to 410 ({selectedLinks.size})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={bulkRemoveLinks}
                    disabled={selectedLinks.size === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Links ({selectedLinks.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={selectedLinks.size === brokenLinks.length && brokenLinks.length > 0}
                          onCheckedChange={toggleAllSelection}
                        />
                      </TableHead>
                      <TableHead>Source Page</TableHead>
                      <TableHead>Broken Link</TableHead>
                      <TableHead>Link Text</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokenLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedLinks.has(link.id)}
                            onCheckedChange={() => toggleLinkSelection(link.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-medium text-sm truncate">{link.sourceSlug}</p>
                            <p className="text-xs text-muted-foreground">{link.sourceLanguage} • {link.sourceTable.replace('_', ' ')}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[250px] block truncate">
                            {link.brokenUrl}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground max-w-[150px] block truncate">
                            {link.linkText || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-destructive border-destructive">
                            {link.targetStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBrokenLink(link)}
                              title="Remove this link"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/${link.sourceLanguage}/${link.sourceTable === 'blog_articles' ? 'blog' : 'qa'}/${link.sourceSlug}`, '_blank')}
                              title="View source page"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {!scanning && brokenLinks.length === 0 && summary.totalLinks > 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold">All Links Healthy!</h3>
                <p className="text-muted-foreground">
                  Scanned {summary.totalLinks} links and found no broken references.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Content Types</TableHead>
                    <TableHead>Links Checked</TableHead>
                    <TableHead>Broken Found</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanHistory.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell>
                        {format(new Date(scan.scanStartedAt), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {scan.contentTypesScanned.map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{scan.totalLinksChecked}</TableCell>
                      <TableCell>
                        <Badge variant={scan.brokenLinksFound > 0 ? "destructive" : "default"}>
                          {scan.brokenLinksFound}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {scan.scanCompletedAt ? (
                          <Badge variant="outline" className="text-green-600">Complete</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">Running</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Info Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> This tool scans the <code className="text-xs bg-muted px-1 rounded">internal_links</code> JSONB arrays 
            in your content tables and validates that each linked URL exists in the database. Links to unpublished or deleted content are flagged as broken.
            <br /><br />
            <strong>Actions:</strong>
            <ul className="list-disc ml-4 mt-2">
              <li><strong>Remove Links:</strong> Removes the broken link from the source page's internal_links array</li>
              <li><strong>Add to 410:</strong> Adds the broken URL to the gone_urls table (doesn't remove the link)</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </AdminLayout>
  );
};

export default BrokenLinkChecker;
