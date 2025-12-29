import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  nl: 'Dutch',
  fr: 'French',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  hu: 'Hungarian',
  fi: 'Finnish',
  no: 'Norwegian',
};

const ALL_SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const TRANSLATION_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const ALL_QA_TYPES = ['core', 'decision', 'practical', 'problem'];

/**
 * Translate a Q&A page from English to target language
 */
async function translateQAPage(
  englishQA: any,
  targetLanguage: string,
  lovableApiKey: string
): Promise<any> {
  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  console.log(`[Translation] Translating to ${targetLanguageName}...`);

  const translationPrompt = `Translate this Q&A page from English to ${targetLanguageName}.

CRITICAL: Translate EVERYTHING while keeping ALL HTML tags intact.

English Q&A Page:

**Title:**
${englishQA.title}

**Main Question:**
${englishQA.question_main}

**Main Answer (HTML):**
${englishQA.answer_main}

**Related Q&As:**
${JSON.stringify(englishQA.related_qas, null, 2)}

**Meta Title:**
${englishQA.meta_title}

**Meta Description:**
${englishQA.meta_description}

**Speakable Answer:**
${englishQA.speakable_answer}

---

Respond in JSON format ONLY:
{
  "title": "translated title",
  "slug": "url-friendly-slug-in-${targetLanguage}",
  "question_main": "translated main question",
  "answer_main": "translated HTML answer (keep all tags)",
  "related_qas": [
    {"question": "translated", "answer": "translated"},
    {"question": "translated", "answer": "translated"}
  ],
  "meta_title": "translated (max 60 chars)",
  "meta_description": "translated (max 160 chars)",
  "speakable_answer": "translated (50-80 words)"
}`;

  const MAX_RETRIES = 2;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `You are an expert translator. Translate all content to ${targetLanguageName}. Return only valid JSON.` },
            { role: 'user', content: translationPrompt }
          ],
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '';
      
      // Robust JSON cleanup
      content = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '');

      let translated;
      try {
        translated = JSON.parse(content);
      } catch {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          translated = JSON.parse(content.slice(start, end + 1));
        } else {
          throw new Error('Failed to parse translation JSON');
        }
      }

      // Merge with original English data, replacing translated fields
      return {
        ...englishQA,
        language: targetLanguage,
        title: translated.title || englishQA.title,
        slug: translated.slug || `${englishQA.slug}-${targetLanguage}`,
        question_main: translated.question_main || englishQA.question_main,
        answer_main: translated.answer_main || englishQA.answer_main,
        related_qas: translated.related_qas || englishQA.related_qas,
        meta_title: (translated.meta_title || englishQA.meta_title).substring(0, 60),
        meta_description: (translated.meta_description || englishQA.meta_description).substring(0, 160),
        speakable_answer: translated.speakable_answer || englishQA.speakable_answer,
      };

    } catch (error) {
      console.error(`[Translation] Attempt ${attempt + 1} failed:`, error);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Translation failed after all retries');
}

// Intro styles to prevent repetitive patterns
const VARIED_INTRO_STYLES = [
  'direct_answer',      // Start with the answer immediately
  'context_first',      // Provide brief context then answer
  'statistic_lead',     // Lead with a relevant statistic
  'common_misconception', // Address misconception then correct
] as const;

// Language-specific minimum word counts
// Inflected/agglutinative languages express meaning in fewer words
const LANGUAGE_WORD_COUNTS: Record<string, { min: number; max: number }> = {
  'en': { min: 350, max: 800 },
  'de': { min: 300, max: 750 },
  'nl': { min: 300, max: 750 },
  'fr': { min: 320, max: 780 },
  'pl': { min: 220, max: 700 },  // Polish is highly inflected - reduced to prevent retry loops
  'sv': { min: 280, max: 750 },
  'da': { min: 280, max: 750 },
  'hu': { min: 220, max: 650 },  // Hungarian is agglutinative
  'fi': { min: 200, max: 600 },  // Finnish is highly agglutinative
  'no': { min: 280, max: 750 },
};

/**
 * Validate Q&A content meets AI-citation specifications
 * - Word count: Language-specific thresholds (inflected languages need fewer words)
 * - No CTAs or marketing language
 * - No links
 */
function validateQAContent(qaData: any, language: string = 'en'): { valid: boolean; reason?: string; wordCount?: number } {
  if (!qaData.answer_main || !qaData.question_main) {
    return { valid: false, reason: 'missing_required_fields' };
  }

  const wordCount = qaData.answer_main.split(/\s+/).filter((w: string) => w.length > 0).length;
  const thresholds = LANGUAGE_WORD_COUNTS[language] || LANGUAGE_WORD_COUNTS['en'];
  
  if (wordCount < thresholds.min) {
    console.warn(`[Validation] Q&A too short: ${wordCount} words (min ${thresholds.min} for ${language})`);
    return { valid: false, reason: 'too_short', wordCount };
  }
  
  if (wordCount > thresholds.max) {
    console.warn(`[Validation] Q&A too long: ${wordCount} words (max ${thresholds.max} for ${language})`);
    return { valid: false, reason: 'too_long', wordCount };
  }
  
  const lowerContent = qaData.answer_main.toLowerCase();
  
  // Check for prohibited CTA content
  const ctaPatterns = ['contact us', 'get in touch', 'call us today', 'reach out to', 'book a consultation'];
  for (const pattern of ctaPatterns) {
    if (lowerContent.includes(pattern)) {
      console.warn(`[Validation] Q&A contains CTA: "${pattern}"`);
      return { valid: false, reason: 'contains_cta' };
    }
  }
  
  // Check for markdown links - should be 0
  const linkMatches = qaData.answer_main.match(/\[.*?\]\(.*?\)/g) || [];
  if (linkMatches.length > 0) {
    console.warn(`[Validation] Q&A contains ${linkMatches.length} links`);
    return { valid: false, reason: 'contains_links' };
  }
  
  return { valid: true, wordCount };
}

/**
 * Validate Q&A was generated in the correct language
 * Detects if content was accidentally generated in English instead of target language
 */
function validateQALanguage(qaData: any, expectedLanguage: string): boolean {
  // English is default, always valid
  if (expectedLanguage === 'en') return true;
  
  const content = `${qaData.question_main} ${qaData.answer_main}`.toLowerCase();
  
  // Common English patterns that shouldn't dominate in non-English content
  const englishPatterns = [' the ', ' is ', ' are ', ' and ', ' for ', ' to ', ' of ', ' in ', ' that ', ' with '];
  const englishMatches = englishPatterns.filter(p => content.includes(p)).length;
  
  // Language-specific patterns that SHOULD appear
  const langPatterns: Record<string, string[]> = {
    'de': [' der ', ' die ', ' das ', ' und ', ' ist ', ' sind ', ' für ', ' mit ', ' von ', ' auf '],
    'nl': [' de ', ' het ', ' een ', ' en ', ' is ', ' zijn ', ' voor ', ' van ', ' met ', ' op '],
    'fr': [' le ', ' la ', ' les ', ' et ', ' est ', ' sont ', ' pour ', ' de ', ' avec ', ' dans '],
    'pl': [' jest ', ' są ', ' i ', ' dla ', ' że ', ' w ', ' z ', ' na ', ' do ', ' nie '],
    'sv': [' är ', ' och ', ' för ', ' att ', ' en ', ' ett ', ' med ', ' på ', ' som ', ' det '],
    'da': [' er ', ' og ', ' for ', ' at ', ' en ', ' et ', ' med ', ' på ', ' som ', ' det '],
    'hu': [' van ', ' és ', ' a ', ' az ', ' egy ', ' hogy ', ' nem ', ' meg ', ' el ', ' ki '],
    'fi': [' on ', ' ja ', ' että ', ' ei ', ' se ', ' tämä ', ' ovat ', ' tai ', ' kun ', ' voi '],
    'no': [' er ', ' og ', ' for ', ' at ', ' en ', ' et ', ' med ', ' på ', ' som ', ' det ']
  };
  
  const targetPatterns = langPatterns[expectedLanguage] || [];
  const targetMatches = targetPatterns.filter(p => content.includes(p)).length;
  
  // Log detection results
  console.log(`[Language] Checking ${expectedLanguage}: English patterns=${englishMatches}/10, ${expectedLanguage} patterns=${targetMatches}/${targetPatterns.length}`);
  
  // If we have many English matches AND few target language matches, content is probably in English
  if (englishMatches >= 6 && targetMatches < 3) {
    console.warn(`[Language] Content appears to be in English, not ${expectedLanguage}`);
    return false;
  }
  
  // If we have very few target patterns, also suspicious
  if (targetPatterns.length > 0 && targetMatches < 2) {
    console.warn(`[Language] Very few ${expectedLanguage} patterns detected (${targetMatches})`);
    return false;
  }
  
  return true;
}

