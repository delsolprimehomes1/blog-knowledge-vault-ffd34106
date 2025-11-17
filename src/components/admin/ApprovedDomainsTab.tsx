import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, TrendingUp, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ApprovedDomainsTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: domains, isLoading } = useQuery({
    queryKey: ['approved-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approved_domains')
        .select('*')
        .order('trust_score', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: usageStats } = useQuery({
    queryKey: ['domain-usage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domain_usage_stats')
        .select('domain, total_uses, articles_used_in, last_used_at')
        .order('total_uses', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const usageMap = new Map(usageStats?.map(s => [s.domain, s]) || []);

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!domains) return [];
    const uniqueCategories = new Set(domains.map(d => d.category));
    return Array.from(uniqueCategories).sort();
  }, [domains]);

  // Filter domains based on search and category
  const filteredDomains = useMemo(() => {
    if (!domains) return [];
    
    let filtered = domains;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(domain => 
        domain.domain.toLowerCase().includes(query) ||
        domain.category.toLowerCase().includes(query) ||
        domain.notes?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(domain => domain.category === categoryFilter);
    }

    return filtered;
  }, [domains, searchQuery, categoryFilter]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'tier_1': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'tier_2': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getUsageColor = (uses: number) => {
    if (uses === 0) return 'text-muted-foreground';
    if (uses < 10) return 'text-green-600 dark:text-green-400';
    if (uses < 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const approvedCount = domains?.filter(d => d.is_allowed).length || 0;
  const totalDomains = domains?.length || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{approvedCount}</span>
              <span className="text-muted-foreground text-sm">/ {totalDomains}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tier 1 Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {domains?.filter(d => d.tier === 'tier_1' && d.is_allowed).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Highest authority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">
                {usageStats?.reduce((sum, s) => sum + (s.total_uses || 0), 0) || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Citations placed</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Domains</CardTitle>
          <CardDescription>Search by domain name, category, or description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredDomains.length === totalDomains 
              ? `Showing all ${totalDomains} domains`
              : `Showing ${filteredDomains.length} of ${totalDomains} domains`
            }
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved Domains</CardTitle>
          <CardDescription>
            Whitelisted domains for Perplexity citations - diversity enforced at 20 uses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDomains.map((domain) => {
                  const usage = usageMap.get(domain.domain);
                  const totalUses = usage?.total_uses || 0;
                  
                  return (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-mono text-sm">{domain.domain}</div>
                          {domain.notes && (
                            <div className="text-xs text-muted-foreground mt-1">{domain.notes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{domain.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierColor(domain.tier || 'unknown')}>
                          {domain.tier?.replace('tier_', 'Tier ') || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{domain.trust_score}/10</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={getUsageColor(totalUses)}>
                            {totalUses} {totalUses === 1 ? 'use' : 'uses'}
                          </div>
                          {usage?.articles_used_in && usage.articles_used_in > 0 && (
                            <div className="text-xs text-muted-foreground">
                              in {usage.articles_used_in} {usage.articles_used_in === 1 ? 'article' : 'articles'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {domain.is_allowed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
