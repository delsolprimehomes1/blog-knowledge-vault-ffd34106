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

    // Mobile-optimized prompt with centered composition
    const prompt = `A photorealistic, high-end lifestyle photograph of an attractive, successful couple in their late 50s relaxing in the backyard of their luxury modern Mediterranean villa in Costa del Sol. They are standing by the edge of a sleek infinity pool during golden hour, holding crystal champagne flutes and making a toast, looking happy and relaxed. The foreground features high-end beige outdoor lounge furniture and manicured potted olive trees. The background offers a breathtaking panoramic view of the Mediterranean Sea and rolling mountains bathed in warm sunset light. The atmosphere is serene, celebratory, and affluent. Shot in the style of Architectural Digest or Vogue Living, 8k resolution, warm lighting, cinematic depth of field.

IMPORTANT COMPOSITION: Center the couple prominently in the middle of the frame. Keep them in the center third of the image so they remain visible when cropped for mobile devices. Do not place subjects on the edges.`;

    console.log('Generating mobile-optimized hero image...');
    
    const result = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: prompt,
        image_size: "square_hd",
        num_inference_steps: 35,
        num_images: 3,
        guidance_scale: 7.5,
      },
      logs: true,
    }) as FalResult;

    console.log('Image generation complete:', result);

    return new Response(
      JSON.stringify({ 
        images: result.images,
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
