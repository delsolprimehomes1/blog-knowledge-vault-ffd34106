import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { XCircle, Shield, Clock } from "lucide-react";
import { PendingDomainsManager } from "@/components/admin/PendingDomainsManager";
import { DomainReviewAlert } from "@/components/admin/DomainReviewAlert";

export default function ApprovedDomains() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch pending domains count
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-domains-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('discovered_domains')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch approved domains (whitelist)
  const { data: approvedDomains, isLoading: isLoadingApproved } = useQuery({
    queryKey: ['approved-whitelist-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approved_domains')
        .select('*')
        .eq('is_allowed', true)
        .order('domain', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch blocked domains (blacklist)
  const { data: blockedDomains, isLoading: isLoadingBlocked } = useQuery({
    queryKey: ['blocked-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approved_domains')
        .select('*')
        .eq('is_allowed', false)
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

  // Get unique categories for approved domains
  const approvedCategories = useMemo(() => {
    if (!approvedDomains) return [];
    const unique = Array.from(new Set(approvedDomains.map(d => d.category)));
    return unique.sort();
  }, [approvedDomains]);

  // Get unique categories for blocked domains
  const blockedCategories = useMemo(() => {
    if (!blockedDomains) return [];
    const unique = Array.from(new Set(blockedDomains.map(d => d.category)));
    return unique.sort();
  }, [blockedDomains]);

  // Filter approved domains
  const filteredApproved = useMemo(() => {
    if (!approvedDomains) return [];
    
    let filtered = approvedDomains;
    
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
  }, [approvedDomains, searchQuery, categoryFilter]);

  // Filter blocked domains
  const filteredBlocked = useMemo(() => {
    if (!blockedDomains) return [];
    
    let filtered = blockedDomains;
    
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
  }, [blockedDomains, searchQuery, categoryFilter]);

  const getTierColor = (tier: string | null) => {
    if (!tier) return 'bg-muted text-muted-foreground';
    switch (tier) {
      case '1': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case '2': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Domain Management</h1>
          <p className="text-muted-foreground">
            Review and approve discovered domains, manage whitelist, and block competitors
          </p>
        </div>

        {/* Alert Banner */}
        <DomainReviewAlert onReviewClick={() => setActiveTab('pending')} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending Review
              {pendingCount && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <Shield className="w-4 h-4" />
              Approved Whitelist
              <Badge variant="secondary" className="ml-1">
                {approvedDomains?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="blocked" className="gap-2">
              <XCircle className="w-4 h-4" />
              Blocked Competitors
              <Badge variant="secondary" className="ml-1">
                {blockedDomains?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Pending Domains Tab */}
          <TabsContent value="pending">
            <PendingDomainsManager />
          </TabsContent>

          {/* Approved Whitelist Tab */}
          <TabsContent value="approved">
            {isLoadingApproved ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <ApprovedDomainsTable 
                domains={filteredApproved}
                categories={approvedCategories}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                usageMap={usageMap}
                getTierColor={getTierColor}
                getUsageColor={getUsageColor}
                type="approved"
              />
            )}
          </TabsContent>

          {/* Blocked Competitors Tab */}
          <TabsContent value="blocked">
            {isLoadingBlocked ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <ApprovedDomainsTable 
                domains={filteredBlocked}
                categories={blockedCategories}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                usageMap={usageMap}
                getTierColor={getTierColor}
                getUsageColor={getUsageColor}
                type="blocked"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Shared table component for approved/blocked domains
interface ApprovedDomainsTableProps {
  domains: any[];
  categories: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  usageMap: Map<string, number>;
  getTierColor: (tier: string | null) => string;
  getUsageColor: (uses: number) => string;
  type: 'approved' | 'blocked';
}

function ApprovedDomainsTable({
  domains,
  categories,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  usageMap,
  getTierColor,
  getUsageColor,
  type
}: ApprovedDomainsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === 'approved' ? '✅ Approved Whitelist' : '🚫 Competitor Blacklist'}
        </CardTitle>
        <CardDescription>
          {type === 'approved' 
            ? 'Authoritative sources approved for citation discovery'
            : 'Real estate competitors automatically excluded from citation discovery'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <Input
            placeholder={`Search ${type} domains...`}
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

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
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
                {domains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No {type} domains found
                    </TableCell>
                  </TableRow>
                ) : (
                  domains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-mono text-sm">{domain.domain}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{domain.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierColor(domain.tier)}>
                          Tier {domain.tier || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{domain.trust_score}</TableCell>
                      <TableCell className={getUsageColor(usageMap.get(domain.domain) || 0)}>
                        {usageMap.get(domain.domain) || 0}
                      </TableCell>
                      <TableCell>
                        {type === 'approved' ? (
                          <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <Shield className="w-3 h-3" />
                            APPROVED
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            BLOCKED
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
