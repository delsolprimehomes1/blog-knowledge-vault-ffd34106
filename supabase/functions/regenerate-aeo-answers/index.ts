import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', de: 'German', nl: 'Dutch', fr: 'French',
  pl: 'Polish', sv: 'Swedish', da: 'Danish', hu: 'Hungarian',
  fi: 'Finnish', no: 'Norwegian',
};

// Anti-patterns that indicate bad formatting (Hans' AEO rules)
const BAD_PATTERNS = [
  /^\d+\.\s/m,
  /^[-*•]\s/m,
  /\n\s*\d+\.\s/,
  /\n\s*[-*•]\s/,
];

function hasBadFormatting(text: string): boolean {
  return BAD_PATTERNS.some(p => p.test(text));
}

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0).length;
}

async function regenerateAnswer(
  question: string,
  currentAnswer: string,
  language: string,
  apiKey: string
): Promise<string | null> {
  const languageName = LANGUAGE_NAMES[language] || 'English';
  
  const prompt = `Rewrite this answer as a SINGLE PARAGRAPH verdict following Hans' AEO rules.

QUESTION: ${question}

CURRENT ANSWER (WRONG FORMAT):
${currentAnswer.substring(0, 1000)}

HANS' AEO RULES (MANDATORY):
- Write as a SINGLE PARAGRAPH (80-120 words, max 150)
- NO lists, NO bullets, NO numbered points, NO line breaks
- Complete sentences ending with period
- Self-contained (AI can quote verbatim without context)
- Neutral, factual tone (no "we", no marketing)
- Max 800 characters
- Directly answers the question as a verdict/conclusion

WRONG: "There are 5 key steps: 1. Get an NIE 2. Find a lawyer 3. Open bank account..."
RIGHT: "Purchasing property in Costa del Sol involves obtaining a Spanish NIE, appointing an independent lawyer for due diligence, opening a Spanish bank account, signing a private purchase agreement with deposit, and finalizing the sale before a notary through the public deed of sale, after which the property is registered in the Land Registry."

Return ONLY the rewritten answer in ${languageName}. No JSON, no formatting, no quotes.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You rewrite answers in ${languageName} following Hans' AEO rules. Return ONLY the rewritten text.` },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();
    
    if (!rewritten) return null;
    
    // Validate the rewritten answer
    const words = countWords(rewritten);
    if (words < 60 || words > 200) {
      console.warn(`Rewritten answer has ${words} words, may need adjustment`);
    }
    
    if (hasBadFormatting(rewritten)) {
      console.warn('Rewritten answer still has bad formatting');
      return null;
    }
    
    return rewritten;
  } catch (error) {
    console.error('Regeneration error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contentType = 'qa_pages', // 'qa_pages' | 'blog_articles' | 'comparison_pages' | 'location_pages'
      batchSize = 10,
      dryRun = true,
      fixListsOnly = true, // Only fix answers with list patterns
    } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const apiKey = Deno.env.get('LOVABLE_API_KEY')!;

    console.log(`[AEO Fix] Starting for ${contentType}, batchSize=${batchSize}, dryRun=${dryRun}`);

    let badAnswers: any[] = [];
    
    if (contentType === 'qa_pages') {
      // Fetch Q&A pages with speakable_answer
      const { data, error } = await supabase
        .from('qa_pages')
        .select('id, question_main, speakable_answer, language')
        .not('speakable_answer', 'is', null)
        .limit(500);
      
      if (error) throw error;
      
      // Filter for bad formatting
      badAnswers = (data || []).filter(qa => {
        const answer = qa.speakable_answer || '';
        if (fixListsOnly) {
          return hasBadFormatting(answer);
        }
        const words = countWords(answer);
        return hasBadFormatting(answer) || words > 150 || words < 60;
      });
      
    } else if (contentType === 'blog_articles') {
      // Fetch blog articles with speakable_answer
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, speakable_answer, language')
        .eq('status', 'published')
        .not('speakable_answer', 'is', null)
        .limit(500);
      
      if (error) throw error;
      
      badAnswers = (data || []).filter(article => {
        const answer = article.speakable_answer || '';
        if (fixListsOnly) {
          return hasBadFormatting(answer);
        }
        const words = countWords(answer);
        return hasBadFormatting(answer) || words > 150 || words < 60;
      });
    }

    console.log(`[AEO Fix] Found ${badAnswers.length} items with bad formatting`);
    
    // Take batch
    const batch = badAnswers.slice(0, batchSize);
    
    const results = {
      scanned: badAnswers.length,
      processed: 0,
      fixed: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };

    for (const item of batch) {
      const question = item.question_main || item.headline || 'Unknown question';
      const currentAnswer = item.speakable_answer || '';
      const language = item.language || 'en';
      
      console.log(`[AEO Fix] Processing: ${question.substring(0, 50)}...`);
      
      const newAnswer = await regenerateAnswer(question, currentAnswer, language, apiKey);
      
      if (!newAnswer) {
        results.failed++;
        results.details.push({ id: item.id, status: 'failed', reason: 'Regeneration failed' });
        continue;
      }
      
      results.processed++;
      
      if (dryRun) {
        results.details.push({
          id: item.id,
          question: question.substring(0, 60),
          language,
          status: 'preview',
          before: {
            text: currentAnswer.substring(0, 200) + '...',
            words: countWords(currentAnswer),
            hasList: hasBadFormatting(currentAnswer),
          },
          after: {
            text: newAnswer.substring(0, 200) + '...',
            words: countWords(newAnswer),
            hasList: hasBadFormatting(newAnswer),
          },
        });
      } else {
        // Actually update the record
        const table = contentType === 'qa_pages' ? 'qa_pages' : 'blog_articles';
        const { error: updateError } = await supabase
          .from(table)
          .update({ speakable_answer: newAnswer })
          .eq('id', item.id);
        
        if (updateError) {
          results.failed++;
          results.details.push({ id: item.id, status: 'update_failed', error: updateError.message });
        } else {
          results.fixed++;
          results.details.push({ id: item.id, status: 'fixed' });
        }
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[AEO Fix] Complete: ${results.fixed} fixed, ${results.failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      contentType,
      dryRun,
      results,
      remaining: badAnswers.length - batch.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AEO Fix] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
