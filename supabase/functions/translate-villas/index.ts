import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_LANGS = ["nl", "fr", "de", "fi", "pl", "da", "hu", "sv", "no"];

const LANG_NAMES: Record<string, string> = {
  nl: "Dutch", fr: "French", de: "German", fi: "Finnish",
  pl: "Polish", da: "Danish", hu: "Hungarian", sv: "Swedish", no: "Norwegian",
};

async function translateWithAI(texts: Record<string, string>, targetLang: string): Promise<Record<string, string>> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const langName = LANG_NAMES[targetLang] || targetLang;

  const prompt = `Translate the following JSON values from English to ${langName}. 
Keep all JSON keys exactly the same. Return ONLY valid JSON with the translated values.
Do NOT translate Spanish place names (like Marbella, Estepona, Benahavís, Costa del Sol, etc.) - keep them as-is.
Do NOT translate brand names like "Del Sol Prime Homes".
For property types, translate naturally: villa→villa, townhouse→local equivalent.

${JSON.stringify(texts, null, 2)}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a professional real estate translator. Return ONLY valid JSON." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI gateway error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Extract JSON from possible markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  const jsonStr = jsonMatch[1]!.trim();

  return JSON.parse(jsonStr);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetLangs: string[] = body.languages || TARGET_LANGS;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch English page content
    const { data: pageContent, error: pageErr } = await supabase
      .from("villas_page_content")
      .select("*")
      .eq("language", "en")
      .single();

    if (pageErr || !pageContent) {
      throw new Error(`Failed to fetch English villas page content: ${pageErr?.message}`);
    }

    // 2. Fetch English properties
    const { data: properties, error: propErr } = await supabase
      .from("villas_properties")
      .select("*")
      .eq("language", "en")
      .eq("visible", true)
      .order("display_order");

    if (propErr) {
      throw new Error(`Failed to fetch English villas properties: ${propErr?.message}`);
    }

    const props = properties || [];

    // 3. Assign property_group_id to English properties that don't have one
    for (const prop of props) {
      if (!prop.property_group_id) {
        const groupId = crypto.randomUUID();
        await supabase
          .from("villas_properties")
          .update({ property_group_id: groupId })
          .eq("id", prop.id);
        prop.property_group_id = groupId;
      }
    }

    const results: Record<string, { pageContent: boolean; properties: number; error?: string }> = {};

    // 4. Translate for each target language
    for (const lang of targetLangs) {
      try {
        console.log(`Translating villas to ${lang}...`);

        // Build page content text fields to translate
        const pageTexts: Record<string, string> = {
          headline: pageContent.headline || "",
          subheadline: pageContent.subheadline || "",
          cta_text: pageContent.cta_text || "",
          meta_title: pageContent.meta_title || "",
          meta_description: pageContent.meta_description || "",
          hero_image_alt: pageContent.hero_image_alt || "",
        };

        // Build property text fields (batch all properties in one call)
        const propertyTexts: Record<string, string> = {};
        for (let i = 0; i < props.length; i++) {
          const p = props[i];
          propertyTexts[`prop_${i}_title`] = p.title || "";
          propertyTexts[`prop_${i}_short_description`] = p.short_description || "";
          propertyTexts[`prop_${i}_description`] = p.description || "";
          propertyTexts[`prop_${i}_featured_image_alt`] = p.featured_image_alt || "";
        }

        // Combine into one translation call
        const allTexts = { ...pageTexts, ...propertyTexts };
        const translated = await translateWithAI(allTexts, lang);

        // 5. Check if page content row exists for this language
        const { data: existing } = await supabase
          .from("villas_page_content")
          .select("id")
          .eq("language", lang)
          .maybeSingle();

        const pagePayload = {
          language: lang,
          headline: translated.headline || pageTexts.headline,
          subheadline: translated.subheadline || pageTexts.subheadline,
          cta_text: translated.cta_text || pageTexts.cta_text,
          meta_title: translated.meta_title || pageTexts.meta_title,
          meta_description: translated.meta_description || pageTexts.meta_description,
          hero_image_alt: translated.hero_image_alt || pageTexts.hero_image_alt,
          hero_image_url: pageContent.hero_image_url,
          is_published: true,
          updated_at: new Date().toISOString(),
        };

        let upsertErr = null;
        if (existing) {
          const { error } = await supabase
            .from("villas_page_content")
            .update(pagePayload)
            .eq("id", existing.id);
          upsertErr = error;
        } else {
          const { error } = await supabase
            .from("villas_page_content")
            .insert(pagePayload);
          upsertErr = error;
        }

        if (upsertErr) {
          console.error(`Page content upsert error for ${lang}:`, upsertErr);
        }

        // 6. Delete existing properties for this language (clean slate)
        await supabase
          .from("villas_properties")
          .delete()
          .eq("language", lang);

        // 7. Insert translated properties
        let propCount = 0;
        for (let i = 0; i < props.length; i++) {
          const p = props[i];
          const { error: insertErr } = await supabase
            .from("villas_properties")
            .insert({
              language: lang,
              title: translated[`prop_${i}_title`] || p.title,
              short_description: translated[`prop_${i}_short_description`] || p.short_description,
              description: translated[`prop_${i}_description`] || p.description,
              featured_image_alt: translated[`prop_${i}_featured_image_alt`] || p.featured_image_alt,
              // Copy all non-text fields exactly
              featured_image_url: p.featured_image_url,
              gallery_images: p.gallery_images,
              price: p.price,
              currency: p.currency,
              bedrooms: p.bedrooms,
              bedrooms_max: p.bedrooms_max,
              bathrooms: p.bathrooms,
              sqm: p.sqm,
              location: p.location,
              property_type: p.property_type,
              property_group_id: p.property_group_id,
              display_order: p.display_order,
              visible: p.visible,
              status: p.status,
              featured: p.featured,
              features: p.features,
              partner_source: p.partner_source,
              partner_logo: p.partner_logo,
              slug: p.slug,
            });

          if (insertErr) {
            console.error(`Property insert error for ${lang}, prop ${i}:`, insertErr);
          } else {
            propCount++;
          }
        }

        results[lang] = { pageContent: !upsertErr, properties: propCount };
        console.log(`${lang}: page=${!upsertErr}, properties=${propCount}/${props.length}`);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));

      } catch (langErr) {
        console.error(`Error translating villas to ${lang}:`, langErr);
        results[lang] = { pageContent: false, properties: 0, error: String(langErr) };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Villas translation error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
