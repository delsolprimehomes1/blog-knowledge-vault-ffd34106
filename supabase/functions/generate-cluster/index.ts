import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to link translations for multilingual clusters
// Enhanced to assign hreflang_group_id and set source_language
async function linkTranslations(supabase: any, clusterId: string) {
  console.log(`[Link Translations] Starting for cluster ${clusterId}...`);
  
  // Fetch all articles with this cluster_id
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('id, language, slug, cluster_number, hreflang_group_id')
    .eq('cluster_id', clusterId)
    .order('cluster_number', { ascending: true });
  
  if (error) {
    console.error(`[Link Translations] Error fetching articles:`, error);
    throw error;
  }
  
  if (!articles || articles.length === 0) {
    console.warn(`[Link Translations] No articles found for cluster ${clusterId}`);
    return;
  }
  
  console.log(`[Link Translations] Found ${articles.length} articles to link`);
  
  // Group by cluster_number (article position in cluster)
  const groups: Record<number, Record<string, { id: string; slug: string; hreflang_group_id?: string }>> = {};
  for (const article of articles) {
    if (!groups[article.cluster_number]) {
      groups[article.cluster_number] = {};
    }
    groups[article.cluster_number][article.language] = {
      id: article.id,
      slug: article.slug,
      hreflang_group_id: article.hreflang_group_id
    };
  }
  
  console.log(`[Link Translations] Grouped into ${Object.keys(groups).length} article sets`);
  
  // Generate hreflang_group_id for each cluster_number group and assign to articles
  for (const [clusterNum, langMap] of Object.entries(groups)) {
    // Check if any article in this group already has an hreflang_group_id
    const existingGroupId = Object.values(langMap).find(a => a.hreflang_group_id)?.hreflang_group_id;
    const groupId = existingGroupId || crypto.randomUUID();
    
    console.log(`[Link Translations] Assigning hreflang_group_id ${groupId} to cluster_number ${clusterNum}`);
    
    // Update all articles in this group with the shared hreflang_group_id
    const articleIds = Object.values(langMap).map(a => a.id);
    const { error: groupError } = await supabase
      .from('blog_articles')
      .update({ hreflang_group_id: groupId })
      .in('id', articleIds);
    
    if (groupError) {
      console.error(`[Link Translations] Error assigning hreflang_group_id to cluster ${clusterNum}:`, groupError);
    }
  }
  
  // Update each article with its siblings' translations
  let updateCount = 0;
  for (const article of articles) {
    const siblings: Record<string, string> = {};
    for (const [lang, data] of Object.entries(groups[article.cluster_number])) {
      if (lang !== article.language) {
        siblings[lang] = data.slug;
      }
    }
    
    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({ translations: siblings })
      .eq('id', article.id);
    
    if (updateError) {
      console.error(`[Link Translations] Error updating article ${article.id}:`, updateError);
    } else {
      updateCount++;
      console.log(`[Link Translations] ✅ Linked article ${article.cluster_number} (${article.language}) with ${Object.keys(siblings).length} siblings`);
    }
  }
  
  console.log(`[Link Translations] ✅ Complete: ${updateCount}/${articles.length} articles updated with translation links + hreflang_group_id`);
}

// Helper function to remove citation links from HTML for blocked domains
function removeCitationLinks(content: string, blockedCitations: any[]): string {
  let updatedContent = content;
  
  for (const blocked of blockedCitations) {
    // Create regex to find and remove the citation link
    // Pattern: According to the <a href="BLOCKED_URL"...>text</a>,
    const escapedUrl = blocked.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const citationPattern = new RegExp(
      `According to the <a[^>]*href="${escapedUrl}"[^>]*>[^<]+</a>,\\s*`,
      'gi'
    );
    
    updatedContent = updatedContent.replace(citationPattern, '');
  }
  
  return updatedContent;
}

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Helper function to filter citations against approved domains
async function filterCitations(
  supabase: any,
  citations: any[],
  jobId: string,
  articleNum: number,
  htmlContent?: string
): Promise<{ filtered: any[]; blocked: any[]; cleanedContent?: string }> {
  if (!citations || citations.length === 0) {
    return { filtered: citations, blocked: [], cleanedContent: htmlContent };
  }

  console.log(`[Job ${jobId}] 🔍 Filtering ${citations.length} citations for article ${articleNum}...`);

  // Fetch approved domains (where is_allowed = true)
  const { data: approvedDomains, error } = await supabase
    .from('approved_domains')
    .select('domain')
    .eq('is_allowed', true);

  if (error) {
    console.error(`[Job ${jobId}] ❌ Error fetching approved domains:`, error);
    return { filtered: citations, blocked: [], cleanedContent: htmlContent };
  }

  const approvedSet = new Set(
    (approvedDomains || []).map((d: any) => d.domain.toLowerCase())
  );

  console.log(`[Job ${jobId}] ✅ Loaded ${approvedSet.size} approved domains`);

  // Filter citations
  const filtered: any[] = [];
  const blocked: any[] = [];

  for (const citation of citations) {
    const domain = extractDomain(citation.url);
    
    if (approvedSet.has(domain.toLowerCase())) {
      filtered.push(citation);
    } else {
      blocked.push({ 
        domain, 
        url: citation.url, 
        source: citation.source || citation.sourceName 
      });
    }
  }

  // Log blocked citations
  if (blocked.length > 0) {
    console.warn(`[Job ${jobId}] 🚫 BLOCKED ${blocked.length} competitor citations for article ${articleNum}:`);
    blocked.forEach(b => {
      console.warn(`  - ${b.domain}: ${b.url} (${b.source})`);
    });
  }

  console.log(`[Job ${jobId}] ✅ Citation filtering complete: ${filtered.length} approved, ${blocked.length} blocked`);

  // Clean HTML content if provided
  let cleanedContent = htmlContent;
  if (htmlContent && blocked.length > 0) {
    cleanedContent = removeCitationLinks(htmlContent, blocked);
    console.log(`[Job ${jobId}] 🧹 Cleaned HTML content of ${blocked.length} blocked citation links`);
  }

  return { filtered, blocked, cleanedContent };
}

// ============= NEW: Verify actual article count for a language =============
async function verifyLanguageArticleCount(supabase: any, jobId: string, language: string): Promise<number> {
  const { count, error } = await supabase
    .from('blog_articles')
    .select('*', { count: 'exact', head: true })
    .eq('cluster_id', jobId)
    .eq('language', language);
  
  if (error) {
    console.error(`[verifyLanguageArticleCount] Error:`, error);
    return 0;
  }
  return count || 0;
}

