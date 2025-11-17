import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CitationPlacement {
  sentenceIndex: number;
  beforeText: string;
  afterText: string;
  url: string;
  source: string;
  relevanceScore: number;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      mode = 'fix_broken',
      auto_apply = true,
      use_approved_domains_only = true,
      diversity_threshold = 20,
      max_citations_per_article = 5
    } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting intelligent citation enhancement...');

    // Step 1: Get approved domains
    const { data: approvedDomains, error: domainsError } = await supabase
      .from('approved_domains')
      .select('domain, trust_score, category, tier')
      .eq('is_allowed', true)
      .order('trust_score', { ascending: false });

    if (domainsError || !approvedDomains?.length) {
      throw new Error('No approved domains found');
    }

    console.log(`✅ Loaded ${approvedDomains.length} approved domains`);

    // Step 2: Get domain usage stats to ensure diversity
    const { data: usageStats } = await supabase
      .from('domain_usage_stats')
      .select('domain, total_uses')
      .in('domain', approvedDomains.map(d => d.domain));

    const usageMap = new Map(usageStats?.map(s => [s.domain, s.total_uses]) || []);

    // Filter out overused domains
    const availableDomains = approvedDomains.filter(d => 
      (usageMap.get(d.domain) || 0) < diversity_threshold
    );

    console.log(`✅ ${availableDomains.length} domains available (under threshold)`);

    // Step 3: Find articles with broken citations
    const { data: brokenCitations, error: brokenError } = await supabase
      .from('external_citation_health')
      .select('url, status')
      .in('status', ['dead', 'broken', 'redirect_broken'])
      .limit(50);

    if (brokenError) throw brokenError;

    console.log(`🔍 Found ${brokenCitations?.length || 0} broken citations`);

    // Step 4: Find articles using those citations
    const brokenUrls = brokenCitations?.map(c => c.url) || [];
    const articlesMap = new Map();

    for (const url of brokenUrls) {
      const { data: articles } = await supabase.rpc('find_articles_with_citation', {
        citation_url: url,
        published_only: false
      });

      articles?.forEach((article: any) => {
        if (!articlesMap.has(article.id)) {
          articlesMap.set(article.id, article);
        }
      });
    }

    const articlesToFix = Array.from(articlesMap.values()).slice(0, 20);
    console.log(`📝 Processing ${articlesToFix.length} articles`);

    let totalCitationsAdded = 0;
    let articlesUpdated = 0;
    const domainsUsed = new Set<string>();

    // Step 5: Process each article
    for (const article of articlesToFix) {
      try {
        console.log(`\n📄 Processing: ${article.headline}`);

        // Extract current broken citations
        const externalCitations = Array.isArray(article.external_citations) 
          ? article.external_citations 
          : [];
        
        const brokenInArticle = externalCitations.filter((c: any) => 
          brokenUrls.includes(c.url)
        );

        console.log(`  ❌ ${brokenInArticle.length} broken citations to replace`);

        // Build Perplexity prompt with approved domains constraint
        const domainsList = availableDomains
          .slice(0, 30)
          .map(d => `- ${d.domain} (${d.category}, trust: ${d.trust_score})`)
          .join('\n');

        const prompt = `You are a citation placement expert. Analyze this Spanish real estate article and intelligently place citations ONLY from the approved domains list.

**Article:** "${article.headline}"
**Language:** ${article.language}
**Content Preview:** ${article.detailed_content.substring(0, 1200)}...

**APPROVED DOMAINS (USE ONLY THESE):**
${domainsList}

**Current Broken Citations to Replace:**
${brokenInArticle.map((c: any) => `- ${c.url} (${c.text || 'No anchor'})`).join('\n')}

**Task:**
1. Identify ${max_citations_per_article} key claims in the article that need citations
2. Find the EXACT sentence where each citation should be placed
3. Select the BEST URL from approved domains that supports that claim
4. Provide context about why this citation belongs there

**CRITICAL CONSTRAINTS:**
- Use ONLY domains from the approved list above
- Each citation MUST be from a DIFFERENT domain (maximize diversity)
- Citations must be highly relevant (relevance score > 85)
- Place citations naturally after factual claims, statistics, or regulations

Return ONLY valid JSON:
{
  "placements": [
    {
      "sentenceIndex": 3,
      "beforeText": "exact 20-30 chars before placement",
      "afterText": "exact 20-30 chars after placement",
      "url": "https://exact-url-from-approved-domains",
      "source": "Source Name",
      "relevanceScore": 95,
      "reason": "Why this citation fits here"
    }
  ]
}`;

        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
                content: 'You are a citation placement expert. Return ONLY valid JSON with precise citation placements from approved domains.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (!perplexityResponse.ok) {
          console.error(`  ❌ Perplexity API error: ${perplexityResponse.status}`);
          continue;
        }

        const perplexityData = await perplexityResponse.json();
        let responseText = perplexityData.choices[0].message.content;
        
        // Clean markdown artifacts
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const placementResult = JSON.parse(responseText);
        const placements: CitationPlacement[] = placementResult.placements || [];

        console.log(`  📌 Perplexity suggested ${placements.length} citations`);

        // Validate placements
        const validPlacements = placements.filter(p => {
          try {
            const url = new URL(p.url);
            const domain = url.hostname.replace('www.', '');
            const isApproved = availableDomains.some(d => d.domain === domain);
            
            if (!isApproved) {
              console.log(`  ⚠️ Rejected ${p.url} - not in approved domains`);
              return false;
            }

            if (p.relevanceScore < 85) {
              console.log(`  ⚠️ Rejected ${p.url} - low relevance (${p.relevanceScore})`);
              return false;
            }

            return true;
          } catch {
            return false;
          }
        });

        console.log(`  ✅ ${validPlacements.length} citations passed validation`);

        if (validPlacements.length === 0) {
          console.log(`  ⚠️ No valid placements found, skipping article`);
          continue;
        }

        // Create revision backup
        const { error: revisionError } = await supabase
          .from('article_revisions')
          .insert({
            article_id: article.id,
            revision_type: 'auto_citation_enhancement',
            previous_content: article.detailed_content,
            previous_citations: article.external_citations,
            change_reason: 'Intelligent auto-citation placement from approved domains',
            can_rollback: true
          });

        if (revisionError) {
          console.error(`  ❌ Failed to create revision: ${revisionError.message}`);
          continue;
        }

        // Insert citations into content
        let updatedContent = article.detailed_content;
        const newCitations = [];

        for (const placement of validPlacements) {
          const url = new URL(placement.url);
          const domain = url.hostname.replace('www.', '');
          
          // Find insertion point
          const searchText = placement.beforeText + placement.afterText;
          const insertionPoint = updatedContent.indexOf(searchText);
          
          if (insertionPoint === -1) {
            console.log(`  ⚠️ Could not find insertion point for: ${searchText.substring(0, 40)}...`);
            continue;
          }

          const citationId: number = newCitations.length + 1;
          const citationMarker = `[[${citationId}]]`;
          const insertAt = insertionPoint + placement.beforeText.length;
          
          updatedContent = 
            updatedContent.slice(0, insertAt) + 
            citationMarker + 
            updatedContent.slice(insertAt);

          newCitations.push({
            url: placement.url,
            source: placement.source,
            text: placement.reason,
            number: citationId
          });

          domainsUsed.add(domain);

          // Increment domain usage
          await supabase.rpc('increment_domain_usage', {
            p_domain: domain,
            p_article_id: article.id
          });

          console.log(`  ✅ Placed citation #${citationId}: ${placement.source} (${domain})`);
        }

        // Merge with existing citations (keep non-broken ones)
        const keptCitations = externalCitations.filter((c: any) => 
          !brokenUrls.includes(c.url)
        );
        const allCitations = [...keptCitations, ...newCitations];

        // Update article
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            detailed_content: updatedContent,
            external_citations: allCitations,
            has_dead_citations: false,
            last_citation_check_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (updateError) {
          console.error(`  ❌ Failed to update article: ${updateError.message}`);
          continue;
        }

        totalCitationsAdded += newCitations.length;
        articlesUpdated++;
        console.log(`  ✅ Updated article with ${newCitations.length} new citations`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (articleError) {
        console.error(`  ❌ Error processing article:`, articleError);
        continue;
      }
    }

    console.log(`\n🎉 Enhancement complete!`);
    console.log(`  Articles updated: ${articlesUpdated}`);
    console.log(`  Citations added: ${totalCitationsAdded}`);
    console.log(`  Unique domains used: ${domainsUsed.size}`);

    return new Response(
      JSON.stringify({
        success: true,
        articlesUpdated,
        citationsAdded: totalCitationsAdded,
        domainsUsed: domainsUsed.size,
        domainsUsedList: Array.from(domainsUsed)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in auto-enhance-citations:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
