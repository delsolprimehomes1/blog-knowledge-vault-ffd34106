import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, TrendingDown, TrendingUp, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DomainDiversityData {
  domain: string;
  category: string;
  language: string;
  tier: string;
  trust_score: number;
  total_uses: number;
  usage_status: string;
  diversity_score: number;
}

export const DomainDiversityDashboard = () => {
  const [domains, setDomains] = useState<DomainDiversityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadDiversityData();
    loadAlerts();
  }, []);

  const loadDiversityData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_diversity_report' as any);

      if (error) throw error;
      setDomains((data || []) as DomainDiversityData[]);
    } catch (error) {
      console.error('Error loading diversity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('citation_diversity_alerts')
        .select('*')
        .eq('resolved', false)
        .order('current_uses', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const getStatusBadge = (status: string, diversityScore: number) => {
    if (status.includes('BLOCKED')) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Blocked</Badge>;
    }
    if (status.includes('UNUSED')) {
      return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="w-3 h-3" />Unused</Badge>;
    }
    if (status.includes('LIGHTLY')) {
      return <Badge variant="secondary" className="gap-1"><TrendingUp className="w-3 h-3" />Lightly Used</Badge>;
    }
    if (status.includes('MODERATE')) {
      return <Badge variant="outline" className="gap-1"><TrendingDown className="w-3 h-3" />Moderate</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><AlertCircle className="w-3 h-3" />High Use</Badge>;
  };

  const unused = domains.filter(d => d.total_uses === 0).length;
  const lightlyUsed = domains.filter(d => d.total_uses > 0 && d.total_uses < 5).length;
  const blocked = domains.filter(d => d.total_uses >= 20).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{domains.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-600">Unused (Priority 1)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{unused}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Lightly Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{lightlyUsed}</div>
            <p className="text-xs text-muted-foreground mt-1">&lt;5 uses each</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-destructive">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{blocked}</div>
            <p className="text-xs text-muted-foreground mt-1">≥20 uses</p>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {alerts.length} domains approaching usage limits. Review to maintain diversity.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Domain Usage Report</CardTitle>
          <CardDescription>
            Domains sorted by diversity score. Unused domains are prioritized for maximum diversity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {domains.map((domain) => (
                <div key={domain.domain} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{domain.domain}</p>
                      {getStatusBadge(domain.usage_status, domain.diversity_score)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {domain.category} • {domain.language} • Trust: {domain.trust_score}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">Uses: {domain.total_uses}</p>
                      <p className="text-xs text-muted-foreground">Score: {domain.diversity_score}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
