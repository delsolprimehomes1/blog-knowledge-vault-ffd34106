import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_LANGUAGES = ["en", "de", "nl", "fr", "pl", "sv", "da", "hu", "fi", "no"];

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  nl: "Dutch",
  fr: "French",
  pl: "Polish",
  sv: "Swedish",
  da: "Danish",
  hu: "Hungarian",
  fi: "Finnish",
  no: "Norwegian",
};

// Spanish terms that should NEVER be translated
const SPANISH_TERMS = [
  "NIE", "NIF", "TIE", "IBI", "ITP", "AJD", "IVA", "IRNR", "Plusvalía",
  "Escritura", "Nota Simple", "Catastro", "Registro de la Propiedad",
  "Notario", "Gestoría", "Abogado", "Procurador", "Tasador", "API",
  "Arras", "Señal", "Contrato de Arras", "Poder Notarial", "Cédula de Habitabilidad",
  "Licencia de Primera Ocupación", "LPO", "Certificado Energético",
  "Comunidad de Propietarios", "Presidente", "Administrador",
  "Cuota de Comunidad", "Derrama", "Acta de la Junta",
  "Finca", "Parcela", "Solar", "Urbanización", "Cortijo",
  "Golden Visa", "Non-Lucrative Visa", "Digital Nomad Visa",
  "Padrón", "Empadronamiento", "Residencia", "Tarjeta de Residencia",
  "Hacienda", "Agencia Tributaria", "Modelo 210", "Modelo 720",
  "Impuesto sobre la Renta", "Impuesto de Patrimonio",
  "Costa del Sol", "Andalucía", "Málaga", "Marbella", "Estepona",
  "Mijas", "Fuengirola", "Benalmádena", "Torremolinos", "Nerja",
  "Ronda", "Antequera", "Frigiliana", "Casares", "Manilva", "Benahavís",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetLanguage, generateAll } = await req.json();

    // If generateAll is true, process all non-English languages
    const languagesToProcess = generateAll 
      ? SUPPORTED_LANGUAGES.filter(l => l !== "en")
      : [targetLanguage];

    if (!generateAll && !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "targetLanguage is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!generateAll && !SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      return new Response(
        JSON.stringify({ error: `Unsupported language: ${targetLanguage}. Supported: ${SUPPORTED_LANGUAGES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the English glossary from storage
    const { data: englishGlossary, error: fetchError } = await supabase.storage
      .from("glossary-translations")
      .download("en.json");

    let sourceGlossary: any;
    
    if (fetchError || !englishGlossary) {
      // Try to fetch from public folder via HTTP
      console.log("Fetching English glossary from public folder...");
      const publicResponse = await fetch("https://www.delsolprimehomes.com/glossary/en.json");
      if (!publicResponse.ok) {
        throw new Error("Could not fetch English glossary source");
      }
      sourceGlossary = await publicResponse.json();
      
      // Upload English version to storage for future use
      await supabase.storage
        .from("glossary-translations")
        .upload("en.json", JSON.stringify(sourceGlossary, null, 2), {
          contentType: "application/json",
          upsert: true,
        });
    } else {
      const text = await englishGlossary.text();
      sourceGlossary = JSON.parse(text);
    }

    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const lang of languagesToProcess) {
      if (lang === "en") {
        results[lang] = { success: true };
        continue;
      }

      console.log(`Translating glossary to ${LANGUAGE_NAMES[lang]} (${lang})...`);

      try {
        const translatedGlossary = await translateGlossary(
          sourceGlossary,
          lang,
          LOVABLE_API_KEY
        );

        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from("glossary-translations")
          .upload(`${lang}.json`, JSON.stringify(translatedGlossary, null, 2), {
            contentType: "application/json",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Failed to upload ${lang}.json:`, uploadError);
          results[lang] = { success: false, error: uploadError.message };
        } else {
          console.log(`Successfully uploaded ${lang}.json`);
          results[lang] = { success: true };
        }
      } catch (err) {
        console.error(`Failed to translate to ${lang}:`, err);
        results[lang] = { success: false, error: err instanceof Error ? err.message : "Unknown error" };
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: generateAll 
          ? `Processed ${languagesToProcess.length} languages`
          : `Translated to ${targetLanguage}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("translate-glossary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function translateGlossary(
  sourceGlossary: any,
  targetLang: string,
  apiKey: string
): Promise<any> {
  const targetLanguageName = LANGUAGE_NAMES[targetLang];
  
  // Clone the structure
  const translatedGlossary = {
    version: sourceGlossary.version,
    last_updated: new Date().toISOString(),
    total_terms: sourceGlossary.total_terms,
    categories: {} as Record<string, any>,
  };

  // Process each category
  for (const [categoryKey, category] of Object.entries(sourceGlossary.categories as Record<string, any>)) {
    console.log(`  Translating category: ${categoryKey}...`);
    
    const translatedCategory = await translateCategory(category, targetLang, targetLanguageName, apiKey);
    translatedGlossary.categories[categoryKey] = translatedCategory;
  }

  return translatedGlossary;
}

async function translateCategory(
  category: any,
  targetLang: string,
  targetLanguageName: string,
  apiKey: string
): Promise<any> {
  const systemPrompt = `You are a professional translator specializing in real estate and legal terminology translation from English to ${targetLanguageName}.

CRITICAL RULES:
1. KEEP ALL Spanish terms UNCHANGED. These include but are not limited to: ${SPANISH_TERMS.slice(0, 30).join(", ")}, etc.
2. KEEP all proper nouns unchanged: Costa del Sol, Andalucía, Málaga, Marbella, Spain, etc.
3. KEEP all abbreviations that are Spanish or universal: NIE, NIF, IBI, IVA, etc.
4. Translate ONLY the English descriptive text to ${targetLanguageName}
5. Maintain professional real estate/legal terminology appropriate for ${targetLanguageName} speakers
6. Output must be valid JSON that matches the input structure exactly
7. Do not add any explanations outside the JSON

Translate the category title, description, and each term's definition.`;

  const userPrompt = `Translate this glossary category to ${targetLanguageName}. Return ONLY valid JSON:

${JSON.stringify(category, null, 2)}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse the JSON from the response
  try {
    // Try to extract JSON if wrapped in markdown code blocks
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    throw new Error(`Failed to parse translated JSON: ${parseError}`);
  }
}