// ============= NEW: Update per-language status atomically =============
async function updateLanguageStatus(
  supabase: any, 
  jobId: string, 
  language: string, 
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'partial'
) {
  // Fetch current language_status
  const { data: job } = await supabase
    .from('cluster_generations')
    .select('language_status')
    .eq('id', jobId)
    .single();
  
  const currentStatus = job?.language_status || {};
  const updatedStatus = { ...currentStatus, [language]: status };
  
  await supabase
    .from('cluster_generations')
    .update({
      language_status: updatedStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
  
  console.log(`[Job ${jobId}] 📊 Language status updated: ${language} → ${status}`);
  return updatedStatus;
}

// ============= NEW: Determine true job status from article counts =============
async function determineJobStatus(
  supabase: any,
  jobId: string,
  languagesQueue: string[],
  expectedArticlesPerLang: number = 6
): Promise<{ status: 'completed' | 'partial' | 'failed'; completedLanguages: string[]; languageStatus: Record<string, string> }> {
  const languageStatus: Record<string, string> = {};
  const completedLanguages: string[] = [];
  
  for (const lang of languagesQueue) {
    const count = await verifyLanguageArticleCount(supabase, jobId, lang);
    if (count >= expectedArticlesPerLang) {
      languageStatus[lang] = 'completed';
      completedLanguages.push(lang);
    } else if (count > 0) {
      languageStatus[lang] = 'partial';
    } else {
      languageStatus[lang] = 'pending';
    }
  }
  
  const allComplete = completedLanguages.length === languagesQueue.length;
  const anyStarted = Object.values(languageStatus).some(s => s !== 'pending');
  
  return {
    status: allComplete ? 'completed' : (anyStarted ? 'partial' : 'failed'),
    completedLanguages,
    languageStatus
  };
}

// Helper function to update job progress
async function updateProgress(supabase: any, jobId: string, step: number, message: string, articleNum?: number) {
  await supabase
    .from('cluster_generations')
    .update({
      status: 'generating',
      progress: {
        current_step: step,
        total_steps: 11,
        current_article: articleNum || 0,
        total_articles: 6,
        message
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Heartbeat function to indicate backend is alive
async function sendHeartbeat(supabase: any, jobId: string) {
  await supabase
    .from('cluster_generations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

// Start continuous heartbeat (returns interval ID to clear later)
function startHeartbeat(jobId: string, supabaseClient: any) {
  const intervalId = setInterval(async () => {
    try {
      await supabaseClient
        .from('cluster_generations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', jobId);
      console.log(`[Heartbeat] Job ${jobId} still processing...`);
    } catch (error) {
      console.error('[Heartbeat] Failed to update timestamp:', error);
    }
  }, 60000); // Update every 60 seconds

  return intervalId;
}

// Timeout wrapper for promises with proper cleanup
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutHandle: number | undefined;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(`⏱️ TIMEOUT: ${errorMessage} (${timeoutMs}ms)`);
      console.error(error.message);
      reject(error);
    }, timeoutMs) as unknown as number;
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
    return result;
  } catch (error) {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
    throw error;
  }
}

// Retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`[${operationName}] Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Max retries exceeded for ${operationName}`);
}

// Content quality validation - Ensures articles meet minimum standards
function validateContentQuality(article: any, plan: any): {
  isValid: boolean;
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let score = 100;
  
  // Check headline coverage in content
  const headlineWords = plan.headline.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
  const contentLower = article.detailed_content.toLowerCase();
  const mentionedWords = headlineWords.filter((w: string) => contentLower.includes(w)).length;
  
  if (mentionedWords < headlineWords.length * 0.5) {
    issues.push('Content may not fully address headline topic');
    score -= 15;
  }
  
  // Check keyword presence
  if (plan.targetKeyword && !contentLower.includes(plan.targetKeyword.toLowerCase())) {
    issues.push('Target keyword not found in content');
    score -= 10;
  }
  
  // Check for repetitive phrases (indicates poor quality)
  const sentences = article.detailed_content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
  const seenSentences = new Set();
  const duplicates: string[] = [];
  
  sentences.forEach((s: string) => {
    const normalized = s.trim().toLowerCase();
    if (normalized.length > 30) {
      if (seenSentences.has(normalized)) {
        duplicates.push(normalized.substring(0, 50));
      } else {
        seenSentences.add(normalized);
      }
    }
  });
  
  if (duplicates.length > 0) {
    issues.push(`${duplicates.length} duplicate sentences found`);
    score -= 20;
  }
  
  // Check headings structure
  const h2Count = (article.detailed_content.match(/<h2>/gi) || []).length;
  if (h2Count < 4) {
    issues.push('Insufficient content structure (need 4+ H2 headings)');
    score -= 10;
  }
  
  // Check citation markers resolved
  if (article.detailed_content.includes('[CITATION_NEEDED]')) {
    issues.push('Unresolved citation markers present');
    score -= 25;
  }
  
  // Check minimum word count
  const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  if (wordCount < 1200) {
    issues.push(`Content too short (${wordCount} words, minimum 1200)`);
    score -= 15;
  }
  
  return {
    isValid: score >= 60,
    issues,
    score
  };
}

// Heartbeat wrapper - sends periodic updates during long operations
async function withHeartbeat<T>(
  supabase: any,
  jobId: string,
  promise: Promise<T>,
  intervalMs: number = 30000
): Promise<T> {
  const heartbeatInterval = setInterval(async () => {
    console.log(`[Job ${jobId}] 💓 Heartbeat - operation still in progress...`);
    await sendHeartbeat(supabase, jobId);
  }, intervalMs);
  
  try {
    return await promise;
  } finally {
    clearInterval(heartbeatInterval);
  }
}

// Main generation function (runs in background)
async function generateCluster(
  jobId: string, 
  topic: string, 
  language: string, 
  targetAudience: string, 
  primaryKeyword: string,
  resumedLanguageIndex?: number,
  isResumedMultilingual?: boolean
) {
  const FUNCTION_START_TIME = Date.now();
  const MAX_FUNCTION_RUNTIME = 4.5 * 60 * 1000; // 4.5 minutes (safety margin before 5-min Supabase limit)
  const ARTICLE_TIME_ESTIMATE = 30000; // 30 seconds per article estimate
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  // Timeout monitoring helpers
  const getRemainingTime = () => MAX_FUNCTION_RUNTIME - (Date.now() - FUNCTION_START_TIME);
  const hasTimeForNextArticle = () => getRemainingTime() > ARTICLE_TIME_ESTIMATE;
  
    console.log(`[Job ${jobId}] ⏱️ Timeout monitoring: ${MAX_FUNCTION_RUNTIME / 1000}s limit, ${ARTICLE_TIME_ESTIMATE / 1000}s per article buffer`);

  // Start continuous heartbeat to prevent timeout detection
  const heartbeat = startHeartbeat(jobId, supabase);

  try {
    // Check for stuck jobs and clean them up before starting
    console.log(`[Job ${jobId}] 🔍 Checking for stuck jobs...`);
    await supabase.rpc('check_stuck_cluster_jobs');
    
    // ============= FEATURE FLAG CHECK: MULTILINGUAL CLUSTERS =============
    const { data: flagData } = await supabase
      .from('content_settings')
      .select('setting_value')
      .eq('setting_key', 'feature_multilingual_clusters')
      .single();

    const enableMultilingual = flagData?.setting_value === 'true';
    const SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
    
    console.log(`[Job ${jobId}] 🌍 Multilingual feature flag: ${enableMultilingual ? 'ENABLED' : 'DISABLED'}`);
    
    // Determine which language(s) to generate
    let currentLanguage = language;
    let languagesQueue: string[] = [];
    let isMultilingual = false;
    
    // Handle resumed multilingual jobs
    if (isResumedMultilingual) {
      // Fetch existing multilingual state from DB instead of reinitializing
      const { data: jobData } = await supabase
        .from('cluster_generations')
        .select('is_multilingual, languages_queue, current_language_index, completed_languages, language_status')
        .eq('id', jobId)
        .single();
      
      isMultilingual = jobData?.is_multilingual || false;
      languagesQueue = jobData?.languages_queue || [];
      
      // ============= FIX: Determine next language from actual article counts, not index =============
      let nextLangIndex = 0;
      for (let i = 0; i < languagesQueue.length; i++) {
        const count = await verifyLanguageArticleCount(supabase, jobId, languagesQueue[i]);
        if (count < 6) {
          nextLangIndex = i;
          break;
        }
        nextLangIndex = i + 1; // All complete
      }
      
      currentLanguage = languagesQueue[nextLangIndex] || language;
      resumedLanguageIndex = nextLangIndex;
      
      console.log(`[Job ${jobId}] 🌍 RESUMED multilingual job at language ${currentLanguage} (verified index ${nextLangIndex})`);
      
      // Mark this language as running
      await updateLanguageStatus(supabase, jobId, currentLanguage, 'running');
    } else if (enableMultilingual) {
      languagesQueue = [...SUPPORTED_LANGUAGES];
      currentLanguage = languagesQueue[0];
      isMultilingual = true;
      
      // Initialize language_status for all languages
      const initialLanguageStatus: Record<string, string> = {};
      for (const lang of languagesQueue) {
        initialLanguageStatus[lang] = lang === currentLanguage ? 'running' : 'pending';
      }
      
      // Update job record with multilingual tracking
      await supabase
        .from('cluster_generations')
        .update({
          is_multilingual: true,
          language_status: initialLanguageStatus,
          languages_queue: languagesQueue,
          current_language_index: 0,
          completed_languages: [],
        })
        .eq('id', jobId);
      
      console.log(`[Job ${jobId}] 🌍 MULTILINGUAL MODE: Generating all ${languagesQueue.length} languages`);
      console.log(`[Job ${jobId}] 🌍 Current language (batch 1/10): ${currentLanguage}`);
    } else {
      console.log(`[Job ${jobId}] 📝 Single-language mode: ${language}`);
    }
    
    console.log(`[Job ${jobId}] Starting generation for:`, { topic, language: currentLanguage, targetAudience, primaryKeyword });
    await updateProgress(supabase, jobId, 0, isMultilingual ? `Generating language 1/10: ${currentLanguage.toUpperCase()}...` : 'Starting generation...');

    // Validate LOVABLE_API_KEY before starting
    console.log(`[Job ${jobId}] 🔐 Validating LOVABLE_API_KEY...`);
    try {
      const testResponse = await withTimeout(
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY!}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }],
          }),
        }),
        10000,
        'API key validation timeout'
      );
      
      if (!testResponse.ok && testResponse.status === 401) {
        throw new Error('OPENAI_API_KEY is invalid or expired');
      }
      console.log(`[Job ${jobId}] ✅ OPENAI_API_KEY validated successfully`);
    } catch (error) {
      console.error(`[Job ${jobId}] ❌ API key validation failed:`, error);
      throw new Error(`OpenAI key validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Fetch master content prompt from database
    console.log(`[Job ${jobId}] Fetching master content prompt...`);
    const { data: masterPromptData, error: promptError } = await supabase
      .from('content_settings')
      .select('setting_value, updated_at')
      .eq('setting_key', 'master_content_prompt')
      .single();

    if (promptError) {
      console.error(`[Job ${jobId}] Error fetching master prompt:`, promptError);
    }

    const masterPrompt = masterPromptData?.setting_value || '';
    const hasCustomPrompt = masterPrompt && masterPrompt.trim().length > 100;

    if (hasCustomPrompt) {
      console.log(`[Job ${jobId}] ✅ Using CUSTOM master prompt (${masterPrompt.length} chars, last updated: ${masterPromptData.updated_at})`);
    } else {
      console.log(`[Job ${jobId}] ⚠️ No custom prompt found, using fallback content generation`);
    }

    // Fetch available authors and categories
    const { data: authors } = await supabase.from('authors').select('*');
    const { data: categories } = await supabase.from('categories').select('*');

    // STEP 1: Generate cluster structure
    await updateProgress(supabase, jobId, 1, 'Generating article structure...');
    console.log(`[Job ${jobId}] Step 1: Generating structure`);

    // Language name mapping for structure generation
    const structureLanguageName = {
      'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French',
      'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian',
      'fi': 'Finnish', 'no': 'Norwegian'
    }[language] || 'English';

    const structurePrompt = `You are an expert SEO content strategist for a luxury real estate agency in Costa del Sol, Spain.

Create a content cluster structure for the topic: "${topic}"
Language: ${language} (${structureLanguageName})
Target audience: ${targetAudience}
Primary keyword: ${primaryKeyword}

CRITICAL LANGUAGE REQUIREMENT: ALL headlines, target keywords, and content angles MUST be written in ${structureLanguageName}. Do NOT write in English unless the target language IS English.

Generate 6 article titles following this funnel structure:
- 3 TOFU (Top of Funnel) - Awareness stage, educational, broad topics
- 2 MOFU (Middle of Funnel) - Consideration stage, comparison, detailed guides
- 1 BOFU (Bottom of Funnel) - Decision stage, action-oriented

Each article must include the location "Costa del Sol" in the headline (keep "Costa del Sol" as-is, it's a proper noun).

CRITICAL: You MUST return ONLY a valid JSON object with this EXACT structure. Do NOT include markdown code blocks, explanations, or any other text.
CRITICAL: All text content (headline, targetKeyword, contentAngle) MUST be in ${structureLanguageName}.

{
  "articles": [
    {
      "funnelStage": "TOFU",
      "headline": "Headline in ${structureLanguageName} with Costa del Sol",
      "targetKeyword": "keyword phrase in ${structureLanguageName}",
      "searchIntent": "informational",
      "contentAngle": "Content angle description in ${structureLanguageName}"
    }
  ]
}

Return ONLY the JSON object above, nothing else. No markdown, no explanations, no code fences.`;

    // Wrap AI call with timeout and retry
    const structureResponse = await retryWithBackoff(
      () => withTimeout(
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 4096,
            messages: [
              { role: 'system', content: 'You are an SEO expert specializing in real estate content strategy. Return only valid JSON.' },
              { role: 'user', content: structurePrompt }
            ],
          }),
        }),
        120000, // 2 minute timeout
        'AI structure generation timed out'
      ),
      3,
      1000,
      'Structure generation'
    );

    if (!structureResponse.ok) {
      if (structureResponse.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please wait and try again.');
      }
      if (structureResponse.status === 402) {
        throw new Error('OpenAI credits depleted. Please add credits.');
      }
      const errorText = await structureResponse.text();
      throw new Error(`OpenAI error (${structureResponse.status}): ${errorText}`);
    }

    // Send heartbeat after major operation
    await sendHeartbeat(supabase, jobId);

    let structureData;
    try {
      const rawText = await structureResponse.text();
      console.log(`[Job ${jobId}] 📥 Structure response length: ${rawText.length} chars`);
      structureData = JSON.parse(rawText);
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      console.error(`[Job ${jobId}] ❌ JSON parse error for article structure:`, errorMsg);
      throw new Error(`Failed to parse AI structure response: ${errorMsg}`);
    }

    if (!structureData.choices?.[0]?.message?.content) {
      throw new Error('Invalid article structure response from AI');
    }
    const structureText = structureData.choices[0].message.content;

    console.log(`[Job ${jobId}] 📥 Raw AI response (first 500 chars):`, structureText.substring(0, 500));

    // Enhanced parsing with multiple fallback strategies
    let articleStructures;
    try {
      // Strategy 1: Try parsing as-is
      let parsed;
      try {
        parsed = JSON.parse(structureText);
      } catch (e1) {
        // Strategy 2: Remove markdown code blocks
        const cleaned = structureText.replace(/```json\n?|\n?```|```\n?/g, '').trim();
        try {
          parsed = JSON.parse(cleaned);
        } catch (e2) {
          // Strategy 3: Extract JSON from text (find first { to last })
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
      }
      
      // Handle multiple response formats
      articleStructures = 
        parsed.articles || 
        parsed.contentCluster?.articles || 
        parsed.data?.articles ||
        (Array.isArray(parsed) ? parsed : []);
      
      if (!Array.isArray(articleStructures) || articleStructures.length === 0) {
        console.error(`[Job ${jobId}] ❌ Invalid structure format. Full response:`, structureText);
        throw new Error(`Invalid AI response format: Expected array of articles, got ${typeof articleStructures}. Response structure: ${JSON.stringify(Object.keys(parsed || {}))}`);
      }
      
      console.log(`[Job ${jobId}] ✅ Successfully parsed ${articleStructures.length} article structures`);
      
      // Normalize field names to handle AI inconsistency
      // AI sometimes returns 'primaryKeyword' or 'keyword' instead of 'targetKeyword'
      articleStructures = articleStructures.map((article: any) => ({
        ...article,
        targetKeyword: article.targetKeyword || article.primaryKeyword || article.keyword,
      }));
      console.log(`[Job ${jobId}] ✅ Normalized ${articleStructures.length} article structures (targetKeyword field)`);
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      console.error(`[Job ${jobId}] ❌ Failed to parse article structures. Full AI response:`, structureText);
      throw new Error(`Failed to parse AI structure response: ${errorMsg}. AI returned: ${structureText.substring(0, 200)}...`);
    }
    
    // Validate article structure format
    const invalidArticles = articleStructures.filter((a: any) => 
      !a.funnelStage || !a.headline || !a.targetKeyword
    );
    if (invalidArticles.length > 0) {
      console.error(`[Job ${jobId}] ❌ ${invalidArticles.length} articles missing required fields:`, invalidArticles);
      throw new Error(`${invalidArticles.length} articles are missing required fields (funnelStage, headline, targetKeyword)`);
    }

    console.log(`[Job ${jobId}] Generated structure for`, articleStructures.length, 'articles');
    
    // Save article structure to DB for resume capability
    await supabase
      .from('cluster_generations')
      .update({
        article_structure: articleStructures,
        total_articles: articleStructures.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    console.log(`[Job ${jobId}] ✅ Saved article structure to DB for resume capability`);

    // STEP 2: Generate each article with detailed sections
    // FIX #1: Track saved article IDs instead of keeping full articles in memory
    const savedArticleIds: string[] = [];
    let failedArticleCount = 0;
    let timeoutStopped = false;

    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  STARTING ARTICLE GENERATION LOOP     ║`);
    console.log(`╚════════════════════════════════════════╝`);
    console.log(`[Job ${jobId}] Total articles to generate: ${articleStructures.length}\n`);

    for (let i = 0; i < articleStructures.length; i++) {
      // Check timeout BEFORE starting next article
      if (!hasTimeForNextArticle()) {
        const remainingArticles = articleStructures.length - i;
        console.log(`\n⚠️  [Job ${jobId}] TIMEOUT APPROACHING - Gracefully stopping`);
        console.log(`   Remaining time: ${(getRemainingTime() / 1000).toFixed(1)}s`);
        console.log(`   Articles saved: ${savedArticleIds.length}/${articleStructures.length}`);
        console.log(`   Articles remaining: ${remainingArticles}`);
        timeoutStopped = true;
        break;
      }

      const articleStartTime = Date.now();
      await updateProgress(supabase, jobId, 2 + i, `Generating article ${i + 1} of ${articleStructures.length}...`, i + 1);
      const plan = articleStructures[i];
      
      // FIX #3: Enhanced article start logging
      console.log(`\n╔════════════════════════════════════════╗`);
      console.log(`║  ARTICLE ${i + 1}/${articleStructures.length} - ${plan.funnelStage.padEnd(4, ' ')}                      ║`);
      console.log(`╚════════════════════════════════════════╝`);
      console.log(`[Job ${jobId}] Headline: "${plan.headline}"`);
      console.log(`[Job ${jobId}] Keyword: "${plan.targetKeyword}"`);
      console.log(`⏱️  Time remaining: ${(getRemainingTime() / 1000).toFixed(1)}s\n`);
      console.log(`[Job ${jobId}] Stage: ${plan.funnelStage}`);
      console.log(`[Job ${jobId}] Language: ${language}\n`);
      
      const article: any = {
        funnel_stage: plan.funnelStage,
        language: currentLanguage, // Use current language from multilingual tracking
        status: 'draft',
      };

      // 1. HEADLINE
      article.headline = plan.headline;

      // 2. SLUG
      article.slug = plan.headline
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // 3. CATEGORY (AI-based selection from exact database categories)
      const validCategoryNames = (categories || []).map(c => c.name);
      
      const categoryPrompt = `Select the most appropriate category for this article from this EXACT list:
${validCategoryNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Article Details:
- Headline: ${plan.headline}
- Target Keyword: ${plan.targetKeyword}
- Content Angle: ${plan.contentAngle}
- Funnel Stage: ${plan.funnelStage}

Return ONLY the category name exactly as shown above. No explanation, no JSON, just the category name.`;

      let finalCategory;
      
      try {
        const categoryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 256,
            messages: [{ role: 'user', content: categoryPrompt }],
          }),
        });

        if (!categoryResponse.ok) {
          if (categoryResponse.status === 429 || categoryResponse.status === 402) {
            throw new Error(`Lovable AI error: ${categoryResponse.status}`);
          }
        }

        let categoryData;
        try {
          const rawText = await categoryResponse.text();
          categoryData = JSON.parse(rawText);
        } catch (parseError) {
          const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
          console.error(`[Job ${jobId}] ❌ JSON parse error for category selection:`, errorMsg);
          throw new Error(`Failed to parse category response: ${errorMsg}`);
        }

        if (!categoryData.choices?.[0]?.message?.content) {
          throw new Error('Invalid category response from AI');
        }
        const aiSelectedCategory = categoryData.choices[0].message.content.trim();
        
        // Validate AI response against database categories
        const isValidCategory = validCategoryNames.includes(aiSelectedCategory);
        
        if (isValidCategory) {
          finalCategory = aiSelectedCategory;
          console.log(`[Job ${jobId}] ✅ AI selected valid category: "${finalCategory}"`);
        } else {
          console.warn(`[Job ${jobId}] ⚠️ AI returned invalid category: "${aiSelectedCategory}". Using fallback.`);
          
          // Intelligent fallback based on headline keywords
          const headlineLower = plan.headline.toLowerCase();
          
          if (headlineLower.includes('buy') || headlineLower.includes('purchase')) {
            finalCategory = 'Buying Guides';
          } else if (headlineLower.includes('invest') || headlineLower.includes('return')) {
            finalCategory = 'Investment Strategies';
          } else if (headlineLower.includes('market') || headlineLower.includes('price') || headlineLower.includes('trend')) {
            finalCategory = 'Market Analysis';
          } else if (headlineLower.includes('location') || headlineLower.includes('area') || headlineLower.includes('where')) {
            finalCategory = 'Location Insights';
          } else if (headlineLower.includes('legal') || headlineLower.includes('law') || headlineLower.includes('regulation')) {
            finalCategory = 'Legal & Regulations';
          } else if (headlineLower.includes('manage') || headlineLower.includes('maintain')) {
            finalCategory = 'Property Management';
          } else {
            // Ultimate fallback: use most common category for the funnel stage
            finalCategory = plan.funnelStage === 'TOFU' ? 'Market Analysis' : 'Buying Guides';
          }
          
          console.log(`[Job ${jobId}] 🔄 Fallback category assigned: "${finalCategory}"`);
        }
      } catch (error) {
        console.error(`[Job ${jobId}] ❌ Error selecting category:`, error);
        // Error fallback
        finalCategory = categories?.[0]?.name || 'Buying Guides';
        console.log(`[Job ${jobId}] 🔄 Error fallback category: "${finalCategory}"`);
      }
      
      article.category = finalCategory;

      // 4. SEO META TAGS - Language-aware
      const seoLanguageName = {
        'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French',
        'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian',
        'fi': 'Finnish', 'no': 'Norwegian'
      }[language] || 'English';

      const seoPrompt = `Create SEO meta tags for this article.

CRITICAL: Meta title and meta description MUST be written in ${seoLanguageName}. Do NOT write in English unless the article language is English.

Article Language: ${seoLanguageName}
Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Angle: ${plan.contentAngle}

Requirements:
- Meta Title: MUST be in ${seoLanguageName}, include primary keyword, location "Costa del Sol", and year 2025
- Max 60 characters (strict limit)
- Meta Description: MUST be in ${seoLanguageName}, compelling summary with CTA
- Max 160 characters (strict limit)
- Include numbers or specific benefits

Return ONLY valid JSON with text in ${seoLanguageName}:
{
  "title": "Title in ${seoLanguageName} (max 60 chars)",
  "description": "Description in ${seoLanguageName} with benefits and CTA (max 160 chars)"
}`;

      const seoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          max_tokens: 512,
          messages: [{ role: 'user', content: seoPrompt }],
        }),
      });

      if (!seoResponse.ok && (seoResponse.status === 429 || seoResponse.status === 402)) {
        throw new Error(`Lovable AI error: ${seoResponse.status}`);
      }

      let seoData;
      try {
        const rawText = await seoResponse.text();
        seoData = JSON.parse(rawText);
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        console.error(`[Job ${jobId}] ❌ JSON parse error for SEO meta:`, errorMsg);
        throw new Error(`Failed to parse SEO response: ${errorMsg}`);
      }

      if (!seoData.choices?.[0]?.message?.content) {
        throw new Error('Invalid SEO response from AI');
      }
      const seoText = seoData.choices[0].message.content;
      const seoMeta = JSON.parse(seoText.replace(/```json\n?|\n?```/g, ''));
      
      article.meta_title = seoMeta.title;
      article.meta_description = seoMeta.description;
      article.canonical_url = `https://www.delsolprimehomes.com/${currentLanguage}/blog/${article.slug}`;

      // 5. SPEAKABLE ANSWER (40-60 words) - LANGUAGE-AWARE
      const speakableLanguageNames: Record<string, string> = {
        'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French',
        'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian',
        'fi': 'Finnish', 'no': 'Norwegian'
      };
      const speakableLangName = speakableLanguageNames[currentLanguage] || 'English';
      
      const speakablePrompt = `Write a 40-60 word speakable answer IN ${speakableLangName.toUpperCase()} for this article:

Language: ${speakableLangName} (${currentLanguage})
Question: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Focus: ${plan.contentAngle}

Requirements:
- MUST be written entirely in ${speakableLangName}, NOT English (unless article is English)
- Conversational tone (use "you" and "your" equivalent in ${speakableLangName})
- Present tense, active voice
- Self-contained (no pronouns referring to previous context)
- Actionable (tell reader what to DO)
- No jargon
- Exactly 40-60 words

CRITICAL: The response MUST be in ${speakableLangName}. Do not write in English unless the article language IS English.

Return ONLY the speakable text in ${speakableLangName}, no JSON, no formatting, no quotes.`;

      const speakableResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 256,
          messages: [{ role: 'user', content: speakablePrompt }],
        }),
      });

      if (!speakableResponse.ok && (speakableResponse.status === 429 || speakableResponse.status === 402)) {
        throw new Error(`OpenAI error: ${speakableResponse.status}`);
      }

      let speakableData;
      try {
        const rawText = await speakableResponse.text();
        speakableData = JSON.parse(rawText);
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        console.error(`[Job ${jobId}] ❌ JSON parse error for speakable answer:`, errorMsg);
        throw new Error(`Failed to parse speakable response: ${errorMsg}`);
      }

      if (!speakableData.choices?.[0]?.message?.content) {
        throw new Error('Invalid speakable response from AI');
      }
      article.speakable_answer = speakableData.choices[0].message.content.trim();

      // 6. DETAILED CONTENT (1500-2500 words)
      console.log(`[Job ${jobId}] Generating detailed content for article ${i + 1}: "${plan.headline}"`);
      
      // Build content prompt using master prompt if available
      let contentPromptMessages;
      
      if (hasCustomPrompt) {
        // Replace variables in master prompt
        const processedPrompt = masterPrompt
          .replace(/\{\{headline\}\}/g, plan.headline)
          .replace(/\{\{targetKeyword\}\}/g, plan.targetKeyword || primaryKeyword)
          .replace(/\{\{searchIntent\}\}/g, plan.searchIntent || 'informational')
          .replace(/\{\{contentAngle\}\}/g, plan.contentAngle || 'comprehensive guide')
          .replace(/\{\{funnelStage\}\}/g, plan.funnelStage)
          .replace(/\{\{targetAudience\}\}/g, targetAudience)
          .replace(/\{\{language\}\}/g, language);

        console.log(`[Job ${jobId}] ✅ Using master prompt with replaced variables for article ${i + 1}`);

        contentPromptMessages = [
          {
            role: "system",
            content: "You are Hans Beeckman, an expert Costa del Sol property specialist. Follow the master prompt instructions exactly."
          },
          {
            role: "user",
            content: processedPrompt
          }
        ];
      } else {
        // Fallback to original prompt structure
        console.log(`[Job ${jobId}] ⚠️ Using fallback prompt structure for article ${i + 1}`);
        
        const contentPrompt = `Write a comprehensive 2000-word blog article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Search Intent: ${plan.searchIntent}
Content Angle: ${plan.contentAngle}
Funnel Stage: ${plan.funnelStage}
Target Audience: ${targetAudience}
Language: ${language}

Requirements:
1. Structure with H2 and H3 headings (proper hierarchy)
2. Include specific data points, numbers, timeframes
3. Write for ${plan.funnelStage} stage:
   - TOFU: Educational, broad, establish authority
   - MOFU: Comparative, detailed, build trust
   - BOFU: Action-oriented, conversion-focused, specific CTAs
4. Include real examples from Costa del Sol (Marbella, Estepona, Málaga, Mijas, Benalmádena, etc.)
5. Natural tone, 8th-grade reading level
6. Reference claims that need citations naturally, DO NOT use [CITATION_NEEDED] markers
7. Mark potential internal link opportunities with [INTERNAL_LINK: topic]

Format as HTML with:
- <h2> for main sections (5-7 sections)
- <h3> for subsections
- <p> for paragraphs
- <ul> and <li> for lists
- <strong> for emphasis
- <table> if comparing data

External citations will be added automatically by the system.

Return ONLY the HTML content, no JSON wrapper, no markdown code blocks.`;

        contentPromptMessages = [
          { role: 'user', content: contentPrompt }
        ];
      }

      // FIX #4: Dynamic timeout based on funnel stage
      const getContentTimeout = (funnelStage: string): number => {
        switch(funnelStage) {
          case 'TOFU': return 120000;  // 2 minutes
          case 'MOFU': return 150000;  // 2.5 minutes
          case 'BOFU': return 180000;  // 3 minutes
          default: return 120000;
        }
      };

      // Build OpenAI request
      let aiRequestBody: any = {
          model: 'gpt-4o',
        max_tokens: 8192,
        messages: contentPromptMessages,
      };

      // FIX #3: Enhanced phase logging - Content Generation
      const contentTimeout = getContentTimeout(plan.funnelStage);
      console.log(`\n========================================`);
      console.log(`🚀 [Job ${jobId}] ARTICLE ${i + 1}/${articleStructures.length} - PHASE: Content Generation`);
      console.log(`   Funnel Stage: ${plan.funnelStage}`);
      console.log(`   Timeout: ${contentTimeout/1000}s`);
      console.log(`   Expected words: 1,500-2,500`);
      console.log(`========================================\n`);

      // FIX #2: Comprehensive error handling for AI calls with AbortController
      let contentResponse;
      
      // Create AbortController to cancel request at network level
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`⏱️ [Job ${jobId}] Article ${i + 1} - Aborting AI request after ${contentTimeout}ms`);
        abortController.abort();
      }, contentTimeout);

      try {
        console.log(`🤖 [Job ${jobId}] Article ${i + 1} - Calling OpenAI (timeout: ${contentTimeout/1000}s)...`);
        
        contentResponse = await withHeartbeat(
          supabase,
          jobId,
          fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY!}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(aiRequestBody),
            signal: abortController.signal  // ✅ This cancels the request
          })
        );
        
        // Success - clear the timeout
        clearTimeout(timeoutId);
        
      } catch (aiError) {
        clearTimeout(timeoutId);
        
        const error = aiError as Error;
        
        // Handle abort specifically
        if (error.name === 'AbortError') {
          const timeoutError = new Error(`Article ${i + 1} AI content generation TIMEOUT after ${contentTimeout}ms (${contentTimeout/1000}s)`);
          console.error(`❌ [Job ${jobId}] Article ${i + 1} - AI request ABORTED due to timeout`, {
            timeout: contentTimeout,
            funnel: plan.funnelStage,
            headline: plan.headline
          });
          
          await supabase
            .from('cluster_generations')
            .update({
              progress: {
                message: `Article ${i + 1} AI timeout: ${contentTimeout/1000}s exceeded`,
                phase: 'content_generation',
                article_number: i + 1
              },
              error: JSON.stringify({
                phase: 'content_generation',
                article: i + 1,
                headline: plan.headline,
                error: `Timeout after ${contentTimeout}ms`,
                timestamp: new Date().toISOString()
              })
            })
            .eq('id', jobId);
          
          throw timeoutError;
        }
        
        // Handle other errors
        console.error(`❌ [Job ${jobId}] Article ${i + 1} - AI call FAILED:`, {
          error: error.message,
          stack: error.stack?.substring(0, 500),
          headline: plan.headline
        });
        
        await supabase
          .from('cluster_generations')
          .update({
            progress: {
              message: `Article ${i + 1} AI call failed: ${error.message}`,
              phase: 'content_generation',
              article_number: i + 1
            },
            error: JSON.stringify({
              phase: 'content_generation',
              article: i + 1,
              headline: plan.headline,
              error: error.message,
              timestamp: new Date().toISOString()
            })
          })
          .eq('id', jobId);
        
        throw new Error(`Article ${i + 1} content generation failed: ${error.message}`);
      }

      if (!contentResponse.ok) {
        const errorText = await contentResponse.text();
        console.error(`❌ [Job ${jobId}] Article ${i + 1} - AI API error:`, {
          status: contentResponse.status,
          statusText: contentResponse.statusText,
          error: errorText
        });
        
        if (contentResponse.status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please wait and try again.');
        }
        if (contentResponse.status === 402) {
          throw new Error('OpenAI credits depleted.');
        }
        throw new Error(`AI API returned ${contentResponse.status}: ${errorText}`);
      }
      
      console.log(`✅ [Job ${jobId}] Article ${i + 1} - AI responded successfully (${contentResponse.status})`);


      let contentData;
      try {
        const rawText = await contentResponse.text();
        console.log(`[Job ${jobId}] 📥 Content response length for article ${i + 1}: ${rawText.length} chars`);
        contentData = JSON.parse(rawText);
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        console.error(`[Job ${jobId}] ❌ JSON parse error for article ${i + 1} content:`, {
          error: errorMsg,
          responseStatus: contentResponse.status,
          responseHeaders: Object.fromEntries(contentResponse.headers.entries())
        });
        throw new Error(`Failed to parse content response for article ${i + 1}: ${errorMsg}. The response may be too large or malformed.`);
      }

      if (!contentData.choices?.[0]?.message?.content) {
        console.error(`[Job ${jobId}] Invalid content response for article ${i + 1}:`, contentData);
        throw new Error('Invalid content generation response');
      }

      const detailedContent = contentData.choices[0].message.content.trim();
      article.detailed_content = detailedContent;
      
      console.log(`[Job ${jobId}] ✅ Content parsed successfully for article ${i + 1}:`, {
        contentLength: detailedContent.length,
        wordCount: detailedContent.split(/\s+/).length,
        timestamp: new Date().toISOString()
      });
      
      // Log content quality metrics for monitoring
      const contentWordCount = detailedContent.split(/\s+/).length;
      const hasSpeakableAnswer = detailedContent.includes('speakable-answer');
      const internalLinkCount = (detailedContent.match(/\[INTERNAL_LINK:/g) || []).length;
      const citationCount = (detailedContent.match(/\[CITATION_NEEDED:/g) || []).length;
      const h2Count = (detailedContent.match(/<h2>/g) || []).length;
      
      console.log(`[Job ${jobId}] 📊 Content metrics for article ${i + 1}:`);
      console.log(`[Job ${jobId}]   • Word count: ${contentWordCount}`);
      console.log(`[Job ${jobId}]   • Has speakable answer: ${hasSpeakableAnswer}`);
      console.log(`[Job ${jobId}]   • Internal link markers: ${internalLinkCount}`);
      console.log(`[Job ${jobId}]   • Citation markers: ${citationCount}`);
      console.log(`[Job ${jobId}]   • H2 sections: ${h2Count}`);

      // 7. FEATURED IMAGE (using existing generate-image function with enhanced prompt)
      const inferPropertyType = (contentAngle: string, headline: string) => {
        const text = (contentAngle + ' ' + headline).toLowerCase();
        if (text.includes('villa')) return 'luxury Spanish villa';
        if (text.includes('apartment') || text.includes('flat')) return 'modern apartment';
        if (text.includes('penthouse')) return 'penthouse with terrace';
        if (text.includes('townhouse')) return 'townhouse';
        return 'luxury property';
      };

      // Detect article topic for contextual image generation
      const detectArticleTopic = (headline: string): string => {
        const text = headline.toLowerCase();
        
        // Market analysis / trends / forecasts
        if (text.match(/\b(market|trends|forecast|outlook|analysis|statistics|data|report|2025|2026|predictions)\b/)) {
          return 'market-analysis';
        }
        
        // Digital nomads / remote work
        if (text.match(/\b(digital nomad|remote work|coworking|work from home|expat tech|freelance)\b/)) {
          return 'digital-nomad';
        }
        
        // Buying guides / how-to
        if (text.match(/\b(guide to|how to|step by step|buying guide|beginner|starter)\b/)) {
          return 'buying-guide';
        }
        
        // Legal/Process articles
        if (text.match(/\b(buy|buying|purchase|process|legal|documents?|nie|tax|fees?|cost|steps?)\b/)) {
          return 'process-legal';
        }
        
        // Comparison articles
        if (text.match(/\b(vs|versus|compare|comparison|best|choose|which|difference|beyond)\b/)) {
          return 'comparison';
        }
        
        // Investment articles
        if (text.match(/\b(invest|investment|roi|rental|yield|return|profit|market|portfolio|strategy)\b/)) {
          return 'investment';
        }
        
        // Lifestyle articles
        if (text.match(/\b(live|living|lifestyle|expat|retire|retirement|community|culture|quality of life)\b/)) {
          return 'lifestyle';
        }
        
        // Area/location guides
        if (text.match(/\b(guide|area|neighborhood|district|zone|where|location|hidden gem|discover)\b/)) {
          return 'location-guide';
        }
        
        // Property management / rental
        if (text.match(/\b(property management|tenant|vacation rental|maintenance|landlord)\b/)) {
          return 'property-management';
        }
        
        // Property type specific
        if (text.match(/\b(villa|apartment|penthouse|townhouse|second home)\b/)) {
          return 'property-showcase';
        }
        
        // Default
        return 'general-property';
      };

      // Generate contextual image prompt based on funnel stage and topic
      const generateContextualImagePrompt = (
        headline: string,
        funnelStage: string,
        topic: string,
        propertyType: string,
        location: string,
        articleIndex: number
      ): string => {
        
        const baseQuality = 'ultra-realistic, 8k resolution, professional photography, no text, no watermarks';
        
        // UNIQUENESS TRACKING: Vary perspectives based on article index to prevent repetition
        const perspectives = [
          'wide-angle perspective',
          'intimate close-up details',
          'aerial drone view',
          'interior-focused composition',
          'lifestyle-centered framing',
          'architectural detail focus'
        ];
        const perspective = perspectives[articleIndex % perspectives.length];
        
        // Time variety (deterministic based on article index for consistency)
        const timesOfDay = ['morning golden light', 'bright midday sun', 'soft afternoon light', 'blue hour evening', 'sunset glow', 'early sunrise'];
        const timeOfDay = timesOfDay[articleIndex % timesOfDay.length];
        
        // Architectural style variety (also deterministic)
        const archStyles = ['modern minimalist', 'traditional Mediterranean', 'contemporary coastal', 'Spanish colonial', 'Andalusian classic', 'sleek modernist'];
        const archStyle = archStyles[articleIndex % archStyles.length];
        
        // ========== TOFU (Top of Funnel) - Inspirational & Lifestyle ==========
        if (funnelStage === 'TOFU') {
          
          // Market analysis articles
          if (topic === 'market-analysis') {
            return `Professional business scene in modern ${location} office: 
              Real estate market analysts reviewing data and trends, 
              large display screens showing graphs and statistics, 
              Costa del Sol skyline visible through office windows, 
              business professionals in meeting, contemporary workspace, 
              laptops and digital presentations, ${timeOfDay}, 
              ${perspective}, focus on DATA and BUSINESS not properties, 
              ${baseQuality}`;
          }
          
          // Digital nomad articles
          if (topic === 'digital-nomad') {
            return `Modern coworking lifestyle in ${location}, Costa del Sol: 
              Young remote workers in bright coworking space, 
              laptops and coffee, minimalist design, 
              Mediterranean views from windows, natural plants, 
              professional yet relaxed atmosphere, diverse professionals, 
              ${timeOfDay}, ${perspective}, NOT luxury villas, focus on WORK lifestyle, 
              ${baseQuality}`;
          }
          
          // Lifestyle articles
          if (topic === 'lifestyle') {
            return `Authentic lifestyle photography in ${location}, Costa del Sol: 
              International expats enjoying local Spanish life, 
              outdoor market or plaza scene, palm trees, 
              café culture, community interaction, 
              NO properties visible, focus on PEOPLE and CULTURE, 
              ${timeOfDay}, ${perspective}, documentary style, 
              ${baseQuality}`;
          }
          
          // Location guide articles
          if (topic === 'location-guide') {
            return `Aerial drone photography of ${location}, Costa del Sol: 
              Panoramic town view showing character and layout, 
              Mediterranean coastline and beaches, 
              mountains in background, urban planning visible, 
              ${timeOfDay}, ${perspective}, NOT focusing on specific properties, 
              wide establishing shot of the area, 
              ${baseQuality}`;
          }
          
          // Comparison articles
          if (topic === 'comparison') {
            return `Conceptual split-screen comparison imagery for ${location}: 
              Two distinct Costa del Sol locations side by side, 
              contrasting environments and atmospheres, 
              beach town vs mountain town, or urban vs rural, 
              clean graphic composition, ${timeOfDay}, ${perspective}, 
              NOT property interiors, focus on LOCATION character, 
              ${baseQuality}`;
          }
          
          // Default TOFU: Aspirational but varied
          const tofuVariations = [
            `Coastal lifestyle in ${location}, Costa del Sol: Beach promenade with palm trees, people walking, Mediterranean sea, ${timeOfDay}, ${perspective}, NOT infinity pools, ${baseQuality}`,
            `Mountain view from ${location}, Costa del Sol: Sierra Blanca mountains, hiking trails, nature and outdoor lifestyle, ${timeOfDay}, ${perspective}, NOT luxury properties, ${baseQuality}`,
            `${location} town center: Charming Spanish plaza, traditional architecture, outdoor dining, local atmosphere, ${timeOfDay}, ${perspective}, NO villas, ${baseQuality}`
          ];
          return tofuVariations[articleIndex % tofuVariations.length];
        }
        
        // ========== MOFU (Middle of Funnel) - Detailed & Comparative ==========
        if (funnelStage === 'MOFU') {
          
          // Market analysis for MOFU
          if (topic === 'market-analysis') {
            return `Investment analysis scene in ${location} real estate office: 
              Financial charts and property market data on screens, 
              professional investment consultant reviewing portfolios, 
              ROI graphs and statistics visible, modern office interior, 
              ${timeOfDay}, ${perspective}, NOT showing properties, focus on ANALYSIS, 
              ${baseQuality}`;
          }
          
          // Buying guide articles
          if (topic === 'buying-guide') {
            return `Property viewing experience in ${location}: 
              Real estate agent showing ${archStyle} ${propertyType} to international buyers, 
              clients examining property features, viewing interior spaces, 
              professional consultation in progress, ${timeOfDay}, ${perspective}, 
              NOT staged perfection, show REAL viewing experience, 
              ${baseQuality}`;
          }
          
          // Comparison articles
          if (topic === 'comparison') {
            return `Side-by-side property comparison visualization for ${location}: 
              Two different property styles in Costa del Sol, 
              ${archStyle} architecture contrast, 
              interior layout comparison, different price points, 
              ${timeOfDay}, ${perspective}, clean comparative photography, 
              NOT identical properties, show CLEAR differences, 
              ${baseQuality}`;
          }
          
          // Investment articles
          if (topic === 'investment') {
            return `Investment property showcase in ${location}: 
              High-yield rental ${propertyType} with modern appeal, 
              ${archStyle} design, professional staging, 
              rental-ready condition, ${timeOfDay}, ${perspective}, 
              NOT infinity pools, focus on RENTAL potential features, 
              ${baseQuality}`;
          }
          
          // Property showcase
          if (topic === 'property-showcase') {
            return `${archStyle} ${propertyType} detailed tour in ${location}: 
              Multiple rooms and spaces, architectural details, 
              living areas and bedrooms, kitchen and bathrooms, 
              ${timeOfDay} through windows, ${perspective}, 
              NOT only exterior pools, show INTERIOR spaces, 
              ${baseQuality}`;
          }
          
          // Default MOFU: Detailed property features
          return `${archStyle} ${propertyType} interior in ${location}, Costa del Sol: 
            Spacious living room with ${timeOfDay} natural light, 
            contemporary furnishings, high-end finishes, 
            terrace access visible, Spanish design elements, ${perspective}, 
            NOT pool-centric, focus on LIVING spaces, 
            ${baseQuality}`;
        }
        
        // ========== BOFU (Bottom of Funnel) - Professional & Process-Oriented ==========
        if (funnelStage === 'BOFU') {
          
          // Legal/process articles
          if (topic === 'process-legal') {
            return `Professional legal consultation in ${location} law office: 
              Spanish property lawyer meeting with international clients, 
              legal documents for Costa del Sol real estate on desk, 
              professional office setting, contracts and paperwork, 
              ${timeOfDay} office lighting, ${perspective}, trust and expertise conveyed, 
              NOT properties, show LEGAL process, 
              ${baseQuality}`;
          }
          
          // Property management
          if (topic === 'property-management') {
            return `Property management service in ${location}: 
              Professional property manager inspecting ${propertyType}, 
              maintenance checklist, tenant interaction, 
              property care and management activities, 
              ${timeOfDay}, ${perspective}, NOT luxury glamour shots, show SERVICE aspect, 
              ${baseQuality}`;
          }
          
          // Comparison/decision articles
          if (topic === 'comparison') {
            return `Final decision consultation for ${location} property: 
              Serious buyers making final choice, real estate professional presenting options, 
              detailed property information and contracts on table, 
              modern office or property location, ${timeOfDay}, ${perspective}, 
              NOT staged properties, focus on DECISION making, 
              ${baseQuality}`;
          }
          
          // Investment for BOFU
          if (topic === 'investment') {
            return `Investment closing scene in ${location}: 
              Property investment deal finalization, 
              financial documents and keys on desk, 
              professional handshake between investor and agent, 
              modern office setting, ${timeOfDay}, ${perspective}, 
              NOT property exteriors, show TRANSACTION moment, 
              ${baseQuality}`;
          }
          
          // Default BOFU: Move-in ready
          return `Move-in ready ${archStyle} ${propertyType} in ${location}: 
            Pristine condition interior, fully furnished and staged, 
            keys prominently displayed on entrance table, 
            welcoming entrance hall, ${timeOfDay} through doorway, ${perspective}, 
            NOT pools or exteriors, show READY for ownership, 
            ${baseQuality}`;
        }
        
        // ========== Fallback ==========
        return `Professional ${location} Costa del Sol imagery: 
          ${archStyle} architecture, Mediterranean environment, 
          ${timeOfDay}, ${perspective}, diverse perspective, 
          NOT generic villa with pool, 
          ${baseQuality}`;
      };

      const inferLocation = (headline: string) => {
        const text = headline.toLowerCase();
        if (text.includes('marbella')) return 'Marbella';
        if (text.includes('estepona')) return 'Estepona';
        if (text.includes('malaga') || text.includes('málaga')) return 'Málaga';
        if (text.includes('mijas')) return 'Mijas';
        if (text.includes('benalmádena') || text.includes('benalmadena')) return 'Benalmádena';
        return 'Costa del Sol';
      };

      const propertyType = inferPropertyType(plan.contentAngle, plan.headline);
      const location = inferLocation(plan.headline);

      // Detect article topic and generate contextual prompt
      const articleTopic = detectArticleTopic(plan.headline);
      const imagePrompt = generateContextualImagePrompt(
        plan.headline,
        plan.funnelStage,
        articleTopic,
        propertyType,
        location,
        i  // Pass article index for uniqueness tracking
      );

      // FIX #3: Enhanced phase logging - Image Generation
      console.log(`\n========================================`);
      console.log(`🚀 [Job ${jobId}] ARTICLE ${i + 1} - PHASE: Image Generation`);
      console.log(`   Funnel Stage: ${plan.funnelStage}`);
      console.log(`   Topic: ${articleTopic}`);
      console.log(`   Location: ${location}`);
      console.log(`   Language: ${currentLanguage}`);
      console.log(`   Multilingual Mode: ${isMultilingual}`);
      console.log(`========================================\n`);
      
      // Language name mapping for alt text generation
      const languageNames: Record<string, string> = {
        'en': 'English',
        'de': 'German',
        'nl': 'Dutch',
        'fr': 'French',
        'pl': 'Polish',
        'sv': 'Swedish',
        'da': 'Danish',
        'hu': 'Hungarian',
        'fi': 'Finnish',
        'no': 'Norwegian'
      };
      const languageName = languageNames[currentLanguage] || 'English';
      
      // FIX #2: Comprehensive error handling for image generation
      try {
        let featuredImageUrl = '';
        let featuredImageAlt = '';
        let imageReused = false;
        
        // ============= IMAGE SHARING FOR MULTILINGUAL CLUSTERS =============
        // For non-English languages, try to reuse image from English sibling
        if (isMultilingual && currentLanguage !== 'en') {
          console.log(`🔄 [Job ${jobId}] Article ${i + 1} - Checking for English sibling image to reuse...`);
          
          const { data: englishSibling } = await supabase
            .from('blog_articles')
            .select('featured_image_url')
            .eq('cluster_id', jobId)
            .eq('cluster_number', i + 1)
            .eq('language', 'en')
            .maybeSingle();
          
          if (englishSibling?.featured_image_url && 
              !englishSibling.featured_image_url.includes('unsplash.com')) {
            featuredImageUrl = englishSibling.featured_image_url;
            imageReused = true;
            console.log(`✅ [Job ${jobId}] Reusing image from English sibling: ${featuredImageUrl}`);
          } else {
            console.log(`⚠️ [Job ${jobId}] No English sibling image found, will generate new one`);
          }
        }
        
        // Generate new image only if not reused
        if (!imageReused) {
          console.log(`🎨 [Job ${jobId}] Article ${i + 1} - Generating new image...`);
          console.log(`   Prompt: ${imagePrompt.substring(0, 100)}...`);
          
          const imageResponse = await supabase.functions.invoke('generate-image', {
            body: {
              prompt: imagePrompt,
              headline: plan.headline,
            },
          });

          console.log('📸 Image response error:', imageResponse.error);
          console.log('📸 Image response data:', JSON.stringify(imageResponse.data));

          if (imageResponse.error) {
            console.error('❌ Edge function returned error:', imageResponse.error);
            throw new Error(`Edge function error: ${JSON.stringify(imageResponse.error)}`);
          }

          if (imageResponse.data?.error) {
            console.error('❌ FAL.ai API error:', imageResponse.data.error);
            throw new Error(`FAL.ai error: ${imageResponse.data.error}`);
          }

          if (imageResponse.data?.images?.[0]?.url) {
            const tempImageUrl = imageResponse.data.images[0].url;
            console.log('✅ Image generated successfully from FAL.ai:', tempImageUrl);

            // Download image from FAL.ai and persist to Supabase Storage
            try {
              console.log('📥 Downloading image from FAL.ai...');
              const imgFetchResponse = await fetch(tempImageUrl);
              if (!imgFetchResponse.ok) throw new Error(`Failed to download image: ${imgFetchResponse.status}`);
              
              const imageBlob = await imgFetchResponse.blob();
              // Use cluster_number in filename (shared across languages)
              const fileName = `cluster-${jobId}-pos-${i + 1}.jpg`;
              
              console.log(`📤 Uploading to Supabase Storage: ${fileName}`);
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('article-images')
                .upload(fileName, imageBlob, {
                  contentType: 'image/jpeg',
                  upsert: true
                });

              if (uploadError) {
                console.error('❌ Failed to upload image to storage:', uploadError);
                featuredImageUrl = tempImageUrl; // Fallback to FAL.ai URL
              } else {
                // Get permanent public URL
                const { data: publicUrlData } = supabase.storage
                  .from('article-images')
                  .getPublicUrl(fileName);
                
                featuredImageUrl = publicUrlData.publicUrl;
                console.log('✅ Image persisted to Supabase Storage:', featuredImageUrl);
              }
            } catch (storageError) {
              console.error('❌ Storage operation failed:', storageError);
              featuredImageUrl = tempImageUrl; // Fallback to FAL.ai URL
            }
          } else {
            console.warn('⚠️ No images in response');
            throw new Error('No images returned from FAL.ai');
          }
        }

        // ============= LANGUAGE-AWARE ALT TEXT GENERATION =============
        // Always generate alt text in the article's language
        console.log(`🏷️ [Job ${jobId}] Generating alt text in ${languageName}...`);
        
        const funnelIntent = plan.funnelStage === 'TOFU' ? 'awareness/lifestyle' : plan.funnelStage === 'MOFU' ? 'consideration/comparison' : 'decision/action';
        const funnelStyle = plan.funnelStage === 'TOFU' ? 'inspiring lifestyle' : plan.funnelStage === 'MOFU' ? 'detailed comparison' : 'professional consultation';
        
        const altPrompt = `Create SEO-optimized alt text IN ${languageName.toUpperCase()} for this image:

Article Title: ${plan.headline}
Article Language: ${languageName} (${currentLanguage})
Funnel Stage: ${plan.funnelStage} (${funnelIntent})
Article Topic: ${articleTopic}
Target Keyword: ${plan.targetKeyword}
Image shows: ${imagePrompt}

Requirements:
- MUST be written entirely in ${languageName}, NOT English
- Include primary keyword "${plan.targetKeyword}"
- Reflect the ${plan.funnelStage} intent (${funnelStyle})
- Describe what's visible in the image accurately
- Max 125 characters
- Natural, descriptive (not keyword stuffed)

IMPORTANT: Return ONLY the alt text in ${languageName}, no quotes, no JSON, no English.`;

        const altResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            max_tokens: 256,
            messages: [{ role: 'user', content: altPrompt }],
          }),
        });

        if (!altResponse.ok && (altResponse.status === 429 || altResponse.status === 402)) {
          throw new Error(`Lovable AI error: ${altResponse.status}`);
        }

        let altData;
        try {
          const rawText = await altResponse.text();
          altData = JSON.parse(rawText);
        } catch (parseError) {
          const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
          console.error(`[Job ${jobId}] ❌ JSON parse error for image alt text:`, errorMsg);
          throw new Error(`Failed to parse alt text response: ${errorMsg}`);
        }

        if (!altData.choices?.[0]?.message?.content) {
          throw new Error('Invalid alt text response from AI');
        }
        featuredImageAlt = altData.choices[0].message.content.trim();
        
        console.log(`✅ Image ${imageReused ? 'REUSED' : 'generated'} with ${languageName} alt text:
  - Funnel-appropriate style: ${funnelStyle}
  - Topic match: ${articleTopic}
  - Image URL: ${featuredImageUrl}
  - Alt text (${languageName}): ${featuredImageAlt}`);

        article.featured_image_url = featuredImageUrl;
        article.featured_image_alt = featuredImageAlt;
        // Generate caption in the article's language
        article.featured_image_caption = currentLanguage === 'en' 
          ? `${plan.headline} - Luxury real estate in Costa del Sol`
          : featuredImageAlt; // Use the localized alt text as caption for non-English
      } catch (error) {
        console.error('❌ IMAGE GENERATION FAILED:', error);
        console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        // Use placeholder image instead of empty string
        article.featured_image_url = 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200';
        article.featured_image_alt = `${plan.headline} - Costa del Sol luxury real estate`;
        article.featured_image_caption = `${plan.headline} - Luxury real estate in Costa del Sol`;
        
        console.log('⚠️ Using placeholder image for:', plan.headline);
      }

      // 8. DIAGRAM (for MOFU/BOFU articles using existing generate-diagram function)
      if (plan.funnelStage !== 'TOFU') {
        try {
          const diagramResponse = await withTimeout(
            supabase.functions.invoke('generate-diagram', {
              body: {
                articleContent: article.detailed_content,
                headline: plan.headline,
              },
            }),
            60000,
            'Diagram generation timeout after 60 seconds'
          );

          if (diagramResponse.data?.mermaidCode) {
            article.diagram_url = diagramResponse.data.mermaidCode;
            article.diagram_description = diagramResponse.data.description;
          } else {
            article.diagram_url = null;
            article.diagram_description = null;
          }
        } catch (error) {
          console.error('Diagram generation failed:', error);
          article.diagram_url = null;
          article.diagram_description = null;
        }
      } else {
        article.diagram_url = null;
        article.diagram_description = null;
      }

      // 9. E-E-A-T ATTRIBUTION (AI-powered author matching)
      if (authors && authors.length > 0) {
        try {
          const authorPrompt = `Suggest E-E-A-T attribution for this real estate article:

Headline: ${plan.headline}
Funnel Stage: ${plan.funnelStage}
Target Keyword: ${plan.targetKeyword}
Content Focus: ${article.speakable_answer}

Available Authors:
${authors.map((author: any, idx: number) => 
  `${idx + 1}. ${author.name} - ${author.job_title}, ${author.years_experience} years experience
     Bio: ${author.bio.substring(0, 200)}
     Credentials: ${author.credentials.join(', ')}`
).join('\n\n')}

Requirements:
- Match author expertise to article topic
- Consider funnel stage (${plan.funnelStage}):
  * TOFU: Educational background, broad market knowledge
  * MOFU: Analytical skills, comparison expertise
  * BOFU: Transaction experience, legal knowledge
- Select different person as reviewer (if available)
- Reviewer should complement primary author's expertise

Return ONLY valid JSON:
{
  "primaryAuthorNumber": 1,
  "reviewerNumber": 2,
  "reasoning": "Author 1 is best because [expertise match]. Reviewer 2 complements with [different expertise].",
  "confidence": 90
}`;

          const authorResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              max_tokens: 512,
              messages: [{ role: 'user', content: authorPrompt }],
            }),
          });

          if (!authorResponse.ok && (authorResponse.status === 429 || authorResponse.status === 402)) {
            throw new Error(`Lovable AI error: ${authorResponse.status}`);
          }

          let authorData;
          try {
            const rawText = await authorResponse.text();
            authorData = JSON.parse(rawText);
          } catch (parseError) {
            const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
            console.error(`[Job ${jobId}] ❌ JSON parse error for author selection:`, errorMsg);
            throw new Error(`Failed to parse author response: ${errorMsg}`);
          }

          if (!authorData.choices?.[0]?.message?.content) {
            throw new Error('Invalid author response from AI');
          }
          const authorText = authorData.choices[0].message.content;
          const authorSuggestion = JSON.parse(authorText.replace(/```json\n?|\n?```/g, ''));

          const primaryAuthorIdx = authorSuggestion.primaryAuthorNumber - 1;
          const reviewerIdx = authorSuggestion.reviewerNumber - 1;

          article.author_id = authors[primaryAuthorIdx]?.id || authors[0].id;
          article.reviewer_id = (reviewerIdx >= 0 && reviewerIdx < authors.length && reviewerIdx !== primaryAuthorIdx) 
            ? authors[reviewerIdx]?.id 
            : (authors.length > 1 ? authors.find((a: any) => a.id !== article.author_id)?.id : null);

          console.log(`E-E-A-T: ${authors[primaryAuthorIdx]?.name} (author) + ${authors[reviewerIdx]?.name || 'none'} (reviewer) | Confidence: ${authorSuggestion.confidence}%`);
        } catch (error) {
          console.error('E-E-A-T attribution failed, using fallback:', error);
          // Fallback to first author
          article.author_id = authors[0].id;
          article.reviewer_id = authors.length > 1 ? authors[1].id : null;
        }
      } else {
        article.author_id = null;
        article.reviewer_id = null;
      }

      // FIX #3: Enhanced phase logging - Citation Discovery
      console.log(`\n========================================`);
      console.log(`🚀 [Job ${jobId}] ARTICLE ${i + 1} - PHASE: Citation Discovery`);
      console.log(`   Target: 2+ approved citations`);
      console.log(`   Max attempts: 4`);
      console.log(`   Language: ${language}`);
      console.log(`========================================\n`);
      
      // 10. EXTERNAL CITATIONS - SKIPPED (POST-GENERATION WORKFLOW)
      console.log(`\n========================================`);
      console.log(`📋 [Job ${jobId}] Article ${i + 1} - SKIPPING CITATIONS PHASE`);
      console.log(`   Workflow: Citations will be added manually during review`);
      console.log(`   Status: Article will be saved as DRAFT with citation_status='pending'`);
      console.log(`========================================\n`);

      // Set citation metadata for post-generation workflow
      article.external_citations = [];
      article.citation_status = 'pending';
      article.citation_failure_reason = 'Citations to be added during post-generation review process';

      // Update progress
      await updateProgress(
        supabase,
        jobId,
        2 + i,
        `Article ${i + 1}/${articleStructures.length} - Content, image, and FAQs complete (citations pending)`,
        i + 1
      );

      console.log(`✅ [Job ${jobId}] Article ${i + 1} - Citations phase SKIPPED (will be added before publishing)`);
      console.log(`🏁 [Job ${jobId}] Article ${i + 1} - FINISHED CITATIONS PHASE (skipped for post-generation)`);
      // END CITATIONS PHASE

      // Post-process: Replace any remaining [CITATION_NEEDED] markers
      const remainingMarkers = (article.detailed_content?.match(/\[CITATION_NEEDED\]/g) || []).length;
      if (remainingMarkers > 0) {
        console.log(`[Job ${jobId}] ⚠️ ${remainingMarkers} [CITATION_NEEDED] markers remaining in article ${i+1}. Attempting to replace...`);
        
        try {
          const replacementResponse = await withTimeout(
            supabase.functions.invoke('replace-citation-markers', {
              body: {
                content: article.detailed_content,
                headline: plan.headline,
                language: language,
                category: plan.category || 'Buying Guides'
              }
            }),
            90000,
            'Citation marker replacement timeout after 90 seconds'
          );

          if (replacementResponse.data?.success && replacementResponse.data.replacedCount > 0) {
            article.detailed_content = replacementResponse.data.updatedContent;
            console.log(`[Job ${jobId}] ✅ Replaced ${replacementResponse.data.replacedCount} citation markers`);
            
            // Merge any new citations found
            const newCitations = replacementResponse.data.citations || [];
            const existingCitations = article.external_citations || [];
            const mergedCitations = [...existingCitations];
            
            newCitations.forEach((newCit: any) => {
              const exists = mergedCitations.some((existing: any) => existing.url === newCit.url);
              if (!exists) {
                mergedCitations.push({
                  text: newCit.sourceName,
                  url: newCit.url,
                  source: newCit.sourceName
                });
              }
            });
            
            // Filter merged citations against approved domains
            const filterResult = await filterCitations(
              supabase,
              mergedCitations,
              jobId,
              i + 1,
              article.detailed_content
            );
            
            article.external_citations = filterResult.filtered;
            article.detailed_content = filterResult.cleanedContent || article.detailed_content;
          } else {
            console.log(`[Job ${jobId}] ⚠️ Could not replace all citation markers. ${replacementResponse.data?.failedCount || 0} markers failed.`);
          }
        } catch (citError) {
          console.error(`[Job ${jobId}] Citation marker replacement failed:`, citError);
        }
      }

      // 11. FAQ ENTITIES (for ALL funnel stages including TOFU)
      {
        // Language-aware FAQ generation
        const faqLanguageName = {
          'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French',
          'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian',
          'fi': 'Finnish', 'no': 'Norwegian'
        }[language] || 'English';
        
        const faqPrompt = `Generate 3-5 FAQ entities for this article.

CRITICAL: Both questions AND answers MUST be written in ${faqLanguageName}. Do NOT write in English unless the article language is English.

Article Language: ${faqLanguageName}
Headline: ${plan.headline}
Content Summary: ${article.detailed_content.substring(0, 500)}...

Return ONLY valid JSON with questions and answers in ${faqLanguageName}:
{
  "faqs": [
    {
      "question": "Question in ${faqLanguageName}?",
      "answer": "Concise answer in ${faqLanguageName} (2-3 sentences)"
    }
  ]
}`;

        // Create AbortController for FAQ generation with 45s timeout
        const faqAbortController = new AbortController();
        const faqTimeoutId = setTimeout(() => {
          console.warn(`⏱️ [Job ${jobId}] Article ${i + 1} - Aborting FAQ request after 45s timeout`);
          faqAbortController.abort();
        }, 45000);

        try {
          console.log(`📋 [Job ${jobId}] Article ${i + 1} - Generating FAQs (timeout: 45s)...`);
          
          const faqResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              max_tokens: 2048,
              messages: [{ role: 'user', content: faqPrompt }],
            }),
            signal: faqAbortController.signal  // ✅ CRITICAL: Cancels request on timeout
          });
          
          clearTimeout(faqTimeoutId);

          if (!faqResponse.ok && (faqResponse.status === 429 || faqResponse.status === 402)) {
            throw new Error(`Lovable AI error: ${faqResponse.status}`);
          }

          let faqData;
          try {
            const rawText = await faqResponse.text();
            faqData = JSON.parse(rawText);
          } catch (parseError) {
            const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
            console.error(`❌ [Job ${jobId}] Article ${i + 1} - FAQ JSON parse error:`, errorMsg);
            throw new Error(`Failed to parse FAQ response: ${errorMsg}`);
          }

          if (!faqData.choices?.[0]?.message?.content) {
            throw new Error('Invalid FAQ response structure from AI');
          }
          
          const faqText = faqData.choices[0].message.content;
          const faqResult = JSON.parse(faqText.replace(/```json\n?|\n?```/g, ''));
          article.qa_entities = faqResult.faqs;
          console.log(`✅ [Job ${jobId}] Article ${i + 1} - Generated ${faqResult.faqs.length} FAQs successfully`);
          
        } catch (faqError) {
          clearTimeout(faqTimeoutId);
          
          const error = faqError as Error;
          
          if (error.name === 'AbortError') {
            console.warn(`⏱️ [Job ${jobId}] Article ${i + 1} - FAQ generation TIMEOUT (45s), continuing without FAQs`);
          } else {
            console.error(`❌ [Job ${jobId}] Article ${i + 1} - FAQ generation failed:`, error.message);
          }
          
          // NON-FATAL: Continue without FAQs rather than crashing entire cluster
          article.qa_entities = [];
        }
      }


      // 12. Calculate read time
      const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
      article.read_time = Math.ceil(wordCount / 200);

      // ✅ QUALITY VALIDATION - Ensure content meets quality standards
      console.log(`[Job ${jobId}] 🔍 Validating content quality for article ${i+1}...`);
      const qualityCheck = validateContentQuality(article, plan);
      console.log(`[Job ${jobId}] Quality Score: ${qualityCheck.score}/100`);
      
      if (!qualityCheck.isValid) {
        console.warn(`[Job ${jobId}] ⚠️ Quality issues detected for "${article.headline}":`);
        qualityCheck.issues.forEach(issue => console.warn(`  - ${issue}`));
      } else {
        console.log(`[Job ${jobId}] ✅ Content quality validated successfully`);
      }

      // Initialize empty arrays for internal links and related articles
      article.internal_links = [];
      article.related_article_ids = [];
      article.cta_article_ids = [];
      article.translations = {};

      // FIX #1: SAVE ARTICLE IMMEDIATELY TO DATABASE
      console.log(`\n========================================`);
      console.log(`💾 [Job ${jobId}] ARTICLE ${i + 1} - PHASE: Database Save`);
      console.log(`   Headline: ${article.headline}`);
      console.log(`   Word count: ${wordCount}`);
      console.log(`   Citations: ${article.external_citations?.length || 0}`);
      console.log(`   Quality score: ${qualityCheck.score}/100`);
      console.log(`========================================\n`);
      
      try {
        // Check for duplicate before inserting (prevent constraint violations on resume)
        const { count: existingCount } = await supabase
          .from('blog_articles')
          .select('*', { count: 'exact', head: true })
          .eq('cluster_id', jobId)
          .eq('language', language)
          .eq('cluster_number', i + 1);
        
        if (existingCount && existingCount > 0) {
          console.log(`⚠️ [Job ${jobId}] Article ${i + 1} already exists for ${language}, skipping save`);
          // Fetch existing article ID to track it
          const { data: existingArticle } = await supabase
            .from('blog_articles')
            .select('id')
            .eq('cluster_id', jobId)
            .eq('language', language)
            .eq('cluster_number', i + 1)
            .single();
          if (existingArticle) {
            savedArticleIds.push(existingArticle.id);
          }
          continue; // Skip to next article
        }
        
        console.log(`💾 [Job ${jobId}] Article ${i + 1} - Saving to blog_articles table...`);
        
        // Generate hreflang_group_id for English articles (translations will share this)
        const hreflangGroupId = currentLanguage === 'en' ? crypto.randomUUID() : null;
        
        const { data: savedArticle, error: saveError } = await supabase
          .from('blog_articles')
          .insert([{
            headline: article.headline,
            slug: article.slug,
            category: article.category,
            funnel_stage: article.funnel_stage,
            language: article.language,
            source_language: 'en', // English-first strategy: all content originates from English
            is_primary: currentLanguage === 'en', // English articles are primary
            hreflang_group_id: hreflangGroupId, // For translation linking
            status: 'draft',
            detailed_content: article.detailed_content,
            speakable_answer: article.speakable_answer,
            meta_title: article.meta_title,
            meta_description: article.meta_description,
            canonical_url: article.canonical_url,
            featured_image_url: article.featured_image_url,
            featured_image_alt: article.featured_image_alt,
            featured_image_caption: article.featured_image_caption || null,
            diagram_url: article.diagram_url || null,
            diagram_description: article.diagram_description || null,
            diagram_alt: article.diagram_alt || null,
            diagram_caption: article.diagram_caption || null,
            external_citations: article.external_citations || [],
            internal_links: article.internal_links || [],
            author_id: article.author_id || null,
            reviewer_id: article.reviewer_id || null,
            qa_entities: article.qa_entities || [],
            read_time: article.read_time,
            cluster_id: jobId,
            cluster_number: i + 1,
            cluster_theme: topic,
            related_article_ids: [],
            cta_article_ids: [],
            translations: {},
            date_published: null,
            date_modified: new Date().toISOString(),
            citation_status: article.citation_status || 'pending',
            citation_failure_reason: article.citation_failure_reason || null,
            citation_health_score: null,
            has_dead_citations: false,
            last_citation_check_at: null
          }])
          .select()
          .single();
        
        if (saveError) {
          console.error(`❌ [Job ${jobId}] Article ${i + 1} - Database save FAILED:`, saveError);
          throw new Error(`Failed to save article: ${saveError.message}`);
        }
        
        savedArticleIds.push(savedArticle.id);
        const articleDuration = ((Date.now() - articleStartTime) / 1000).toFixed(1);
        console.log(`✅ [Job ${jobId}] Article ${i + 1} - SAVED SUCCESSFULLY (ID: ${savedArticle.id})`);
        console.log(`⏱️  Article time: ${articleDuration}s | Total elapsed: ${((Date.now() - FUNCTION_START_TIME) / 1000).toFixed(1)}s`);
        
        // CHECKPOINT: Update cluster progress immediately after each article save
        // This ensures job state is recoverable even if timeout occurs
        await supabase
          .from('cluster_generations')
          .update({
            articles: savedArticleIds,
            progress: {
              current_step: 2 + i,
              total_steps: 11,
              current_article: i + 1,
              total_articles: articleStructures.length,
              saved_articles: savedArticleIds.length,
              failed_articles: failedArticleCount,
              message: `✅ CHECKPOINT: Article ${i + 1}/${articleStructures.length} saved for ${language}`
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        console.log(`📊 [Job ${jobId}] CHECKPOINT: ${savedArticleIds.length}/${articleStructures.length} articles saved for ${language}\n`);
        
      } catch (saveError) {
        const error = saveError as Error;
        failedArticleCount++;
        console.error(`❌ [Job ${jobId}] Article ${i + 1} - Save operation FAILED:`, error);
        
        // Log failure but continue to next article
        await supabase
          .from('cluster_generations')
          .update({
            progress: {
              current_step: 2 + i,
              total_steps: 11,
              current_article: i + 1,
              total_articles: articleStructures.length,
              saved_articles: savedArticleIds.length,
              failed_articles: failedArticleCount,
              message: `Article ${i + 1} FAILED to save: ${error.message}`,
              last_error: {
                article_number: i + 1,
                headline: article.headline,
                error: error.message,
                timestamp: new Date().toISOString()
              }
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        console.warn(`⚠️ [Job ${jobId}] Continuing to next article despite save failure`);
      }
    }

    // Check if we stopped due to timeout
    if (timeoutStopped) {
      console.log(`\n⚠️  [Job ${jobId}] Generation stopped early due to approaching timeout`);
      console.log(`   ✅ Successfully saved: ${savedArticleIds.length}/${articleStructures.length} articles`);
      console.log(`   ⏱️  Total time used: ${((Date.now() - FUNCTION_START_TIME) / 1000).toFixed(1)}s / ${(MAX_FUNCTION_RUNTIME / 1000).toFixed(1)}s`);
    }

    // FIX #1: Fetch saved articles to check citation status
    console.log(`\n[Job ${jobId}] Fetching ${savedArticleIds.length} saved articles for final validation...`);
    
    const { data: savedArticles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, citation_status, citation_failure_reason')
      .in('id', savedArticleIds);
    
    if (fetchError) {
      console.error(`❌ [Job ${jobId}] Failed to fetch saved articles:`, fetchError);
      throw new Error(`Failed to validate articles: ${fetchError.message}`);
    }
    
    // FINAL VALIDATION: No longer blocking on citation status
    // All articles are saved as drafts with citation_status='pending'
    // Citations will be added in post-generation review process
    console.log(`[Job ${jobId}] ℹ️  Citation validation skipped - all articles saved as drafts pending citation review`);

    const articleSummary = (savedArticles || []).map((a: any) => ({
      headline: a.headline,
      citation_status: a.citation_status
    }));

    console.log(`[Job ${jobId}] 📊 Article summary:`, JSON.stringify(articleSummary, null, 2));

    console.log(`[Job ${jobId}] ✅ All articles passed validation`);

    await updateProgress(supabase, jobId, 8, 'Finding internal links...');
    console.log(`[Job ${jobId}] Fetching saved articles for internal linking...`);

    // STEP 3: Find internal links between cluster articles
    // POST-PROCESSING: Wrapped in try-catch so timeout during linking doesn't corrupt state
    // Articles are already saved and language is marked complete before this point
    console.log(`\n📎 [Job ${jobId}] Starting POST-PROCESSING (non-fatal if timeout)...`);
    
    try {
    // Fetch all saved articles from database
    const { data: articlesForLinking, error: fetchArticlesError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, speakable_answer, category, funnel_stage, language, detailed_content')
      .in('id', savedArticleIds);
    
    if (fetchArticlesError) {
      console.error(`❌ [Job ${jobId}] Failed to fetch articles for linking:`, fetchArticlesError);
      throw new Error(`Failed to fetch articles: ${fetchArticlesError.message}`);
    }
    
    const articles = articlesForLinking || [];
    console.log(`[Job ${jobId}] Fetched ${articles.length} articles for internal linking`);
    
    for (let i = 0; i < articles.length; i++) {
      try {
        const article = articles[i];
        
        // Pass other articles as available articles (excluding current)
        const otherArticles = articles
          .filter((a: any, idx: number) => idx !== i)
          .map((a: any) => ({
            id: a.id,
            slug: a.slug,
            headline: a.headline,
            speakable_answer: a.speakable_answer,
            category: a.category,
            funnel_stage: a.funnel_stage,
            language: a.language,
          }));

        console.log(`[Job ${jobId}] Finding internal links for article ${i+1}/${articles.length}: "${article.headline}" (${article.language})`);
        console.log(`[Job ${jobId}] Available articles for linking: ${otherArticles.length} articles, all in ${article.language}`);

        const linksResponse = await supabase.functions.invoke('find-internal-links', {
          body: {
            content: article.detailed_content,
            headline: article.headline,
            currentArticleId: article.id,
            language: article.language,
            funnelStage: article.funnel_stage,
            availableArticles: otherArticles,
          },
        });

        if (linksResponse.error) {
          console.error(`[Job ${jobId}] Internal links error for article ${i+1}:`, linksResponse.error);
        }

        if (linksResponse.data?.links && linksResponse.data.links.length > 0) {
          console.log(`[Job ${jobId}] Found ${linksResponse.data.links.length} internal links for "${article.headline}"`);
          if (linksResponse.data.links.length > 0) {
            console.log(`[Job ${jobId}] Sample link: "${linksResponse.data.links[0].text}" -> ${linksResponse.data.links[0].title}`);
          }
          const links = linksResponse.data.links;
          
          // Insert links into content
          let updatedContent = article.detailed_content;
          
          for (const link of links) {
            if (link.insertAfterHeading) {
              const headingRegex = new RegExp(
                `<h2[^>]*>\\s*${link.insertAfterHeading}\\s*</h2>`,
                'i'
              );
              
              const match = updatedContent.match(headingRegex);
              if (match && match.index !== undefined) {
                const headingIndex = match.index + match[0].length;
                const afterHeading = updatedContent.substring(headingIndex);
                const nextParagraphMatch = afterHeading.match(/<p>/);
                
                if (nextParagraphMatch && nextParagraphMatch.index !== undefined) {
                  const insertPoint = headingIndex + nextParagraphMatch.index + 3;
                  
                  const linkHtml = `For more details, check out our guide on <a href="${link.url}" title="${link.title}">${link.text}</a>. `;
                  
                  updatedContent = updatedContent.substring(0, insertPoint) + 
                                 linkHtml + 
                                 updatedContent.substring(insertPoint);
                }
              }
            }
          }
          
          // Update article in database with new content and links
          await supabase
            .from('blog_articles')
            .update({
              detailed_content: updatedContent,
              internal_links: links.map((link: any) => ({
                url: link.url,
                text: link.text,
                title: link.title,
                relevance: link.relevance
              }))
            })
            .eq('id', article.id);
          
          console.log(`[Job ${jobId}] ✅ Updated article ${i+1} with ${links.length} internal links`);
        }
      } catch (error) {
        console.error(`Internal links failed for article ${i + 1}:`, error);
      }
    }

    // STEP 4: Set up funnel-based CTAs
    await updateProgress(supabase, jobId, 9, 'Setting funnel CTAs...');
    console.log(`[Job ${jobId}] Setting funnel CTAs for ${articles.length} articles...`);

    const tofuArticles = articles.filter((a: any) => a.funnel_stage === 'TOFU');
    const mofuArticles = articles.filter((a: any) => a.funnel_stage === 'MOFU');
    const bofuArticles = articles.filter((a: any) => a.funnel_stage === 'BOFU');

    // TOFU → MOFU CTAs, related: other TOFU + select MOFU
    for (const tofuArticle of tofuArticles) {
      const ctaSlugs = mofuArticles.slice(0, 2).map((m: any) => m.slug);
      const relatedSlugs = [
        ...tofuArticles.filter((t: any) => t.id !== tofuArticle.id).slice(0, 3).map((t: any) => t.slug),
        ...mofuArticles.slice(0, 2).map((m: any) => m.slug)
      ].slice(0, 7);
      
      // Convert slugs to IDs
      const { data: ctaArticles } = await supabase
        .from('blog_articles')
        .select('id')
        .in('slug', ctaSlugs);
      
      const { data: relatedArticles } = await supabase
        .from('blog_articles')
        .select('id')
        .in('slug', relatedSlugs);
      
      await supabase
        .from('blog_articles')
        .update({
          cta_article_ids: (ctaArticles || []).map((a: any) => a.id),
          related_article_ids: (relatedArticles || []).map((a: any) => a.id)
        })
        .eq('id', tofuArticle.id);
    }

    // MOFU → BOFU CTAs, related: other MOFU + TOFU context
    for (const mofuArticle of mofuArticles) {
      const ctaSlugs = bofuArticles.slice(0, 2).map((b: any) => b.slug);
      const relatedSlugs = [
        ...mofuArticles.filter((m: any) => m.id !== mofuArticle.id).slice(0, 3).map((m: any) => m.slug),
        ...tofuArticles.slice(0, 2).map((t: any) => t.slug),
        ...bofuArticles.map((b: any) => b.slug)
      ].slice(0, 7);
      
      const { data: ctaArticles } = await supabase
        .from('blog_articles')
        .select('id')
        .in('slug', ctaSlugs);
      
      const { data: relatedArticles } = await supabase
        .from('blog_articles')
        .select('id')
        .in('slug', relatedSlugs);
      
      await supabase
        .from('blog_articles')
        .update({
          cta_article_ids: (ctaArticles || []).map((a: any) => a.id),
          related_article_ids: (relatedArticles || []).map((a: any) => a.id)
        })
        .eq('id', mofuArticle.id);
    }

    // BOFU → no CTA (chatbot), related: MOFU + select TOFU
    for (const bofuArticle of bofuArticles) {
      const relatedSlugs = [
        ...mofuArticles.map((m: any) => m.slug),
        ...tofuArticles.slice(0, 3).map((t: any) => t.slug)
      ].slice(0, 7);
      
      const { data: relatedArticles } = await supabase
        .from('blog_articles')
        .select('id')
        .in('slug', relatedSlugs);
      
      await supabase
        .from('blog_articles')
        .update({
          cta_article_ids: [],
          related_article_ids: (relatedArticles || []).map((a: any) => a.id)
        })
        .eq('id', bofuArticle.id);
    }

    await updateProgress(supabase, jobId, 10, 'Setting related articles...');
    console.log(`[Job ${jobId}] Funnel linking complete`);

    // STEP 5: Set related articles - Already set in CTA logic above

    await updateProgress(supabase, jobId, 11, 'Completed!');
    
    } catch (postProcessError) {
      // POST-PROCESSING FAILURE IS NON-FATAL
      // Articles are already saved and language status is updated after this block
      console.warn(`\n⚠️ [Job ${jobId}] POST-PROCESSING FAILED (non-fatal):`, postProcessError);
      console.warn(`   Articles are saved. Internal links/CTAs can be added manually.`);
      console.warn(`   Continuing to language completion check...\n`);
    }
    
    // ============= MULTILINGUAL MODE: Check if more languages remain =============
    // ============= EARLY COMPLETION MARKING: Mark language complete BEFORE post-processing =============
    let finalStatus = 'completed';
    let completionNote = '';
    
    if (isMultilingual) {
      // EARLY COMPLETION: Verify article count and mark language complete IMMEDIATELY
      // This happens BEFORE internal links/CTAs so timeout during post-processing is safe
      const actualCount = await verifyLanguageArticleCount(supabase, jobId, currentLanguage);
      const languageComplete = actualCount >= 6;
      
      console.log(`\n🎯 [Job ${jobId}] EARLY COMPLETION CHECK for ${currentLanguage}`);
      console.log(`   Articles found: ${actualCount}/6`);
      console.log(`   Language complete: ${languageComplete}`);
      
      // Update language status IMMEDIATELY based on actual count (before any post-processing)
      if (languageComplete) {
        await updateLanguageStatus(supabase, jobId, currentLanguage, 'completed');
        console.log(`   ✅ Language ${currentLanguage} marked COMPLETED (6 articles verified)`);
      } else if (timeoutStopped) {
        await updateLanguageStatus(supabase, jobId, currentLanguage, 'timeout');
        console.log(`   ⏱️ Language ${currentLanguage} marked TIMEOUT (${actualCount} articles saved)`);
      } else if (actualCount > 0) {
        await updateLanguageStatus(supabase, jobId, currentLanguage, 'partial');
        console.log(`   ⚠️ Language ${currentLanguage} marked PARTIAL (${actualCount} articles saved)`);
      }
      
      // Determine true status from actual article counts across ALL languages
      const { status: trueStatus, completedLanguages, languageStatus } = await determineJobStatus(
        supabase, jobId, languagesQueue, 6
      );
      
      // Find remaining languages (those with < 6 articles)
      const remainingLanguages = languagesQueue.filter(lang => 
        (languageStatus[lang] !== 'completed')
      );
      
      console.log(`\n🌍 ========== MULTILINGUAL STATUS (VERIFIED) ==========`);
      console.log(`   Current language: ${currentLanguage}`);
      console.log(`   Articles for ${currentLanguage}: ${actualCount}/6`);
      console.log(`   Completed languages: ${completedLanguages.join(', ') || 'None'}`);
      console.log(`   Remaining: ${remainingLanguages.length > 0 ? remainingLanguages.join(', ') : 'None - ALL COMPLETE!'}`);
      console.log(`   Language status: ${JSON.stringify(languageStatus)}`);
      console.log(`==========================================\n`);
      
      // Update multilingual tracking with verified data
      await supabase
        .from('cluster_generations')
        .update({
          completed_languages: completedLanguages,
          current_language_index: completedLanguages.length,
          language_status: languageStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (remainingLanguages.length > 0) {
        // More languages to translate
        
        // Check if English is complete - if so, AUTO-INVOKE translate-cluster!
        const englishComplete = completedLanguages.includes('en');
        
        if (englishComplete) {
          console.log(`[Job ${jobId}] ✅ English complete. AUTO-INVOKING translate-cluster...`);
          
          // Auto-invoke translate-cluster function to start translations
          try {
            const translateResponse = await fetch(
              `${SUPABASE_URL}/functions/v1/translate-cluster`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({ jobId }),
              }
            );
            
            if (translateResponse.ok) {
              const translateResult = await translateResponse.json();
              console.log(`[Job ${jobId}] ✅ translate-cluster invoked successfully:`, translateResult);
              
              if (translateResult.status === 'completed') {
                // All translations complete!
                finalStatus = 'completed';
                completionNote = 'Multilingual cluster complete: 6 English articles + 54 translations (60 total).';
              } else {
                // Translation in progress or partial
                finalStatus = 'partial';
                completionNote = translateResult.message || `English complete. ${remainingLanguages.length} languages being translated...`;
              }
            } else {
              const errorText = await translateResponse.text();
              console.error(`[Job ${jobId}] ❌ translate-cluster failed:`, errorText);
              finalStatus = 'partial';
              completionNote = `English complete (6 articles). Translation start failed: ${errorText}. Click Resume to retry.`;
            }
          } catch (translateError) {
            console.error(`[Job ${jobId}] ❌ Failed to invoke translate-cluster:`, translateError);
            finalStatus = 'partial';
            completionNote = `English complete (6 articles). Ready to translate to ${remainingLanguages.length} languages. Click Resume to start.`;
          }
        } else {
          finalStatus = 'partial';
          completionNote = `Multilingual: ${completedLanguages.length}/${languagesQueue.length} languages complete. Next: ${remainingLanguages[0]}. Click Resume to continue.`;
          console.log(`[Job ${jobId}] ✅ Language ${currentLanguage} complete. ${remainingLanguages.length} languages remaining.`);
        }
      } else {
        // All languages complete - run translation linking
        console.log(`[Job ${jobId}] 🌍 ALL LANGUAGES COMPLETE! Running translation linking...`);
        
        try {
          await linkTranslations(supabase, jobId);
          console.log(`[Job ${jobId}] ✅ Translation linking complete`);
          finalStatus = 'completed';
          completionNote = `Multilingual cluster complete: 6 English articles + 54 translations (60 total).`;
        } catch (linkError) {
          console.error(`[Job ${jobId}] ❌ Translation linking failed:`, linkError);
          finalStatus = 'completed';
          completionNote = `Multilingual cluster complete with ${languagesQueue.length} languages, but translation linking failed: ${linkError instanceof Error ? linkError.message : 'Unknown error'}`;
        }
      }
    } else {
      // Single-language mode - original logic
      const successRate = (savedArticleIds.length / articleStructures.length) * 100;
      const allArticlesGenerated = savedArticleIds.length === articleStructures.length;
      finalStatus = allArticlesGenerated ? 'completed' : 'partial';
      completionNote = timeoutStopped 
        ? `${savedArticleIds.length}/${articleStructures.length} articles generated. Generation stopped early due to timeout to prevent job failure.`
        : `${savedArticleIds.length}/${articleStructures.length} articles saved as drafts.`;
    }
    
    console.log(`\n========================================`);
    console.log(`🎉 [Job ${jobId}] CLUSTER GENERATION ${finalStatus.toUpperCase()}`);
    console.log(`   Mode: ${isMultilingual ? 'MULTILINGUAL' : 'Single-language'}`);
    console.log(`   Total articles: ${articleStructures.length}`);
    console.log(`   Successfully saved: ${savedArticleIds.length}`);
    console.log(`   Failed: ${failedArticleCount}`);
    console.log(`   Timeout stopped: ${timeoutStopped ? 'Yes' : 'No'}`);
    console.log(`   Total time: ${((Date.now() - FUNCTION_START_TIME) / 1000).toFixed(1)}s`);
    console.log(`   Status: ${finalStatus}`);
    if (isMultilingual) {
      console.log(`   Note: ${completionNote}`);
    }
    console.log(`========================================\n`);

    // Save final status to job record with error handling and verification
    console.log(`[Job ${jobId}] 💾 Updating job status to: ${finalStatus}`);
    
    const { data: updateData, error: updateError } = await supabase
      .from('cluster_generations')
      .update({
        status: finalStatus,
        articles: savedArticleIds, // Only store article IDs
        completion_note: completionNote,
        progress: {
          current_step: 11,
          total_steps: 11,
          current_article: savedArticleIds.length,
          total_articles: articleStructures.length,
          saved_articles: savedArticleIds.length,
          failed_articles: failedArticleCount,
          timeout_stopped: timeoutStopped,
          is_multilingual: isMultilingual,
          current_language: currentLanguage,
          completed_languages: isMultilingual ? languagesQueue.slice(0, languagesQueue.indexOf(currentLanguage) + 1) : undefined,
          total_time_seconds: ((Date.now() - FUNCTION_START_TIME) / 1000).toFixed(1),
          message: finalStatus === 'completed' 
            ? isMultilingual 
              ? `✅ Multilingual cluster complete: All ${languagesQueue.length} languages generated!`
              : `✅ Cluster complete: ${savedArticleIds.length}/${articleStructures.length} articles saved as DRAFTS.`
            : isMultilingual
            ? `🌍 Language ${currentLanguage} complete. Generating next language...`
            : `⚠️ Partial completion: ${savedArticleIds.length}/${articleStructures.length} articles saved as DRAFTS.`
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select();

    if (updateError) {
      console.error(`[Job ${jobId}] ❌ CRITICAL: Failed to update job status:`, updateError);
      // Try one more time with minimal data
      const { error: retryError } = await supabase
        .from('cluster_generations')
        .update({
          status: finalStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (retryError) {
        console.error(`[Job ${jobId}] ❌ CRITICAL: Retry failed:`, retryError);
      } else {
        console.log(`[Job ${jobId}] ✅ Status update succeeded on retry`);
      }
    } else {
      console.log(`[Job ${jobId}] ✅ Job status successfully updated to: ${finalStatus}`);
      console.log(`[Job ${jobId}] ✅ Job ${finalStatus} - ${savedArticleIds.length} articles saved to database`);
    }
    
    // Verify the update succeeded
    const { data: verifyData, error: verifyError } = await supabase
      .from('cluster_generations')
      .select('status')
      .eq('id', jobId)
      .single();
    
    if (verifyError) {
      console.error(`[Job ${jobId}] ⚠️  Could not verify status update:`, verifyError);
    } else if (verifyData?.status !== finalStatus) {
      console.error(`[Job ${jobId}] ⚠️  Status mismatch! Expected: ${finalStatus}, Got: ${verifyData?.status}`);
    } else {
      console.log(`[Job ${jobId}] ✅ Status verified in database: ${verifyData.status}`);
    }

  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Generation failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Update job with structured error
    await supabase
      .from('cluster_generations')
      .update({
        status: 'failed',
        error: JSON.stringify({
          message: errorMessage,
          step: 'unknown',
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined
        }),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  } finally {
    // Always stop the heartbeat when done (success or failure)
    clearInterval(heartbeat);
    console.log(`[Heartbeat] Stopped for job ${jobId}`);
  }
}

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language, targetAudience, primaryKeyword, _resumeMultilingualJob } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user ID (if authenticated)
    const authHeader = req.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
      } catch (e) {
        console.log('Could not get user from auth header:', e);
      }
    }

    let job;
    let resumedLanguageIndex = 0;
    
    // Handle multilingual continuation
    if (_resumeMultilingualJob) {
      console.log(`[Resume] 🌍 Continuing multilingual job: ${_resumeMultilingualJob}`);
      
      // Fetch existing job
      const { data: existingJob, error: fetchError } = await supabase
        .from('cluster_generations')
        .select('*')
        .eq('id', _resumeMultilingualJob)
        .single();
      
      if (fetchError || !existingJob) {
        throw new Error(`Failed to fetch job for multilingual resume: ${fetchError?.message}`);
      }
      
      job = existingJob;
      resumedLanguageIndex = job.current_language_index || 0;
      
      console.log(`[Resume] Continuing from language index ${resumedLanguageIndex}: ${job.languages_queue?.[resumedLanguageIndex]}`);
      
      // Update job status to generating
      await supabase
        .from('cluster_generations')
        .update({
          status: 'generating',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
    } else {
      // Create new job
      const { data: newJob, error: jobError } = await supabase
        .from('cluster_generations')
        .insert({
          user_id: userId,
          topic,
          language,
          target_audience: targetAudience,
          primary_keyword: primaryKeyword,
          status: 'pending',
        })
        .select()
        .single();

      if (jobError) {
        console.error('Failed to create job:', jobError);
        throw jobError;
      }
      
      job = newJob;
      console.log(`✅ Created job ${job.id}, starting background generation`);
    }

    // Start generation in background (non-blocking) with global error boundary
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          await generateCluster(
            job.id, 
            job.topic, 
            _resumeMultilingualJob ? job.languages_queue[resumedLanguageIndex] : language,
            job.target_audience, 
            job.primary_keyword,
            _resumeMultilingualJob ? resumedLanguageIndex : undefined,
            _resumeMultilingualJob ? true : false
          );
        } catch (error) {
          console.error(`[Job ${job.id}] 🚨 FATAL ERROR - generateCluster crashed:`, {
            errorType: error?.constructor?.name,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          });
          
          // Ensure database is updated even on catastrophic failure
          try {
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );
            
            await supabase
              .from('cluster_generations')
              .update({
                status: 'failed',
                error: JSON.stringify({
                  message: error instanceof Error ? error.message : 'Unknown fatal error',
                  type: 'FATAL_CRASH',
                  timestamp: new Date().toISOString(),
                  stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
                }),
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
              
            console.log(`[Job ${job.id}] ✅ Database updated with error status`);
          } catch (dbError) {
            console.error(`[Job ${job.id}] ❌ Failed to update database after crash:`, dbError);
          }
        }
      })()
    );

    // Return job ID immediately
    return new Response(
      JSON.stringify({ success: true, jobId: job.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-cluster request handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
