import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  de: 'German',
  nl: 'Dutch',
  fr: 'French',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  pl: 'Polish',
  hu: 'Hungarian',
};

async function generateCaption(
  headline: string, 
  clusterTheme: string | null, 
  language: string
): Promise<string> {
  const langName = languageNames[language] || 'English';
  
  const prompt = `Generate a compelling, SEO-optimized caption for this Costa del Sol real estate article image.

Article Headline: ${headline}
Theme: ${clusterTheme || 'Costa del Sol real estate'}

Requirements:
- 100-150 characters maximum
- Include a location reference (Costa del Sol, Spain, Mediterranean, or specific cities like Marbella, Málaga)
- Add value beyond the headline - provide context about the visual
- Write in ${langName}
- Do NOT include quotes or special formatting
- Make it descriptive of what a reader would see in a real estate photo

Return ONLY the caption text, nothing else.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional real estate content writer specializing in Costa del Sol properties. Generate concise, engaging image captions.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { batchSize = 10, language = 'all', dryRun = false, singleArticleId = null } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle single article caption generation
    if (singleArticleId) {
      console.log(`Generating caption for single article: ${singleArticleId}`);
      
      const { data: article, error: fetchError } = await supabase
        .from('blog_articles')
        .select('id, headline, cluster_theme, language')
        .eq('id', singleArticleId)
        .single();

      if (fetchError || !article) {
        throw new Error(`Article not found: ${singleArticleId}`);
      }

      const caption = await generateCaption(
        article.headline,
        article.cluster_theme,
        article.language
      );

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ 
            featured_image_caption: caption,
            date_modified: new Date().toISOString()
          })
          .eq('id', singleArticleId);

        if (updateError) {
          throw new Error(`Failed to update article: ${updateError.message}`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        caption,
        dryRun,
        article: {
          id: article.id,
          headline: article.headline,
          language: article.language
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Batch processing: Get articles missing captions
    let query = supabase
      .from('blog_articles')
      .select('id, headline, cluster_theme, language, slug')
      .eq('status', 'published')
      .or('featured_image_caption.is.null,featured_image_caption.eq.N/A,featured_image_caption.eq.null,featured_image_caption.eq.N.v.t.')
      .order('date_published', { ascending: false })
      .limit(batchSize);

    if (language !== 'all') {
      query = query.eq('language', language);
    }

    const { data: articles, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No articles need caption generation',
        processed: 0,
        remaining: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get total count of articles needing captions
    let countQuery = supabase
      .from('blog_articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('featured_image_caption.is.null,featured_image_caption.eq.N/A,featured_image_caption.eq.null,featured_image_caption.eq.N.v.t.');

    if (language !== 'all') {
      countQuery = countQuery.eq('language', language);
    }

    const { count: totalRemaining } = await countQuery;

    console.log(`Processing ${articles.length} articles. Total remaining: ${totalRemaining}`);

    const results: Array<{
      id: string;
      headline: string;
      language: string;
      caption?: string;
      error?: string;
    }> = [];

    for (const article of articles) {
      try {
        console.log(`Generating caption for: ${article.headline.substring(0, 50)}...`);
        
        const caption = await generateCaption(
          article.headline,
          article.cluster_theme,
          article.language
        );

        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({ 
              featured_image_caption: caption,
              date_modified: new Date().toISOString()
            })
            .eq('id', article.id);

          if (updateError) {
            throw new Error(updateError.message);
          }
        }

        results.push({
          id: article.id,
          headline: article.headline,
          language: article.language,
          caption
        });

        // Rate limiting: 1 second delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Failed to process article ${article.id}:`, error);
        results.push({
          id: article.id,
          headline: article.headline,
          language: article.language,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.caption).length;
    const errorCount = results.filter(r => r.error).length;

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      processed: articles.length,
      successful: successCount,
      failed: errorCount,
      remaining: (totalRemaining || 0) - successCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-missing-captions:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
