import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const ApprovedDomainsTab = () => {
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

      <Card>
        <CardHeader>
          <CardTitle>Approved Domains</CardTitle>
          <CardDescription>
            High-authority sources whitelisted for automatic citation placement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-center">Trust Score</TableHead>
                <TableHead className="text-center">Usage</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains?.map((domain) => {
                const usage = usageMap.get(domain.domain);
                const uses = usage?.total_uses || 0;

                return (
                  <TableRow key={domain.id}>
                    <TableCell className="font-mono text-sm">
                      {domain.domain}
                      {domain.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {domain.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {domain.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTierColor(domain.tier || '')}>
                        {domain.tier?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="font-semibold">{domain.trust_score}</div>
                        <div className="text-xs text-muted-foreground">/ 10</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getUsageColor(uses)}>
                        {uses}
                        {usage && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({usage.articles_used_in} articles)
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {domain.is_allowed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
