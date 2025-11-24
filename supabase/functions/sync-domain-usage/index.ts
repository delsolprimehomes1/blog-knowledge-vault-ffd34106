import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Domain analysis for auto-categorization
function analyzeDomainForSync(domain: string): { 
  category: string; 
  trustScore: number; 
  tier: string;
  sourceType: string;
  language: string | null;
  region: string | null;
} {
  const lowerDomain = domain.toLowerCase();
  
  // Government domains
  if (lowerDomain.includes('.gov') || lowerDomain.includes('.gob.es') || 
      lowerDomain.includes('juntadeandalucia') || lowerDomain.includes('ine.es') ||
      lowerDomain.includes('boe.es')) {
    return {
      category: 'Government Authority',
      trustScore: 95,
      tier: '1',
      sourceType: 'Government',
      language: lowerDomain.includes('.es') || lowerDomain.includes('juntadeandalucia') ? 'es' : null,
      region: lowerDomain.includes('.es') || lowerDomain.includes('juntadeandalucia') ? 'ES' : null
    };
  }
  
  // Academic domains
  if (lowerDomain.includes('.edu') || lowerDomain.includes('.ac.uk') || 
      lowerDomain.includes('university') || lowerDomain.includes('universidad')) {
    return {
      category: 'Academic',
      trustScore: 90,
      tier: '1',
      sourceType: 'Academic',
      language: lowerDomain.includes('.es') ? 'es' : null,
      region: lowerDomain.includes('.es') ? 'ES' : null
    };
  }
  
  // Statistics/research
  if (lowerDomain.includes('statistic') || lowerDomain.includes('ine.') || 
      lowerDomain.includes('eurostat') || lowerDomain.includes('oecd')) {
    return {
      category: 'Statistics',
      trustScore: 95,
      tier: '1',
      sourceType: 'Research',
      language: lowerDomain.includes('.es') ? 'es' : null,
      region: lowerDomain.includes('.es') ? 'ES' : 'Global'
    };
  }
  
  // News organizations
  if (lowerDomain.includes('bbc.') || lowerDomain.includes('reuters.') || 
      lowerDomain.includes('guardian.') || lowerDomain.includes('elpais.')) {
    return {
      category: 'News & Media',
      trustScore: 85,
      tier: '2',
      sourceType: 'News',
      language: lowerDomain.includes('elpais') || lowerDomain.includes('.es') ? 'es' : 'en',
      region: lowerDomain.includes('.es') ? 'ES' : null
    };
  }
  
  // Default
  return {
    category: 'General',
    trustScore: 70,
    tier: '2',
    sourceType: 'General',
    language: null,
    region: null
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { minUsageThreshold = 100 } = await req.json();

    console.log(`Syncing domains with >=${minUsageThreshold} uses to approved_domains...`);

    // Get heavily-used domains that aren't already in approved_domains
    const { data: statsData, error: statsError } = await supabase
      .from('domain_usage_stats')
      .select('domain, total_uses, category, tier, last_used_at')
      .gte('total_uses', minUsageThreshold)
      .order('total_uses', { ascending: false });

    if (statsError) throw statsError;

    if (!statsData || statsData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No domains meet the threshold',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which domains already exist in approved_domains
    const { data: existingDomains, error: existingError } = await supabase
      .from('approved_domains')
      .select('domain')
      .in('domain', statsData.map(d => d.domain));

    if (existingError) throw existingError;

    const existingDomainSet = new Set(existingDomains?.map(d => d.domain) || []);
    const newDomains = statsData.filter(d => !existingDomainSet.has(d.domain));

    console.log(`Found ${newDomains.length} new domains to sync`);

    // Insert new domains with auto-categorization
    const domainsToInsert = newDomains.map(d => {
      const analysis = analyzeDomainForSync(d.domain);
      return {
        domain: d.domain,
        category: d.category || analysis.category,
        trust_score: analysis.trustScore,
        tier: d.tier || analysis.tier,
        source_type: analysis.sourceType,
        language: analysis.language,
        region: analysis.region,
        is_allowed: true,
        notes: `Auto-synced from domain_usage_stats (${d.total_uses} uses)`
      };
    });

    if (domainsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('approved_domains')
        .insert(domainsToInsert);

      if (insertError) throw insertError;
    }

    console.log(`Successfully synced ${domainsToInsert.length} domains`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: domainsToInsert.length,
        domains: domainsToInsert.map(d => d.domain)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing domains:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
