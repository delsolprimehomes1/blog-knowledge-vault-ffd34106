import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as fal from "npm:@fal-ai/serverless-client";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FalImage {
  url: string;
  width: number;
  height: number;
}

interface FalResult {
  images: FalImage[];
}

interface GeneratedImage {
  type: 'hero' | 'lifestyle' | 'architecture' | 'amenities';
  url: string;
  prompt: string;
}

/**
 * Upload image from Fal.ai to Supabase Storage
 */
async function uploadToStorage(
  falImageUrl: string,
  supabase: any,
  bucket: string = 'article-images',
  prefix: string = 'brochure'
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

/**
 * Generate image prompts for a city
 */
function getImagePrompts(cityName: string): { type: GeneratedImage['type']; prompt: string }[] {
  return [
    {
      type: 'hero',
      prompt: `Photorealistic aerial drone view of ${cityName}, Costa del Sol, Spain at golden hour. Stunning Mediterranean coastal cityscape with luxury modern architecture, pristine sandy beaches, azure blue sea, palm trees, and mountains in the background. High-end real estate photography style, 8K resolution, cinematic lighting with warm golden sun rays, aspirational luxury atmosphere. Wide panoramic establishing shot showing the full beauty of the city and coastline.`
    },
    {
      type: 'lifestyle',
      prompt: `Luxury lifestyle scene in ${cityName}, Costa del Sol. Elegant beachfront restaurant terrace at sunset with sophisticated European diners, Mediterranean Sea views, premium fine dining setup with crystal glasses and white linen tablecloths. Warm golden hour lighting, high-end travel magazine photography style, photorealistic, aspirational luxury living atmosphere.`
    },
    {
      type: 'architecture',
      prompt: `Modern luxury villa exterior in ${cityName}, Costa del Sol. Contemporary Mediterranean architecture with floor-to-ceiling glass windows, infinity pool overlooking the sea, designer outdoor furniture, lush landscaping with palm trees and bougainvillea. Premium real estate photography, bright natural lighting, architectural digest quality, photorealistic detail, aspirational lifestyle.`
    },
    {
      type: 'amenities',
      prompt: `${cityName} Costa del Sol luxury amenities. Championship golf course with Mediterranean Sea views, or luxury marina with superyachts, or upscale beach club with infinity pools. Sunny Mediterranean atmosphere, vibrant colors, photorealistic high-quality travel photography, welcoming and exclusive feel.`
    },
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brochureId, regenerateOnly } = await req.json();

    if (!brochureId) {
      throw new Error('brochureId is required');
    }

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

    fal.config({ credentials: falKey.trim() });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the brochure
    const { data: brochure, error: fetchError } = await supabase
      .from('city_brochures')
      .select('*')
      .eq('id', brochureId)
      .single();

    if (fetchError || !brochure) {
      throw new Error(`Brochure not found: ${brochureId}`);
    }

    const cityName = brochure.name;
    const citySlug = brochure.slug;

    console.log(`🎨 Starting image generation for ${cityName}`);

    // Update status
    await supabase
      .from('city_brochures')
      .update({ generation_status: 'generating_images' })
      .eq('id', brochureId);

    const imagePrompts = getImagePrompts(cityName);
    const generatedImages: GeneratedImage[] = [];

    // Generate all 4 images
    for (const { type, prompt } of imagePrompts) {
      try {
        console.log(`🖼️ Generating ${type} image for ${cityName}...`);

        const result = await fal.subscribe("fal-ai/nano-banana-pro", {
          input: {
            prompt,
            aspect_ratio: type === 'hero' ? "16:9" : "4:3",
            resolution: "2K",
            num_images: 1,
            output_format: "png"
          },
          logs: true,
        }) as FalResult;

        if (result.images && result.images.length > 0) {
          const falUrl = result.images[0].url;
          
          // Upload to Supabase Storage
          const permanentUrl = await uploadToStorage(
            falUrl, 
            supabase, 
            'article-images', 
            `brochure-${citySlug}-${type}`
          );

          generatedImages.push({
            type,
            url: permanentUrl,
            prompt,
          });

          console.log(`✅ ${type} image generated and uploaded`);
        }

      } catch (error) {
        console.error(`❌ Failed to generate ${type} image:`, error);
        // Continue with other images
      }
    }

    if (generatedImages.length === 0) {
      throw new Error('Failed to generate any images');
    }

    // Extract hero image and gallery images
    const heroImage = generatedImages.find(img => img.type === 'hero');
    const galleryImages = generatedImages.filter(img => img.type !== 'hero');

    // Format gallery images for storage
    const ai_gallery_images = galleryImages.map(img => ({
      type: img.type,
      image: img.url,
      prompt: img.prompt,
      title_i18n: {
        en: img.type === 'lifestyle' ? 'Mediterranean Lifestyle' :
            img.type === 'architecture' ? 'Luxury Architecture' :
            'World-Class Amenities'
      }
    }));

    // Update database
    const updateData: any = {
      images_generated: true,
      last_generated_at: new Date().toISOString(),
      ai_gallery_images,
    };

    if (heroImage) {
      updateData.ai_hero_image = heroImage.url;
    }

    // Set generation_status based on whether content is also generated
    const currentStatus = brochure.content_generated ? 'complete' : 'images_complete';
    updateData.generation_status = currentStatus;

    await supabase
      .from('city_brochures')
      .update(updateData)
      .eq('id', brochureId);

    console.log(`🏁 Image generation complete for ${cityName}`);

    return new Response(
      JSON.stringify({
        success: true,
        cityName,
        heroImage: heroImage?.url,
        galleryImages: ai_gallery_images,
        totalImages: generatedImages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Image generation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