/**
 * Generate AI-optimized Q&A prompt following the definitive content specification
 * Includes STRONG language enforcement for non-English content
 */
function generateAIOptimizedPrompt(
  article: any, 
  qaType: string, 
  language: string, 
  introStyle: string
): string {
  const languageName = LANGUAGE_NAMES[language] || language;
  const isNonEnglish = language !== 'en';
  
  const styleInstructions: Record<string, string> = {
    'direct_answer': 'Start with the direct answer immediately. No preamble.',
    'context_first': 'Begin with 1-2 sentences of context, then provide the answer.',
    'statistic_lead': 'If relevant, lead with a statistic or fact, then answer.',
    'common_misconception': 'Address a common misconception first, then provide the correct answer.',
  };

  const qaTypeInstructions: Record<string, string> = {
    'core': 'CORE question - fundamental information. Use "What is...", "How does..." format.',
    'decision': 'DECISION question - helps users choose. Use "Should I...", "Best way to...", "Which is better..." format.',
    'practical': 'PRACTICAL question - actionable guidance. Use "When should I...", "How do I...", "What steps..." format.',
    'problem': 'PROBLEM question - addresses challenges. Use "What mistakes...", "What risks...", "How to avoid..." format.',
  };

  // Strong language enforcement header for non-English
  const languageEnforcement = isNonEnglish ? `
⚠️ CRITICAL LANGUAGE REQUIREMENT - READ CAREFULLY ⚠️
You MUST write ALL content in ${languageName.toUpperCase()} language.
- The question_main MUST be written in ${languageName}
- The answer_main MUST be written ENTIRELY in ${languageName}
- ALL H3 headings MUST be in ${languageName}
- The meta_title, meta_description, and speakable_answer MUST be in ${languageName}

DO NOT write in English. DO NOT translate from English. Write NATIVELY in ${languageName}.
If you output ANY English text in question_main or answer_main, this response will be REJECTED.

Example question formats in ${languageName}:
${language === 'de' ? '- "Was sind die Risiken beim Immobilienkauf in Spanien?"\n- "Wie hoch sind die Nebenkosten beim Hauskauf?"' : ''}
${language === 'nl' ? '- "Wat zijn de risicos bij het kopen van vastgoed in Spanje?"\n- "Hoeveel kosten de bijkomende kosten bij aankoop?"' : ''}
${language === 'fr' ? '- "Quels sont les risques liés à lachat immobilier en Espagne?"\n- "Quels sont les frais annexes lors de lachat?"' : ''}
${language === 'pl' ? '- "Jakie są ryzyka przy zakupie nieruchomości w Hiszpanii?"\n- "Ile wynoszą dodatkowe koszty zakupu?"' : ''}
${language === 'sv' ? '- "Vilka risker finns vid fastighetsköp i Spanien?"\n- "Hur höga är de extra kostnaderna vid köp?"' : ''}
${language === 'da' ? '- "Hvad er risiciene ved ejendomskøb i Spanien?"\n- "Hvor høje er de ekstra omkostninger ved køb?"' : ''}
${language === 'hu' ? '- "Milyen kockázatai vannak a spanyolországi ingatlanvásárlásnak?"\n- "Mennyibe kerülnek a járulékos költségek?"' : ''}
${language === 'fi' ? '- "Mitä riskejä kiinteistön ostamiseen Espanjassa liittyy?"\n- "Paljonko ovat lisäkulut ostettaessa?"' : ''}
${language === 'no' ? '- "Hva er risikoene ved eiendomskjøp i Spania?"\n- "Hvor høye er tilleggskostnadene ved kjøp?"' : ''}

` : '';

  return `${languageEnforcement}You are generating a Q&A page optimized for AI citation by ChatGPT, Perplexity, Claude, and other AI systems.

TARGET LANGUAGE: ${languageName.toUpperCase()} (ISO code: ${language})
${isNonEnglish ? `⚠️ REMINDER: Write ALL content natively in ${languageName}. NO ENGLISH TEXT ALLOWED!` : ''}

Q&A TYPE: ${qaType.toUpperCase()}
${qaTypeInstructions[qaType] || qaTypeInstructions['core']}

INTRO STYLE: ${styleInstructions[introStyle] || styleInstructions['direct_answer']}

=== STRICT REQUIREMENTS ===

1. WORD COUNT (CRITICAL):
   Total: 450-700 words
   - Short Answer: 80-120 words (direct, no subsections)
   - In-Depth Explanation: 300-500 words (3-5 H3 sections)
   - Practical Nuance: 40-70 words (closing paragraph)

2. EXACT STRUCTURE:
   The answer_main must follow this EXACT format:
   
   [Short Answer - 80-120 words, NO heading]
   Direct, complete answer that stands alone. 1-2 short paragraphs. Calm, factual, neutral tone.
   
   ### [Descriptive H3 Heading 1]
   [80-150 words explaining this aspect]
   
   ### [Descriptive H3 Heading 2]
   [80-150 words explaining this aspect]
   
   ### [Descriptive H3 Heading 3]
   [80-150 words explaining this aspect]
   
   [Practical Nuance - 40-70 words, NO heading]
   One closing paragraph adding real-world nuance or addressing common misunderstandings.

3. TONE (NON-NEGOTIABLE):
   ✅ Neutral, advisory, factual
   ✅ Third-person perspective only
   ✅ Clear, descriptive H3 headings
   
   ❌ NO "we", "our", "I" language
   ❌ NO marketing language or promises
   ❌ NO superlatives (amazing, perfect, best, incredible)
   ❌ NO CTAs (contact us, get in touch, call today)

4. PROHIBITED CONTENT:
   ❌ NO internal links
   ❌ NO external links
   ❌ NO bullet points in Short Answer
   ❌ NO references to other Q&As or articles
   ❌ NO social proof or testimonials

5. H3 SECTION THEMES (choose 3-5 relevant ones):
   - Legal aspects / regulations
   - Financial considerations / costs
   - Practical timeline / process
   - Common risks / pitfalls
   - How buyers mitigate issues
   - Regional variations
   - Professional requirements
   - Documentation needed
   - Market considerations

=== SOURCE CONTEXT ===
Article Title: ${article.headline}
Article Summary: ${article.meta_description || 'Real estate in Costa del Sol, Spain'}
Cluster Theme: ${article.cluster_theme || 'Spanish property'}
Funnel Stage: ${article.funnel_stage || 'TOFU'}
Language: ${language}

ARTICLE CONTENT:
${(article.detailed_content || '').substring(0, 4000)}

=== OUTPUT FORMAT ===
Return ONLY valid JSON:
{
  "qa_type": "${qaType}",
  "question_main": "Question in ${languageName} ending with ?",
  "answer_main": "Complete markdown answer following the exact structure above",
  "title": "SEO page title (50-60 chars)",
  "slug": "url-friendly-slug",
  "meta_title": "Meta title ≤60 chars",
  "meta_description": "Meta description ≤160 chars",
  "speakable_answer": "Citation-ready voice answer (50-80 words)"
}

CRITICAL: Generate unique, valuable content that AI systems will cite as authoritative. This is a KNOWLEDGE OBJECT, not a sales page.`;
}

/**
 * Generate English Q&A pages for an article - AI-OPTIMIZED VERSION
 * Now generates content optimized for AI citation (450-700 words, structured, no marketing)
 */
