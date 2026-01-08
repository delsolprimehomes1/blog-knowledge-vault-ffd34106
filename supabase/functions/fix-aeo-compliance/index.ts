import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AEO Rules from Hans
const AEO_MAX_CHARS = 800;
const AEO_MAX_WORDS = 150;

// Truncate at sentence boundary for AEO compliance
function truncateAtSentence(text: string, maxChars: number = AEO_MAX_CHARS): string {
  if (!text || text.length <= maxChars) return text;
  
  // Find the last sentence ending before maxChars
  const truncated = text.substring(0, maxChars);
  
  // Look for sentence endings: . ! ? followed by space or end
  const sentenceEndPattern = /[.!?](?:\s|$)/g;
  let lastEnd = -1;
  let match;
  
  while ((match = sentenceEndPattern.exec(truncated)) !== null) {
    lastEnd = match.index + 1; // Include the punctuation
  }
  
  // If found a sentence ending, use it
  if (lastEnd > maxChars * 0.5) { // At least 50% of max length
    return text.substring(0, lastEnd).trim();
  }
  
  // Fallback: truncate at word boundary
  const wordBoundary = truncated.lastIndexOf(' ');
  if (wordBoundary > maxChars * 0.7) {
    return truncated.substring(0, wordBoundary).trim() + '...';
  }
  
  return truncated.trim() + '...';
}

// Enforce word count limit
function enforceWordLimit(text: string, maxWords: number = AEO_MAX_WORDS): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  
  // Take first maxWords words
  const truncated = words.slice(0, maxWords).join(' ');
  
  // Try to end at sentence boundary
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > truncated.length * 0.7) {
    return truncated.substring(0, lastSentenceEnd + 1).trim();
  }
  
  return truncated.trim() + '...';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to true for safety
    const contentType = body.contentType || 'qa'; // 'qa', 'blog', 'comparison', 'all'
    
    console.log(`[AEO Compliance] Starting (dryRun: ${dryRun}, contentType: ${contentType})...`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: Record<string, { found: number; fixed: number; samples: any[] }> = {};

    // Fix Q&A pages
    if (contentType === 'qa' || contentType === 'all') {
      const { data: qaPages, error: qaError } = await supabase
        .from('qa_pages')
        .select('id, slug, language, speakable_answer, answer_main')
        .not('speakable_answer', 'is', null);

      if (qaError) throw qaError;

      const violations = qaPages?.filter(qa => 
        qa.speakable_answer && (
          qa.speakable_answer.length > AEO_MAX_CHARS ||
          qa.speakable_answer.split(/\s+/).length > AEO_MAX_WORDS
        )
      ) || [];

      console.log(`[AEO] Found ${violations.length} Q&A pages with AEO violations`);

      const samples: any[] = [];
      let fixedCount = 0;

      for (const qa of violations) {
        // Apply truncation
        let fixed = truncateAtSentence(qa.speakable_answer, AEO_MAX_CHARS);
        fixed = enforceWordLimit(fixed, AEO_MAX_WORDS);

        const sample = {
          id: qa.id,
          slug: qa.slug,
          language: qa.language,
          original_chars: qa.speakable_answer.length,
          original_words: qa.speakable_answer.split(/\s+/).length,
          fixed_chars: fixed.length,
          fixed_words: fixed.split(/\s+/).length,
        };

        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('qa_pages')
            .update({ speakable_answer: fixed })
            .eq('id', qa.id);

          if (updateError) {
            console.error(`[AEO] Error fixing ${qa.id}:`, updateError);
          } else {
            fixedCount++;
          }
        }

        if (samples.length < 5) samples.push(sample);
      }

      results.qa = {
        found: violations.length,
        fixed: dryRun ? 0 : fixedCount,
        samples
      };
    }

    // Fix Blog articles
    if (contentType === 'blog' || contentType === 'all') {
      const { data: articles, error: blogError } = await supabase
        .from('blog_articles')
        .select('id, slug, language, speakable_answer')
        .not('speakable_answer', 'is', null);

      if (blogError) throw blogError;

      const violations = articles?.filter(a => 
        a.speakable_answer && (
          a.speakable_answer.length > AEO_MAX_CHARS ||
          a.speakable_answer.split(/\s+/).length > AEO_MAX_WORDS
        )
      ) || [];

      console.log(`[AEO] Found ${violations.length} blog articles with AEO violations`);

      const samples: any[] = [];
      let fixedCount = 0;

      for (const article of violations) {
        let fixed = truncateAtSentence(article.speakable_answer, AEO_MAX_CHARS);
        fixed = enforceWordLimit(fixed, AEO_MAX_WORDS);

        const sample = {
          id: article.id,
          slug: article.slug,
          language: article.language,
          original_chars: article.speakable_answer.length,
          original_words: article.speakable_answer.split(/\s+/).length,
          fixed_chars: fixed.length,
          fixed_words: fixed.split(/\s+/).length,
        };

        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('blog_articles')
            .update({ speakable_answer: fixed })
            .eq('id', article.id);

          if (!updateError) fixedCount++;
        }

        if (samples.length < 5) samples.push(sample);
      }

      results.blog = {
        found: violations.length,
        fixed: dryRun ? 0 : fixedCount,
        samples
      };
    }

    // Fix Comparison pages
    if (contentType === 'comparison' || contentType === 'all') {
      const { data: comparisons, error: compError } = await supabase
        .from('comparison_pages')
        .select('id, slug, language, speakable_answer')
        .not('speakable_answer', 'is', null);

      if (compError) throw compError;

      const violations = comparisons?.filter(c => 
        c.speakable_answer && (
          c.speakable_answer.length > AEO_MAX_CHARS ||
          c.speakable_answer.split(/\s+/).length > AEO_MAX_WORDS
        )
      ) || [];

      console.log(`[AEO] Found ${violations.length} comparison pages with AEO violations`);

      const samples: any[] = [];
      let fixedCount = 0;

      for (const comp of violations) {
        let fixed = truncateAtSentence(comp.speakable_answer, AEO_MAX_CHARS);
        fixed = enforceWordLimit(fixed, AEO_MAX_WORDS);

        const sample = {
          id: comp.id,
          slug: comp.slug,
          language: comp.language,
          original_chars: comp.speakable_answer.length,
          original_words: comp.speakable_answer.split(/\s+/).length,
          fixed_chars: fixed.length,
          fixed_words: fixed.split(/\s+/).length,
        };

        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('comparison_pages')
            .update({ speakable_answer: fixed })
            .eq('id', comp.id);

          if (!updateError) fixedCount++;
        }

        if (samples.length < 5) samples.push(sample);
      }

      results.comparison = {
        found: violations.length,
        fixed: dryRun ? 0 : fixedCount,
        samples
      };
    }

    const totalFound = Object.values(results).reduce((sum, r) => sum + r.found, 0);
    const totalFixed = Object.values(results).reduce((sum, r) => sum + r.fixed, 0);

    return new Response(JSON.stringify({
      dryRun,
      message: dryRun 
        ? `Found ${totalFound} AEO violations across content types`
        : `Fixed ${totalFixed} of ${totalFound} AEO violations`,
      aeoRules: {
        maxChars: AEO_MAX_CHARS,
        maxWords: AEO_MAX_WORDS
      },
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[AEO Compliance] Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
