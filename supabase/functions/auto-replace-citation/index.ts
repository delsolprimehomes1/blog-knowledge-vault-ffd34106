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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
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
    // Tier 1 domains (trust 9-10) are exempt from usage limits
    const availableDomains: ApprovedDomain[] = (approvedDomains || [])
      .map(d => ({
        ...d,
        usage_count: usageMap.get(d.domain) || 0
      }))
      .filter(d => {
        // Tier 1 domains (trust 9-10) are exempt from usage limits
        if (d.tier === 'tier_1' && d.trust_score >= 9) {
          return true;
        }
        // Other domains must have <20 uses
        return d.usage_count < 20;
      })
      .sort((a, b) => b.trust_score - a.trust_score);

    const tier1Count = availableDomains.filter(d => d.tier === 'tier_1' && d.trust_score >= 9).length;
    console.log(`Whitelist: ${availableDomains.length} approved domains available (${tier1Count} tier_1 exempt from usage limits)`);

    // Step 2: Build strict whitelist prompt for Perplexity
    const domainList = availableDomains
      .slice(0, 100) // Top 100 to keep prompt manageable
      .map(d => `- ${d.domain} (Trust: ${d.trust_score}, Category: ${d.category})`)
      .join('\n');

    const contextSnippet = articleContent
      .split(brokenUrl)[0]
      .slice(-300) + brokenUrl + articleContent.split(brokenUrl)[1].slice(0, 300);

    // Create a strict whitelist with domain-only list for validation
    const domainOnlyList = availableDomains
      .slice(0, 100)
      .map(d => d.domain)
      .join(', ');

    const prompt = `You are a citation replacement expert. Find a replacement for a broken citation.

CRITICAL CONSTRAINTS - FAILURE TO COMPLY WILL REJECT YOUR RESPONSE:
═══════════════════════════════════════════════════════════════════

1. APPROVED DOMAINS WHITELIST (YOU MUST USE ONE OF THESE):
${domainList}

2. DOMAIN VALIDATION CHECKLIST:
   ✓ Extract the domain from your suggested URL
   ✓ Check if it appears in the list above
   ✓ If NOT in the list, DO NOT use it - choose another domain from the list
   
3. FORBIDDEN: Do NOT suggest domains like:
   ❌ sede.seg-social.gob.es (not in whitelist)
   ❌ Any domain not explicitly listed above
   ✅ ONLY use: ${domainOnlyList}

═══════════════════════════════════════════════════════════════════

TASK CONTEXT:
- Article Topic: "${articleHeadline}"
- Article Language: ${articleLanguage}
- Broken Link: ${brokenUrl}
- Context: "${contextSnippet}"

REQUIRED OUTPUT FORMAT (JSON only, no markdown):
{
  "url": "https://[domain-from-whitelist-above]/specific-page-path",
  "sourceName": "Official Source Name",
  "relevanceScore": 85,
  "reason": "Brief explanation of why this replaces the broken link"
}

VALIDATION BEFORE RESPONDING:
1. Extract domain from your URL (e.g., "example.com" from "https://example.com/page")
2. Verify this exact domain appears in the whitelist above
3. If not found, choose a different domain from the whitelist
4. Ensure relevanceScore is realistic (0-100)
5. Return ONLY valid JSON, no extra text`;

    // Step 3: Call Lovable AI with structured output for strict constraint enforcement
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a citation replacement expert. You can ONLY suggest URLs from approved domains provided by the user.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_replacement',
            description: 'Suggest a replacement URL from the approved whitelist',
            parameters: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'Full URL from one of the approved domains in the whitelist'
                },
                sourceName: {
                  type: 'string',
                  description: 'Name of the source'
                },
                relevanceScore: {
                  type: 'number',
                  description: 'Relevance score from 0-100',
                  minimum: 0,
                  maximum: 100
                },
                reason: {
                  type: 'string',
                  description: 'Brief explanation of why this replaces the broken link'
                }
              },
              required: ['url', 'sourceName', 'relevanceScore', 'reason'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_replacement' } },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Lovable AI response:', JSON.stringify(data, null, 2));

    // Extract structured output from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'suggest_replacement') {
      throw new Error('AI did not return a valid replacement suggestion');
    }

    let suggestion: any;
    try {
      suggestion = JSON.parse(toolCall.function.arguments);
      console.log('Parsed suggestion:', suggestion);
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
      throw new Error('Could not parse AI suggestion');
    }

    // Step 4: Validate suggestion is in approved whitelist
    const replacementDomain = new URL(suggestion.url).hostname.replace('www.', '');
    const approvedDomain = availableDomains.find(d => d.domain === replacementDomain);

    if (!approvedDomain) {
      console.error(`Rejected: ${replacementDomain} not in whitelist`);
      throw new Error(`Suggested domain ${replacementDomain} is not in approved whitelist`);
    }

    // Determine if this is a high-trust government domain (Option 2)
    const isHighTrustGov = approvedDomain.tier === 'tier_1' && approvedDomain.trust_score >= 9;
    console.log(`Domain trust level: tier=${approvedDomain.tier}, trust_score=${approvedDomain.trust_score}, isHighTrustGov=${isHighTrustGov}`);

    // Step 5: Verify URL is accessible (skip for high-trust government domains)
    if (!isHighTrustGov) {
      try {
        const headCheck = await fetch(suggestion.url, { method: 'HEAD' });
        if (!headCheck.ok) {
          throw new Error(`URL returned ${headCheck.status}`);
        }
        console.log('URL accessibility verified');
      } catch (accessError) {
        console.error('URL not accessible:', accessError);
        throw new Error('Suggested URL is not accessible');
      }
    } else {
      console.log('Skipping accessibility check for high-trust government domain');
    }

    // Step 6: Calculate final score and validate relevance (Option 4)
    const relevanceScore = suggestion.relevanceScore || 80;
    const minRelevance = isHighTrustGov ? 70 : 80;
    
    if (relevanceScore < minRelevance) {
      throw new Error(`Relevance score too low: ${relevanceScore}/100 (minimum ${minRelevance} for ${approvedDomain.tier})`);
    }
    console.log(`Relevance score ${relevanceScore}/100 meets threshold of ${minRelevance}`);
    
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
