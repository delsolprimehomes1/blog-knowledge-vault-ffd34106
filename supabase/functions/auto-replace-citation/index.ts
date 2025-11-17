import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovedDomain {
  domain: string;
  trust_score: number;
  tier: string;
  category: string;
  usage_count?: number;
}

interface ReplacementResult {
  success: boolean;
  replacementUrl?: string;
  replacementDomain?: string;
  replacementSource?: string;
  trustScore?: number;
  relevanceScore?: number;
  finalScore?: number;
  reason?: string;
  revisionId?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      brokenUrl,
      articleId,
      articleHeadline,
      articleContent,
      articleLanguage = 'es'
    } = await req.json();

    console.log(`Auto-replacing citation: ${brokenUrl} in article ${articleId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Fetch approved domains whitelist with usage stats
    const { data: approvedDomains, error: domainsError } = await supabase
      .from('approved_domains')
      .select('domain, trust_score, tier, category')
      .eq('is_allowed', true)
      .order('trust_score', { ascending: false });

    if (domainsError) throw domainsError;

    // Get domain usage stats
    const { data: usageStats } = await supabase
      .from('domain_usage_stats')
      .select('domain, total_uses');

    const usageMap = new Map(
      (usageStats || []).map((s: any) => [s.domain, s.total_uses || 0])
    );

    // Filter out overused domains (>20 uses) and enrich with usage data
    const availableDomains: ApprovedDomain[] = (approvedDomains || [])
      .map(d => ({
        ...d,
        usage_count: usageMap.get(d.domain) || 0
      }))
      .filter(d => d.usage_count < 20)
      .sort((a, b) => b.trust_score - a.trust_score);

    console.log(`Whitelist: ${availableDomains.length} approved domains available`);

    // Step 2: Build strict whitelist prompt for Perplexity
    const domainList = availableDomains
      .slice(0, 100) // Top 100 to keep prompt manageable
      .map(d => `- ${d.domain} (Trust: ${d.trust_score}, Category: ${d.category})`)
      .join('\n');

    const contextSnippet = articleContent
      .split(brokenUrl)[0]
      .slice(-300) + brokenUrl + articleContent.split(brokenUrl)[1].slice(0, 300);

    const prompt = `Find a replacement citation for this broken link. 

CRITICAL REQUIREMENT: You MUST ONLY use domains from this APPROVED WHITELIST:

${domainList}

Article Topic: "${articleHeadline}"
Article Language: ${articleLanguage}
Broken Link: ${brokenUrl}

Context around broken link:
"${contextSnippet}"

Return ONLY a single JSON object for the BEST matching URL from the approved whitelist:
{
  "url": "https://approved-domain.com/exact-page",
  "sourceName": "Source Name",
  "relevanceScore": 95,
  "reason": "Why this specific page replaces the broken link"
}

IMPORTANT:
- The domain MUST be from the whitelist above
- The URL must be specific and relevant, not just the homepage
- relevanceScore should be 0-100
- Return ONLY the JSON object, nothing else`;

    // Step 3: Call Perplexity
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a citation replacement expert. You MUST only suggest URLs from the provided approved domain whitelist. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Perplexity response:', aiResponse);

    // Parse suggestion
    let suggestion: any;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse suggestion:', parseError);
      throw new Error('Could not parse AI response');
    }

    // Step 4: Validate suggestion is in approved whitelist
    const replacementDomain = new URL(suggestion.url).hostname.replace('www.', '');
    const approvedDomain = availableDomains.find(d => d.domain === replacementDomain);

    if (!approvedDomain) {
      console.error(`Rejected: ${replacementDomain} not in whitelist`);
      throw new Error(`Suggested domain ${replacementDomain} is not in approved whitelist`);
    }

    // Step 5: Verify URL is accessible
    try {
      const headCheck = await fetch(suggestion.url, { method: 'HEAD' });
      if (!headCheck.ok) {
        throw new Error(`URL returned ${headCheck.status}`);
      }
    } catch (accessError) {
      console.error('URL not accessible:', accessError);
      throw new Error('Suggested URL is not accessible');
    }

    // Step 6: Calculate final score
    const relevanceScore = suggestion.relevanceScore || 80;
    const trustScore = approvedDomain.trust_score;
    const usageCount = approvedDomain.usage_count || 0;
    const diversityBonus = Math.max(0, 100 - (usageCount * 5));

    const finalScore = (relevanceScore * 0.6) + (trustScore * 10 * 0.3) + (diversityBonus * 0.1);

    console.log(`Scoring: relevance=${relevanceScore}, trust=${trustScore}, diversity=${diversityBonus}, final=${finalScore.toFixed(2)}`);

    // Step 7: Fetch article for revision backup
    const { data: article, error: articleError } = await supabase
      .from('blog_articles')
      .select('detailed_content, external_citations')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      throw new Error('Article not found');
    }

    // Step 8: Create revision backup
    const { data: revision, error: revisionError } = await supabase
      .from('article_revisions')
      .insert({
        article_id: articleId,
        revision_type: 'auto_citation_replacement',
        previous_content: article.detailed_content,
        previous_citations: article.external_citations,
        change_reason: `Auto-replaced broken citation: ${brokenUrl} → ${suggestion.url}`,
        can_rollback: true,
        rollback_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (revisionError) {
      console.error('Failed to create revision:', revisionError);
      throw new Error('Failed to create revision backup');
    }

    // Step 9: Replace in content and citations
    const updatedContent = article.detailed_content.replace(
      new RegExp(brokenUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      suggestion.url
    );

    const updatedCitations = (article.external_citations as any[]).map(c =>
      c.url === brokenUrl
        ? {
            ...c,
            url: suggestion.url,
            source_name: suggestion.sourceName,
            last_verified: new Date().toISOString()
          }
        : c
    );

    // Step 10: Update article
    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({
        detailed_content: updatedContent,
        external_citations: updatedCitations,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (updateError) {
      console.error('Failed to update article:', updateError);
      throw new Error('Failed to update article');
    }

    // Step 11: Update citation tracking
    await supabase
      .from('citation_usage_tracking')
      .update({ is_active: false })
      .eq('article_id', articleId)
      .eq('citation_url', brokenUrl);

    await supabase
      .from('citation_usage_tracking')
      .insert({
        article_id: articleId,
        citation_url: suggestion.url,
        citation_source: suggestion.sourceName,
        citation_domain: replacementDomain,
        is_active: true,
        last_verified_at: new Date().toISOString()
      });

    // Step 12: Increment domain usage
    await supabase.rpc('increment_domain_usage', {
      p_domain: replacementDomain,
      p_article_id: articleId
    });

    // Step 13: Update citation health
    await supabase
      .from('external_citation_health')
      .upsert({
        url: suggestion.url,
        status: 'healthy',
        http_status_code: 200,
        source_name: suggestion.sourceName,
        last_checked_at: new Date().toISOString(),
        times_verified: 1
      }, { onConflict: 'url' });

    const result: ReplacementResult = {
      success: true,
      replacementUrl: suggestion.url,
      replacementDomain: replacementDomain,
      replacementSource: suggestion.sourceName,
      trustScore: trustScore,
      relevanceScore: relevanceScore,
      finalScore: parseFloat(finalScore.toFixed(2)),
      reason: suggestion.reason,
      revisionId: revision.id
    };

    console.log('✅ Citation replaced successfully:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-replace-citation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
