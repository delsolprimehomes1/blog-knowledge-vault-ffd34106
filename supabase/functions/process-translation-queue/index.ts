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
  no: 'Norwegian'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { batchSize = 1, dryRun = false } = await req.json().catch(() => ({}));
    const results: any[] = [];
    const processedCount = Math.min(batchSize, 5); // Max 5 per call to avoid timeout

    for (let i = 0; i < processedCount; i++) {
      // Get next pending job (highest priority first)
      const { data: job, error: fetchError } = await supabase
        .from('cluster_translation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (fetchError || !job) {
        console.log('No more jobs in queue or error:', fetchError?.message);
        break;
      }

      console.log(`Processing job ${job.id}: ${job.target_language} for article ${job.english_article_id}`);

      if (dryRun) {
        results.push({ job: job.id, status: 'would_process', target: job.target_language });
        continue;
      }

      // Mark job as processing
      await supabase
        .from('cluster_translation_queue')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', job.id);

      // Update cluster progress to in_progress
      await supabase
        .from('cluster_completion_progress')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        })
        .eq('cluster_id', job.cluster_id)
        .eq('status', 'queued');

      try {
        // Check if translation already exists
        const { data: existingArticle } = await supabase
          .from('blog_articles')
          .select('id, slug')
          .eq('hreflang_group_id', job.english_article_id)
          .eq('language', job.target_language)
          .eq('status', 'published')
          .limit(1)
          .single();

        if (existingArticle) {
          console.log(`Translation already exists for ${job.target_language}: ${existingArticle.slug}`);
          await supabase
            .from('cluster_translation_queue')
            .update({ 
              status: 'skipped',
              completed_at: new Date().toISOString(),
              error_message: 'Translation already exists'
            })
            .eq('id', job.id);
          results.push({ job: job.id, status: 'skipped', reason: 'already_exists' });
          continue;
        }

        // Get the English article to translate
        const { data: englishArticle, error: articleError } = await supabase
          .from('blog_articles')
          .select('*')
          .eq('id', job.english_article_id)
          .single();

        if (articleError || !englishArticle) {
          throw new Error(`English article not found: ${job.english_article_id}`);
        }

        // Translate the article using the existing translate-article function
        const translatedArticle = await translateArticle(englishArticle, job.target_language);

        // Insert the translated article
        const { data: newArticle, error: insertError } = await supabase
          .from('blog_articles')
          .insert({
            ...translatedArticle,
            cluster_id: job.cluster_id,
            cluster_number: englishArticle.cluster_number,
            cluster_theme: englishArticle.cluster_theme,
            hreflang_group_id: englishArticle.hreflang_group_id || englishArticle.id,
            status: 'published',
            date_published: new Date().toISOString(),
            date_modified: new Date().toISOString(),
            source_language: 'en'
          })
          .select('id, slug')
          .single();

        if (insertError) {
          throw new Error(`Failed to insert translation: ${insertError.message}`);
        }

        // Mark job as completed
        await supabase
          .from('cluster_translation_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            created_article_id: newArticle.id
          })
          .eq('id', job.id);

        console.log(`Successfully created ${job.target_language} translation: ${newArticle.slug}`);
        results.push({ 
          job: job.id, 
          status: 'completed', 
          articleId: newArticle.id,
          slug: newArticle.slug,
          language: job.target_language
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing job ${job.id}:`, errorMessage);
        
        const newRetryCount = (job.retry_count || 0) + 1;
        const isFinalFailure = newRetryCount >= (job.max_retries || 3);

        await supabase
          .from('cluster_translation_queue')
          .update({ 
            status: isFinalFailure ? 'failed' : 'pending',
            error_message: errorMessage,
            retry_count: newRetryCount
          })
          .eq('id', job.id);

        // Update error count in progress
        if (isFinalFailure) {
          await supabase
            .from('cluster_completion_progress')
            .update({ 
              error_count: (job.error_count || 0) + 1,
              last_updated: new Date().toISOString()
            })
            .eq('cluster_id', job.cluster_id);
        }

        results.push({ 
          job: job.id, 
          status: isFinalFailure ? 'failed' : 'retry',
          error: errorMessage,
          retryCount: newRetryCount
        });
      }
    }

    // Get queue stats
    const { data: statsData } = await supabase
      .from('cluster_translation_queue')
      .select('status');
    
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 };
    statsData?.forEach(item => {
      stats[item.status as keyof typeof stats]++;
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        queueStats: stats,
        message: results.length === 0 ? 'No jobs in queue' : `Processed ${results.length} jobs`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Queue processor error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Translation function (embedded to avoid function-to-function calls)
async function translateArticle(englishArticle: any, targetLanguage: string) {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  const prompt = `You are a professional translator specializing in real estate content for the Costa del Sol, Spain market.

Translate this English blog article to ${languageName} (${targetLanguage}).

CRITICAL REQUIREMENTS:
1. Translate ALL text naturally - headlines, content, meta descriptions
2. Keep the HTML structure intact
3. meta_title MUST be under 60 characters
4. meta_description MUST be under 160 characters
5. Create a URL-friendly slug in ${languageName}
6. Maintain SEO optimization in the target language
7. Keep all external URLs unchanged
8. Translate the speakable_answer naturally

ENGLISH ARTICLE:
Headline: ${englishArticle.headline}
Meta Title: ${englishArticle.meta_title}
Meta Description: ${englishArticle.meta_description}
Speakable Answer: ${englishArticle.speakable_answer}
Content (first 3000 chars): ${englishArticle.detailed_content?.substring(0, 3000)}

Respond in JSON format:
{
  "headline": "translated headline",
  "meta_title": "translated meta title (max 60 chars)",
  "meta_description": "translated meta description (max 160 chars)",
  "speakable_answer": "translated speakable answer",
  "slug": "url-friendly-slug-in-target-language",
  "detailed_content": "full translated HTML content"
}`;

  const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';
  
  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse translation response');
  }

  const translated = JSON.parse(jsonMatch[0]);

  // Ensure length limits
  if (translated.meta_title?.length > 60) {
    translated.meta_title = translated.meta_title.substring(0, 57) + '...';
  }
  if (translated.meta_description?.length > 160) {
    translated.meta_description = translated.meta_description.substring(0, 157) + '...';
  }

  // Create slug if not provided
  if (!translated.slug) {
    translated.slug = translated.headline
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80);
  }

  return {
    language: targetLanguage,
    headline: translated.headline,
    meta_title: translated.meta_title,
    meta_description: translated.meta_description,
    speakable_answer: translated.speakable_answer,
    slug: translated.slug,
    detailed_content: translated.detailed_content || englishArticle.detailed_content,
    featured_image_url: englishArticle.featured_image_url,
    featured_image_alt: translated.headline,
    featured_image_caption: englishArticle.featured_image_caption,
    category: englishArticle.category,
    funnel_stage: englishArticle.funnel_stage,
    author_id: englishArticle.author_id,
    reviewer_id: englishArticle.reviewer_id,
    canonical_url: `https://www.delsolprimehomes.com/${targetLanguage}/blog/${translated.slug}`,
    external_citations: englishArticle.external_citations,
    internal_links: englishArticle.internal_links,
    qa_entities: englishArticle.qa_entities,
    diagram_url: englishArticle.diagram_url,
    diagram_description: englishArticle.diagram_description,
    diagram_alt: englishArticle.diagram_alt,
    diagram_caption: englishArticle.diagram_caption
  };
}
