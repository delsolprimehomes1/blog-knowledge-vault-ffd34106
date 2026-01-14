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

// Scene variations to ensure unique images (6 unique per cluster - one per funnel position)
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

// Language names for localized metadata generation
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  nl: 'Dutch',
  de: 'German',
  fr: 'French',
  fi: 'Finnish',
  pl: 'Polish',
  da: 'Danish',
  hu: 'Hungarian',
  sv: 'Swedish',
  no: 'Norwegian'
};

/**
 * Upload image from Fal.ai to Supabase Storage
 */
async function uploadToStorage(
  falImageUrl: string,
  supabase: any,
  bucket: string = 'article-images',
  prefix: string = 'img'
): Promise<string> {
  try {
    if (!falImageUrl || !falImageUrl.includes('fal.media')) {
      return falImageUrl;
    }

    console.log(`📥 Downloading image from Fal.ai...`);
    const imageResponse = await fetch(falImageUrl);
    
    if (!imageResponse.ok) {
      console.error(`❌ Failed to download image: ${imageResponse.status}`);
      return falImageUrl;
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedPrefix = prefix
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .substring(0, 50);
    const filename = `${sanitizedPrefix}-${timestamp}-${randomSuffix}.png`;
    
    console.log(`📤 Uploading to Supabase Storage: ${bucket}/${filename}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false
      });
    
    if (uploadError) {
      console.error(`❌ Upload failed:`, uploadError);
      return falImageUrl;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);
    
    const supabaseUrl = publicUrlData?.publicUrl;
    
    if (supabaseUrl) {
      console.log(`✅ Image uploaded to Supabase: ${supabaseUrl}`);
      return supabaseUrl;
    }
    
    return falImageUrl;
    
  } catch (error) {
    console.error(`❌ Storage upload error:`, error);
    return falImageUrl;
  }
}

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
    
    if (result.images?.[0]?.url) {
      console.log(`✅ Generated unique image with Nano Banana Pro`);
      return result.images[0].url;
    }
  } catch (error) {
    console.error(`⚠️ Image generation failed:`, error);
  }
  return fallbackUrl;
}

/**
 * Generate localized alt text and caption for an image
 */
async function generateLocalizedMetadata(
  article: { headline: string; language: string },
  openaiKey: string
): Promise<{ altText: string; caption: string | null }> {
  const languageName = LANGUAGE_NAMES[article.language] || 'English';

  try {
    const metadataResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You create SEO-optimized image metadata in ${languageName}.
            
Output a JSON object with:
- "altText": Descriptive alt text for accessibility and SEO (100-150 characters). Include location keywords like "Costa del Sol" or specific towns.
- "caption": Engaging caption for display below the image (100-200 characters). Should complement the article.

RULES:
- Write in ${languageName} (not English, unless article is English)
- Be descriptive and specific
- Include location references (Costa del Sol, Spain, Mediterranean)

Return ONLY valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: `Article headline: ${article.headline}
Generate alt text and caption in ${languageName}.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      }),
    });

    if (metadataResponse.ok) {
      const metadataData = await metadataResponse.json();
      const metadataContent = metadataData.choices?.[0]?.message?.content?.trim();
      
      const cleanedContent = metadataContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const metadata = JSON.parse(cleanedContent);
      
      return {
        altText: metadata.altText?.length >= 50 ? metadata.altText : `Costa del Sol property - ${article.headline}`,
        caption: metadata.caption?.length >= 50 ? metadata.caption : null
      };
    }
  } catch (error) {
    console.error(`Failed to generate ${languageName} metadata:`, error);
  }

  return {
    altText: `Costa del Sol property - ${article.headline}`,
    caption: null
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, dryRun = false, preserveEnglishImages = false } = await req.json();

    if (!clusterId) {
      return new Response(
        JSON.stringify({ error: 'clusterId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔄 Regenerating images for cluster: ${clusterId}`);

    // Fetch all articles for this cluster
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, language, featured_image_url, funnel_stage, slug')
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

    console.log(`📊 Found ${articles.length} articles in cluster`);

    // ============================================
    // IMAGE SHARING STRATEGY: 
    // 1. Generate 6 unique images for English articles (one per funnel stage)
    // 2. Share those images to all non-English translations
    // 3. Generate localized alt text + caption for each language
    // ============================================

    // Group articles by funnel_stage
    const articlesByFunnel: Record<string, { english: any | null; translations: any[] }> = {};
    
    for (const article of articles) {
      const key = article.funnel_stage || 'unknown';
      if (!articlesByFunnel[key]) {
        articlesByFunnel[key] = { english: null, translations: [] };
      }
      if (article.language === 'en') {
        articlesByFunnel[key].english = article;
      } else {
        articlesByFunnel[key].translations.push(article);
      }
    }

    const funnelStages = Object.keys(articlesByFunnel);
    console.log(`📊 Found ${funnelStages.length} funnel stages: ${funnelStages.join(', ')}`);

    if (dryRun) {
      const englishCount = Object.values(articlesByFunnel).filter(g => g.english).length;
      const translationCount = Object.values(articlesByFunnel).reduce((sum, g) => sum + g.translations.length, 0);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          dryRun: true, 
          articleCount: articles.length,
          uniqueImagesNeeded: preserveEnglishImages ? 0 : englishCount,
          imagesPreserved: preserveEnglishImages ? englishCount : 0,
          translationsToShare: translationCount,
          preserveMode: preserveEnglishImages,
          message: preserveEnglishImages 
            ? `Would preserve ${englishCount} existing images, share to ${translationCount} translations`
            : `Would generate ${englishCount} unique images, share to ${translationCount} translations` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let failCount = 0;
    let imagesPreserved = 0;
    const results: Array<{ id: string; language: string; success: boolean; newUrl?: string; shared?: boolean; preserved?: boolean }> = [];
    let sceneIndex = 0;

    // Process each funnel stage
    for (const [funnelStage, group] of Object.entries(articlesByFunnel)) {
      const { english, translations } = group;
      
      console.log(`\n📍 Processing funnel stage: ${funnelStage}`);
      console.log(`   English article: ${english ? 'Yes' : 'No'}`);
      console.log(`   Translations: ${translations.length}`);

      let primaryImageUrl: string | null = null;

      // Step 1: Handle English article - either preserve or generate new image
      if (english) {
        if (preserveEnglishImages && english.featured_image_url) {
          // PRESERVE MODE: Keep existing English image
          console.log(`📌 Preserving existing English image for ${funnelStage}`);
          primaryImageUrl = english.featured_image_url;
          
          // Still generate/update English metadata if OpenAI key available
          try {
            const { altText, caption } = openaiKey 
              ? await generateLocalizedMetadata(english, openaiKey)
              : { altText: `Costa del Sol property - ${english.headline}`, caption: null };
            
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ 
                featured_image_alt: altText,
                featured_image_caption: caption,
                updated_at: new Date().toISOString()
              })
              .eq('id', english.id);
            
            if (updateError) {
              console.error(`❌ Failed to update English metadata:`, updateError);
              failCount++;
              results.push({ id: english.id, language: 'en', success: false });
            } else {
              console.log(`✅ Updated English metadata (image preserved)`);
              imagesPreserved++;
              successCount++;
              results.push({ id: english.id, language: 'en', success: true, newUrl: primaryImageUrl || undefined, preserved: true });
            }
          } catch (error) {
            console.error(`❌ Error updating English metadata:`, error);
            failCount++;
            results.push({ id: english.id, language: 'en', success: false });
          }
        } else {
          // GENERATE MODE: Create new image
          const scene = SCENE_VARIATIONS[sceneIndex % SCENE_VARIATIONS.length];
          sceneIndex++;
          
          const imagePrompt = `Professional Costa del Sol real estate photograph, luxury Mediterranean villa with ${scene}, bright natural lighting, Architectural Digest style, no text, no watermarks, no logos, clean composition, high-end marketing quality`;
          
          console.log(`🇬🇧 Generating image for English ${funnelStage} article...`);
          
          try {
            let newImageUrl = await generateUniqueImage(
              imagePrompt, 
              english.featured_image_url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200'
            );
            
            // Upload to Supabase Storage
            if (newImageUrl && newImageUrl.includes('fal.media')) {
              newImageUrl = await uploadToStorage(
                newImageUrl,
                supabase,
                'article-images',
                `cluster-en-${funnelStage}-${english.slug || english.id.slice(0, 8)}`
              );
            }
            
            // Generate English metadata
            const { altText, caption } = openaiKey 
              ? await generateLocalizedMetadata(english, openaiKey)
              : { altText: `Costa del Sol property - ${english.headline}`, caption: null };
            
            // Update English article
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ 
                featured_image_url: newImageUrl,
                featured_image_alt: altText,
                featured_image_caption: caption,
                updated_at: new Date().toISOString()
              })
              .eq('id', english.id);
            
            if (updateError) {
              console.error(`❌ Failed to update English article:`, updateError);
              failCount++;
              results.push({ id: english.id, language: 'en', success: false });
            } else {
              console.log(`✅ Updated English article with new image`);
              primaryImageUrl = newImageUrl;
              successCount++;
              results.push({ id: english.id, language: 'en', success: true, newUrl: newImageUrl });
            }
          } catch (error) {
            console.error(`❌ Error generating English image:`, error);
            failCount++;
            results.push({ id: english.id, language: 'en', success: false });
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 2: Share primary image to all translations with localized metadata
      if (primaryImageUrl && translations.length > 0) {
        console.log(`🔗 Sharing image to ${translations.length} translations...`);
        
        for (const translation of translations) {
          try {
            // Generate localized metadata
            const { altText, caption } = openaiKey 
              ? await generateLocalizedMetadata(translation, openaiKey)
              : { altText: `Costa del Sol property - ${translation.headline}`, caption: null };
            
            // Update translation with SHARED image + localized metadata
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({ 
                featured_image_url: primaryImageUrl,
                featured_image_alt: altText,
                featured_image_caption: caption,
                updated_at: new Date().toISOString()
              })
              .eq('id', translation.id);
            
            if (updateError) {
              console.error(`❌ Failed to update ${translation.language} translation:`, updateError);
              failCount++;
              results.push({ id: translation.id, language: translation.language, success: false });
            } else {
              console.log(`✅ Shared image to ${translation.language} with localized metadata`);
              successCount++;
              results.push({ id: translation.id, language: translation.language, success: true, newUrl: primaryImageUrl, shared: true });
            }
          } catch (error) {
            console.error(`❌ Error updating ${translation.language} translation:`, error);
            failCount++;
            results.push({ id: translation.id, language: translation.language, success: false });
          }
        }
      } else if (!primaryImageUrl && translations.length > 0) {
        // No English primary - skip translations
        console.log(`⚠️ No primary image for ${funnelStage}, skipping ${translations.length} translations`);
        for (const translation of translations) {
          failCount++;
          results.push({ id: translation.id, language: translation.language, success: false });
        }
      }
    }

    const uniqueImagesGenerated = results.filter(r => r.success && r.language === 'en' && !r.preserved).length;
    const imagesShared = results.filter(r => r.shared).length;

    console.log(`\n🎉 Completed: ${successCount} success, ${failCount} failed`);
    console.log(`   Unique images generated: ${uniqueImagesGenerated}`);
    console.log(`   Images preserved: ${imagesPreserved}`);
    console.log(`   Images shared to translations: ${imagesShared}`);

    return new Response(
      JSON.stringify({
        success: true,
        clusterId,
        totalArticles: articles.length,
        uniqueImagesGenerated,
        imagesPreserved,
        imagesShared,
        successCount,
        failCount,
        preserveMode: preserveEnglishImages,
        results: results.slice(0, 30)
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