async function generateEnglishQAPages(
  article: any,
  lovableApiKey: string,
  specificTypes?: string[]
): Promise<any[]> {
  console.log(`[Generate] Creating AI-optimized Q&A pages for: ${article.headline}`);

  const typesToGenerate = specificTypes || ALL_QA_TYPES;
  const qaPagesData: any[] = [];
  
  let styleIndex = 0;
  
  for (const qaType of typesToGenerate) {
    const introStyle = VARIED_INTRO_STYLES[styleIndex % VARIED_INTRO_STYLES.length];
    styleIndex++;
    
    console.log(`[Generate] Generating ${qaType} Q&A with ${introStyle} style`);
    
    const prompt = generateAIOptimizedPrompt(article, qaType, article.language || 'en', introStyle);
    
    const MAX_RETRIES = 1; // Reduced to prevent timeout (2 total attempts)
    let qaData = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { 
                role: 'system', 
                content: `You are an expert knowledge content generator creating AI-citable Q&A pages. ${article.language !== 'en' ? `CRITICAL: Generate ALL content in ${LANGUAGE_NAMES[article.language] || article.language}. Do NOT write in English.` : ''} Return only valid JSON. Never include marketing language, CTAs, or links.`
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 2500,
            temperature: 0.7,
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        let content = aiData.choices?.[0]?.message?.content || '';
        
        // Clean up response
        content = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/^\s+|\s+$/g, '')
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}')
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .replace(/[\x00-\x1F\x7F]/g, '');

        // Parse JSON
        try {
          qaData = JSON.parse(content);
        } catch {
          const start = content.indexOf('{');
          const end = content.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            qaData = JSON.parse(content.slice(start, end + 1));
          } else {
            throw new Error('Failed to parse AI response as JSON');
          }
        }
        
        // Validate content with language-aware word count thresholds
        const articleLanguage = article.language || 'en';
        const validation = validateQAContent(qaData, articleLanguage);
        if (!validation.valid) {
          console.warn(`[Generate] Validation failed for ${qaType} (attempt ${attempt + 1}): ${validation.reason}`);
          if (attempt < MAX_RETRIES) {
            qaData = null;
            continue;
          }
          // On final attempt, use anyway but log warning
          console.warn(`[Generate] Using ${qaType} despite validation failure after ${MAX_RETRIES + 1} attempts`);
        } else {
          console.log(`[Generate] Valid ${qaType} Q&A: ${validation.wordCount} words`);
        }
        
        // Language validation for non-English content
        if (articleLanguage !== 'en' && !validateQALanguage(qaData, articleLanguage)) {
          console.warn(`[Generate] Language validation failed for ${qaType} in ${articleLanguage} (attempt ${attempt + 1})`);
          if (attempt < MAX_RETRIES) {
            qaData = null;
            continue; // Retry with hopefully correct language
          }
          console.error(`[Generate] Failed to generate ${qaType} in ${articleLanguage} after ${MAX_RETRIES + 1} attempts - content may be in wrong language`);
        }
        
        break; // Success, exit retry loop
        
      } catch (error) {
        console.error(`[Generate] Attempt ${attempt + 1} failed for ${qaType}:`, error);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    if (qaData) {
      // Ensure qa_type is set correctly
      qaData.qa_type = qaType;
      qaData.language = article.language || 'en';
      qaData.source_article_id = article.id;
      qaData.source_article_slug = article.slug;
      
      // Remove any links that might have slipped through
      if (qaData.answer_main) {
        qaData.answer_main = qaData.answer_main.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      }
      
      qaPagesData.push(qaData);
    } else {
      console.error(`[Generate] Failed to generate ${qaType} Q&A after all retries`);
    }
  }
  
  if (qaPagesData.length === 0) {
    throw new Error('Failed to generate any Q&A pages');
  }

  console.log(`[Generate] Successfully generated ${qaPagesData.length}/${typesToGenerate.length} Q&A pages`);
  return qaPagesData;
}

/**
 * Background processing for completeMissing mode
 * Processes all articles and updates job progress in database
 * Supports resuming from a specific article/language if provided
 */
