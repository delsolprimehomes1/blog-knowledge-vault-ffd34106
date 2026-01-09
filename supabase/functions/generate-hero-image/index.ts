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

    // Brighter prompt with luminous lighting
    const prompt = `A photorealistic, high-end lifestyle photograph of an attractive, successful couple in their late 50s relaxing in the backyard of their luxury modern Mediterranean villa in Costa del Sol. They are standing by the edge of a sleek infinity pool during BRIGHT golden hour with warm, luminous sunlight. The scene is BRIGHTLY LIT with soft, glowing ambient light - not dark or shadowy. They are holding crystal champagne flutes and making a toast, looking happy and relaxed. The foreground features high-end beige outdoor lounge furniture and manicured potted olive trees. The background offers a breathtaking panoramic view of the Mediterranean Sea and rolling mountains bathed in warm, BRIGHT sunset light with golden and amber tones. The atmosphere is serene, celebratory, and affluent. Shot in the style of Architectural Digest or Vogue Living, 8k resolution, bright warm lighting, soft shadows, cinematic depth of field.

IMPORTANT: Keep the lighting BRIGHT and LUMINOUS, avoid dark or moody shadows. The couple should be well-lit and clearly visible. Center the couple prominently in the middle of the frame.`;

    console.log('Generating brighter hero images for desktop and mobile...');
    
    // Generate desktop landscape images (16:9)
    const desktopResult = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: prompt,
        image_size: "landscape_16_9",
        num_inference_steps: 35,
        num_images: 3,
        guidance_scale: 7.5,
      },
      logs: true,
    }) as FalResult;

    // Generate mobile portrait images (4:3)
    const mobileResult = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: prompt,
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
        prompt: prompt 
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
