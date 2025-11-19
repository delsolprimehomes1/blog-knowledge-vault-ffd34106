import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, XCircle, SkipForward, ChevronDown, ExternalLink,
  Sparkles, AlertTriangle, Shield
} from 'lucide-react';
import { analyzeDomain, getTrustScoreColor, getSourceTypeIcon } from '@/lib/domainAnalyzer';
import { useBulkDomainActions, type DomainWithAnalysis } from '@/hooks/useBulkDomainActions';

export function PendingDomainsManager() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { bulkApprove, bulkBlock, bulkSkip, smartApprove, isProcessing } = useBulkDomainActions();

  // Fetch pending domains
  const { data: pendingDomains, isLoading, refetch } = useQuery({
    queryKey: ['pending-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovered_domains')
        .select('*')
        .eq('status', 'pending')
        .order('times_suggested', { ascending: false });
      
      if (error) throw error;

      // Analyze each domain
      const analyzed: DomainWithAnalysis[] = data.map(d => ({
        ...d,
        analysis: analyzeDomain(
          d.domain, 
          d.source_name || undefined, 
          Array.isArray(d.example_urls) ? d.example_urls as string[] : []
        )
      }));

      return analyzed;
    }
  });

  // Get unique categories
  const categories = useMemo(() => {
    if (!pendingDomains) return [];
    const unique = Array.from(new Set(pendingDomains.map(d => d.analysis.category)));
    return unique.sort();
  }, [pendingDomains]);

  // Filter domains
  const filteredDomains = useMemo(() => {
    if (!pendingDomains) return [];
    
    let filtered = pendingDomains;
    
    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.source_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(d => d.analysis.category === categoryFilter);
    }
    
    return filtered;
  }, [pendingDomains, searchQuery, categoryFilter]);

  // Selected domains with analysis
  const selectedDomains = useMemo(() => {
    return filteredDomains.filter(d => selectedIds.has(d.id));
  }, [filteredDomains, selectedIds]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDomains.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDomains.map(d => d.id)));
    }
  };

  // Handle actions
  const handleApprove = async () => {
    const result = await bulkApprove(selectedDomains);
    if (result.success) {
      setSelectedIds(new Set());
      refetch();
    }
  };

  const handleBlock = async () => {
    const result = await bulkBlock(selectedDomains);
    if (result.success) {
      setSelectedIds(new Set());
      refetch();
    }
  };

  const handleSkip = async () => {
    const result = await bulkSkip(Array.from(selectedIds));
    if (result.success) {
      setSelectedIds(new Set());
      refetch();
    }
  };

  const handleSmartApprove = async () => {
    await smartApprove(filteredDomains);
    setSelectedIds(new Set());
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const highQualityCount = filteredDomains.filter(d => d.analysis.trustScore >= 85).length;
  const competitorCount = filteredDomains.filter(d => d.analysis.isCompetitor).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDomains.length}</div>
            <p className="text-xs text-muted-foreground">domains awaiting decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              High Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{highQualityCount}</div>
            <p className="text-xs text-muted-foreground">trust score ≥ 85</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Competitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{competitorCount}</div>
            <p className="text-xs text-muted-foreground">need blocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Domain Review Queue</CardTitle>
              <CardDescription>
                Review and approve discovered domains with AI-powered analysis
              </CardDescription>
            </div>
            <Button 
              onClick={handleSmartApprove}
              disabled={isProcessing || filteredDomains.length === 0}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Smart Approve All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <Input
              placeholder="Search domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedIds.size} domain{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button 
                  onClick={handleApprove}
                  disabled={isProcessing}
                  size="sm"
                  className="gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </Button>
                <Button 
                  onClick={handleBlock}
                  disabled={isProcessing}
                  size="sm"
                  variant="destructive"
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Block
                </Button>
                <Button 
                  onClick={handleSkip}
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </Button>
              </div>
            </div>
          )}

          {/* Domain Cards */}
          <div className="space-y-3">
            {filteredDomains.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No pending domains</p>
                <p className="text-sm">All discovered domains have been reviewed</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 py-2 border-b">
                  <Checkbox
                    checked={selectedIds.size === filteredDomains.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>

                {filteredDomains.map((domain) => (
                  <DomainCard
                    key={domain.id}
                    domain={domain}
                    isSelected={selectedIds.has(domain.id)}
                    onToggleSelect={() => toggleSelection(domain.id)}
                  />
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual Domain Card Component
interface DomainCardProps {
  domain: DomainWithAnalysis;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function DomainCard({ domain, isSelected, onToggleSelect }: DomainCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { analysis } = domain;

  const exampleUrls = Array.isArray(domain.example_urls) ? domain.example_urls : [];
  const articleTopics = Array.isArray(domain.article_topics) ? domain.article_topics : [];

  return (
    <Card className={isSelected ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getSourceTypeIcon(analysis.sourceType)}</span>
                <a 
                  href={`https://${domain.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm hover:underline flex items-center gap-1"
                >
                  {domain.domain}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              
              <Badge className={getTrustScoreColor(analysis.trustScore)}>
                {analysis.trustScore}/100
              </Badge>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{analysis.category}</Badge>
              <Badge variant="outline">Tier {analysis.tier}</Badge>
              <Badge variant="outline">{analysis.language.toUpperCase()}</Badge>
              <Badge variant="outline">{analysis.region}</Badge>
              {analysis.isCompetitor && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Competitor
                </Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <strong>Source:</strong> {domain.source_name || 'Unknown'} • 
              <strong className="ml-2">Suggested:</strong> {domain.times_suggested}× • 
              <strong className="ml-2">AI Analysis:</strong> {analysis.reasoning}
            </div>

            {(exampleUrls.length > 0 || articleTopics.length > 0) && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-8">
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    Show Details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {exampleUrls.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Example URLs:</p>
                      <ul className="text-xs space-y-1">
                        {exampleUrls.slice(0, 3).map((url: string, i: number) => (
                          <li key={i}>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {articleTopics.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Referenced in articles:</p>
                      <ul className="text-xs space-y-1">
                        {articleTopics.slice(0, 3).map((topic: string, i: number) => (
                          <li key={i} className="text-muted-foreground">• {topic}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
