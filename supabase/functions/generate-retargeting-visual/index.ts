import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("[generate-retargeting-visual] Starting image generation with Nano Banana Pro...");

    // Generate image using Nano Banana Pro
    const prompt = `Professional, calm educational scene: A person thoughtfully reviewing real estate research documents in a bright, modern Mediterranean home office. Natural warm light streams through arched Spanish-style windows. Clean wooden desk with neatly arranged documents, a sleek laptop, and a ceramic coffee cup. Through the window, a glimpse of sunny Costa del Sol landscape with whitewashed buildings and palm trees. No logos, no visible text on documents. Peaceful, contemplative, sophisticated mood. 4:3 aspect ratio, warm natural lighting, high-end lifestyle photography, soft focus background, editorial quality.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-retargeting-visual] AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[generate-retargeting-visual] AI response received");

    // Extract base64 image from response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageData) {
      console.error("[generate-retargeting-visual] No image in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("No image generated");
    }

    // Parse base64 data
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid image data format");
    }

    const imageFormat = base64Match[1]; // png, jpeg, etc.
    const base64Content = base64Match[2];
    const imageBuffer = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));

    console.log(`[generate-retargeting-visual] Image decoded: ${imageFormat}, ${imageBuffer.length} bytes`);

    // Upload to Supabase Storage
    const fileName = `retargeting-visual-${Date.now()}.${imageFormat}`;
    const filePath = `retargeting/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(filePath, imageBuffer, {
        contentType: `image/${imageFormat}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-retargeting-visual] Upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("article-images")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log(`[generate-retargeting-visual] Image uploaded: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        format: imageFormat,
        size: imageBuffer.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[generate-retargeting-visual] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
