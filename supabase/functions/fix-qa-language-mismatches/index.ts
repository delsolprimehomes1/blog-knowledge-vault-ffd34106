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

// English answer patterns
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

function isEnglishContent(text: string, expectedLanguage: string): boolean {
  if (!text || expectedLanguage === 'en') return false;
  
  const trimmedText = text.trim();
  
  const hasEnglishQuestionPattern = ENGLISH_QUESTION_PATTERNS.some(pattern => 
    pattern.test(trimmedText)
  );
  
  if (hasEnglishQuestionPattern) return true;
  
  const hasEnglishAnswerPattern = ENGLISH_ANSWER_PATTERNS.some(pattern => 
    pattern.test(trimmedText)
  );
  
  const englishWords = ['the', 'is', 'are', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has'];
  const lowerText = trimmedText.toLowerCase();
  const wordCount = lowerText.split(/\s+/).length;
  const englishWordCount = englishWords.filter(word => 
    lowerText.includes(` ${word} `) || 
    lowerText.startsWith(`${word} `) || 
    lowerText.endsWith(` ${word}`)
  ).length;
  
  if (wordCount > 10 && englishWordCount >= 3) {
    return true;
  }
  
  return hasEnglishAnswerPattern && englishWordCount >= 2;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to true for safety
    
    console.log(`[Fix] Starting Q&A language fix (dryRun: ${dryRun})...`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all non-English Q&A pages
    const { data: qaPages, error: qaError } = await supabase
      .from('qa_pages')
      .select('id, language, question_main, answer_main, slug, source_article_id')
      .neq('language', 'en');

    if (qaError) throw qaError;

    console.log(`[Fix] Checking ${qaPages?.length || 0} non-English Q&A pages...`);

    // Find issues
    const issuesToFix: Array<{
      qa_id: string;
      qa_language: string;
      qa_question: string;
      source_article_id: string | null;
    }> = [];

    for (const qa of qaPages || []) {
      const questionIsEnglish = isEnglishContent(qa.question_main, qa.language);
      const answerIsEnglish = isEnglishContent(qa.answer_main, qa.language);
      
      if (questionIsEnglish || answerIsEnglish) {
        issuesToFix.push({
          qa_id: qa.id,
          qa_language: qa.language,
          qa_question: qa.question_main?.substring(0, 80) || '',
          source_article_id: qa.source_article_id
        });
      }
    }

    console.log(`[Fix] Found ${issuesToFix.length} Q&As with wrong language content`);

    if (issuesToFix.length === 0) {
      return new Response(JSON.stringify({
        dryRun,
        message: 'No issues found! All Q&As have correct language content.',
        issues_found: 0,
        issues_fixed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (dryRun) {
      // Group by language for preview
      const byLanguage: Record<string, number> = {};
      issuesToFix.forEach(issue => {
        byLanguage[issue.qa_language] = (byLanguage[issue.qa_language] || 0) + 1;
      });

      return new Response(JSON.stringify({
        dryRun: true,
        message: `Would delete ${issuesToFix.length} Q&As with wrong language content`,
        issues_found: issuesToFix.length,
        issues_by_language: byLanguage,
        actions_preview: issuesToFix.slice(0, 20).map(issue => ({
          action: 'delete',
          qa_id: issue.qa_id,
          language: issue.qa_language,
          question_preview: issue.qa_question
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Execute fix - delete the bad Q&As
    console.log(`[Fix] Executing deletion of ${issuesToFix.length} Q&As...`);
    
    const qaIdsToDelete = issuesToFix.map(i => i.qa_id);
    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Delete in batches of 50 to avoid timeouts
    const BATCH_SIZE = 50;
    for (let i = 0; i < qaIdsToDelete.length; i += BATCH_SIZE) {
      const batch = qaIdsToDelete.slice(i, i + BATCH_SIZE);
      
      const { error: deleteError, count } = await supabase
        .from('qa_pages')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`[Fix] Error deleting batch ${i / BATCH_SIZE + 1}:`, deleteError);
        errors.push(deleteError.message);
        errorCount += batch.length;
      } else {
        deletedCount += count || batch.length;
        console.log(`[Fix] Deleted batch ${i / BATCH_SIZE + 1}: ${count || batch.length} Q&As`);
      }
    }

    // Also update blog_articles to remove deleted Q&A IDs from generated_qa_page_ids
    console.log('[Fix] Updating blog_articles to remove deleted Q&A references...');
    
    // Get articles that reference these Q&As
    const { data: affectedArticles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, generated_qa_page_ids')
      .not('generated_qa_page_ids', 'is', null);

    if (!articlesError && affectedArticles) {
      let articlesUpdated = 0;
      for (const article of affectedArticles) {
        const currentIds = article.generated_qa_page_ids || [];
        const filteredIds = currentIds.filter((id: string) => !qaIdsToDelete.includes(id));
        
        if (filteredIds.length !== currentIds.length) {
          await supabase
            .from('blog_articles')
            .update({ generated_qa_page_ids: filteredIds })
            .eq('id', article.id);
          articlesUpdated++;
        }
      }
      console.log(`[Fix] Updated ${articlesUpdated} articles to remove deleted Q&A references`);
    }

    const byLanguage: Record<string, number> = {};
    issuesToFix.forEach(issue => {
      byLanguage[issue.qa_language] = (byLanguage[issue.qa_language] || 0) + 1;
    });

    return new Response(JSON.stringify({
      dryRun: false,
      message: `Successfully deleted ${deletedCount} Q&As with wrong language content`,
      issues_found: issuesToFix.length,
      issues_fixed: deletedCount,
      issues_by_language: byLanguage,
      errors: errors.length > 0 ? errors : undefined,
      error_count: errorCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[Fix] Error:', error);
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
