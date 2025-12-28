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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { qaPageId, section } = await req.json();

    if (!qaPageId || !section) {
      return new Response(JSON.stringify({ error: 'qaPageId and section are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validSections = ['answer', 'speakable', 'meta', 'related_qas'];
    if (!validSections.includes(section)) {
      return new Response(JSON.stringify({ error: `Invalid section. Must be one of: ${validSections.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Q&A page
    const { data: qaPage, error: qaError } = await supabase
      .from('qa_pages')
      .select('*, blog_articles!source_article_id(headline, detailed_content)')
      .eq('id', qaPageId)
      .single();

    if (qaError || !qaPage) {
      return new Response(JSON.stringify({ error: 'Q&A page not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const languageName = LANGUAGE_NAMES[qaPage.language] || 'English';
    const article = qaPage.blog_articles;

    let prompt = '';
    let updateFields: Record<string, any> = {};

    switch (section) {
      case 'answer':
        prompt = `CRITICAL: Write the answer ENTIRELY in ${languageName}. No English unless target language IS English.

Based on this question: "${qaPage.question_main}"
And this article context: ${article?.detailed_content?.substring(0, 2000) || ''}

Generate a comprehensive, helpful, citeable answer in HTML format (300-500 words) in ${languageName}.
Return ONLY the HTML answer text, no JSON, no markdown code blocks.`;
        break;

      case 'speakable':
        prompt = `CRITICAL: Write the answer ENTIRELY in ${languageName}. No English unless target language IS English.

Based on this question: "${qaPage.question_main}"
And this answer: ${qaPage.answer_main.substring(0, 1000)}

Generate a short, citation-ready voice answer (50-80 words) suitable for voice assistants in ${languageName}.
Return ONLY the speakable text, no JSON, no markdown.`;
        break;

      case 'meta':
        prompt = `CRITICAL: Write ENTIRELY in ${languageName}. No English unless target language IS English.

Based on this Q&A page:
Title: ${qaPage.title}
Question: ${qaPage.question_main}

Generate SEO meta tags in ${languageName}:
1. meta_title: ≤60 characters
2. meta_description: ≤160 characters

Return JSON only: {"meta_title": "...", "meta_description": "..."}`;
        break;

      case 'related_qas':
        prompt = `CRITICAL: Write ENTIRELY in ${languageName}. No English unless target language IS English.

Based on this main question: "${qaPage.question_main}"
And article context: ${article?.detailed_content?.substring(0, 2000) || ''}

Generate 2-3 related Q&A questions and answers in ${languageName}.
Each answer should be 50-100 words.

Return JSON array only: [{"question": "...", "answer": "..."}, ...]`;
        break;
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert SEO content generator. Follow instructions exactly.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    switch (section) {
      case 'answer':
        updateFields.answer_main = content;
        break;
      case 'speakable':
        updateFields.speakable_answer = content;
        break;
      case 'meta':
        const metaData = JSON.parse(content);
        updateFields.meta_title = metaData.meta_title?.substring(0, 60);
        updateFields.meta_description = metaData.meta_description?.substring(0, 160);
        break;
      case 'related_qas':
        updateFields.related_qas = JSON.parse(content);
        break;
    }

    updateFields.updated_at = new Date().toISOString();

    const { data: updatedQa, error: updateError } = await supabase
      .from('qa_pages')
      .update(updateFields)
      .eq('id', qaPageId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      qaPage: updatedQa,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regenerate-qa-section:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
