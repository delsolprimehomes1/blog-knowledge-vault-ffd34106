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
  
  // Check minimum word count - AEO requires 1,500-2,000 words
  const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  if (wordCount < 1500) {
    issues.push(`Content too short (${wordCount} words, minimum 1500)`);
    score -= 20;
  } else if (wordCount > 2300) {
    issues.push(`Content too long (${wordCount} words, maximum 2300)`);
    score -= 5;
  }
  
  // Validate FAQ AEO compliance
  if (article.qa_entities && Array.isArray(article.qa_entities)) {
    if (article.qa_entities.length < 5) {
      issues.push(`Too few FAQs: ${article.qa_entities.length} (need 5-8)`);
      score -= 10;
    }
    
    article.qa_entities.forEach((faq: any, idx: number) => {
      const answerWords = faq.answer?.split(/\s+/).length || 0;
      
      if (answerWords < 80 || answerWords > 150) {
        issues.push(`FAQ ${idx + 1}: ${answerWords} words (need 80-120)`);
        score -= 5;
      }
      
      // Check for list formatting (forbidden in FAQ answers)
      if (faq.answer?.match(/^\s*\d+\.\s|^\s*[-*•]\s|\n\s*\d+\.\s|\n\s*[-*•]\s/m)) {
        issues.push(`FAQ ${idx + 1} contains forbidden lists`);
        score -= 10;
      }
    });
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

    // ============= CHUNKED GENERATION: Fire-and-forget first chunk =============
    // Instead of processing all articles in this function (which times out),
    // we delegate to generate-cluster-chunk which self-chains for reliable processing
    
    const CHUNK_SIZE = 1; // One article per chunk to prevent timeouts
    const totalChunks = Math.ceil(articleStructures.length / CHUNK_SIZE);
    
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  CHUNKED GENERATION MODE              ║`);
    console.log(`╚════════════════════════════════════════╝`);
    console.log(`[Job ${jobId}] Total articles: ${articleStructures.length}`);
    console.log(`[Job ${jobId}] Chunk size: ${CHUNK_SIZE}`);
    console.log(`[Job ${jobId}] Total chunks: ${totalChunks}\n`);

    // Update job to indicate chunked mode
    await supabase
      .from('cluster_generations')
      .update({
        status: 'generating',
        progress: {
          current_step: 2,
          total_steps: articleStructures.length + 2,
          current_article: 0,
          total_articles: articleStructures.length,
          message: `Starting chunked generation (${totalChunks} chunks)...`,
          chunked: true,
          total_chunks: totalChunks,
          chunk: 1,
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Fire first chunk (fire-and-forget)
    console.log(`[Job ${jobId}] 🔥 Firing chunk 1/${totalChunks}...`);
    
    fetch(`${SUPABASE_URL}/functions/v1/generate-cluster-chunk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        jobId,
        chunkIndex: 0,
        articleStructures,
      }),
    }).catch(err => {
      console.error(`[Job ${jobId}] Fire-and-forget error (ignored):`, err);
    });

    console.log(`[Job ${jobId}] ✅ Chunk 1 fired - orchestrator complete`);
    console.log(`[Job ${jobId}] Articles will self-chain via generate-cluster-chunk`);

    // Stop heartbeat - chunks will manage their own
    clearInterval(heartbeat);
    console.log(`[Heartbeat] Stopped for orchestrator ${jobId}`);

    // Return early - chunks will handle the rest
    return;

  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Orchestrator failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    await supabase
      .from('cluster_generations')
      .update({
        status: 'failed',
        error: JSON.stringify({
          message: errorMessage,
          step: 'orchestrator',
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined
        }),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  } finally {
    clearInterval(heartbeat);
    console.log(`[Heartbeat] Stopped for job ${jobId}`);
  }
}

// NOTE: Legacy sequential article generation code removed.
// Articles are now generated via chunked processing in generate-cluster-chunk function.

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language, targetAudience, primaryKeyword, _resumeMultilingualJob } = await req.json();

    // ENFORCE ENGLISH-FIRST STRATEGY
    // Master clusters must be created in English. Translations happen via Cluster Manager.
    if (!_resumeMultilingualJob && language && language !== 'en') {
      console.warn(`[generate-cluster] ⚠️ Rejected non-English language request: ${language}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'English-first strategy enforced. Master clusters must be created in English. Use Cluster Manager to translate to other languages.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          started_at: new Date().toISOString(), // Track when job started
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
