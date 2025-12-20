import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode = 'qa', qaPageIds, comparisonPageIds } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (mode === 'qa') {
      return await handleQAPages(supabase, qaPageIds);
    } else if (mode === 'comparison') {
      return await handleComparisonPages(supabase, comparisonPageIds);
    } else if (mode === 'cleanup-citations') {
      return await handleCleanupCitations(supabase);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid mode' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Error in bulk-link-qa-pages:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function handleQAPages(supabase: any, qaPageIds?: string[]) {
  console.log('Starting bulk QA page linking...');
  
  // Fetch QA pages (all or specific)
  let qaQuery = supabase
    .from('qa_pages')
    .select('id, slug, title, question_main, source_article_id, language, internal_links')
    .eq('status', 'published');
  
  if (qaPageIds && qaPageIds.length > 0) {
    qaQuery = qaQuery.in('id', qaPageIds);
  }
  
  const { data: qaPages, error: qaError } = await qaQuery;
  
  if (qaError) {
    console.error('Error fetching QA pages:', qaError);
    throw qaError;
  }

  console.log(`Found ${qaPages?.length || 0} QA pages to process`);

  // Fetch all published blog articles for linking
  const { data: blogArticles, error: articlesError } = await supabase
    .from('blog_articles')
    .select('id, slug, headline, language, funnel_stage, category')
    .eq('status', 'published');

  if (articlesError) {
    console.error('Error fetching blog articles:', articlesError);
    throw articlesError;
  }

  // Fetch location pages for BOFU links
  const { data: locationPages, error: locationError } = await supabase
    .from('location_pages')
    .select('id, city_slug, topic_slug, headline, language')
    .eq('status', 'published');

  if (locationError) {
    console.error('Error fetching location pages:', locationError);
  }

  // Fetch comparison pages
  const { data: comparisonPages, error: compError } = await supabase
    .from('comparison_pages')
    .select('id, slug, headline, language')
    .eq('status', 'published');

  if (compError) {
    console.error('Error fetching comparison pages:', compError);
  }

  const results = [];

  for (const qaPage of qaPages || []) {
    try {
      // Find source article
      const sourceArticle = blogArticles?.find((a: any) => a.id === qaPage.source_article_id);
      
      // Filter articles by same language
      const sameLanguageArticles = blogArticles?.filter((a: any) => 
        a.language === qaPage.language && a.id !== qaPage.source_article_id
      ) || [];

      // Find BOFU articles for the same language
      const bofuArticles = sameLanguageArticles.filter((a: any) => a.funnel_stage === 'BOFU');
      const mofuArticles = sameLanguageArticles.filter((a: any) => a.funnel_stage === 'MOFU');

      // Same language location pages
      const sameLanguageLocations = locationPages?.filter((l: any) => l.language === qaPage.language) || [];
      
      // Same language comparison pages
      const sameLanguageComparisons = comparisonPages?.filter((c: any) => c.language === qaPage.language) || [];

      const links: any[] = [];

      // 1. Link to source article (always first priority)
      if (sourceArticle) {
        links.push({
          text: sourceArticle.headline,
          url: `/blog/${sourceArticle.slug}`,
          title: `Read full article: ${sourceArticle.headline}`
        });
      }

      // 2. Add 1-2 BOFU articles
      const topBofuArticles = bofuArticles.slice(0, 2);
      for (const article of topBofuArticles) {
        links.push({
          text: article.headline,
          url: `/blog/${article.slug}`,
          title: article.headline
        });
      }

      // 3. Add 1 MOFU article if available
      if (mofuArticles.length > 0) {
        const mofuArticle = mofuArticles[0];
        links.push({
          text: mofuArticle.headline,
          url: `/blog/${mofuArticle.slug}`,
          title: mofuArticle.headline
        });
      }

      // 4. Add a location page if available
      if (sameLanguageLocations.length > 0) {
        const locationPage = sameLanguageLocations[0];
        links.push({
          text: locationPage.headline,
          url: `/locations/${locationPage.city_slug}/${locationPage.topic_slug}`,
          title: locationPage.headline
        });
      }

      // 5. Add a comparison page if available
      if (sameLanguageComparisons.length > 0) {
        const compPage = sameLanguageComparisons[0];
        links.push({
          text: compPage.headline,
          url: `/compare/${compPage.slug}`,
          title: compPage.headline
        });
      }

      // Update the QA page with new links
      const { error: updateError } = await supabase
        .from('qa_pages')
        .update({ internal_links: links })
        .eq('id', qaPage.id);

      if (updateError) {
        console.error(`Error updating QA page ${qaPage.id}:`, updateError);
        results.push({
          id: qaPage.id,
          slug: qaPage.slug,
          success: false,
          error: updateError.message,
          linkCount: 0
        });
      } else {
        console.log(`Updated QA page ${qaPage.slug} with ${links.length} links`);
        results.push({
          id: qaPage.id,
          slug: qaPage.slug,
          success: true,
          linkCount: links.length
        });
      }

    } catch (err: any) {
      console.error(`Error processing QA page ${qaPage.id}:`, err);
      results.push({
        id: qaPage.id,
        slug: qaPage.slug,
        success: false,
        error: err.message,
        linkCount: 0
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const totalLinks = results.reduce((sum, r) => sum + (r.linkCount || 0), 0);

  console.log(`Completed: ${successCount}/${results.length} QA pages updated with ${totalLinks} total links`);

  return new Response(
    JSON.stringify({
      mode: 'qa',
      success: true,
      processed: results.length,
      successCount,
      totalLinksAdded: totalLinks,
      results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleComparisonPages(supabase: any, comparisonPageIds?: string[]) {
  console.log('Starting bulk comparison page linking...');

  // Fetch comparison pages
  let compQuery = supabase
    .from('comparison_pages')
    .select('*')
    .eq('status', 'published');

  if (comparisonPageIds && comparisonPageIds.length > 0) {
    compQuery = compQuery.in('id', comparisonPageIds);
  }

  const { data: comparisonPages, error: compError } = await compQuery;

  if (compError) {
    console.error('Error fetching comparison pages:', compError);
    throw compError;
  }

  console.log(`Found ${comparisonPages?.length || 0} comparison pages to process`);

  // Fetch all blog articles
  const { data: blogArticles, error: articlesError } = await supabase
    .from('blog_articles')
    .select('id, slug, headline, language, funnel_stage, category')
    .eq('status', 'published');

  if (articlesError) throw articlesError;

  // Fetch location pages
  const { data: locationPages, error: locationError } = await supabase
    .from('location_pages')
    .select('id, city_slug, topic_slug, headline, language')
    .eq('status', 'published');

  if (locationError) {
    console.error('Error fetching location pages:', locationError);
  }

  const results = [];

  for (const compPage of comparisonPages || []) {
    try {
      const language = compPage.language || 'en';
      
      // Filter articles by language
      const sameLanguageArticles = blogArticles?.filter((a: any) => 
        a.language === language
      ) || [];

      // Find BOFU and relevant articles
      const bofuArticles = sameLanguageArticles.filter((a: any) => a.funnel_stage === 'BOFU');
      const investmentArticles = sameLanguageArticles.filter((a: any) => 
        a.headline.toLowerCase().includes('invest') || 
        a.category?.toLowerCase().includes('investment')
      );
      const buyingArticles = sameLanguageArticles.filter((a: any) => 
        a.headline.toLowerCase().includes('buy') || 
        a.headline.toLowerCase().includes('guide')
      );

      // Same language location pages
      const sameLanguageLocations = locationPages?.filter((l: any) => l.language === language) || [];

      const links: any[] = [];

      // Add 2-3 BOFU articles
      const topBofuArticles = bofuArticles.slice(0, 3);
      for (const article of topBofuArticles) {
        links.push({
          text: article.headline,
          url: `/blog/${article.slug}`,
          title: article.headline
        });
      }

      // Add investment articles
      for (const article of investmentArticles.slice(0, 2)) {
        if (!links.some(l => l.url === `/blog/${article.slug}`)) {
          links.push({
            text: article.headline,
            url: `/blog/${article.slug}`,
            title: article.headline
          });
        }
      }

      // Add location pages
      for (const locationPage of sameLanguageLocations.slice(0, 2)) {
        links.push({
          text: locationPage.headline,
          url: `/locations/${locationPage.city_slug}/${locationPage.topic_slug}`,
          title: locationPage.headline
        });
      }

      // Limit to 5-7 links
      const finalLinks = links.slice(0, 7);

      // Update comparison page
      const { error: updateError } = await supabase
        .from('comparison_pages')
        .update({ internal_links: finalLinks })
        .eq('id', compPage.id);

      if (updateError) {
        results.push({
          id: compPage.id,
          slug: compPage.slug,
          success: false,
          error: updateError.message,
          linkCount: 0
        });
      } else {
        console.log(`Updated comparison page ${compPage.slug} with ${finalLinks.length} links`);
        results.push({
          id: compPage.id,
          slug: compPage.slug,
          success: true,
          linkCount: finalLinks.length
        });
      }

    } catch (err: any) {
      results.push({
        id: compPage.id,
        slug: compPage.slug,
        success: false,
        error: err.message,
        linkCount: 0
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const totalLinks = results.reduce((sum, r) => sum + (r.linkCount || 0), 0);

  return new Response(
    JSON.stringify({
      mode: 'comparison',
      success: true,
      processed: results.length,
      successCount,
      totalLinksAdded: totalLinks,
      results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCleanupCitations(supabase: any) {
  console.log('Starting citation marker cleanup...');

  // Find articles with [CITATION_NEEDED] markers
  const { data: articlesWithMarkers, error: fetchError } = await supabase
    .from('blog_articles')
    .select('id, slug, headline, detailed_content, speakable_answer')
    .or('detailed_content.ilike.%[CITATION_NEEDED]%,speakable_answer.ilike.%[CITATION_NEEDED]%');

  if (fetchError) {
    console.error('Error fetching articles with markers:', fetchError);
    throw fetchError;
  }

  console.log(`Found ${articlesWithMarkers?.length || 0} articles with [CITATION_NEEDED] markers`);

  const results = [];

  for (const article of articlesWithMarkers || []) {
    try {
      let content = article.detailed_content || '';
      let speakable = article.speakable_answer || '';
      let cleanedContent = false;
      let cleanedSpeakable = false;

      // Remove [CITATION_NEEDED] markers (various formats)
      const markerPatterns = [
        /\[CITATION_NEEDED\]/gi,
        /\[CITATION NEEDED\]/gi,
        /\[citation_needed\]/gi,
        /\[citation needed\]/gi,
        /\s*\[CITATION_NEEDED\]\s*/gi,
        /\s*\[CITATION NEEDED\]\s*/gi
      ];

      for (const pattern of markerPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, '');
          cleanedContent = true;
        }
        if (pattern.test(speakable)) {
          speakable = speakable.replace(pattern, '');
          cleanedSpeakable = true;
        }
      }

      // Clean up any resulting double spaces or empty parentheses
      content = content.replace(/\s{2,}/g, ' ').replace(/\(\s*\)/g, '').trim();
      speakable = speakable.replace(/\s{2,}/g, ' ').replace(/\(\s*\)/g, '').trim();

      if (cleanedContent || cleanedSpeakable) {
        const updateData: any = {};
        if (cleanedContent) updateData.detailed_content = content;
        if (cleanedSpeakable) updateData.speakable_answer = speakable;

        const { error: updateError } = await supabase
          .from('blog_articles')
          .update(updateData)
          .eq('id', article.id);

        if (updateError) {
          results.push({
            id: article.id,
            slug: article.slug,
            headline: article.headline,
            success: false,
            error: updateError.message
          });
        } else {
          console.log(`Cleaned markers from article: ${article.slug}`);
          results.push({
            id: article.id,
            slug: article.slug,
            headline: article.headline,
            success: true,
            cleanedContent,
            cleanedSpeakable
          });
        }
      } else {
        results.push({
          id: article.id,
          slug: article.slug,
          headline: article.headline,
          success: true,
          note: 'No markers found after detailed scan'
        });
      }

    } catch (err: any) {
      results.push({
        id: article.id,
        slug: article.slug,
        headline: article.headline,
        success: false,
        error: err.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return new Response(
    JSON.stringify({
      mode: 'cleanup-citations',
      success: true,
      processed: results.length,
      successCount,
      results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
