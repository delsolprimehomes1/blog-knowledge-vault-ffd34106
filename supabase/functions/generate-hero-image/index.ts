import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

    fal.config({ credentials: falKey.trim() });

    // Desktop prompt - couple on RIGHT side
    const desktopPrompt = `A photorealistic, high-end lifestyle photograph of an attractive couple in their late 50s relaxing at a luxury modern Mediterranean villa in Costa del Sol. The couple is positioned on the RIGHT SIDE of the frame, sitting intimately together on a plush beige outdoor lounge sofa. They are holding champagne glasses and leaning into each other warmly. A champagne bottle in an ice bucket sits nearby with fruit. The villa features modern architecture with natural stone walls and large glass doors. The foreground has potted olive trees and Mediterranean plants. An infinity pool with sleek glass railing is visible, with a breathtaking panoramic view of the Mediterranean Sea and rolling hills in the background. WARM GOLDEN HOUR lighting - soft, luminous, and well-exposed with a gradient sky from soft peach to pale blue. Beige, cream, and taupe color palette. Shot in the style of Architectural Digest, 8k resolution, wide establishing shot, cinematic depth of field. IMPORTANT: Keep the LEFT side of the image clear of people - show villa architecture and landscaping there. Couple must be on the RIGHT third of the frame.`;

    // Mobile prompt - couple CENTERED
    const mobilePrompt = `A photorealistic, high-end lifestyle photograph of an attractive couple in their late 50s relaxing at a luxury modern Mediterranean villa in Costa del Sol. The couple is positioned in the CENTER of the frame, sitting intimately together on a plush beige outdoor lounge sofa. They are holding champagne glasses and leaning into each other warmly. A champagne bottle in an ice bucket sits nearby with fruit. The villa features modern architecture with natural stone walls. Potted olive trees frame the scene. An infinity pool with glass railing is visible, with Mediterranean Sea views in the background. WARM GOLDEN HOUR lighting - soft, luminous, and well-exposed. Beige, cream, and taupe color palette. Shot in the style of Architectural Digest, 8k resolution, portrait-friendly composition, cinematic depth of field. IMPORTANT: Couple must be CENTERED in the frame for portrait crop.`;

    console.log('Generating hero images with couple positioning...');
    
    // Generate desktop landscape images (16:9) - couple on RIGHT
    const desktopResult = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: desktopPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 35,
        num_images: 3,
        guidance_scale: 7.5,
      },
      logs: true,
    }) as FalResult;

    // Generate mobile portrait images (4:3) - couple CENTERED
    const mobileResult = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: mobilePrompt,
        image_size: "portrait_4_3",
        num_inference_steps: 35,
        num_images: 3,
        guidance_scale: 7.5,
      },
      logs: true,
    }) as FalResult;

    console.log('Desktop images generated:', desktopResult.images.length);
    console.log('Mobile images generated:', mobileResult.images.length);

    return new Response(
      JSON.stringify({ 
        desktop: desktopResult.images,
        mobile: mobileResult.images,
        desktopPrompt: desktopPrompt,
        mobilePrompt: mobilePrompt
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error generating hero image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
