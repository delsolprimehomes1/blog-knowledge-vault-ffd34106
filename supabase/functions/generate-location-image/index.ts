import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      location_page_id,
      city_name, 
      city_slug,
      topic_slug,
      intent_type,
      image_prompt,
      regenerate = false
    } = await req.json();

    if (!city_name || !topic_slug) {
      return new Response(
        JSON.stringify({ error: 'city_name and topic_slug are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build location-specific image prompt
    const defaultPrompt = `Professional aerial photography of ${city_name}, Costa del Sol, Spain. 
Mediterranean coastline with azure waters, luxury villas and apartments, 
Spanish architecture, palm trees, golden beaches. 
Ultra high resolution, real estate marketing style, 
warm Mediterranean sunlight, no text overlays. 16:9 aspect ratio.`;

    const finalPrompt = image_prompt 
      ? `${image_prompt}. Ultra high resolution, 16:9 aspect ratio.`
      : defaultPrompt;

    console.log('Generating location image for:', city_name, topic_slug);
    console.log('Using prompt:', finalPrompt);

    // Generate image using Gemini
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Image API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Image API error: ${response.status}`);
    }

    const aiData = await response.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData || !imageData.startsWith('data:image')) {
      console.error('No valid image data in response:', aiData);
      throw new Error('No valid image data received from AI');
    }

    // Extract base64 data and mime type
    const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 image format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';

    // Convert base64 to Uint8Array for upload
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${city_slug || city_name.toLowerCase().replace(/\s+/g, '-')}/${topic_slug}-${timestamp}.${extension}`;

    console.log('Uploading image to storage:', fileName);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('location-images')
      .upload(fileName, bytes, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year cache
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('location-images')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Generate SEO-optimized alt text and caption
    const altText = `Aerial view of ${city_name}, Costa del Sol showing Mediterranean coastline, luxury properties, and ${intent_type?.replace(/-/g, ' ') || 'real estate'} opportunities`;
    
    const caption = `${city_name}, Costa del Sol - Premium real estate destination featuring stunning Mediterranean views, world-class amenities, and exceptional investment opportunities in Southern Spain.`;

    console.log('Image uploaded successfully:', publicUrl);

    // If location_page_id is provided, update the database
    if (location_page_id) {
      const { error: updateError } = await supabase
        .from('location_pages')
        .update({
          featured_image_url: publicUrl,
          featured_image_alt: altText,
          featured_image_caption: caption,
          featured_image_width: 1920,
          featured_image_height: 1080,
          updated_at: new Date().toISOString()
        })
        .eq('id', location_page_id);

      if (updateError) {
        console.error('Failed to update location page:', updateError);
        // Don't throw - image was still generated successfully
      } else {
        console.log('Location page updated with new image');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        image: {
          url: publicUrl,
          alt: altText,
          caption: caption,
          width: 1920,
          height: 1080,
          format: extension,
          fileName
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-location-image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
