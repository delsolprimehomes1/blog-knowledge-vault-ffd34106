import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as fal from "https://esm.sh/@fal-ai/serverless-client@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface FalResult {
  images?: Array<{ url?: string }>;
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId } = await req.json();

    if (!articleId) {
      return new Response(
        JSON.stringify({ error: 'articleId is required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const falKey = Deno.env.get('FAL_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configure Fal.ai
    fal.config({
      credentials: falKey.trim().replace(/[\r\n]/g, ''),
    });

    console.log(`🖼️ Starting image regeneration for article: ${articleId}`);

    // Step 1: Fetch the article
    const { data: article, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, meta_description, detailed_content, language, funnel_stage, cluster_theme, slug')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      throw new Error(`Article not found: ${fetchError?.message || 'Unknown error'}`);
    }

    console.log(`📝 Article: "${article.headline}" (${article.language})`);

    const languageName = LANGUAGE_NAMES[article.language] || 'English';

    // Step 2: Generate content-based image prompt using OpenAI
    console.log(`🧠 Generating content-based image prompt...`);
    
    const contentForAnalysis = `
Headline: ${article.headline}
Meta Description: ${article.meta_description}
Theme: ${article.cluster_theme || 'Costa del Sol Real Estate'}
Funnel Stage: ${article.funnel_stage}
Content Preview: ${(article.detailed_content || '').substring(0, 2000)}
    `.trim();

    const promptGenerationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an expert at creating image prompts for AI image generators. 
Your task is to analyze a Costa del Sol real estate article and create a professional photography prompt that visually complements the article content.

CRITICAL RULES:
- NEVER include text, headlines, watermarks, or logos in the image
- Focus on architectural details, settings, atmospheres, and lifestyle elements
- Include "no text, no watermarks, no logos, no words" in every prompt
- Specify "16:9 aspect ratio, professional real estate photography, 2K resolution"
- Reference Costa del Sol Mediterranean aesthetic
- Match the article's tone (investment-focused = data/business vibes, lifestyle = people/culture, property = architecture)
- Be specific about lighting, composition, and style

Output ONLY the image prompt, nothing else.`
          },
          {
            role: 'user',
            content: `Create a professional photography prompt for this article:

${contentForAnalysis}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!promptGenerationResponse.ok) {
      const errorText = await promptGenerationResponse.text();
      console.error('OpenAI prompt generation failed:', errorText);
      throw new Error('Failed to generate image prompt');
    }

    const promptData = await promptGenerationResponse.json();
    const imagePrompt = promptData.choices?.[0]?.message?.content?.trim() || 
      `Professional Costa del Sol real estate photography, Mediterranean architecture, bright natural lighting, ultra-realistic, 8k resolution, no text, no watermarks, no logos, 16:9 aspect ratio`;

    console.log(`🎨 Generated prompt: ${imagePrompt.substring(0, 100)}...`);

    // Step 3: Generate image using Nano Banana Pro
    console.log(`🖼️ Generating image with Nano Banana Pro...`);
    
    const result = await fal.subscribe("fal-ai/nano-banana-pro", {
      input: {
        prompt: imagePrompt,
        aspect_ratio: "16:9",
        resolution: "2K",
        num_images: 1,
        output_format: "png"
      }
    }) as FalResult;

    // Fixed: Correct response structure - result.images, not result.data.images
    let generatedImageUrl = result.images?.[0]?.url;

    if (!generatedImageUrl) {
      console.error('Fal.ai response:', JSON.stringify(result));
      throw new Error('Image generation failed - no URL returned');
    }

    console.log(`✅ Image generated successfully`);

    // Upload to Supabase Storage if it's a Fal.ai URL
    if (generatedImageUrl && generatedImageUrl.includes('fal.media')) {
      generatedImageUrl = await uploadToStorage(
        generatedImageUrl,
        supabase,
        'article-images',
        `article-${article.slug || article.id.slice(0, 8)}`
      );
    }

    // Step 4: Generate language-matched alt text and caption
    console.log(`📝 Generating ${languageName} metadata (alt text & caption)...`);

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
- "altText": Descriptive alt text for accessibility and SEO (100-150 characters). Include location keywords like "Costa del Sol" or specific towns. Describe what's visible in the image.
- "caption": Engaging caption for display below the image (100-200 characters). Should complement the article and include a subtle call-to-action or interesting fact.

RULES:
- Write in ${languageName} (not English, unless article is English)
- Be descriptive and specific
- Include location references (Costa del Sol, Spain, Mediterranean)
- No generic placeholder text
- Caption should add value, not just describe the image

Return ONLY valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: `Article headline: ${article.headline}
Article theme: ${article.cluster_theme || 'Costa del Sol Real Estate'}
Image shows: ${imagePrompt}

Generate alt text and caption in ${languageName}.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      }),
    });

    let altText = `Costa del Sol property - ${article.headline}`;
    let caption = null;

    if (metadataResponse.ok) {
      try {
        const metadataData = await metadataResponse.json();
        const metadataContent = metadataData.choices?.[0]?.message?.content?.trim();
        
        // Parse JSON response
        const cleanedContent = metadataContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        const metadata = JSON.parse(cleanedContent);
        
        if (metadata.altText && metadata.altText.length >= 50) {
          altText = metadata.altText;
        }
        if (metadata.caption && metadata.caption.length >= 50) {
          caption = metadata.caption;
        }
        
        console.log(`✅ Generated ${languageName} metadata`);
      } catch (parseError) {
        console.error('Failed to parse metadata JSON:', parseError);
        // Use fallback alt text
      }
    }

    // Step 5: Update the article with new image data
    console.log(`💾 Updating article with new image...`);

    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({
        featured_image_url: generatedImageUrl,
        featured_image_alt: altText,
        featured_image_caption: caption,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (updateError) {
      throw new Error(`Failed to update article: ${updateError.message}`);
    }

    console.log(`🎉 Successfully regenerated image for article: ${article.headline}`);

    return new Response(
      JSON.stringify({
        success: true,
        articleId,
        headline: article.headline,
        language: article.language,
        imageUrl: generatedImageUrl,
        altText,
        caption,
        prompt: imagePrompt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in regenerate-article-image:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
