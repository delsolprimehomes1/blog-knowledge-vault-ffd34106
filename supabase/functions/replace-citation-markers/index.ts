import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CitationContext {
  claim: string;
  surroundingText: string;
  articleTopic: string;
  language: string;
  index: number;
}

interface Citation {
  sourceName: string;
  url: string;
  relevance: string;
  language: string;
  index: number;
  fallbackCitation?: boolean; // Flag for overused domain fallbacks
}

// ===== DOMAIN DIVERSITY ENFORCEMENT =====
async function getOverusedDomains(supabase: any, limit: number = 20): Promise<string[]> {
  const { data, error } = await supabase
    .from('domain_usage_stats')
    .select('domain, total_uses')
    .gte('total_uses', limit)
    .order('total_uses', { ascending: false });
    
  if (error) {
    console.error('Error fetching domain stats:', error);
    return [];
  }
  
  console.log(`🚫 Blocked ${data.length} overused domains (>${limit} uses)`);
  return data.map((d: any) => d.domain);
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

async function trackDomainUsage(supabase: any, domain: string, articleId?: string): Promise<void> {
  try {
    // ✅ ATOMIC UPDATE: Use Supabase RPC with SQL transaction
    const { data, error } = await supabase.rpc('increment_domain_usage', {
      p_domain: domain,
      p_article_id: articleId
    });
    
    if (error) {
      console.error('Domain tracking error:', error);
      
      // Fallback to non-atomic update if RPC fails
      const { data: existing } = await supabase
        .from('domain_usage_stats')
        .select('total_uses')
        .eq('domain', domain)
        .single();
      
      const newCount = (existing?.total_uses || 0) + 1;
      
      await supabase
        .from('domain_usage_stats')
        .upsert({
          domain,
          total_uses: newCount,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'domain'
        });
        
      console.log(`⚠️ Fallback tracking: ${domain} (${newCount} total uses)`);
    } else {
      console.log(`✓ Tracked: ${domain} (atomic)`);
    }
  } catch (error) {
    console.error('Domain tracking failed:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, headline, language, category, preferredSourceTypes = [], articleId } = await req.json();

    console.log('Citation replacement request:', { headline, language, category });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get blocked domains (>20 uses)
    const blockedDomains = await getOverusedDomains(supabase, 20);

    // Extract all [CITATION_NEEDED] markers with context
    const citationContexts = extractCitationContexts(content, headline, language);

    if (citationContexts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          citations: [],
          updatedContent: content,
          message: 'No citations needed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${citationContexts.length} citation markers to replace`);

    // Find citations for each marker using Perplexity
    const citations: Citation[] = [];

    for (const context of citationContexts) {
      try {
        console.log(`\n🎯 Citation Request #${context.index + 1}`);
        console.log(`   Sentence: "${context.claim.substring(0, 60)}..."`);
        console.log(`   Blocked domains: ${blockedDomains.length}`);
        
        let citation = await findCitationForClaim(context, language, preferredSourceTypes, blockedDomains, supabase);
        
        // ✅ FALLBACK: If all domains blocked/failed, try without blocking
        if (!citation && blockedDomains.length > 100) { // Only if many domains blocked
          console.warn('   ⚠️ All domains blocked - attempting fallback...');
          
          citation = await findCitationForClaim(
            context, 
            language, 
            preferredSourceTypes, 
            [], // NO BLOCKED DOMAINS for fallback
            supabase
          );
          
          if (citation) {
            // Tag as fallback citation
            citation.fallbackCitation = true;
            console.log(`   ⚠️ FALLBACK citation used: ${citation.sourceName}`);
          }
        }
        
        if (citation) {
          const domain = extractDomain(citation.url);
          
          // Double-check domain isn't blocked (safety) - SKIP for fallback
          if (!citation.fallbackCitation && blockedDomains.includes(domain)) {
            console.warn(`⚠️ Perplexity returned blocked domain: ${domain} - REJECTING`);
            continue;
          }
          
          citations.push(citation);
          console.log(`   ✓ Selected: ${citation.sourceName}`);
          console.log(`   ✓ Domain: ${domain}`);
          
          // Track domain usage (even for fallback)
          await trackDomainUsage(supabase, domain, articleId);
        } else {
          console.log(`   ✗ No citation found`);
        }
      } catch (error) {
        console.error('Error finding citation:', error);
      }
    }

    // Replace [CITATION_NEEDED] markers with actual citations
    const updatedContent = replaceCitationMarkers(content, citations);

    console.log(`Replaced ${citations.length} of ${citationContexts.length} markers`);

    return new Response(
      JSON.stringify({
        success: true,
        citations,
        updatedContent,
        totalMarkers: citationContexts.length,
        replacedCount: citations.length,
        failedCount: citationContexts.length - citations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in replace-citation-markers:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Enhanced sentence splitter that handles abbreviations, URLs, and decimals
function smartSentenceSplit(text: string): string[] {
  // Protect URLs
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls: string[] = [];
  let protectedText = text.replace(urlPattern, (match) => {
    urls.push(match);
    return `__URL_${urls.length - 1}__`;
  });
  
  // Protect common abbreviations
  const abbrevs = ['U.K.', 'U.S.', 'U.N.', 'E.U.', 'etc.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'i.e.', 'e.g.'];
  const abbrevMap: Record<string, string> = {};
  abbrevs.forEach((abbrev, idx) => {
    const placeholder = `__ABBREV_${idx}__`;
    abbrevMap[placeholder] = abbrev;
    protectedText = protectedText.replace(new RegExp(abbrev.replace('.', '\\.'), 'g'), placeholder);
  });
  
  // Split on sentence boundaries (only when followed by capital letter)
  const sentences = protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter(s => s.trim().length > 0);
  
  // Restore protected content
  return sentences.map(sentence => {
    let restored = sentence;
    // Restore abbreviations
    Object.entries(abbrevMap).forEach(([placeholder, original]) => {
      restored = restored.replace(placeholder, original);
    });
    // Restore URLs
    urls.forEach((url, idx) => {
      restored = restored.replace(`__URL_${idx}__`, url);
    });
    return restored;
  });
}

function extractCitationContexts(
  content: string, 
  headline: string,
  language: string
): CitationContext[] {
  const contexts: CitationContext[] = [];
  
  // Split content into sentences (handle HTML)
  const withoutTags = content.replace(/<[^>]+>/g, ' ');
  // ✅ USE SMART SENTENCE SPLITTING
  const sentences = smartSentenceSplit(withoutTags);
  
  let markerIndex = 0;
  sentences.forEach((sentence, index) => {
    if (sentence.includes('[CITATION_NEEDED]')) {
      // ✅ SENTENCE-LEVEL CONTEXT: Get 3 sentences before and after
      const start = Math.max(0, index - 3);
      const end = Math.min(sentences.length, index + 4);
      const surroundingText = sentences.slice(start, end).join(' ');
      
      // Extract the actual claim (text before [CITATION_NEEDED])
      const claim = sentence
        .replace('[CITATION_NEEDED]', '')
        .trim();
      
      contexts.push({
        claim,
        surroundingText: surroundingText.replace(/\[CITATION_NEEDED\]/g, ''),
        articleTopic: headline,
        language,
        index: markerIndex++
      });
    }
  });
  
  return contexts;
}

// Helper function to identify government/educational domains
function isGovernmentDomain(url: string): boolean {
  const govPatterns = [
    // Generic government domains
    '.gov',                    // US federal/state government
    '.edu',                    // Educational institutions (US)
    '.ac.uk',                  // Academic institutions (UK)
    
    // UK government
    '.gov.uk',                 // UK government departments
    '.nhs.uk',                 // National Health Service
    'ofcom.org.uk',           // Ofcom (Communications regulator)
    'fca.org.uk',             // Financial Conduct Authority
    'cqc.org.uk',             // Care Quality Commission
    'ons.gov.uk',             // Office for National Statistics
    
    // Spanish government
    '.gob.es',                 // Spanish government
    '.gob.',                   // Generic Spanish-speaking countries
    'ine.es',                  // Instituto Nacional de Estadística
    'bde.es',                  // Banco de España
    'boe.es',                  // Boletín Oficial del Estado
    
    // European Union
    'europa.eu',               // EU institutions
    'eurostat.ec.europa.eu',  // Eurostat
    
    // Other countries
    '.gouv.',                  // French-speaking governments (gouv.fr, etc.)
    '.overheid.nl',            // Netherlands government
    '.gc.ca',                  // Government of Canada
    '.gov.au',                 // Australian government
    '.govt.nz'                 // New Zealand government
  ];
  const lowerUrl = url.toLowerCase();
  return govPatterns.some(pattern => lowerUrl.includes(pattern));
}

// Resilient URL verification with fallback strategies
async function verifyUrl(url: string): Promise<boolean> {
  const isGov = isGovernmentDomain(url);
  
  try {
    // Try HEAD request first (fastest)
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CitationBot/1.0)'
      },
      signal: AbortSignal.timeout(8000)
    });
    
    if (response.status === 200 || response.status === 403) {
      return true;
    }
    
    // For government domains, try GET request as fallback
    if (isGov && (response.status === 400 || response.status >= 500)) {
      console.log(`HEAD failed for gov site ${url}, trying GET...`);
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CitationBot/1.0)'
        },
        signal: AbortSignal.timeout(10000)
      });
      return getResponse.status === 200 || getResponse.status === 403;
    }
    
    return false;
  } catch (error) {
    console.error('URL verification error:', url, error);
    
    // For government domains, be more lenient with SSL/network errors
    if (isGov) {
      console.warn(`Accepting government URL despite verification error: ${url}`);
      return true; // ✅ Accept government sources even with SSL issues
    }
    
    return false;
  }
}

// Verification with retry logic
async function verifyUrlWithRetry(url: string, retries = 2): Promise<boolean> {
  for (let i = 0; i <= retries; i++) {
    const result = await verifyUrl(url);
    if (result) return true;
    
    if (i < retries) {
      console.log(`Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
}

// Semantic validation: Check if citation URL content matches target sentence
async function validateCitationRelevance(
  targetSentence: string,
  citation: Citation,
  minKeywordMatches: number = 3
): Promise<{ valid: boolean; score: number; reason: string }> {
  
  // Extract keywords from target sentence
  const extractKeywords = (text: string): Set<string> => {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);
    
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word))
    );
  };
  
  const sentenceKeywords = extractKeywords(targetSentence);
  const citationKeywords = extractKeywords(citation.sourceName + ' ' + (citation.relevance || ''));
  
  // Count keyword overlaps
  let matchCount = 0;
  sentenceKeywords.forEach(keyword => {
    if (citationKeywords.has(keyword)) {
      matchCount++;
    }
  });
  
  // Calculate relevance score (0-100)
  const maxPossible = Math.max(sentenceKeywords.size, citationKeywords.size);
  const score = maxPossible > 0 ? Math.round((matchCount / maxPossible) * 100) : 0;
  
  // Validation logic
  if (matchCount >= minKeywordMatches) {
    return {
      valid: true,
      score,
      reason: `Strong match: ${matchCount} shared keywords`
    };
  }
  
  // Check for named entities (locations, regions)
  const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  const sentenceEntities = new Set((targetSentence.match(entityPattern) || []).map(e => e.toLowerCase()));
  const citationEntities = new Set((citation.sourceName.match(entityPattern) || []).map(e => e.toLowerCase()));
  
  let entityMatches = 0;
  sentenceEntities.forEach(entity => {
    if (citationEntities.has(entity)) {
      entityMatches++;
    }
  });
  
  if (entityMatches >= 1) {
    return {
      valid: true,
      score: score + 20, // Bonus for entity match
      reason: `Entity match: ${entityMatches} shared entities`
    };
  }
  
  return {
    valid: false,
    score,
    reason: `Insufficient match: only ${matchCount} keywords, ${entityMatches} entities`
  };
}

async function findCitationForClaim(
  context: CitationContext,
  language: string,
  preferredSourceTypes: string[] = [],
  blockedDomains: string[] = [],
  supabase: any,
  retryAttempt: number = 0 // Track retries
): Promise<Citation | null> {
  
  const languageInstructions: Record<string, string> = {
    'en': 'Find English-language sources only (.com, .org, .uk, .gov)',
    'es': 'Find Spanish-language sources only (.es, .gob.es, Spanish sites)',
    'de': 'Find German-language sources only (.de, German sites)',
    'nl': 'Find Dutch-language sources only (.nl, Dutch sites)',
    'fr': 'Find French-language sources only (.fr, French sites)',
    'pl': 'Find Polish-language sources only (.pl, Polish sites)',
    'sv': 'Find Swedish-language sources only (.se, Swedish sites)',
    'da': 'Find Danish-language sources only (.dk, Danish sites)',
    'hu': 'Find Hungarian-language sources only (.hu, Hungarian sites)',
  };

  const sourcePreferenceText = preferredSourceTypes.length > 0 
    ? `\n- PRIORITIZE these source types (in order): ${preferredSourceTypes.join(', ')}`
    : '';

  // ✅ DOMAIN DIVERSITY ENFORCEMENT
  const blockedDomainsText = blockedDomains.length > 0
    ? `\n\n🚫 **CRITICAL: HARD-BLOCKED DOMAINS (Do NOT use under ANY circumstances):**\n${blockedDomains.map(d => `- ${d}`).join('\n')}\n\n**These domains have exceeded the 20-use limit. You MUST find sources from other domains.**`
    : '';

  const prompt = `Find ONE authoritative source to cite this EXACT SENTENCE about "${context.articleTopic}":

✅ **EXACT SENTENCE TO CITE:**
"${context.claim}"

📝 **MICRO-CONTEXT (surrounding sentences):**
${context.surroundingText}

🎯 **CRITICAL REQUIREMENT:**
The citation must DIRECTLY support the topic of the EXACT SENTENCE above.
NOT just the general article topic — the specific idea in that sentence.
The reader should feel the link naturally extends what they just read.${blockedDomainsText}

**OTHER REQUIREMENTS:**
- ${languageInstructions[language] || 'Find English sources'}
- Prioritize official/government sources (.gov, .gob.es, etc.)${sourcePreferenceText}
- Must be a real, accessible URL (verify it exists)
- Must be in ${language.toUpperCase()} language
- SELECT FROM DIVERSE, UNUSED DOMAINS (we have 600+ approved domains)

Return ONLY this JSON (no markdown, no explanation):
{
  "sourceName": "Official name of organization/website",
  "url": "https://exact-url-to-source",
  "relevance": "One sentence explaining why this source validates the EXACT SENTENCE",
  "language": "${language}"
}`;

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const response = await fetch(
      'https://api.perplexity.ai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
            role: 'system',
            content: `You are a research expert finding authoritative citations. CRITICAL: Only return sources in ${language.toUpperCase()} language. ${blockedDomains.length > 0 ? `NEVER use these blocked domains: ${blockedDomains.join(', ')}. ` : ''}Match citations to SENTENCE-LEVEL context, not just article topic. Verify URLs are real and accessible. Return ONLY valid JSON.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 300
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse JSON response (handle markdown code blocks)
    let jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) {
      jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      console.error('No JSON found in Perplexity response:', aiResponse);
      return null;
    }

    const citation = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    
    // Validate citation structure
    if (!citation.url || !citation.sourceName) {
      console.error('Invalid citation structure:', citation);
      return null;
    }

    // Verify language matches
    if (citation.language !== language) {
      console.warn(`Citation language (${citation.language}) doesn't match article (${language})`);
      // Still allow it if the URL domain matches the language
      const urlMatchesLanguage = checkUrlLanguage(citation.url, language);
      if (!urlMatchesLanguage) {
        return null;
      }
    }

    // Verify URL is accessible with retry logic
    const urlCheck = await verifyUrlWithRetry(citation.url);
    if (!urlCheck) {
      console.error(`URL not accessible after retries: ${citation.url}`);
      return null;
    }
    
    // ✅ POST-VALIDATION: Verify semantic relevance
    const validation = await validateCitationRelevance(context.claim, citation);
    console.log(`   Validation: ${validation.valid ? '✓' : '✗'} Score: ${validation.score}% - ${validation.reason}`);

    if (!validation.valid) {
      console.warn(`Citation rejected: ${citation.url} - ${validation.reason}`);
      
      // Retry with more restrictive prompt (expand context window)
      if (retryAttempt < 1) { // Allow 1 retry
        console.log('   Retrying with expanded context...');
        
        return await findCitationForClaim(
          context, 
          language, 
          preferredSourceTypes, 
          blockedDomains, 
          supabase,
          retryAttempt + 1 // Track retry count
        );
      }
      
      return null; // Failed validation and retry
    }

    return {
      ...citation,
      index: context.index
    };

  } catch (error) {
    console.error('Perplexity API error:', error);
    return null;
  }
}

function checkUrlLanguage(url: string, language: string): boolean {
  const languageTLDs: Record<string, string[]> = {
    'es': ['.es', '.gob.es', 'spain', 'españa'],
    'en': ['.com', '.org', '.gov', '.uk'],
    'de': ['.de'],
    'nl': ['.nl'],
    'fr': ['.fr'],
    'pl': ['.pl'],
    'sv': ['.se'],
    'da': ['.dk'],
    'hu': ['.hu']
  };

  const expectedTLDs = languageTLDs[language] || [];
  return expectedTLDs.some(tld => url.toLowerCase().includes(tld));
}

function replaceCitationMarkers(
  content: string, 
  citations: Citation[]
): string {
  let updatedContent = content;
  
  // Sort citations by index to replace in order
  const sortedCitations = [...citations].sort((a, b) => a.index - b.index);
  
  sortedCitations.forEach((citation) => {
    // Find first unreplaced [CITATION_NEEDED]
    const marker = '[CITATION_NEEDED]';
    const markerIndex = updatedContent.indexOf(marker);
    
    if (markerIndex !== -1) {
      // Create citation link with proper escaping
      const citationLink = ` <a href="${escapeHtml(citation.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(citation.sourceName)}">[${escapeHtml(citation.sourceName)}]</a>`;
      
      // Replace marker
      updatedContent = 
        updatedContent.substring(0, markerIndex) + 
        citationLink + 
        updatedContent.substring(markerIndex + marker.length);
    }
  });
  
  return updatedContent;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
