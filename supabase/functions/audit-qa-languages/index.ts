import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// English question patterns that indicate wrong language content
const ENGLISH_QUESTION_PATTERNS = [
  /^What /i,
  /^Should /i,
  /^How /i,
  /^When /i,
  /^Why /i,
  /^Can /i,
  /^Is /i,
  /^Are /i,
  /^Do /i,
  /^Does /i,
  /^Will /i,
  /^Which /i,
  /^Where /i,
  /^Who /i,
];

// English answer patterns (common sentence starters)
const ENGLISH_ANSWER_PATTERNS = [
  /^The /i,
  /^This /i,
  /^It /i,
  /^There /i,
  /^You /i,
  /^We /i,
  /^If /i,
  /^When /i,
  /^While /i,
  /^For /i,
  /^To /i,
  /^In /i,
  /^A /i,
  /^An /i,
];

/**
 * Detect if content is in English when it should be in another language
 */
function isEnglishContent(text: string, expectedLanguage: string): boolean {
  if (!text || expectedLanguage === 'en') return false;
  
  const trimmedText = text.trim();
  
  // Check question patterns
  const hasEnglishQuestionPattern = ENGLISH_QUESTION_PATTERNS.some(pattern => 
    pattern.test(trimmedText)
  );
  
  if (hasEnglishQuestionPattern) return true;
  
  // Check answer patterns (for answers)
  const hasEnglishAnswerPattern = ENGLISH_ANSWER_PATTERNS.some(pattern => 
    pattern.test(trimmedText)
  );
  
  // Additional heuristic: check for common English words
  const englishWords = ['the', 'is', 'are', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has'];
  const lowerText = trimmedText.toLowerCase();
  const wordCount = lowerText.split(/\s+/).length;
  const englishWordCount = englishWords.filter(word => 
    lowerText.includes(` ${word} `) || 
    lowerText.startsWith(`${word} `) || 
    lowerText.endsWith(` ${word}`)
  ).length;
  
  // If more than 30% of checked words are English markers, flag it
  if (wordCount > 10 && englishWordCount >= 3) {
    return true;
  }
  
  return hasEnglishAnswerPattern && englishWordCount >= 2;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Audit] Starting Q&A language audit...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all non-English Q&A pages
    const { data: qaPages, error: qaError } = await supabase
      .from('qa_pages')
      .select('id, language, question_main, answer_main, slug, source_article_id, qa_type')
      .neq('language', 'en')
      .order('language');

    if (qaError) {
      console.error('[Audit] Error fetching Q&A pages:', qaError);
      throw qaError;
    }

    console.log(`[Audit] Checking ${qaPages?.length || 0} non-English Q&A pages...`);

    const issues: Array<{
      qa_id: string;
      qa_language: string;
      qa_question: string;
      qa_answer_preview: string;
      qa_slug: string;
      qa_type: string;
      source_article_id: string | null;
      issue_type: string;
    }> = [];

    const issuesByLanguage: Record<string, number> = {};
    const issuesByType: Record<string, number> = { content_mismatch: 0 };

    for (const qa of qaPages || []) {
      // Check if question is in English
      const questionIsEnglish = isEnglishContent(qa.question_main, qa.language);
      
      // Check if answer is in English
      const answerIsEnglish = isEnglishContent(qa.answer_main, qa.language);
      
      if (questionIsEnglish || answerIsEnglish) {
        issues.push({
          qa_id: qa.id,
          qa_language: qa.language,
          qa_question: qa.question_main?.substring(0, 100) || '',
          qa_answer_preview: qa.answer_main?.substring(0, 100) || '',
          qa_slug: qa.slug,
          qa_type: qa.qa_type || 'unknown',
          source_article_id: qa.source_article_id,
          issue_type: 'content_mismatch'
        });

        // Count by language
        issuesByLanguage[qa.language] = (issuesByLanguage[qa.language] || 0) + 1;
        issuesByType.content_mismatch++;
      }
    }

    // Sort issues by language for easier review
    issues.sort((a, b) => a.qa_language.localeCompare(b.qa_language));

    const result = {
      total_qas_scanned: qaPages?.length || 0,
      english_qas_excluded: 'N/A (only checking non-English)',
      issues_found: issues.length,
      issues_by_language: issuesByLanguage,
      issues_by_type: issuesByType,
      detailed_issues: issues,
      scan_timestamp: new Date().toISOString()
    };

    console.log(`[Audit] Complete. Found ${issues.length} issues across ${Object.keys(issuesByLanguage).length} languages`);
    console.log('[Audit] Issues by language:', issuesByLanguage);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[Audit] Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    return new Response(JSON.stringify({ 
      error: errMsg,
      stack: errStack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
