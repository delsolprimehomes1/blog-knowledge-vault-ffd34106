import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_LANGUAGES = ['de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, dryRun = false } = await req.json();

    if (!clusterId) {
      return new Response(
        JSON.stringify({ error: 'clusterId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[complete-incomplete-cluster] Starting for cluster: ${clusterId}`);

    // Step 1: Get all articles in this cluster
    const { data: existingArticles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, language, funnel_stage, status, detailed_content, meta_title, meta_description, speakable_answer, qa_entities, featured_image_url, featured_image_alt, category, cluster_id, hreflang_group_id')
      .eq('cluster_id', clusterId)
      .eq('status', 'published');

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    if (!existingArticles || existingArticles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No articles found in this cluster' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[complete-incomplete-cluster] Found ${existingArticles.length} articles in cluster`);

    // Analyze current state
    const articlesByLang = existingArticles.reduce((acc, article) => {
      acc[article.language] = (acc[article.language] || []).concat(article);
      return acc;
    }, {} as Record<string, typeof existingArticles>);

    const hasEnglish = !!articlesByLang['en'];
    const englishCount = articlesByLang['en']?.length || 0;
    const totalLanguages = Object.keys(articlesByLang).length;

    // Build plan
    const plan = {
      clusterId,
      currentState: {
        totalArticles: existingArticles.length,
        hasEnglish,
        englishCount,
        languages: Object.keys(articlesByLang),
        languageCounts: Object.fromEntries(
          Object.entries(articlesByLang).map(([lang, articles]) => [lang, articles.length])
        )
      },
      steps: [] as string[],
      estimatedNewArticles: 0
    };

    // Step 1: Need to translate to English first?
    if (!hasEnglish) {
      const sourceArticle = existingArticles[0];
      plan.steps.push(`Translate "${sourceArticle.headline}" from ${sourceArticle.language} to English`);
      plan.estimatedNewArticles += 1;
    }

    // Step 2: Need to complete English cluster?
    if (englishCount < 6) {
      const needed = 6 - englishCount;
      plan.steps.push(`Generate ${needed} more English articles to complete the cluster (TOFU/MOFU/BOFU)`);
      plan.estimatedNewArticles += needed;
    }

    // Step 3: Translate to all other languages
    const missingLanguages = TARGET_LANGUAGES.filter(lang => !articlesByLang[lang]);
    if (missingLanguages.length > 0) {
      const articlesToTranslate = Math.max(6, englishCount);
      plan.steps.push(`Translate ${articlesToTranslate} English articles to ${missingLanguages.length} languages: ${missingLanguages.join(', ')}`);
      plan.estimatedNewArticles += articlesToTranslate * missingLanguages.length;
    }

    // Dry run - just return the plan
    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          dryRun: true, 
          plan,
          message: `Would create ${plan.estimatedNewArticles} new articles`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update cluster_generations status
    await supabase
      .from('cluster_generations')
      .update({ 
        completion_status: 'in_progress',
        completion_started_at: new Date().toISOString(),
        english_articles_count: englishCount
      })
      .eq('id', clusterId);

    let newEnglishCount = englishCount;
    let translatedCount = existingArticles.length - englishCount;

    // STEP 1: Translate to English if needed
    if (!hasEnglish) {
      console.log(`[complete-incomplete-cluster] Translating first article to English...`);
      
      const sourceArticle = existingArticles[0];
      
      try {
        const translateResponse = await fetch(`${supabaseUrl}/functions/v1/translate-article`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            englishArticle: sourceArticle, // Source article (will be translated from its language)
            targetLanguage: 'en'
          })
        });

        if (!translateResponse.ok) {
          const errorText = await translateResponse.text();
          console.error(`[complete-incomplete-cluster] Translation to English failed: ${errorText}`);
          throw new Error(`Translation to English failed: ${errorText}`);
        }

        const { translatedArticle } = await translateResponse.json();
        
        // Save the English article
        const { error: insertError } = await supabase
          .from('blog_articles')
          .insert({
            ...translatedArticle,
            cluster_id: clusterId,
            language: 'en',
            status: 'published',
            date_published: new Date().toISOString(),
            hreflang_group_id: sourceArticle.hreflang_group_id || clusterId
          });

        if (insertError) {
          console.error(`[complete-incomplete-cluster] Failed to save English article: ${insertError.message}`);
        } else {
          newEnglishCount = 1;
          console.log(`[complete-incomplete-cluster] English article created`);
        }
      } catch (translateError) {
        console.error(`[complete-incomplete-cluster] Error translating to English:`, translateError);
      }
    }

    // STEP 2: Complete the English cluster (6 articles)
    if (newEnglishCount < 6) {
      console.log(`[complete-incomplete-cluster] Completing English cluster (currently ${newEnglishCount} articles)...`);
      
      try {
        const completeResponse = await fetch(`${supabaseUrl}/functions/v1/complete-cluster`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            clusterId,
            dryRun: false
          })
        });

        if (!completeResponse.ok) {
          const errorText = await completeResponse.text();
          console.error(`[complete-incomplete-cluster] Complete cluster failed: ${errorText}`);
        } else {
          const completeResult = await completeResponse.json();
          newEnglishCount = 6;
          console.log(`[complete-incomplete-cluster] Cluster completed with ${completeResult.articlesGenerated || 'unknown'} new articles`);
          
          // Wait 5 seconds for articles to be fully saved
          console.log(`[complete-incomplete-cluster] Waiting 5 seconds for articles to save...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (completeError) {
        console.error(`[complete-incomplete-cluster] Error completing cluster:`, completeError);
      }
    }

    // Update progress
    await supabase
      .from('cluster_generations')
      .update({ 
        completion_status: 'translating',
        english_articles_count: newEnglishCount
      })
      .eq('id', clusterId);

    // STEP 3: Re-fetch ALL English articles (including newly generated ones) and translate to all languages
    console.log(`[complete-incomplete-cluster] Re-fetching all English articles for translation...`);
    
    // Re-fetch all English articles in this cluster
    const { data: allEnglishArticles, error: enFetchError } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('cluster_id', clusterId)
      .eq('language', 'en')
      .eq('status', 'published');

    if (enFetchError) {
      console.error(`[complete-incomplete-cluster] Failed to fetch English articles: ${enFetchError.message}`);
    }

    const englishArticlesToTranslate = allEnglishArticles || [];
    console.log(`[complete-incomplete-cluster] Found ${englishArticlesToTranslate.length} English articles to translate`);

    // Get existing translations to skip already-translated articles
    const { data: existingTranslations } = await supabase
      .from('blog_articles')
      .select('hreflang_group_id, language')
      .eq('cluster_id', clusterId)
      .neq('language', 'en')
      .eq('status', 'published');

    const existingTranslationMap = new Set(
      (existingTranslations || []).map(t => `${t.hreflang_group_id}-${t.language}`)
    );

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    if (englishArticlesToTranslate.length > 0) {
      // Translate each English article to all 9 target languages
      for (const article of englishArticlesToTranslate) {
        const groupId = article.hreflang_group_id || article.id;
        
        for (const targetLang of TARGET_LANGUAGES) {
          // Skip if translation already exists
          const translationKey = `${groupId}-${targetLang}`;
          if (existingTranslationMap.has(translationKey)) {
            console.log(`[complete-incomplete-cluster] Skipping existing ${targetLang} translation for article ${article.id}`);
            skipCount++;
            continue;
          }
          
          try {
            console.log(`[complete-incomplete-cluster] Translating article "${article.headline}" to ${targetLang}...`);
            
            const translateResponse = await fetch(`${supabaseUrl}/functions/v1/translate-article`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({
                englishArticle: { ...article, hreflang_group_id: groupId },
                targetLanguage: targetLang
              })
            });

            if (translateResponse.ok) {
              const responseData = await translateResponse.json();
              const translatedArticle = responseData.article;
              
              if (!translatedArticle) {
                console.error(`[complete-incomplete-cluster] No article in translation response for ${targetLang}`);
                errorCount++;
                continue;
              }
              
              // Save translated article
              const translatedSlug = translatedArticle.slug || article.slug;
              const { error: insertError } = await supabase
                .from('blog_articles')
                .insert({
                  ...translatedArticle,
                  cluster_id: clusterId,
                  language: targetLang,
                  status: 'published',
                  date_published: new Date().toISOString(),
                  date_modified: new Date().toISOString(),
                  hreflang_group_id: groupId,
                  source_language: 'en',
                  canonical_url: `https://www.delsolprimehomes.com/${targetLang}/blog/${translatedSlug}`
                });

              if (insertError) {
                if (insertError.message.includes('duplicate') || insertError.code === '23505') {
                  console.log(`[complete-incomplete-cluster] Skipping duplicate ${targetLang} article`);
                  skipCount++;
                } else {
                  console.error(`[complete-incomplete-cluster] Failed to save ${targetLang} article: ${insertError.message}`);
                  errorCount++;
                }
              } else {
                successCount++;
                existingTranslationMap.add(translationKey); // Prevent duplicates in same run
              }
            } else {
              const errText = await translateResponse.text();
              console.error(`[complete-incomplete-cluster] Translation to ${targetLang} failed: ${errText}`);
              errorCount++;
            }
          } catch (translateError) {
            console.error(`[complete-incomplete-cluster] Error translating to ${targetLang}:`, translateError);
            errorCount++;
          }
        }
      }
      
      console.log(`[complete-incomplete-cluster] Translation complete: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);
    } else {
      console.warn(`[complete-incomplete-cluster] No English articles found to translate`);
    }

    // Get final count
    const { count: finalCount } = await supabase
      .from('blog_articles')
      .select('id', { count: 'exact', head: true })
      .eq('cluster_id', clusterId)
      .eq('status', 'published');

    // Mark as completed
    await supabase
      .from('cluster_generations')
      .update({ 
        completion_status: 'completed',
        completion_completed_at: new Date().toISOString(),
        translated_articles_count: (finalCount || 0) - newEnglishCount
      })
      .eq('id', clusterId);

    console.log(`[complete-incomplete-cluster] Completed! Final article count: ${finalCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        clusterId,
        originalCount: existingArticles.length,
        finalCount: finalCount || 0,
        plan
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[complete-incomplete-cluster] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
