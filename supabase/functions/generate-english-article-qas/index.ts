import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Q&A types for each article
const QA_TYPES = [
  { id: 'pitfalls', label: 'Common Pitfalls' },
  { id: 'costs', label: 'Hidden Costs' },
  { id: 'process', label: 'Process Steps' },
  { id: 'legal', label: 'Legal Requirements' },
];

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

function generateSlug(headline: string, qaType: string): string {
  const baseSlug = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  // Add 8-char UUID suffix to prevent collisions
  const suffix = crypto.randomUUID().substring(0, 8);
  return `${baseSlug}-${qaType}-${suffix}`;
}

async function generateEnglishQA(
  article: { headline: string; detailed_content: string; meta_description: string; funnel_stage: string },
  qaType: { id: string; label: string },
  existingQuestions: string[] = []
): Promise<{
  question: string;
  answer: string;
  metaTitle: string;
  metaDescription: string;
  speakableAnswer: string;
}> {
  const existingQuestionsBlock = existingQuestions.length > 0
    ? `\n\nCRITICAL - EXISTING QUESTIONS IN THIS CLUSTER (you MUST create a DIFFERENT question):
${existingQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Your question MUST be unique and NOT duplicate any of the above. Focus on the SPECIFIC angle of this article: "${article.headline}"`
    : '';

  const prompt = `You are an expert real estate content writer. Generate a Q&A page about "${qaType.label}" for this article.

ARTICLE HEADLINE: ${article.headline}
ARTICLE DESCRIPTION: ${article.meta_description}
FUNNEL STAGE: ${article.funnel_stage}
${existingQuestionsBlock}

Generate a focused Q&A about ${qaType.label.toLowerCase()} that is SPECIFIC to the unique angle of this article's headline.
The question must be different from any existing questions listed above.

CRITICAL - HANS' AEO RULES FOR speakableAnswer:
- Write as a SINGLE PARAGRAPH verdict/conclusion (80-120 words, max 150)
- NO lists, NO bullets, NO numbered points, NO line breaks
- Complete sentences ending with period
- Self-contained (AI can quote verbatim without context)
- Neutral, factual tone (no marketing language)
- Max 800 characters
- Directly answers the question in summary form

WRONG: "There are 5 key steps: 1. Get an NIE 2. Find a lawyer..."
RIGHT: "Purchasing property in Costa del Sol involves obtaining a Spanish NIE, appointing an independent lawyer for due diligence, opening a Spanish bank account, signing a private purchase agreement with deposit, and finalizing the sale before a notary through the public deed of sale, after which the property is registered in the Land Registry."

Return JSON:
{
  "question": "A natural, UNIQUE question about ${qaType.label.toLowerCase()} specific to '${article.headline}' (50-80 chars)",
  "answer": "Comprehensive answer with 3-5 key points, practical advice (200-400 words)",
  "metaTitle": "SEO title under 60 chars including the question topic",
  "metaDescription": "SEO description 120-155 chars summarizing the answer",
  "speakableAnswer": "Single paragraph verdict (80-120 words, max 150). NO lists. Complete sentences. Neutral tone."
}`;

  const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert real estate content writer. Always respond with valid JSON. Create UNIQUE questions that are specific to the article headline.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    }),
  }, 45000);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in AI response');
  }

  return JSON.parse(content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { articleId, articlePosition } = await req.json();

    if (!articleId) {
      throw new Error('articleId is required');
    }

    console.log(`[GenerateEnglishQAs] Starting for article ${articleId} (position ${articlePosition || '?'})`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the English article
    const { data: article, error: articleError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('id', articleId)
      .eq('language', 'en')
      .single();

    if (articleError || !article) {
      throw new Error(`Article not found: ${articleError?.message || 'No data'}`);
    }

    console.log(`[GenerateEnglishQAs] Article: "${article.headline}"`);
    console.log(`[GenerateEnglishQAs] Cluster ID: ${article.cluster_id}`);

    const createdQAs: string[] = [];
    const errors: string[] = [];

    // Fetch existing questions in this cluster to avoid duplicates
    const { data: existingClusterQAs } = await supabase
      .from('qa_pages')
      .select('question_main, qa_type')
      .eq('cluster_id', article.cluster_id)
      .eq('language', 'en');

    const existingQuestionsByType: Record<string, string[]> = {};
    for (const qa of existingClusterQAs || []) {
      if (!existingQuestionsByType[qa.qa_type]) {
        existingQuestionsByType[qa.qa_type] = [];
      }
      existingQuestionsByType[qa.qa_type].push(qa.question_main);
    }

    console.log(`[GenerateEnglishQAs] Found ${existingClusterQAs?.length || 0} existing Q&As in cluster`);

    // Generate 4 Q&As (one per type)
    for (const qaType of QA_TYPES) {
      try {
        console.log(`[GenerateEnglishQAs] Generating ${qaType.id}...`);

        // Check if this Q&A type already exists for this article
        const { data: existing } = await supabase
          .from('qa_pages')
          .select('id')
          .eq('source_article_id', articleId)
          .eq('language', 'en')
          .eq('qa_type', qaType.id)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`[GenerateEnglishQAs] Skipping ${qaType.id} - already exists`);
          continue;
        }

        // Get existing questions of this type in the cluster
        const existingQuestionsOfType = existingQuestionsByType[qaType.id] || [];

        // Generate English Q&A content with existing questions context
        const qaContent = await generateEnglishQA(
          {
            headline: article.headline,
            detailed_content: article.detailed_content,
            meta_description: article.meta_description,
            funnel_stage: article.funnel_stage,
          },
          qaType,
          existingQuestionsOfType
        );

        // Create new hreflang_group_id for this Q&A (translations will join this group)
        const hreflangGroupId = crypto.randomUUID();
        const slug = generateSlug(qaContent.question, qaType.id);

        // Build Q&A record
        const qaRecord = {
          source_article_id: articleId,
          cluster_id: article.cluster_id,
          language: 'en',
          qa_type: qaType.id,
          title: qaContent.question,
          slug: slug,
          question_main: qaContent.question,
          answer_main: qaContent.answer,
          meta_title: qaContent.metaTitle,
          meta_description: qaContent.metaDescription,
          speakable_answer: qaContent.speakableAnswer,
          featured_image_url: article.featured_image_url,
          featured_image_alt: article.featured_image_alt,
          hreflang_group_id: hreflangGroupId,
          source_language: 'en',
          translations: { en: slug },
          related_qas: [],
          internal_links: [],
          funnel_stage: article.funnel_stage,
          status: 'published',
          source_article_slug: article.slug,
        };

        // Insert the Q&A
        const { data: insertedQA, error: insertError } = await supabase
          .from('qa_pages')
          .insert(qaRecord)
          .select('id, slug')
          .single();

        if (insertError) {
          console.error(`[GenerateEnglishQAs] Insert error for ${qaType.id}:`, insertError);
          errors.push(`${qaType.id}: ${insertError.message}`);
          continue;
        }

        console.log(`[GenerateEnglishQAs] ✅ Created ${qaType.id}: ${insertedQA.slug} (hreflang: ${hreflangGroupId})`);
        createdQAs.push(insertedQA.id);

        // Add to existing questions to prevent collision in same batch
        if (!existingQuestionsByType[qaType.id]) {
          existingQuestionsByType[qaType.id] = [];
        }
        existingQuestionsByType[qaType.id].push(qaContent.question);

      } catch (error) {
        console.error(`[GenerateEnglishQAs] Error for ${qaType.id}:`, error);
        errors.push(`${qaType.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[GenerateEnglishQAs] Complete in ${duration}s: ${createdQAs.length}/4 Q&As created`);

    return new Response(JSON.stringify({
      success: true,
      articleId,
      articleHeadline: article.headline,
      created: createdQAs.length,
      createdIds: createdQAs,
      errors: errors.length > 0 ? errors : undefined,
      durationSeconds: parseFloat(duration),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[GenerateEnglishQAs] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