async function processAllMissingQAs(
  supabase: any,
  jobId: string,
  articleIds: string[],
  targetLanguages: string[],
  openaiApiKey: string,
  clusterId?: string,
  resumeFromArticleIndex: number = 0,
  resumeFromLanguage?: string
) {
  console.log(`[Background] Starting background processing for job ${jobId}, ${articleIds.length} articles, resumeFrom: article ${resumeFromArticleIndex}, lang ${resumeFromLanguage || 'start'}`);
  
  // Sync counter with actual pages at start
  const { data: existingPages } = await supabase
    .from('qa_pages')
    .select('id')
    .in('source_article_id', articleIds);
  
  let totalGenerated = existingPages?.length || 0;
  let processedArticles = resumeFromArticleIndex;
  
  // Update initial progress with synced counter
  await supabase
    .from('qa_generation_jobs')
    .update({
      generated_faq_pages: totalGenerated,
      processed_articles: processedArticles,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  
  try {
    // Skip articles we've already processed when resuming
    const articlesToProcess = articleIds.slice(resumeFromArticleIndex);
    
    for (let articleIndex = 0; articleIndex < articlesToProcess.length; articleIndex++) {
      const articleId = articlesToProcess[articleIndex];
      const actualArticleIndex = resumeFromArticleIndex + articleIndex;
      
      // Get article data
      const { data: article, error: articleError } = await supabase
        .from('blog_articles')
        .select('id, headline, detailed_content, meta_description, language, featured_image_url, featured_image_alt, featured_image_caption, slug, author_id, cluster_id, category, funnel_stage')
        .eq('id', articleId)
        .in('status', ['draft', 'published'])
        .single();
      
      if (articleError || !article) {
        console.log(`[Background] Article ${articleId} not found, skipping`);
        processedArticles++;
        continue;
      }

      // CRITICAL SAFEGUARD: Only generate Q&As for the article's own language
      // Q&As should be created in the same language as the source article
      const articleLanguage = article.language;
      if (!targetLanguages.includes(articleLanguage)) {
        console.log(`[Background] Article ${articleId} language (${articleLanguage}) not in target languages, skipping`);
        processedArticles++;
        continue;
      }
      
      // Filter target languages to ONLY the article's language to prevent mismatches
      const validLanguagesForArticle = [articleLanguage];
      console.log(`[Background] Article ${articleId} will only generate Q&As for its own language: ${articleLanguage}`);

      // Update job with current article and store resume point
      await supabase
        .from('qa_generation_jobs')
        .update({
          current_article_headline: article.headline,
          processed_articles: processedArticles,
          resume_from_article_index: actualArticleIndex,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Get existing Q&A pages for this article
      const { data: existingPages } = await supabase
        .from('qa_pages')
        .select('language, qa_type, hreflang_group_id')
        .eq('source_article_id', articleId);

      const existingCombos = new Set((existingPages || []).map((p: any) => `${p.language}_${p.qa_type}`));
      
      // Get or create hreflang groups
      let hreflangGroupCore = existingPages?.find((p: any) => p.qa_type === 'core')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupDecision = existingPages?.find((p: any) => p.qa_type === 'decision')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupPractical = existingPages?.find((p: any) => p.qa_type === 'practical')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupProblem = existingPages?.find((p: any) => p.qa_type === 'problem')?.hreflang_group_id || crypto.randomUUID();
      
      const getHreflangGroup = (qaType: string) => {
        switch (qaType) {
          case 'core': return hreflangGroupCore;
          case 'decision': return hreflangGroupDecision;
          case 'practical': return hreflangGroupPractical;
          case 'problem': return hreflangGroupProblem;
          default: return crypto.randomUUID();
        }
      };
      
      // Find missing combinations - ONLY for the article's own language
      const missingCombos: { language: string; qaType: string }[] = [];
      for (const lang of validLanguagesForArticle) {
        for (const qaType of ALL_QA_TYPES) {
          if (!existingCombos.has(`${lang}_${qaType}`)) {
            missingCombos.push({ language: lang, qaType });
          }
        }
      }

      if (missingCombos.length === 0) {
        console.log(`[Background] All QAs exist for article ${articleId}`);
        processedArticles++;
        continue;
      }

      console.log(`[Background] ${missingCombos.length} missing QAs for article: ${article.headline}`);
      
      // Get or create tracking
      const { data: tracking } = await supabase
        .from('qa_article_tracking')
        .select('id, languages_generated')
        .eq('source_article_id', articleId)
        .single();

      let trackingId = tracking?.id;
      let languagesGenerated = tracking?.languages_generated || [];

      if (!trackingId) {
        const { data: newTracking } = await supabase
          .from('qa_article_tracking')
          .insert({
            source_article_id: article.id,
            source_article_headline: article.headline,
            source_article_slug: article.slug,
            hreflang_group_core: hreflangGroupCore,
            hreflang_group_decision: hreflangGroupDecision,
            languages_generated: [],
            total_qa_pages: 0,
            status: 'in_progress',
          })
          .select()
          .single();
        trackingId = newTracking?.id;
      }

      // Get English QA pages (generate if missing)
      let englishQAPages: any[] = [];
      const missingEnglishTypes = ALL_QA_TYPES.filter(t => !existingCombos.has(`en_${t}`));
      
      if (missingEnglishTypes.length > 0) {
        const newEnglishPages = await generateEnglishQAPages(article, openaiApiKey, missingEnglishTypes);
        const { data: existingEnglish } = await supabase
          .from('qa_pages')
          .select('*')
          .eq('source_article_id', articleId)
          .eq('language', 'en');
        englishQAPages = [...(existingEnglish || []), ...newEnglishPages];
      } else {
        const { data: existingEnglish } = await supabase
          .from('qa_pages')
          .select('*')
          .eq('source_article_id', articleId)
          .eq('language', 'en');
        englishQAPages = existingEnglish || [];
      }

      // Group missing by language
      const missingByLang: Record<string, string[]> = {};
      for (const combo of missingCombos) {
        if (!missingByLang[combo.language]) missingByLang[combo.language] = [];
        missingByLang[combo.language].push(combo.qaType);
      }

      // Generate/translate missing pages
      for (const [lang, qaTypes] of Object.entries(missingByLang)) {
        // Update current language in job
        await supabase
          .from('qa_generation_jobs')
          .update({
            current_language: lang,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        if (lang === 'en') {
          // Save English pages directly
          for (const englishQA of englishQAPages) {
            if (!qaTypes.includes(englishQA.qa_type)) continue;
            
            const { error: insertError } = await supabase
              .from('qa_pages')
              .insert({
                source_article_id: article.id,
                cluster_id: article.cluster_id || clusterId || null,
                language: 'en',
                source_language: 'en',
                hreflang_group_id: getHreflangGroup(englishQA.qa_type),
                tracking_id: trackingId,
                qa_type: englishQA.qa_type,
                title: englishQA.title,
                slug: englishQA.slug,
                canonical_url: `https://www.delsolprimehomes.com/en/qa/${englishQA.slug}`,
                question_main: englishQA.question_main,
                answer_main: englishQA.answer_main,
                related_qas: englishQA.related_qas || [],
                speakable_answer: englishQA.speakable_answer,
                meta_title: englishQA.meta_title?.substring(0, 60),
                meta_description: englishQA.meta_description?.substring(0, 160),
                featured_image_url: article.featured_image_url,
                featured_image_alt: article.featured_image_alt,
                source_article_slug: article.slug,
                author_id: article.author_id,
                category: article.category,
                funnel_stage: article.funnel_stage, // Hans' funnel-based linking
                status: 'draft',
              });

            if (insertError) {
              // Skip duplicate key errors (23505) - Q&A already exists
              if (insertError.code === '23505') {
                console.log(`[Background] Skipping duplicate English ${englishQA.qa_type} Q&A`);
              } else {
                console.error(`[Background] Insert failed for English ${englishQA.qa_type}:`, insertError);
              }
            } else {
              totalGenerated++;
              // Update progress
              await supabase
                .from('qa_generation_jobs')
                .update({
                  generated_faq_pages: totalGenerated,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', jobId);
            }
          }
        } else {
          // Translate from English
          for (const englishQA of englishQAPages) {
            if (!qaTypes.includes(englishQA.qa_type)) continue;
            
            try {
              const translatedQA = await translateQAPage(englishQA, lang, openaiApiKey);
              
              const { error: insertError } = await supabase
                .from('qa_pages')
                .insert({
                  source_article_id: article.id,
                  cluster_id: article.cluster_id || clusterId || null,
                  language: lang,
                  source_language: 'en',
                  hreflang_group_id: getHreflangGroup(translatedQA.qa_type),
                  tracking_id: trackingId,
                  qa_type: translatedQA.qa_type,
                  title: translatedQA.title,
                  slug: translatedQA.slug,
                  canonical_url: `https://www.delsolprimehomes.com/${lang}/qa/${translatedQA.slug}`,
                  question_main: translatedQA.question_main,
                  answer_main: translatedQA.answer_main,
                  related_qas: translatedQA.related_qas || [],
                  speakable_answer: translatedQA.speakable_answer,
                  meta_title: translatedQA.meta_title?.substring(0, 60),
                  meta_description: translatedQA.meta_description?.substring(0, 160),
                  featured_image_url: article.featured_image_url,
                  featured_image_alt: article.featured_image_alt,
                  source_article_slug: article.slug,
                  author_id: article.author_id,
                  category: article.category,
                  funnel_stage: article.funnel_stage, // Hans' funnel-based linking
                  status: 'draft',
                });

              if (insertError) {
                // Skip duplicate key errors (23505) - Q&A already exists
                if (insertError.code === '23505') {
                  console.log(`[Background] Skipping duplicate ${lang} ${englishQA.qa_type} Q&A`);
                } else {
                  console.error(`[Background] Insert failed for ${lang} ${englishQA.qa_type}:`, insertError);
                }
              } else {
                totalGenerated++;
                // Update progress
                await supabase
                  .from('qa_generation_jobs')
                  .update({
                    generated_faq_pages: totalGenerated,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', jobId);
              }
            } catch (error) {
              console.error(`[Background] Failed to translate to ${lang}:`, error);
            }
          }
        }

        if (!languagesGenerated.includes(lang)) {
          languagesGenerated.push(lang);
        }
      }

      // Update tracking
      if (trackingId) {
        await supabase
          .from('qa_article_tracking')
          .update({
            languages_generated: languagesGenerated,
            total_qa_pages: languagesGenerated.length * 4,
            status: 'completed',
          })
          .eq('id', trackingId);
      }

      // Update source blog article with all QA page IDs
      const { data: allQAPages } = await supabase
        .from('qa_pages')
        .select('id')
        .eq('source_article_id', articleId);
      
      if (allQAPages && allQAPages.length > 0) {
        await supabase
          .from('blog_articles')
          .update({ 
            generated_qa_page_ids: allQAPages.map((qa: { id: string }) => qa.id),
            updated_at: new Date().toISOString()
          })
          .eq('id', articleId);
      }

      processedArticles++;
      
      // Update processed count
      await supabase
        .from('qa_generation_jobs')
        .update({
          processed_articles: processedArticles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    // Mark job as completed
    await supabase
      .from('qa_generation_jobs')
      .update({
        status: 'completed',
        processed_articles: processedArticles,
        generated_faq_pages: totalGenerated,
        current_article_headline: null,
        current_language: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[Background] Job ${jobId} completed. Generated ${totalGenerated} QA pages.`);

  } catch (error) {
    console.error(`[Background] Job ${jobId} failed:`, error);
    
    await supabase
      .from('qa_generation_jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      articleIds, 
      mode = 'single', 
      languages = ['en'], 
      jobId: existingJobId, 
      resumeFromIndex = 0, 
      completeMissing = false,
      clusterId,
      backgroundMode = false,
      resumeJobId, // Resume a stalled job
      singleLanguageMode = false, // Process one language at a time to prevent timeouts
      targetLanguage, // Which language to process in singleLanguageMode
    } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // RESUME MODE: Resume a stalled job
    if (resumeJobId) {
      console.log(`[Resume] Resuming stalled job ${resumeJobId}`);
      
      // Get the stalled job
      const { data: stalledJob, error: stalledError } = await supabase
        .from('qa_generation_jobs')
        .select('*')
        .eq('id', resumeJobId)
        .single();
      
      if (stalledError || !stalledJob) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Job not found' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Sync counter with actual pages
      const { data: actualPages } = await supabase
        .from('qa_pages')
        .select('id')
        .in('source_article_id', stalledJob.article_ids || []);
      
      const actualCount = actualPages?.length || 0;
      
      // Update job to running status with synced counter
      await supabase
        .from('qa_generation_jobs')
        .update({
          status: 'running',
          generated_faq_pages: actualCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resumeJobId);
      
      // Start background processing from where it left off
      // @ts-ignore - EdgeRuntime.waitUntil is a Deno Deploy feature
      EdgeRuntime.waitUntil(
        processAllMissingQAs(
          supabase, 
          resumeJobId, 
          stalledJob.article_ids || [], 
          stalledJob.languages || ALL_SUPPORTED_LANGUAGES, 
          openaiApiKey, 
          stalledJob.cluster_id,
          stalledJob.resume_from_article_index || 0,
          stalledJob.resume_from_language
        )
      );
      
      return new Response(JSON.stringify({
        success: true,
        jobId: resumeJobId,
        status: 'running',
        message: `Resumed job from article ${stalledJob.resume_from_article_index || 0}`,
        actualPages: actualCount,
        totalExpected: stalledJob.total_faq_pages,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SINGLE LANGUAGE MODE: Process QAs for one language only (prevents timeouts)
    // Accept offset for pagination between calls
    const offset = body.offset ?? 0;
    
    if (singleLanguageMode && targetLanguage) {
      console.log(`[SingleLang] Processing QAs for language: ${targetLanguage}, offset: ${offset}`);
      
      // Start timeout guard - must return before 55 seconds to avoid connection close
      const startTime = Date.now();
      const TIMEOUT_MS = 55000; // 55 seconds - leave 5s buffer before edge function timeout
      const MAX_ARTICLES_PER_BATCH = 3; // Process max 3 articles per call to stay safe
      
      const checkTimeout = () => {
        const elapsed = Date.now() - startTime;
        return elapsed > TIMEOUT_MS;
      };
      
      if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'articleIds is required for single language mode' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch all articles for this cluster in the target language WITH consistent ordering
      const { data: langArticles, error: langError } = await supabase
        .from('blog_articles')
        .select('id, headline, detailed_content, meta_description, language, featured_image_url, featured_image_alt, featured_image_caption, slug, author_id, cluster_id, category, funnel_stage')
        .in('id', articleIds)
        .eq('language', targetLanguage)
        .in('status', ['draft', 'published'])
        .order('id'); // Consistent ordering for pagination!
      
      if (langError) {
        console.error('[SingleLang] Error fetching articles:', langError);
        return new Response(JSON.stringify({ success: false, error: langError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!langArticles || langArticles.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: `No ${targetLanguage} articles found`,
          generatedPages: 0,
          skippedPages: 0,
          language: targetLanguage,
          complete: true,
          nextOffset: 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Apply offset to skip already-processed articles
      const articlesToProcess = langArticles.slice(offset);
      console.log(`[SingleLang] Found ${langArticles.length} total articles, processing from offset ${offset} (${articlesToProcess.length} remaining), max ${MAX_ARTICLES_PER_BATCH} per batch`);

      let totalGenerated = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      let articlesProcessed = 0;
      let timedOut = false;
      let reachedBatchLimit = false;
      const results: any[] = [];

      for (const article of articlesToProcess) {
        // Check timeout before processing each article
        if (checkTimeout()) {
          console.log(`[SingleLang] Timeout approaching after ${articlesProcessed} articles, stopping early`);
          timedOut = true;
          break;
        }
        
        // Limit batch size to prevent timeouts (separate from timeout flag)
        if (articlesProcessed >= MAX_ARTICLES_PER_BATCH) {
          console.log(`[SingleLang] Reached batch limit of ${MAX_ARTICLES_PER_BATCH} articles, stopping for continuation`);
          reachedBatchLimit = true;
          break;
        }
        
        try {
          // Check which QA types already exist for this article
          const { data: existingQAs } = await supabase
            .from('qa_pages')
            .select('qa_type, hreflang_group_id')
            .eq('source_article_id', article.id)
            .eq('language', targetLanguage);

          const existingTypes = new Set((existingQAs || []).map((qa: any) => qa.qa_type));
          const missingTypes = ALL_QA_TYPES.filter(t => !existingTypes.has(t));

          if (missingTypes.length === 0) {
            console.log(`[SingleLang] Article ${article.id} already has all QA types, skipping`);
            totalSkipped += 4;
            articlesProcessed++;
            continue;
          }

          // Get or create hreflang group IDs
          const getHreflangGroup = (qaType: string) => {
            const existing = existingQAs?.find((q: any) => q.qa_type === qaType);
            return existing?.hreflang_group_id || crypto.randomUUID();
          };

          // Generate QAs for missing types
          console.log(`[SingleLang] Generating ${missingTypes.length} QA types for article ${article.headline}`);
          const qaPages = await generateEnglishQAPages(article, openaiApiKey, missingTypes);

          let articleSuccessCount = 0;
          let articleFailedCount = 0;
          const insertErrors: string[] = [];

          // Insert generated QAs with proper error tracking
          for (const qa of qaPages) {
            const qaType = qa.qa_type || 'core';
            const hreflangGroupId = getHreflangGroup(qaType);
            
            // Generate unique slug
            const baseSlug = qa.slug || `${article.slug}-${qaType}`;
            const uniqueSlug = `${baseSlug}-${targetLanguage}-${Date.now().toString(36)}`;

            try {
              const { error: insertError } = await supabase
                .from('qa_pages')
                .insert({
                  source_article_id: article.id,
                  cluster_id: article.cluster_id || clusterId,
                  language: targetLanguage,
                  qa_type: qaType,
                  hreflang_group_id: hreflangGroupId,
                  title: qa.title,
                  slug: uniqueSlug,
                  question_main: qa.question_main,
                  answer_main: qa.answer_main,
                  related_qas: qa.related_qas || [],
                  meta_title: qa.meta_title?.substring(0, 60),
                  meta_description: qa.meta_description?.substring(0, 160),
                  speakable_answer: qa.speakable_answer,
                  author_id: article.author_id,
                  featured_image_url: article.featured_image_url,
                  featured_image_alt: article.featured_image_alt,
                  featured_image_caption: article.featured_image_caption,
                  funnel_stage: article.funnel_stage, // Hans' funnel-based linking
                  status: 'published',
                });

              if (insertError) {
                console.error(`[SingleLang] Failed to insert QA (${qaType}):`, insertError);
                articleFailedCount++;
                totalFailed++;
                insertErrors.push(`${qaType}: ${insertError.message}`);
              } else {
                articleSuccessCount++;
                totalGenerated++;
              }
            } catch (err) {
              console.error(`[SingleLang] Exception inserting QA (${qaType}):`, err);
              articleFailedCount++;
              totalFailed++;
              insertErrors.push(`${qaType}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }

          articlesProcessed++;
          
          results.push({
            articleId: article.id,
            headline: article.headline,
            generated: articleSuccessCount,
            failed: articleFailedCount,
            errors: insertErrors.length > 0 ? insertErrors : undefined,
          });

        } catch (err) {
          console.error(`[SingleLang] Error processing article ${article.id}:`, err);
          articlesProcessed++;
          // Estimate 4 failed QAs when we can't determine exact missing types
          totalFailed += ALL_QA_TYPES.length;
          results.push({
            articleId: article.id,
            headline: article.headline,
            error: err instanceof Error ? err.message : 'Unknown error',
            failed: ALL_QA_TYPES.length,
          });
        }
      }

      const totalArticlesInLanguage = langArticles.length;
      const nextOffset = offset + articlesProcessed;
      const remainingArticles = totalArticlesInLanguage - nextOffset;
      const isComplete = remainingArticles <= 0 && !timedOut && !reachedBatchLimit;
      
      console.log(`[SingleLang] Completed: ${totalGenerated} generated, ${totalFailed} failed, ${totalSkipped} skipped, ${articlesProcessed} articles in batch, offset: ${offset} -> ${nextOffset}, remaining: ${remainingArticles}, timedOut: ${timedOut}, batchLimit: ${reachedBatchLimit}`);

      // Return with accurate success status and continuation info
      const hasFailures = totalFailed > 0;
      return new Response(JSON.stringify({
        success: !hasFailures || totalGenerated > 0, // Partial success if some worked
        language: targetLanguage,
        totalArticlesInLanguage,
        articlesProcessed,
        nextOffset, // Tell client where to continue from
        remainingArticles,
        generatedPages: totalGenerated,
        failedPages: totalFailed,
        skippedPages: totalSkipped,
        complete: isComplete,
        timedOut,
        reachedBatchLimit,
        needsContinuation: !isComplete && (timedOut || reachedBatchLimit || remainingArticles > 0),
        results,
        warnings: hasFailures ? [`${totalFailed} QA pages failed to insert - check logs for details`] : undefined,
        message: isComplete 
          ? `Completed all ${totalArticlesInLanguage} articles for ${targetLanguage}`
          : `Processed ${articlesProcessed} articles (${nextOffset}/${totalArticlesInLanguage}). ${remainingArticles} remaining.`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'articleIds is required and must be a non-empty array' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine target languages
    const isAllLanguages = languages.includes('all') || languages[0] === 'all';
    const targetLanguages = isAllLanguages ? ALL_SUPPORTED_LANGUAGES : languages;
    const effectiveLanguageCount = targetLanguages.length;

    // BACKGROUND MODE: Return immediately and process in background
    if (completeMissing && backgroundMode) {
      console.log(`[Main] Starting BACKGROUND processing for ${articleIds.length} articles`);
      
      // Calculate expected total (articles × 4 QA types × languages)
      const maxPossible = articleIds.length * ALL_QA_TYPES.length * targetLanguages.length;
      
      // Extract user ID from authorization header if available
      const authHeader = req.headers.get('authorization');
      let userId = null;
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id || null;
      }
      
      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('qa_generation_jobs')
        .insert({
          user_id: userId,
          status: 'running',
          mode: 'background',
          languages: targetLanguages,
          article_ids: articleIds,
          cluster_id: clusterId || null,
          total_articles: articleIds.length,
          total_faq_pages: maxPossible,
          processed_articles: 0,
          generated_faq_pages: 0,
          current_article_headline: 'Starting...',
          current_language: null,
          results: [],
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (jobError) {
        console.error('[Main] Failed to create job:', jobError);
        throw jobError;
      }

      const jobId = job.id;
      console.log(`[Main] Created background job ${jobId}`);

      // Start background processing without awaiting
      // @ts-ignore - EdgeRuntime.waitUntil is a Deno Deploy feature
      EdgeRuntime.waitUntil(
        processAllMissingQAs(supabase, jobId, articleIds, targetLanguages, openaiApiKey, clusterId)
      );

      // Return immediately with job ID
      return new Response(JSON.stringify({
        success: true,
        jobId,
        status: 'running',
        message: `Background processing started for ${articleIds.length} articles`,
        totalArticles: articleIds.length,
        totalExpected: maxPossible,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // COMPLETE MISSING MODE (synchronous, single article)
    if (completeMissing && articleIds.length === 1) {
      const articleId = articleIds[0];
      console.log(`[CompleteMissing] Finding missing pages for article ${articleId}`);
      
      const { data: article, error: articleError } = await supabase
        .from('blog_articles')
        .select('id, headline, detailed_content, meta_description, language, featured_image_url, featured_image_alt, featured_image_caption, slug, author_id, cluster_id, category, funnel_stage')
        .eq('id', articleId)
        .in('status', ['draft', 'published'])
        .single();
      
      if (articleError || !article) {
        return new Response(JSON.stringify({ success: false, error: 'Article not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: existingPages } = await supabase
        .from('qa_pages')
        .select('language, qa_type, hreflang_group_id')
        .eq('source_article_id', articleId);

      const existingCombos = new Set((existingPages || []).map((p: any) => `${p.language}_${p.qa_type}`));
      
      let hreflangGroupCore = existingPages?.find((p: any) => p.qa_type === 'core')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupDecision = existingPages?.find((p: any) => p.qa_type === 'decision')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupPractical = existingPages?.find((p: any) => p.qa_type === 'practical')?.hreflang_group_id || crypto.randomUUID();
      let hreflangGroupProblem = existingPages?.find((p: any) => p.qa_type === 'problem')?.hreflang_group_id || crypto.randomUUID();
      
      const getHreflangGroup = (qaType: string) => {
        switch (qaType) {
          case 'core': return hreflangGroupCore;
          case 'decision': return hreflangGroupDecision;
          case 'practical': return hreflangGroupPractical;
          case 'problem': return hreflangGroupProblem;
          default: return crypto.randomUUID();
        }
      };
      
      const missingCombos: { language: string; qaType: string }[] = [];
      for (const lang of targetLanguages) {
        for (const qaType of ALL_QA_TYPES) {
          if (!existingCombos.has(`${lang}_${qaType}`)) {
            missingCombos.push({ language: lang, qaType });
          }
        }
      }

      if (missingCombos.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'All Q&A pages already exist for this article',
          generatedPages: 0,
          missingCombos: [],
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log(`[CompleteMissing] Found ${missingCombos.length} missing combinations`);
      
      let englishQAPages: any[] = [];
      const missingEnglishTypes = ALL_QA_TYPES.filter(t => !existingCombos.has(`en_${t}`));
      
      if (missingEnglishTypes.length > 0) {
        const newEnglishPages = await generateEnglishQAPages(article, openaiApiKey, missingEnglishTypes);
        const { data: existingEnglish } = await supabase
          .from('qa_pages')
          .select('*')
          .eq('source_article_id', articleId)
          .eq('language', 'en');
        englishQAPages = [...(existingEnglish || []), ...newEnglishPages];
      } else {
        const { data: existingEnglish } = await supabase
          .from('qa_pages')
          .select('*')
          .eq('source_article_id', articleId)
          .eq('language', 'en');
        englishQAPages = existingEnglish || [];
      }

      let generatedPages = 0;
      const { data: tracking } = await supabase
        .from('qa_article_tracking')
        .select('id, languages_generated')
        .eq('source_article_id', articleId)
        .single();

      let trackingId = tracking?.id;
      let languagesGenerated = tracking?.languages_generated || [];

      if (!trackingId) {
        const { data: newTracking } = await supabase
          .from('qa_article_tracking')
          .insert({
            source_article_id: article.id,
            source_article_headline: article.headline,
            source_article_slug: article.slug,
            hreflang_group_core: hreflangGroupCore,
            hreflang_group_decision: hreflangGroupDecision,
            languages_generated: [],
            total_qa_pages: 0,
            status: 'in_progress',
          })
          .select()
          .single();
        trackingId = newTracking?.id;
      }

      const missingByLang: Record<string, string[]> = {};
      for (const combo of missingCombos) {
        if (!missingByLang[combo.language]) missingByLang[combo.language] = [];
        missingByLang[combo.language].push(combo.qaType);
      }

      for (const [lang, qaTypes] of Object.entries(missingByLang)) {
        if (lang === 'en') {
          for (const englishQA of englishQAPages) {
            if (!qaTypes.includes(englishQA.qa_type)) continue;
            
            const { error: insertError } = await supabase
              .from('qa_pages')
              .insert({
                source_article_id: article.id,
                cluster_id: article.cluster_id || null,
                language: 'en',
                source_language: 'en',
                hreflang_group_id: getHreflangGroup(englishQA.qa_type),
                tracking_id: trackingId,
                qa_type: englishQA.qa_type,
                title: englishQA.title,
                slug: englishQA.slug,
                canonical_url: `https://www.delsolprimehomes.com/en/qa/${englishQA.slug}`,
                question_main: englishQA.question_main,
                answer_main: englishQA.answer_main,
                related_qas: englishQA.related_qas || [],
                speakable_answer: englishQA.speakable_answer,
                meta_title: englishQA.meta_title?.substring(0, 60),
                meta_description: englishQA.meta_description?.substring(0, 160),
                featured_image_url: article.featured_image_url,
                featured_image_alt: article.featured_image_alt,
                source_article_slug: article.slug,
                author_id: article.author_id,
                category: article.category,
                funnel_stage: article.funnel_stage, // Hans' funnel-based linking
                status: 'draft',
              });

            if (!insertError) {
              generatedPages++;
            }
          }
        } else {
          for (const englishQA of englishQAPages) {
            if (!qaTypes.includes(englishQA.qa_type)) continue;
            
            try {
              const translatedQA = await translateQAPage(englishQA, lang, openaiApiKey);
              
              const { error: insertError } = await supabase
                .from('qa_pages')
                .insert({
                  source_article_id: article.id,
                  cluster_id: article.cluster_id || null,
                  language: lang,
                  source_language: 'en',
                  hreflang_group_id: getHreflangGroup(translatedQA.qa_type),
                  tracking_id: trackingId,
                  qa_type: translatedQA.qa_type,
                  title: translatedQA.title,
                  slug: translatedQA.slug,
                  canonical_url: `https://www.delsolprimehomes.com/${lang}/qa/${translatedQA.slug}`,
                  question_main: translatedQA.question_main,
                  answer_main: translatedQA.answer_main,
                  related_qas: translatedQA.related_qas || [],
                  speakable_answer: translatedQA.speakable_answer,
                  meta_title: translatedQA.meta_title?.substring(0, 60),
                  meta_description: translatedQA.meta_description?.substring(0, 160),
                  featured_image_url: article.featured_image_url,
                  featured_image_alt: article.featured_image_alt,
                  source_article_slug: article.slug,
                  author_id: article.author_id,
                  category: article.category,
                  funnel_stage: article.funnel_stage, // Hans' funnel-based linking
                  status: 'draft',
                });

              if (!insertError) {
                generatedPages++;
              }
            } catch (error) {
              console.error(`[CompleteMissing] Failed to translate to ${lang}:`, error);
            }
          }
        }

        if (!languagesGenerated.includes(lang)) {
          languagesGenerated.push(lang);
        }
      }

      if (trackingId) {
        await supabase
          .from('qa_article_tracking')
          .update({
            languages_generated: languagesGenerated,
            total_qa_pages: languagesGenerated.length * 4,
            status: 'completed',
          })
          .eq('id', trackingId);
      }

      if (generatedPages > 0) {
        const { data: allQAPages } = await supabase
          .from('qa_pages')
          .select('id')
          .eq('source_article_id', articleId);
        
        if (allQAPages && allQAPages.length > 0) {
          await supabase
            .from('blog_articles')
            .update({ 
              generated_qa_page_ids: allQAPages.map((qa: { id: string }) => qa.id),
              updated_at: new Date().toISOString()
            })
            .eq('id', articleId);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Generated ${generatedPages} missing Q&A pages using English-first translation`,
        generatedPages,
        missingCombos,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Quick validation: Check for non-English articles
    const { data: articlesToCheck, error: checkError } = await supabase
      .from('blog_articles')
      .select('id, headline, language')
      .in('id', articleIds);

    if (checkError) throw checkError;

    // Validate: Only English articles allowed
    const nonEnglishArticles = (articlesToCheck || []).filter((a: any) => a.language !== 'en');
    if (nonEnglishArticles.length > 0) {
      const nonEnglishHeadlines = nonEnglishArticles.map((a: any) => `${a.headline} (${a.language})`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Q&A generation requires English source articles only. Non-English articles detected.',
        nonEnglishArticles: nonEnglishHeadlines,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let jobId = existingJobId;
    let currentIndex = resumeFromIndex;

    if (!jobId) {
      // Extract user ID from authorization header if available
      const authHeader = req.headers.get('authorization');
      let userId = null;
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id || null;
      }
      
      const { data: job, error: jobError } = await supabase
        .from('qa_generation_jobs')
        .insert({
          user_id: userId,
          status: 'running',
          mode,
          languages,
          article_ids: articleIds,
          total_articles: articleIds.length,
          total_faq_pages: articleIds.length * 2 * effectiveLanguageCount,
          processed_articles: 0,
          generated_faq_pages: 0,
          results: [],
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (jobError) throw jobError;
      jobId = job.id;
      console.log(`[Main] Created new job ${jobId}`);
    } else {
      const { data: existingJob } = await supabase
        .from('qa_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (existingJob) {
        currentIndex = existingJob.processed_articles || 0;
        console.log(`[Main] Resuming job ${jobId} from article index ${currentIndex}`);
        
        await supabase
          .from('qa_generation_jobs')
          .update({ 
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
    }

    if (currentIndex >= articleIds.length) {
      await supabase
        .from('qa_generation_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({
        success: true,
        jobId,
        status: 'completed',
        message: 'All articles already processed',
        processedArticles: currentIndex,
        totalArticles: articleIds.length,
        continueProcessing: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process one article at a time (non-background mode)
    const articleIdToProcess = articleIds[currentIndex];
    
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, headline, detailed_content, meta_description, language, featured_image_url, featured_image_alt, featured_image_caption, slug, author_id, cluster_id, category, funnel_stage')
      .eq('id', articleIdToProcess)
      .in('status', ['draft', 'published']);

    if (articlesError) throw articlesError;
    
    const article = articles?.[0];
    if (!article) {
      currentIndex++;
      await supabase
        .from('qa_generation_jobs')
        .update({
          processed_articles: currentIndex,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({
        success: true,
        jobId,
        status: 'running',
        message: `Article ${articleIdToProcess} not found, skipped`,
        processedArticles: currentIndex,
        totalArticles: articleIds.length,
        continueProcessing: currentIndex < articleIds.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Legacy processOneArticle function for non-background mode - always English source, translate to target languages
    const result = await processOneArticleLegacy(supabase, article, targetLanguages, openaiApiKey, jobId);
    
    currentIndex++;
    const { data: jobData } = await supabase
      .from('qa_generation_jobs')
      .select('generated_faq_pages, results')
      .eq('id', jobId)
      .single();

    const newGeneratedPages = (jobData?.generated_faq_pages || 0) + result.generatedPages;
    const existingResults = jobData?.results || [];
    const newResults = [...existingResults, {
      articleId: article.id,
      headline: article.headline,
      success: result.success,
      generatedPages: result.generatedPages,
      error: result.error,
    }];

    const isComplete = currentIndex >= articleIds.length;

    await supabase
      .from('qa_generation_jobs')
      .update({
        processed_articles: currentIndex,
        generated_faq_pages: newGeneratedPages,
        results: newResults,
        status: isComplete ? 'completed' : 'running',
        completed_at: isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[Main] Article ${currentIndex}/${articleIds.length} processed. Pages: ${result.generatedPages}. Continue: ${!isComplete}`);

    return new Response(JSON.stringify({
      success: true,
      jobId,
      status: isComplete ? 'completed' : 'running',
      message: isComplete 
        ? `Completed! Generated ${newGeneratedPages} Q&A pages using English-first translation` 
        : `Processed article ${currentIndex}/${articleIds.length}`,
      processedArticles: currentIndex,
      totalArticles: articleIds.length,
      generatedPages: newGeneratedPages,
      continueProcessing: !isComplete,
      lastArticle: {
        id: article.id,
        headline: article.headline,
        pagesGenerated: result.generatedPages,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Q&A generation:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Legacy process one article function (kept for backwards compatibility with non-background mode)
 */
async function processOneArticleLegacy(
  supabase: any,
  article: any,
  targetLanguages: string[],
  lovableApiKey: string,
  jobId: string
): Promise<{ success: boolean; generatedPages: number; error?: string }> {
  console.log(`[Process] Processing article: ${article.headline}`);
  let generatedPages = 0;

  try {
    const { data: existingTracking } = await supabase
      .from('qa_article_tracking')
      .select('*')
      .eq('source_article_id', article.id)
      .single();

    let hreflangGroupCore: string;
    let hreflangGroupDecision: string;
    let existingLanguages: string[] = [];
    let trackingId: string;

    if (existingTracking) {
      hreflangGroupCore = existingTracking.hreflang_group_core;
      hreflangGroupDecision = existingTracking.hreflang_group_decision;
      existingLanguages = existingTracking.languages_generated || [];
      trackingId = existingTracking.id;
      
      await supabase
        .from('qa_article_tracking')
        .update({ status: 'in_progress' })
        .eq('id', trackingId);
    } else {
      hreflangGroupCore = crypto.randomUUID();
      hreflangGroupDecision = crypto.randomUUID();
      
      const { data: newTracking, error: trackingError } = await supabase
        .from('qa_article_tracking')
        .insert({
          source_article_id: article.id,
          source_article_headline: article.headline,
          source_article_slug: article.slug,
          hreflang_group_core: hreflangGroupCore,
          hreflang_group_decision: hreflangGroupDecision,
          languages_generated: [],
          total_qa_pages: 0,
          status: 'in_progress',
        })
        .select()
        .single();

      if (trackingError) {
        throw trackingError;
      }
      
      trackingId = newTracking.id;
    }

    const languagesToGenerate = targetLanguages.filter((lang: string) => !existingLanguages.includes(lang));
    
    if (languagesToGenerate.length === 0) {
      return { success: true, generatedPages: 0 };
    }

    // NATIVE LANGUAGE MODE: If article is non-English and we're generating for its language,
    // generate Q&As directly in that language (not English->translate)
    const articleLanguage = article.language;
    const isNativeLanguageGeneration = languagesToGenerate.length === 1 && languagesToGenerate[0] === articleLanguage;
    
    let allQAPages: any[] = [];
    
    if (isNativeLanguageGeneration && articleLanguage !== 'en') {
      // Generate Q&As directly in the article's native language
      console.log(`[Process] Generating Q&As NATIVELY in ${articleLanguage} for: ${article.headline}`);
      const nativeQAPages = await generateEnglishQAPages(article, lovableApiKey, ALL_QA_TYPES);
      
      for (const nativeQA of nativeQAPages) {
        allQAPages.push({
          ...nativeQA,
          language: articleLanguage, // Ensure language is set correctly
          hreflang_group_id: nativeQA.qa_type === 'core' ? hreflangGroupCore : hreflangGroupDecision,
          tracking_id: trackingId,
        });
      }
      existingLanguages.push(articleLanguage);
    } else {
      // Standard mode: Generate English first, then translate
      let englishQAPages: any[] = [];
      
      if (languagesToGenerate.includes('en')) {
        englishQAPages = await generateEnglishQAPages(article, lovableApiKey);
      } else {
        const { data: existingEnglish } = await supabase
          .from('qa_pages')
          .select('*')
          .eq('source_article_id', article.id)
          .eq('language', 'en');
        
        if (existingEnglish && existingEnglish.length > 0) {
          englishQAPages = existingEnglish;
        } else {
          englishQAPages = await generateEnglishQAPages(article, lovableApiKey);
        }
      }

      if (languagesToGenerate.includes('en')) {
        for (const englishQA of englishQAPages) {
          allQAPages.push({
            ...englishQA,
            hreflang_group_id: englishQA.qa_type === 'core' ? hreflangGroupCore : hreflangGroupDecision,
            tracking_id: trackingId,
          });
        }
        existingLanguages.push('en');
      }

      const translationLanguages = languagesToGenerate.filter((lang: string) => lang !== 'en');
      
      // Track successful translations per language (Fix #1)
      const translationStats: Record<string, number> = {};
      const startTime = Date.now();
      const MAX_EXECUTION_TIME = 50000; // 50 seconds (leave 10s buffer for saving)
      
      for (const targetLang of translationLanguages) {
        // Fix #2: Timeout protection
        if (Date.now() - startTime > MAX_EXECUTION_TIME) {
          console.warn(`[Process] ⚠️ Approaching timeout after ${Object.keys(translationStats).length} languages, saving progress...`);
          break;
        }
        
        translationStats[targetLang] = 0;
        
        for (const englishQA of englishQAPages) {
          try {
            console.log(`[Translation] Translating ${englishQA.qa_type} to ${targetLang}...`);
            const translatedQA = await translateQAPage(englishQA, targetLang, lovableApiKey);
            
            allQAPages.push({
              ...translatedQA,
              hreflang_group_id: translatedQA.qa_type === 'core' ? hreflangGroupCore : hreflangGroupDecision,
              tracking_id: trackingId,
              source_article_id: article.id,
              source_article_slug: article.slug,
            });
            
            translationStats[targetLang]++;
            console.log(`[Translation] ✅ SUCCESS: ${englishQA.qa_type} → ${targetLang}`);
            
          } catch (error) {
            console.error(`[Translation] ❌ FAILED: ${englishQA.qa_type} → ${targetLang}:`, error);
          }
        }
        
        // Fix #1: Only mark language complete if at least 1 Q&A translated
        if (translationStats[targetLang] > 0) {
          existingLanguages.push(targetLang);
          console.log(`[Translation] ✅ ${targetLang}: ${translationStats[targetLang]}/${englishQAPages.length} Q&As translated`);
        } else {
          console.error(`[Translation] ❌ ${targetLang}: 0 Q&As translated - NOT marking as complete`);
        }
      }
      
      // Log translation summary
      const successfulLangs = Object.entries(translationStats).filter(([_, count]) => count > 0).length;
      const failedLangs = Object.entries(translationStats).filter(([_, count]) => count === 0).length;
      console.log(`[Translation] Summary: ${successfulLangs} languages succeeded, ${failedLangs} languages failed`);
    }

    for (const qaData of allQAPages) {
      const baseSlug = qaData.slug || `qa-${article.slug}-${qaData.qa_type}`;
      
      const { data: existing } = await supabase
        .from('qa_pages')
        .select('id')
        .eq('slug', baseSlug)
        .eq('language', qaData.language)
        .single();

      if (existing) {
        continue;
      }

      const { error: insertError } = await supabase
        .from('qa_pages')
        .insert({
          source_article_id: article.id,
          cluster_id: article.cluster_id || null,
          language: qaData.language,
          source_language: 'en',
          hreflang_group_id: qaData.hreflang_group_id,
          tracking_id: trackingId,
          qa_type: qaData.qa_type,
          title: qaData.title,
          slug: baseSlug,
          canonical_url: `https://www.delsolprimehomes.com/${qaData.language}/qa/${baseSlug}`,
          question_main: qaData.question_main,
          answer_main: qaData.answer_main,
          related_qas: qaData.related_qas || [],
          speakable_answer: qaData.speakable_answer,
          meta_title: qaData.meta_title?.substring(0, 60) || qaData.title.substring(0, 60),
          meta_description: qaData.meta_description?.substring(0, 160) || '',
          featured_image_url: article.featured_image_url,
          featured_image_alt: article.featured_image_alt || qaData.title,
          featured_image_caption: article.featured_image_caption,
          source_article_slug: article.slug,
          author_id: article.author_id,
          category: article.category,
          funnel_stage: article.funnel_stage, // Hans' funnel-based linking
          status: 'draft',
        });

      if (insertError) {
        console.error('[Process] Insert error:', insertError);
        continue;
      }

      generatedPages++;
    }

    // Fix #3: Accurate tracking update - use actual count, not calculated
    const actualQACount = generatedPages;
    const allTargetLanguages = targetLanguages;
    const failedLanguages = allTargetLanguages.filter((lang: string) => !existingLanguages.includes(lang));
    const hasFailures = failedLanguages.length > 0;
    
    await supabase
      .from('qa_article_tracking')
      .update({
        languages_generated: existingLanguages,
        total_qa_pages: actualQACount,
        status: hasFailures ? 'partial' : 'completed',
      })
      .eq('id', trackingId);
    
    if (hasFailures) {
      console.warn(`[Tracking] ⚠️ Partial completion: ${existingLanguages.length} languages succeeded, ${failedLanguages.length} failed (${failedLanguages.join(', ')})`);
    } else {
      console.log(`[Tracking] ✅ Full completion: ${existingLanguages.length} languages, ${actualQACount} Q&A pages`);
    }

    for (const groupId of [hreflangGroupCore, hreflangGroupDecision]) {
      const { data: pagesInGroup } = await supabase
        .from('qa_pages')
        .select('id, language, slug')
        .eq('hreflang_group_id', groupId);
      
      if (pagesInGroup && pagesInGroup.length > 0) {
        const translations: Record<string, string> = {};
        for (const p of pagesInGroup) {
          translations[p.language] = p.slug;
        }
        
        for (const p of pagesInGroup) {
          await supabase
            .from('qa_pages')
            .update({ translations })
            .eq('id', p.id);
        }
      }
    }

    if (generatedPages > 0) {
      const { data: generatedQAPages } = await supabase
        .from('qa_pages')
        .select('id')
        .eq('source_article_id', article.id);
      
      if (generatedQAPages && generatedQAPages.length > 0) {
        const qaPageIds = generatedQAPages.map((qa: { id: string }) => qa.id);
        
        await supabase
          .from('blog_articles')
          .update({ 
            generated_qa_page_ids: qaPageIds,
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);
      }
    }

    return { success: true, generatedPages };

  } catch (error) {
    console.error(`[Process] Error processing article ${article.id}:`, error);
    return { 
      success: false, 
      generatedPages, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
