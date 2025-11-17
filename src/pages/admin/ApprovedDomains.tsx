import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { XCircle, Shield, TrendingUp, AlertCircle } from "lucide-react";

export default function ApprovedDomains() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch approved domains
  const { data: domains, isLoading } = useQuery({
    queryKey: ['approved-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approved_domains')
        .select('*')
        .eq('is_allowed', false) // BLACKLIST: Show blocked domains
        .order('domain', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch domain usage stats
  const { data: usageStats } = useQuery({
    queryKey: ['domain-usage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domain_usage_stats')
        .select('domain, total_uses')
        .order('total_uses', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Create usage map for efficient lookup
  const usageMap = useMemo(() => {
    if (!usageStats) return new Map();
    return new Map(usageStats.map(stat => [stat.domain, stat.total_uses]));
  }, [usageStats]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!domains) return [];
    const unique = Array.from(new Set(domains.map(d => d.category)));
    return unique.sort();
  }, [domains]);

  // Filter domains
  const filteredDomains = useMemo(() => {
    if (!domains) return [];
    
    let filtered = domains;
    
    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(d => d.category === categoryFilter);
    }
    
    return filtered;
  }, [domains, searchQuery, categoryFilter]);

  const getTierColor = (tier: string | null) => {
    if (!tier) return 'bg-muted text-muted-foreground';
    switch (tier) {
      case '1': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case '2': return 'bg-blue-500/10 text-blue-600 border-emerald-500/20';
      case '3': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUsageColor = (uses: number) => {
    if (uses > 20) return 'text-red-600 font-semibold';
    if (uses > 10) return 'text-orange-600 font-medium';
    if (uses > 5) return 'text-blue-600';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  const tier1Count = domains?.filter(d => d.tier === '1').length || 0;
  const totalUsage = Array.from(usageMap.values()).reduce((sum, uses) => sum + uses, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-red-600">🚫 Blocked Competitor Domains</h1>
          <p className="text-muted-foreground">
            This is a <strong>BLACKLIST</strong> of competitor domains that are automatically blocked from all citations. 
            These 296 real estate competitor websites will never appear in AI-suggested citations.
          </p>
        </div>
        
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Blocked Competitor Domains
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{domains?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Blacklisted competitors
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Real Estate Competitors
              </CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {domains?.filter(d => d.category === 'Real Estate Competitors').length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Direct property competitors
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Protection Status
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground">
                All competitor citations blocked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Input 
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Domains Table */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Domains ({filteredDomains.length})</CardTitle>
            <CardDescription>
              Only these domains can be used for external citations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
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
                  {filteredDomains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-mono text-sm">{domain.domain}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{domain.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {domain.tier ? (
                          <Badge className={getTierColor(domain.tier)}>
                            Tier {domain.tier}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{domain.trust_score}</span>
                      </TableCell>
                      <TableCell>
                        <span className={getUsageColor(usageMap.get(domain.domain) || 0)}>
                          {usageMap.get(domain.domain) || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                      <Badge 
                        variant="destructive"
                        className="whitespace-nowrap bg-red-600 hover:bg-red-700"
                      >
                        🚫 BLOCKED
                      </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
