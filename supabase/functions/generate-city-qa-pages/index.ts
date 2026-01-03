import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  nl: 'Dutch',
  fr: 'French',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  hu: 'Hungarian',
  fi: 'Finnish',
  no: 'Norwegian',
};

const ALL_SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

// City-specific data for hyper-local Q&A generation
const CITY_DATA: Record<string, {
  name: string;
  neighborhoods: string[];
  lifestyleKeywords: string[];
  propertyTypes: string[];
  uniqueFeatures: string[];
  questionThemes: string[];
}> = {
  marbella: {
    name: 'Marbella',
    neighborhoods: ['Golden Mile', 'Puerto Banús', 'Nueva Andalucía', 'Sierra Blanca', 'Los Monteros', 'Guadalmina'],
    lifestyleKeywords: ['luxury', 'glamour', 'international', 'marina', 'golf', 'beach-clubs'],
    propertyTypes: ['luxury-villas', 'beachfront-apartments', 'penthouses', 'golf-properties'],
    uniqueFeatures: ['Puerto Banús marina', 'Golden Mile', 'luxury beach clubs', 'Michelin restaurants', 'international schools'],
    questionThemes: ['Is Marbella too expensive for normal people?', 'Is Puerto Banús worth the hype?', 'Is Marbella safe at night?', 'Can you live in Marbella on a budget?'],
  },
  estepona: {
    name: 'Estepona',
    neighborhoods: ['Old Town', 'El Paraiso', 'Cancelada', 'New Golden Mile', 'Seghers'],
    lifestyleKeywords: ['authentic', 'flowers', 'charming', 'family-friendly', 'beaches', 'promenade'],
    propertyTypes: ['modern-apartments', 'townhouses', 'beachfront', 'new-developments'],
    uniqueFeatures: ['flower murals', 'authentic Old Town', 'orchid house', 'Sunday market', 'paseo marítimo'],
    questionThemes: ['Is Estepona more authentic than Marbella?', 'Is Estepona good for year-round living?', 'Is Estepona safe for families?', 'Does Estepona have good public transport?'],
  },
  sotogrande: {
    name: 'Sotogrande',
    neighborhoods: ['La Reserva', 'Sotogrande Alto', 'Sotogrande Costa', 'Marina', 'Kings & Queens'],
    lifestyleKeywords: ['exclusive', 'golf', 'polo', 'marina', 'privacy', 'prestige'],
    propertyTypes: ['estates', 'golf-villas', 'marina-apartments', 'frontline-golf'],
    uniqueFeatures: ['Real Club de Golf Valderrama', 'Santa María Polo Club', 'private marina', 'international schools', 'gated communities'],
    questionThemes: ['Is Sotogrande only for the ultra-wealthy?', 'Can families afford Sotogrande?', 'Is Sotogrande isolated from other towns?', 'Is Sotogrande boring for young people?'],
  },
  'malaga-city': {
    name: 'Málaga City',
    neighborhoods: ['Centro Histórico', 'Soho', 'Malagueta', 'El Limonar', 'Teatinos'],
    lifestyleKeywords: ['urban', 'culture', 'gastronomy', 'museums', 'nightlife', 'connectivity'],
    propertyTypes: ['city-apartments', 'penthouses', 'historic-conversions', 'new-developments'],
    uniqueFeatures: ['Picasso Museum', 'Alcazaba', 'tech hub status', 'AVE high-speed train', 'international airport'],
    questionThemes: ['Is Málaga City better than coastal towns?', 'Is Málaga City good for digital nomads?', 'Is Málaga City walkable?', 'Is Málaga too hot in summer?'],
  },
  fuengirola: {
    name: 'Fuengirola',
    neighborhoods: ['Los Boliches', 'Carvajal', 'Torreblanca', 'Myramar'],
    lifestyleKeywords: ['family', 'beaches', 'promenade', 'international', 'amenities', 'active'],
    propertyTypes: ['beachfront-apartments', 'family-homes', 'new-developments'],
    uniqueFeatures: ['8km beach promenade', 'Sohail Castle', 'zoo', 'large expat community', 'Cercanías train'],
    questionThemes: ['Is Fuengirola overcrowded in summer?', 'Is Fuengirola good for British expats?', 'Is Fuengirola walkable year-round?', 'Is Fuengirola too touristy?'],
  },
  benalmadena: {
    name: 'Benalmádena',
    neighborhoods: ['Puerto Marina', 'Benalmádena Pueblo', 'Benalmádena Costa', 'Arroyo de la Miel'],
    lifestyleKeywords: ['marina', 'cable-car', 'hillside', 'views', 'entertainment', 'family'],
    propertyTypes: ['marina-apartments', 'hillside-villas', 'new-developments'],
    uniqueFeatures: ['Teleférico cable car', 'Puerto Marina', 'Buddhist stupa', 'Tivoli World', 'Sea Life aquarium'],
    questionThemes: ['Can you walk everywhere in Benalmádena?', 'Is Benalmádena good for families?', 'Is Benalmádena Pueblo too hilly?', 'Is Benalmádena Costa overcrowded?'],
  },
  mijas: {
    name: 'Mijas',
    neighborhoods: ['Mijas Pueblo', 'La Cala de Mijas', 'Mijas Golf', 'Riviera del Sol', 'Calahonda'],
    lifestyleKeywords: ['white-village', 'mountains', 'authentic', 'donkeys', 'views', 'traditional'],
    propertyTypes: ['village-houses', 'hillside-villas', 'golf-properties', 'new-developments'],
    uniqueFeatures: ['white village aesthetics', 'donkey taxis', 'panoramic views', 'multiple golf courses', 'traditional festivals'],
    questionThemes: ['Is Mijas Pueblo too isolated without a car?', 'Is Mijas good for golf lovers?', 'Can you live in Mijas without speaking Spanish?', 'Is Mijas Pueblo authentic or too touristy?'],
  },
  casares: {
    name: 'Casares',
    neighborhoods: ['White Village', 'Casares Costa', 'Secadero', 'Doña Julia Golf'],
    lifestyleKeywords: ['white-village', 'authentic', 'mountains', 'golf', 'tranquil', 'traditional'],
    propertyTypes: ['village-houses', 'golf-villas', 'new-developments', 'country-estates'],
    uniqueFeatures: ['dramatic hilltop location', 'Roman baths', 'Blas Infante birthplace', 'unspoiled village', 'Finca Cortesín nearby'],
    questionThemes: ['Is Casares too rural for modern living?', 'Is Casares good for retirees?', 'Can you live in Casares without a car?', 'Is Casares Costa different from Casares village?'],
  },
  manilva: {
    name: 'Manilva',
    neighborhoods: ['Manilva Pueblo', 'San Luis de Sabinillas', 'Duquesa Marina', 'Castillo de la Duquesa'],
    lifestyleKeywords: ['marina', 'vineyards', 'authentic', 'beaches', 'peaceful', 'wine'],
    propertyTypes: ['marina-apartments', 'beachfront', 'townhouses', 'new-developments'],
    uniqueFeatures: ['Moscatel wine production', 'Duquesa Marina', 'Roman fish factories', 'authentic pueblo', 'unspoiled beaches'],
    questionThemes: ['Is Duquesa Marina as nice as Puerto Banús?', 'Is Manilva too far from Marbella?', 'Is Manilva good for wine lovers?', 'Is Sabinillas good for families?'],
  },
  torremolinos: {
    name: 'Torremolinos',
    neighborhoods: ['La Carihuela', 'Centro', 'Playamar', 'El Bajondillo', 'Montemar'],
    lifestyleKeywords: ['beaches', 'nightlife', 'accessibility', 'promenade', 'tourism', 'vibrant'],
    propertyTypes: ['beachfront-apartments', 'city-apartments', 'new-developments', 'penthouses'],
    uniqueFeatures: ['La Carihuela chiringuitos', 'proximity to Málaga airport', 'LGBTQ+ friendly', 'historic tourism heritage', 'Cercanías train connection'],
    questionThemes: ['Is Torremolinos still relevant in 2025?', 'Is Torremolinos good for nightlife?', 'Is Torremolinos walkable?', 'Has Torremolinos improved in recent years?'],
  },
};

