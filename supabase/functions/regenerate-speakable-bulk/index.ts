import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English', 'de': 'German', 'nl': 'Dutch', 'fr': 'French',
  'pl': 'Polish', 'sv': 'Swedish', 'da': 'Danish', 'hu': 'Hungarian',
  'fi': 'Finnish', 'no': 'Norwegian'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articles } = await req.json();
    
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return new Response(JSON.stringify({ error: 'No articles provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: Array<{
      id: string;
      success: boolean;
      error?: string;
      newSpeakable?: string;
    }> = [];

    for (const article of articles) {
      try {
        const { id, headline, language, detailed_content } = article;
        const langName = LANGUAGE_NAMES[language] || 'English';
        
        // Extract key topic from content for better context
        const contentPreview = detailed_content?.substring(0, 500) || '';
        
        const speakablePrompt = `Write a 40-60 word speakable answer IN ${langName.toUpperCase()} for this article:

Language: ${langName} (${language})
Article Title: ${headline}
Content Preview: ${contentPreview}

Requirements:
- MUST be written entirely in ${langName}, NOT English (unless article is English)
- Conversational tone (use "you" and "your" equivalent in ${langName})
- Present tense, active voice
- Self-contained (no pronouns referring to previous context)
- Actionable (tell reader what to DO)
- No jargon
- Exactly 40-60 words

CRITICAL: The response MUST be in ${langName}. Do not write in English unless the article language IS English.

Return ONLY the speakable text in ${langName}, no JSON, no formatting, no quotes.`;

        console.log(`Generating speakable for article ${id} in ${langName}`);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: `You are a content writer who writes ONLY in ${langName}. Never respond in English unless explicitly asked for English content.` },
              { role: 'user', content: speakablePrompt }
            ],
            max_tokens: 256,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI API error for ${id}:`, errorText);
          results.push({ id, success: false, error: `AI API error: ${response.status}` });
          continue;
        }

        const data = await response.json();
        const newSpeakable = data.choices?.[0]?.message?.content?.trim();

        if (!newSpeakable || newSpeakable.length < 20) {
          results.push({ id, success: false, error: 'Invalid speakable response' });
          continue;
        }

        // Update the article in the database
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ 
            speakable_answer: newSpeakable,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error(`Database update error for ${id}:`, updateError);
          results.push({ id, success: false, error: updateError.message });
        } else {
          console.log(`Successfully updated speakable for article ${id}`);
          results.push({ id, success: true, newSpeakable });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (articleError) {
        console.error(`Error processing article ${article.id}:`, articleError);
        results.push({ 
          id: article.id, 
          success: false, 
          error: articleError instanceof Error ? articleError.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      successCount,
      errorCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regenerate-speakable-bulk:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
