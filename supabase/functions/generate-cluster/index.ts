import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Timeout wrapper for promises
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
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
async function generateCluster(jobId: string, topic: string, language: string, targetAudience: string, primaryKeyword: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // Check for stuck jobs and clean them up before starting
    console.log(`[Job ${jobId}] 🔍 Checking for stuck jobs...`);
    await supabase.rpc('check_stuck_cluster_jobs');
    
    console.log(`[Job ${jobId}] Starting generation for:`, { topic, language, targetAudience, primaryKeyword });
    await updateProgress(supabase, jobId, 0, 'Starting generation...');

    // Validate LOVABLE_API_KEY before starting
    console.log(`[Job ${jobId}] 🔐 Validating LOVABLE_API_KEY...`);
    try {
      const testResponse = await withTimeout(
        fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY!}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }],
          }),
        }),
        10000,
        'API key validation timeout'
      );
      
      if (!testResponse.ok && testResponse.status === 401) {
        throw new Error('LOVABLE_API_KEY is invalid or expired');
      }
      console.log(`[Job ${jobId}] ✅ LOVABLE_API_KEY validated successfully`);
    } catch (error) {
      console.error(`[Job ${jobId}] ❌ API key validation failed:`, error);
      throw new Error(`Lovable AI key validation failed: ${error instanceof Error ? error.message : String(error)}`);
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

    const structurePrompt = `You are an expert SEO content strategist for a luxury real estate agency in Costa del Sol, Spain.

Create a content cluster structure for the topic: "${topic}"
Language: ${language}
Target audience: ${targetAudience}
Primary keyword: ${primaryKeyword}

Generate 6 article titles following this funnel structure:
- 3 TOFU (Top of Funnel) - Awareness stage, educational, broad topics (e.g., "What is Costa del Sol Like for...")
- 2 MOFU (Middle of Funnel) - Consideration stage, comparison, detailed guides (e.g., "How to Choose...")
- 1 BOFU (Bottom of Funnel) - Decision stage, action-oriented (e.g., "Complete Guide to Buying...")

Each article must include the location "Costa del Sol" in the headline.

CRITICAL: You MUST return ONLY a valid JSON object with this EXACT structure. Do NOT include markdown code blocks, explanations, or any other text:

{
  "articles": [
    {
      "funnelStage": "TOFU",
      "headline": "What is Costa del Sol Like for International Buyers?",
      "targetKeyword": "costa del sol for international buyers",
      "searchIntent": "informational",
      "contentAngle": "Overview of Costa del Sol lifestyle, climate, culture for foreign buyers"
    }
  ]
}

Return ONLY the JSON object above, nothing else. No markdown, no explanations, no code fences.`;

    // Wrap AI call with timeout and retry
    const structureResponse = await retryWithBackoff(
      () => withTimeout(
        fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
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
        throw new Error('Lovable AI rate limit exceeded. Please wait and try again.');
      }
      if (structureResponse.status === 402) {
        throw new Error('Lovable AI credits depleted. Please add credits in workspace settings.');
      }
      const errorText = await structureResponse.text();
      throw new Error(`Lovable AI error (${structureResponse.status}): ${errorText}`);
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

    // STEP 2: Generate each article with detailed sections
    const articles = [];

    for (let i = 0; i < articleStructures.length; i++) {
      await updateProgress(supabase, jobId, 2 + i, `Generating article ${i + 1} of ${articleStructures.length}...`, i + 1);
      const plan = articleStructures[i];
      const article: any = {
        funnel_stage: plan.funnelStage,
        language,
        status: 'draft',
      };

      console.log(`[Job ${jobId}] Generating article ${i + 1}/${articleStructures.length}: ${plan.headline}`);

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
        const categoryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
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

      // 4. SEO META TAGS
      const seoPrompt = `Create SEO meta tags for this article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Angle: ${plan.contentAngle}
Language: ${language}

Requirements:
- Meta Title: Include primary keyword, location "Costa del Sol", and year 2025
- Max 60 characters (strict limit)
- Meta Description: Compelling summary with CTA
- Max 160 characters (strict limit)
- Include numbers or specific benefits (e.g., "5 steps", "Complete guide", "Expert tips")

Return ONLY valid JSON:
{
  "title": "Title here (max 60 chars)",
  "description": "Description with benefits and CTA (max 160 chars)"
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
      article.canonical_url = null;

      // 5. SPEAKABLE ANSWER (40-60 words)
      const speakablePrompt = `Write a 40-60 word speakable answer for this article:

Question: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Focus: ${plan.contentAngle}

Requirements:
- Conversational tone (use "you" and "your")
- Present tense, active voice
- Self-contained (no pronouns referring to previous context)
- Actionable (tell reader what to DO)
- No jargon
- Exactly 40-60 words

Example format:
"To [action], you can [step 1], [step 2], and [step 3]. The process typically takes [timeframe] and [key benefit]. [Additional helpful detail]."

Return ONLY the speakable text, no JSON, no formatting, no quotes.`;

      const speakableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          max_tokens: 256,
          messages: [{ role: 'user', content: speakablePrompt }],
        }),
      });

      if (!speakableResponse.ok && (speakableResponse.status === 429 || speakableResponse.status === 402)) {
        throw new Error(`Lovable AI error: ${speakableResponse.status}`);
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

      // Build Lovable AI request
      let aiRequestBody: any = {
          model: 'google/gemini-2.5-flash',
        max_tokens: 8192,
        messages: contentPromptMessages,
      };

      console.log(`[Job ${jobId}] 🤖 Starting Lovable AI call for article ${i + 1}:`, {
        headline: plan.headline,
        funnelStage: plan.funnelStage,
        hasCustomPrompt,
        maxTokens: 8192,
        timestamp: new Date().toISOString()
      });

      const contentResponse = await withHeartbeat(
        supabase,
        jobId,
        withTimeout(
          fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY!}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(aiRequestBody),
          }),
          120000, // 2 minutes - Flash completes in 1-2 min
          `Gemini Flash timeout after 2 minutes for article ${i + 1}`
        )
      );

      console.log(`[Job ${jobId}] ✅ Lovable AI responded for article ${i + 1}:`, {
        status: contentResponse.status,
        statusText: contentResponse.statusText,
        timestamp: new Date().toISOString()
      });

      if (!contentResponse.ok) {
        if (contentResponse.status === 429) {
          throw new Error('Lovable AI rate limit exceeded. Please wait and try again.');
        }
        if (contentResponse.status === 402) {
          throw new Error('Lovable AI credits depleted. Please add credits in workspace settings.');
        }
        const errorText = await contentResponse.text();
        console.error(`[Job ${jobId}] Content generation failed for article ${i + 1}:`, contentResponse.status, errorText);
        throw new Error(`Content generation failed: ${contentResponse.status}`);
      }

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

      try {
        console.log(`🎨 Image generation context:
  - Funnel Stage: ${plan.funnelStage}
  - Detected Topic: ${articleTopic}
  - Property Type: ${propertyType}
  - Location: ${location}
  - Prompt: ${imagePrompt.substring(0, 150)}...`);
        
        const imageResponse = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: imagePrompt,
            headline: plan.headline,
          },
        });

        console.log('📸 Image response error:', imageResponse.error);
        console.log('📸 Image response data:', JSON.stringify(imageResponse.data));

        let featuredImageUrl = '';
        let featuredImageAlt = '';

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
            const imageResponse = await fetch(tempImageUrl);
            if (!imageResponse.ok) throw new Error(`Failed to download image: ${imageResponse.status}`);
            
            const imageBlob = await imageResponse.blob();
            const fileName = `cluster-${jobId}-article-${i + 1}.jpg`;
            
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

          // Generate SEO-optimized alt text
          const funnelIntent = plan.funnelStage === 'TOFU' ? 'awareness/lifestyle' : plan.funnelStage === 'MOFU' ? 'consideration/comparison' : 'decision/action';
          const funnelStyle = plan.funnelStage === 'TOFU' ? 'inspiring lifestyle' : plan.funnelStage === 'MOFU' ? 'detailed comparison' : 'professional consultation';
          
          const altPrompt = `Create SEO-optimized alt text for this image:

Article: ${plan.headline}
Funnel Stage: ${plan.funnelStage} (${funnelIntent})
Article Topic: ${articleTopic}
Target Keyword: ${plan.targetKeyword}
Image shows: ${imagePrompt}

Requirements:
- Include primary keyword "${plan.targetKeyword}"
- Reflect the ${plan.funnelStage} intent (${funnelStyle})
- Describe what's visible in the image accurately
- Max 125 characters
- Natural, descriptive (not keyword stuffed)

Return only the alt text, no quotes, no JSON.`;

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
          
          console.log(`✅ Contextual image generated:
  - Funnel-appropriate style: ${funnelStyle}
  - Topic match: ${articleTopic}
  - Image URL: ${featuredImageUrl}
  - Alt text: ${featuredImageAlt}`);
        } else {
          console.warn('⚠️ No images in response');
          throw new Error('No images returned from FAL.ai');
        }

        article.featured_image_url = featuredImageUrl;
        article.featured_image_alt = featuredImageAlt;
        article.featured_image_caption = featuredImageUrl ? `${plan.headline} - Luxury real estate in Costa del Sol` : null;
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

      // 10. EXTERNAL CITATIONS (MANDATORY - BLOCKING)
      console.log(`[Job ${jobId}] 📚 Finding REQUIRED external citations for article ${i+1}: "${plan.headline}" (${language})`);

      let citationsAttempt = 0;
      const MAX_CITATION_ATTEMPTS = 3;
      let citations: any[] = [];
      let citationError: Error | null = null;

      // 3-LAYER FALLBACK SYSTEM
      while (citationsAttempt < MAX_CITATION_ATTEMPTS && citations.length < 2) {
        citationsAttempt++;
        
        console.log(`[Job ${jobId}] Citation attempt ${citationsAttempt}/${MAX_CITATION_ATTEMPTS}`);
        
        try {
          const citationsResponse = await withTimeout(
            supabase.functions.invoke('find-external-links', {
              body: {
                content: article.detailed_content,
                headline: plan.headline,
                language: language,
                attemptNumber: citationsAttempt,
                requireApprovedDomains: citationsAttempt === 3,
              },
            }),
            30000, // 30 second timeout (increased from 20)
            `External citations lookup timeout on attempt ${citationsAttempt}`
          );

          if (citationsResponse.error) {
            throw new Error(citationsResponse.error.message);
          }

          const fetchedCitations = citationsResponse.data?.citations || [];
          
          if (fetchedCitations.length >= 2) {
            citations = fetchedCitations;
            console.log(`[Job ${jobId}] ✅ Found ${citations.length} verified citations on attempt ${citationsAttempt}`);
            break;
          } else {
            console.warn(`[Job ${jobId}] ⚠️ Only found ${fetchedCitations.length} citations on attempt ${citationsAttempt}, retrying...`);
            citations = fetchedCitations; // Save partial results
          }
          
        } catch (error) {
          citationError = error instanceof Error ? error : new Error(String(error));
          console.error(`[Job ${jobId}] Citation attempt ${citationsAttempt} failed:`, citationError.message);
          
          if (citationsAttempt < MAX_CITATION_ATTEMPTS) {
            const waitTime = 2000 * citationsAttempt;
            console.log(`[Job ${jobId}] Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      // CRITICAL CHECK: Did we get minimum 2 citations?
      if (citations.length < 2) {
        console.error(`[Job ${jobId}] ❌ FAILED citation requirement for article ${i+1}: ${citations.length}/2 found`);
        
        article.citation_status = 'failed';
        article.external_citations = citations;
        article.citation_failure_reason = `Only found ${citations.length} citations after ${MAX_CITATION_ATTEMPTS} attempts. ${citationError ? `Error: ${citationError.message}` : 'Timeout or insufficient results'}`;
        
        console.log(`[Job ${jobId}] ⚠️ Article ${i+1} marked as citation_status='failed'`);
        
      } else {
        article.citation_status = 'verified';
        
        let updatedContent = article.detailed_content;
        
        for (const citation of citations) {
          if (citation.insertAfterHeading) {
            const headingRegex = new RegExp(
              `<h2[^>]*>\\s*${citation.insertAfterHeading}\\s*</h2>`,
              'i'
            );
            
            const match = updatedContent.match(headingRegex);
            if (match && match.index !== undefined) {
              const headingIndex = match.index + match[0].length;
              const afterHeading = updatedContent.substring(headingIndex);
              const nextParagraphMatch = afterHeading.match(/<p>/);
              
              if (nextParagraphMatch && nextParagraphMatch.index !== undefined) {
                const insertPoint = headingIndex + nextParagraphMatch.index + 3;
                
                const citationLink = `According to the <a href="${citation.url}" target="_blank" rel="noopener" title="${citation.sourceName}">${citation.anchorText}</a>, `;
                
                updatedContent = updatedContent.substring(0, insertPoint) + 
                               citationLink + 
                               updatedContent.substring(insertPoint);
              }
            }
          }
        }
        
        article.detailed_content = updatedContent;
        article.external_citations = citations.map((citation: any) => ({
          source: citation.sourceName,
          url: citation.url,
          text: citation.anchorText,
          context: citation.contextInArticle,
          relevance: citation.relevance
        }));
        
        console.log(`[Job ${jobId}] ✅ Article ${i+1} citations VERIFIED (${citations.length} citations inserted)`);
      }

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

      // 11. FAQ ENTITIES (for MOFU/BOFU)
      if (plan.funnelStage !== 'TOFU') {
        const faqPrompt = `Generate 3-5 FAQ entities for this article:
Headline: ${plan.headline}
Content: ${article.detailed_content.substring(0, 500)}...

Return ONLY valid JSON:
{
  "faqs": [
    {
      "question": "Question here?",
      "answer": "Concise answer (2-3 sentences)"
    }
  ]
}`;

        try {
          const faqResponse = await withTimeout(
            fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            }),
            45000,
            'FAQ generation timeout after 45 seconds'
          );

          if (!faqResponse.ok && (faqResponse.status === 429 || faqResponse.status === 402)) {
            throw new Error(`Lovable AI error: ${faqResponse.status}`);
          }

          let faqData;
          try {
            const rawText = await faqResponse.text();
            faqData = JSON.parse(rawText);
          } catch (parseError) {
            const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
            console.error(`[Job ${jobId}] ❌ JSON parse error for FAQ generation:`, errorMsg);
            throw new Error(`Failed to parse FAQ response: ${errorMsg}`);
          }

          if (!faqData.choices?.[0]?.message?.content) {
            throw new Error('Invalid FAQ response from AI');
          }
          const faqText = faqData.choices[0].message.content;
          const faqResult = JSON.parse(faqText.replace(/```json\n?|\n?```/g, ''));
          article.faq_entities = faqResult.faqs;
        } catch (error) {
          console.error(`[Job ${jobId}] FAQ generation failed for article ${i+1}:`, error);
          article.faq_entities = [];
        }
      } else {
        article.faq_entities = [];
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

      articles.push(article);
      console.log(`Article ${i + 1} complete:`, article.headline, `(${wordCount} words, quality: ${qualityCheck.score}/100)`);
    }

    // FINAL VALIDATION: Block cluster if any article failed citations
    const failedCitationArticles = articles.filter((a: any) => a.citation_status === 'failed');

    if (failedCitationArticles.length > 0) {
      const failedHeadlines = failedCitationArticles.map((a: any) => a.headline).join(', ');
      
      console.error(`[Job ${jobId}] ❌ CLUSTER GENERATION BLOCKED: ${failedCitationArticles.length} article(s) failed citation requirements`);
      
      throw new Error(
        `Cluster generation incomplete: ${failedCitationArticles.length} article(s) failed citation requirements. ` +
        `Articles: ${failedHeadlines}. ` +
        `Each article must have at least 2 verified, non-competitor external citations. ` +
        `Please review the citation requirements and retry generation.`
      );
    }

    console.log(`[Job ${jobId}] ✅ All articles passed citation requirements`);

    await updateProgress(supabase, jobId, 8, 'Finding internal links...');
    console.log(`[Job ${jobId}] All articles generated, now finding internal links...`);

    // STEP 3: Find internal links between cluster articles
    
    for (let i = 0; i < articles.length; i++) {
      try {
        const article = articles[i];
        
        // Pass other articles as available articles (excluding current)
        const otherArticles = articles
          .filter((a: any, idx: number) => idx !== i)
          .map((a: any) => ({
            id: `temp-${a.slug}`,
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
            currentArticleId: `temp-${article.slug}`,
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
          
          article.detailed_content = updatedContent;
          article.internal_links = links.map((l: any) => ({
            text: l.text,
            url: l.url,
            title: l.title,
          }));
        }
      } catch (error) {
        console.error(`Internal links failed for article ${i + 1}:`, error);
      }
    }

    // STEP 4: Link articles in funnel progression
    const tofuArticles = articles.filter((a: any) => a.funnel_stage === 'TOFU');
    const mofuArticles = articles.filter((a: any) => a.funnel_stage === 'MOFU');
    const bofuArticles = articles.filter((a: any) => a.funnel_stage === 'BOFU');

    console.log('Linking articles in funnel progression...');

    // TOFU articles → link to MOFU articles (awareness to consideration)
    tofuArticles.forEach((tofuArticle: any, idx: number) => {
      // Store slugs temporarily - will be converted to IDs when saved to database
      const otherTofu = tofuArticles.filter((t: any, i: number) => i !== idx);
      
      tofuArticle._temp_cta_slugs = mofuArticles.map((m: any) => m.slug);
      tofuArticle._temp_related_slugs = [
        ...otherTofu.map((t: any) => t.slug),
        ...mofuArticles.slice(0, 2).map((m: any) => m.slug)
      ].slice(0, 7);
      
      // Keep as empty for now - frontend will resolve slugs to IDs when saving
      tofuArticle.cta_article_ids = [];
      tofuArticle.related_article_ids = [];
    });

    // MOFU articles → link to BOFU article (consideration to decision)
    mofuArticles.forEach((mofuArticle: any, idx: number) => {
      const otherMofu = mofuArticles.filter((m: any, i: number) => i !== idx);
      
      mofuArticle._temp_cta_slugs = bofuArticles.map((b: any) => b.slug);
      mofuArticle._temp_related_slugs = [
        ...tofuArticles.slice(0, 3).map((t: any) => t.slug),
        ...otherMofu.map((m: any) => m.slug),
        ...bofuArticles.map((b: any) => b.slug)
      ].slice(0, 7);
      
      mofuArticle.cta_article_ids = [];
      mofuArticle.related_article_ids = [];
    });

    // BOFU article → no CTA (chatbot for conversion), link to supporting content
    bofuArticles.forEach((bofuArticle: any) => {
      bofuArticle._temp_cta_slugs = []; // No CTA - use chatbot instead
      bofuArticle._temp_related_slugs = [
        ...mofuArticles.map((m: any) => m.slug),
        ...tofuArticles.slice(0, 3).map((t: any) => t.slug)
      ].slice(0, 7);
      
      bofuArticle.cta_article_ids = [];
      bofuArticle.related_article_ids = [];
    });

    await updateProgress(supabase, jobId, 10, 'Setting related articles...');
    console.log(`[Job ${jobId}] Funnel linking complete`);

    // STEP 5: Set related articles - Already set in CTA logic above

    await updateProgress(supabase, jobId, 11, 'Completed!');
    console.log(`[Job ${jobId}] Generation complete!`);

    // Save final articles to job record
    await supabase
      .from('cluster_generations')
      .update({
        status: 'completed',
        articles: articles,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] ✅ Job completed successfully, saved ${articles.length} articles`);

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
  }
}

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language, targetAudience, primaryKeyword } = await req.json();

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

    // Create job record
    const { data: job, error: jobError } = await supabase
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

    console.log(`✅ Created job ${job.id}, starting background generation`);

    // Start generation in background (non-blocking) with global error boundary
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          await generateCluster(job.id, topic, language, targetAudience, primaryKeyword);
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