// Universal questions for all cities
const UNIVERSAL_QUESTIONS = [
  { theme: 'walkability', template: 'Is {city} walkable?' },
  { theme: 'remote-work', template: 'Is {city} good for remote workers?' },
  { theme: 'families', template: 'Is {city} good for families with children?' },
  { theme: 'retirees', template: 'Is {city} good for retirees?' },
  { theme: 'safety', template: 'Is {city} safe to live in?' },
  { theme: 'cost-of-living', template: 'What is the cost of living in {city}?' },
  { theme: 'healthcare', template: 'Is healthcare good in {city}?' },
  { theme: 'public-transport', template: 'Does {city} have good public transport?' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { citySlugs, languages = ['en'], jobId } = await req.json();

    console.log('Starting city QA generation for cities:', citySlugs);
    console.log('Languages:', languages);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine languages
    const isAllLanguages = languages.includes('all') || languages[0] === 'all';
    const targetLanguages = isAllLanguages ? ALL_SUPPORTED_LANGUAGES : languages;

    // Create job for tracking
    let job;
    if (jobId) {
      const { data } = await supabase.from('qa_generation_jobs').select('*').eq('id', jobId).single();
      job = data;
    } else {
      const totalQuestions = citySlugs.length * 10 * targetLanguages.length; // ~10 questions per city per language
      const { data, error } = await supabase
        .from('qa_generation_jobs')
        .insert({
          user_id: null,
          status: 'running',
          mode: 'city-qa',
          languages: targetLanguages,
          article_ids: [], // Not using article IDs for city QA
          total_articles: citySlugs.length,
          total_faq_pages: totalQuestions,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      job = data;
    }

    const results: any[] = [];
    let processedCities = 0;
    let generatedQaPages = 0;

    for (const citySlug of citySlugs) {
      const cityData = CITY_DATA[citySlug];
      if (!cityData) {
        console.error(`No city data found for: ${citySlug}`);
        continue;
      }

      console.log(`Processing city: ${cityData.name}`);

      for (const lang of targetLanguages) {
        const targetLanguageName = LANGUAGE_NAMES[lang] || 'English';
        
        // Combine universal questions with city-specific themes
        const allQuestions = [
          ...UNIVERSAL_QUESTIONS.map(q => q.template.replace('{city}', cityData.name)),
          ...cityData.questionThemes.slice(0, 2), // Add 2 city-specific questions
        ];

        // Generate 8-10 questions per city
        const questionsToGenerate = allQuestions.slice(0, 10);

        const prompt = `You are generating hyper-specific, AI-ready Q&A pages for ${cityData.name} on the Costa del Sol, Spain.

CRITICAL: ALL OUTPUT MUST BE IN ${targetLanguageName}. Every word must be native ${targetLanguageName}.

CITY CONTEXT:
- City Name: ${cityData.name}
- Neighborhoods: ${cityData.neighborhoods.join(', ')}
- Lifestyle: ${cityData.lifestyleKeywords.join(', ')}
- Unique Features: ${cityData.uniqueFeatures.join(', ')}

Generate Q&A pages answering these REAL user questions:
${questionsToGenerate.map((q, i) => `${i + 1}. ${q}`).join('\n')}

For EACH question, return a JSON object with:
{
  "qa_type": "city-specific",
  "category": "City Intelligence",
  "city_slug": "${citySlug}",
  "title": "Full page title in ${targetLanguageName} (50-60 chars)",
  "slug": "url-friendly-slug-in-${lang}",
  "question_main": "The primary question in ${targetLanguageName}",
  "answer_main": "Complete, honest, helpful answer with neighborhood-level detail. HTML format, 250-400 words in ${targetLanguageName}. Include specific examples, pros/cons, and practical advice.",
  "related_qas": [
    {"question": "Related follow-up Q1 in ${targetLanguageName}", "answer": "Short helpful answer"},
    {"question": "Related follow-up Q2 in ${targetLanguageName}", "answer": "Short helpful answer"}
  ],
  "speakable_answer": "SINGLE PARAGRAPH verdict (80-120 words, max 150) in ${targetLanguageName}. NO lists, NO bullets, NO line breaks. Complete sentences ending with period. Self-contained and AI-quotable.",
  "meta_title": "SEO title ≤60 chars in ${targetLanguageName}",
  "meta_description": "SEO description ≤160 chars in ${targetLanguageName}"
}

IMPORTANT GUIDELINES:
- Be HONEST about drawbacks and limitations
- Include specific neighborhood names when relevant
- Mention practical details (distances, costs, amenities)
- Make the speakable_answer perfect for voice search and AI citation
- Each Q&A should be self-contained and complete

Return a JSON array with ${questionsToGenerate.length} objects. No markdown, no explanation, just valid JSON.`;

        try {
          console.log(`Generating ${questionsToGenerate.length} Q&A pages for ${cityData.name} in ${targetLanguageName}`);
          
          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: `You are an expert Costa del Sol local guide and SEO content generator. You write in perfect ${targetLanguageName} with deep local knowledge. Return only valid JSON arrays, no markdown.` },
                { role: 'user', content: prompt }
              ],
              max_tokens: 8000,
            }),
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('AI API error:', errorText);
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          let qaPagesData;
          
          try {
            let content = aiData.choices?.[0]?.message?.content || '';
            content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            qaPagesData = JSON.parse(content);
          } catch (parseError) {
            console.error('Failed to parse AI response:', aiData.choices?.[0]?.message?.content);
            throw new Error('Failed to parse AI response as JSON');
          }

          // Save each Q&A page
          for (const qaData of qaPagesData) {
            try {
              const baseSlug = qaData.slug || `${citySlug}-${qaData.question_main?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
              const slug = baseSlug.endsWith(`-${lang}`) ? baseSlug : `${baseSlug}-${lang}`;
              
              // Check for existing slug
              const { data: existing } = await supabase
                .from('qa_pages')
                .select('id')
                .eq('slug', slug)
                .single();

              if (existing) {
                console.log(`Q&A page already exists: ${slug}`);
                continue;
              }

              const { data: qaPage, error: insertError } = await supabase
                .from('qa_pages')
                .insert({
                  source_article_id: null,
                  language: lang,
                  qa_type: 'city-specific',
                  category: 'City Intelligence',
                  title: qaData.title,
                  slug,
                  question_main: qaData.question_main,
                  answer_main: qaData.answer_main,
                  related_qas: qaData.related_qas || [],
                  speakable_answer: qaData.speakable_answer,
                  meta_title: qaData.meta_title?.substring(0, 60) || qaData.title?.substring(0, 60),
                  meta_description: qaData.meta_description?.substring(0, 160) || '',
                  source_article_slug: citySlug, // Use city slug as reference
                  status: 'draft',
                })
                .select()
                .single();

              if (insertError) {
                console.error('Insert error:', insertError);
                continue;
              }

              generatedQaPages++;
              results.push({
                qa_page_id: qaPage.id,
                city_slug: citySlug,
                language: lang,
                qa_type: 'city-specific',
                title: qaData.title,
                slug,
              });
            } catch (saveError) {
              console.error(`Error saving Q&A page:`, saveError);
            }
          }

          // Small delay between API calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (langError) {
          console.error(`Error generating for ${cityData.name} in ${targetLanguageName}:`, langError);
          results.push({
            city_slug: citySlug,
            language: lang,
            error: langError instanceof Error ? langError.message : 'Unknown error',
          });
        }
      }

      processedCities++;
      
      // Update job progress
      await supabase
        .from('qa_generation_jobs')
        .update({
          processed_articles: processedCities,
          generated_faq_pages: generatedQaPages,
          results,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }

    // Link translations between Q&A pages from same city and question
    const qaPagesByQuestion: Record<string, any[]> = {};
    for (const result of results) {
      if (result.qa_page_id) {
        // Group by city + question theme (extracted from slug base)
        const slugBase = result.slug.replace(/-[a-z]{2}$/, '');
        const key = `${result.city_slug}-${slugBase}`;
        if (!qaPagesByQuestion[key]) qaPagesByQuestion[key] = [];
        qaPagesByQuestion[key].push(result);
      }
    }

    for (const pages of Object.values(qaPagesByQuestion)) {
      if (pages.length > 1) {
        const translations: Record<string, string> = {};
        for (const page of pages) {
          translations[page.language] = page.slug;
        }
        
        for (const page of pages) {
          await supabase
            .from('qa_pages')
            .update({ translations })
            .eq('id', page.qa_page_id);
        }
      }
    }

    // Mark job as completed
    await supabase
      .from('qa_generation_jobs')
      .update({
        status: 'completed',
        processed_articles: processedCities,
        generated_faq_pages: generatedQaPages,
        results,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log(`City QA generation completed. Generated ${generatedQaPages} Q&A pages for ${processedCities} cities.`);

    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      processedCities,
      generatedQaPages,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-city-qa-pages:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
