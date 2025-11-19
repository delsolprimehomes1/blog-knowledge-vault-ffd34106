import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Shield, XCircle } from 'lucide-react';
import { analyzeDomain } from '@/lib/domainAnalyzer';

interface DomainReviewAlertProps {
  onReviewClick: () => void;
}

export function DomainReviewAlert({ onReviewClick }: DomainReviewAlertProps) {
  const { data: pendingDomains } = useQuery({
    queryKey: ['pending-domains-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovered_domains')
        .select('*')
        .eq('status', 'pending');
      
      if (error) throw error;
      
      // Analyze domains to categorize them
      const analyzed = data.map(d => ({
        ...d,
        analysis: analyzeDomain(d.domain, d.source_name || undefined)
      }));

      const highQuality = analyzed.filter(d => d.analysis.trustScore >= 85).length;
      const competitors = analyzed.filter(d => d.analysis.isCompetitor).length;

      return {
        total: data.length,
        highQuality,
        competitors,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Don't show alert if no pending domains
  if (!pendingDomains || pendingDomains.total === 0) {
    return null;
  }

  // Show alert if there are 10+ pending domains or high-priority items
  const showAlert = pendingDomains.total >= 10 || 
                    pendingDomains.highQuality > 0 || 
                    pendingDomains.competitors > 0;

  if (!showAlert) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-900 dark:text-orange-100">
        Domains Pending Review
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-orange-700 dark:text-orange-300">
            {pendingDomains.total} domains need review
          </span>
          {pendingDomains.highQuality > 0 && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
              <Shield className="w-3 h-3 mr-1" />
              {pendingDomains.highQuality} high-quality
            </Badge>
          )}
          {pendingDomains.competitors > 0 && (
            <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
              <XCircle className="w-3 h-3 mr-1" />
              {pendingDomains.competitors} competitors
            </Badge>
          )}
        </div>
        <Button 
          onClick={onReviewClick}
          size="sm"
          className="ml-4"
        >
          Review Now
        </Button>
      </AlertDescription>
    </Alert>
  );
}
