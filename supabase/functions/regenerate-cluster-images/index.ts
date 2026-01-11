import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as fal from "https://esm.sh/@fal-ai/serverless-client@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configure Fal.ai
fal.config({
  credentials: Deno.env.get('FAL_KEY'),
});

// Scene variations to ensure unique images
const SCENE_VARIATIONS = [
  'infinity pool overlooking Mediterranean sea at golden hour',
  'panoramic mountain and sea views from modern terrace',
  'manicured Mediterranean garden with palm trees and pool',
  'contemporary interior with floor-to-ceiling windows',
  'beachfront terrace with white furniture at sunset',
  'golf course villa with mountain backdrop',
  'rooftop terrace with 360-degree views',
  'luxury outdoor living space with fire pit',
  'modern kitchen with marble island and sea view',
  'private courtyard with traditional fountain',
  'infinity edge pool merging with ocean horizon',
  'Spanish colonial architecture with modern touches',
  'penthouse balcony overlooking marina',
  'tropical garden pathway to villa entrance',
  'sunset view from hillside property',
  'contemporary white villa against blue sky',
  'poolside lounge area with cabanas',
  'open-plan living area flowing to terrace',
  'Mediterranean-style arched doorways',
  'luxury bedroom with sea view balcony'
];

// Language-specific aesthetic hints
const LANGUAGE_AESTHETICS: Record<string, string> = {
  en: 'international luxury appeal',
  nl: 'clean Dutch design sensibility',
  de: 'precision German engineering aesthetic',
  fr: 'French elegance and sophistication',
  fi: 'Nordic minimalist warmth',
  pl: 'Central European classic style',
  da: 'Danish hygge comfort',
  hu: 'Hungarian refined taste',
  sv: 'Swedish modern simplicity',
  no: 'Norwegian natural harmony'
};

async function generateUniqueImage(prompt: string, fallbackUrl: string): Promise<string> {
  try {
    const result = await fal.subscribe("fal-ai/nano-banana-pro", {
      input: {
        prompt,
        aspect_ratio: "16:9",
        resolution: "2K",
        num_images: 1,
        output_format: "png"
      }
    }) as { images?: Array<{ url?: string }> };
    
    // Fixed: Correct response structure - result.images, not result.data.images
    if (result.images?.[0]?.url) {
      console.log(`✅ Generated unique image with Nano Banana Pro`);
      return result.images[0].url;
    }
  } catch (error) {
    console.error(`⚠️ Image generation failed:`, error);
  }
  return fallbackUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, dryRun = false } = await req.json();

    if (!clusterId) {
      return new Response(
        JSON.stringify({ error: 'clusterId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔄 Regenerating images for cluster: ${clusterId}`);

    // Fetch all articles for this cluster
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, language, featured_image_url, funnel_stage')
      .eq('cluster_id', clusterId)
      .order('language')
      .order('funnel_stage');

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No articles found for this cluster', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${articles.length} articles to regenerate images for`);

    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          dryRun: true, 
          articleCount: articles.length,
          message: `Would regenerate ${articles.length} images` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let failCount = 0;
    const results: Array<{ id: string; language: string; success: boolean; newUrl?: string }> = [];

    // Process each article
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      
      // Get a unique scene for this article (use index to ensure variety)
      const sceneIndex = i % SCENE_VARIATIONS.length;
      const scene = SCENE_VARIATIONS[sceneIndex];
      const aesthetic = LANGUAGE_AESTHETICS[article.language] || 'international luxury appeal';
      
      const imagePrompt = `Professional Costa del Sol real estate photograph, luxury Mediterranean villa with ${scene}, bright natural lighting, Architectural Digest style, no text, no watermarks, no logos, clean composition, high-end marketing quality, ${aesthetic}`;
      
      console.log(`[${i + 1}/${articles.length}] Generating image for ${article.language} article: ${article.id.slice(0, 8)}...`);
      
      try {
        const newImageUrl = await generateUniqueImage(
          imagePrompt, 
          article.featured_image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200'
        );
        
        // Only update if we got a new URL (not the fallback)
        if (newImageUrl !== article.featured_image_url) {
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({ 
              featured_image_url: newImageUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', article.id);
          
          if (updateError) {
            console.error(`❌ Failed to update article ${article.id}:`, updateError);
            failCount++;
            results.push({ id: article.id, language: article.language, success: false });
          } else {
            console.log(`✅ Updated image for ${article.language} article`);
            successCount++;
            results.push({ id: article.id, language: article.language, success: true, newUrl: newImageUrl });
          }
        } else {
          console.log(`⚠️ Image generation returned fallback for ${article.language} article`);
          failCount++;
          results.push({ id: article.id, language: article.language, success: false });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error processing article ${article.id}:`, error);
        failCount++;
        results.push({ id: article.id, language: article.language, success: false });
      }
    }

    console.log(`🎉 Completed: ${successCount} success, ${failCount} failed out of ${articles.length} total`);

    return new Response(
      JSON.stringify({
        success: true,
        clusterId,
        totalArticles: articles.length,
        successCount,
        failCount,
        results: results.slice(0, 20) // Only return first 20 for response size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in regenerate-cluster-images:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
