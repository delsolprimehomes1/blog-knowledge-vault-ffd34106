import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { analyzeDomain, type DomainAnalysis } from '@/lib/domainAnalyzer';

export interface PendingDomain {
  id: string;
  domain: string;
  source_name: string | null;
  example_urls: any;
  article_topics: any;
  times_suggested: number | null;
  status: string | null;
  created_at: string | null;
}

export interface DomainWithAnalysis extends PendingDomain {
  analysis: DomainAnalysis;
}

export function useBulkDomainActions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  /**
   * Bulk approve domains - Add to approved_domains with is_allowed=true
   */
  const bulkApprove = async (domains: DomainWithAnalysis[]) => {
    setIsProcessing(true);
    try {
      // Prepare approved domains data
      const approvedData = domains.map(d => ({
        domain: d.domain,
        category: d.analysis.category,
        tier: d.analysis.tier,
        trust_score: d.analysis.trustScore,
        language: d.analysis.language,
        region: d.analysis.region,
        source_type: d.analysis.sourceType,
        is_allowed: true,
        notes: `Auto-approved: ${d.analysis.reasoning}`,
      }));

      // Insert into approved_domains
      const { error: insertError } = await supabase
        .from('approved_domains')
        .upsert(approvedData, { onConflict: 'domain' });

      if (insertError) throw insertError;

      // Update discovered_domains status
      const { error: updateError } = await supabase
        .from('discovered_domains')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .in('id', domains.map(d => d.id));

      if (updateError) throw updateError;

      toast({
        title: '✅ Domains Approved',
        description: `${domains.length} domain${domains.length > 1 ? 's' : ''} added to whitelist`,
      });

      return { success: true };
    } catch (error) {
      console.error('Bulk approve error:', error);
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Bulk block domains - Add to approved_domains with is_allowed=false
   */
  const bulkBlock = async (domains: DomainWithAnalysis[]) => {
    setIsProcessing(true);
    try {
      // Prepare blocked domains data
      const blockedData = domains.map(d => ({
        domain: d.domain,
        category: d.analysis.category || 'Competitor',
        tier: '3',
        trust_score: d.analysis.trustScore,
        language: d.analysis.language,
        region: d.analysis.region,
        source_type: d.analysis.sourceType,
        is_allowed: false,
        notes: `Blocked: ${d.analysis.reasoning}`,
      }));

      // Insert into approved_domains
      const { error: insertError } = await supabase
        .from('approved_domains')
        .upsert(blockedData, { onConflict: 'domain' });

      if (insertError) throw insertError;

      // Update discovered_domains status
      const { error: updateError } = await supabase
        .from('discovered_domains')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .in('id', domains.map(d => d.id));

      if (updateError) throw updateError;

      toast({
        title: '🚫 Domains Blocked',
        description: `${domains.length} competitor domain${domains.length > 1 ? 's' : ''} blocked`,
      });

      return { success: true };
    } catch (error) {
      console.error('Bulk block error:', error);
      toast({
        title: 'Block Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Skip domains - Mark as reviewed but take no action
   */
  const bulkSkip = async (domainIds: string[]) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('discovered_domains')
        .update({ 
          status: 'skipped',
          reviewed_at: new Date().toISOString()
        })
        .in('id', domainIds);

      if (error) throw error;

      toast({
        title: '⏭️ Domains Skipped',
        description: `${domainIds.length} domain${domainIds.length > 1 ? 's' : ''} marked as skipped`,
      });

      return { success: true };
    } catch (error) {
      console.error('Bulk skip error:', error);
      toast({
        title: 'Skip Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Smart auto-approve - Only approve high-trust domains
   */
  const smartApprove = async (domains: DomainWithAnalysis[]) => {
    const highTrust = domains.filter(d => 
      d.analysis.trustScore >= 80 && !d.analysis.isCompetitor
    );

    const competitors = domains.filter(d => d.analysis.isCompetitor);

    const results = {
      approved: 0,
      blocked: 0,
      skipped: 0,
    };

    // Approve high-trust
    if (highTrust.length > 0) {
      const result = await bulkApprove(highTrust);
      if (result.success) results.approved = highTrust.length;
    }

    // Block competitors
    if (competitors.length > 0) {
      const result = await bulkBlock(competitors);
      if (result.success) results.blocked = competitors.length;
    }

    // Skip uncertain ones
    const uncertain = domains.filter(d => 
      d.analysis.trustScore < 80 && !d.analysis.isCompetitor
    );
    if (uncertain.length > 0) {
      results.skipped = uncertain.length;
    }

    toast({
      title: '🤖 Smart Review Complete',
      description: `Approved: ${results.approved} | Blocked: ${results.blocked} | Needs review: ${results.skipped}`,
    });

    return results;
  };

  return {
    bulkApprove,
    bulkBlock,
    bulkSkip,
    smartApprove,
    isProcessing,
  };
}
