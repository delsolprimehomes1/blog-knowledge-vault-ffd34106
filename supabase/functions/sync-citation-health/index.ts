import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting citation health sync...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Step 1: Build truth set from all published articles
    console.log('📖 Step 1: Scanning all published articles...');
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, external_citations, slug, headline')
      .eq('status', 'published');

    if (articlesError) {
      console.error('Failed to fetch articles:', articlesError);
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    // Build truth set: Map of URL -> Set of article IDs that use it
    const truthSet = new Map<string, Set<string>>();
    const urlToSource = new Map<string, string>();
    let totalCitations = 0;

    for (const article of articles) {
      if (!article.external_citations) continue;
      
      const citations = article.external_citations as any[];
      for (const citation of citations) {
        if (!citation.url) continue;
        
        totalCitations++;
        const url = citation.url.trim();
        
        if (!truthSet.has(url)) {
          truthSet.set(url, new Set());
          urlToSource.set(url, citation.source || 'Unknown');
        }
        truthSet.get(url)!.add(article.id);
      }
    }

    console.log(`✅ Scanned ${articles.length} articles, found ${truthSet.size} unique URLs (${totalCitations} total citations)`);

    // Step 2: Compare with health table
    console.log('🔍 Step 2: Comparing with external_citation_health table...');
    const { data: healthRecords, error: healthError } = await supabase
      .from('external_citation_health')
      .select('id, url');

    if (healthError) {
      console.error('Failed to fetch health records:', healthError);
      throw new Error(`Failed to fetch health records: ${healthError.message}`);
    }

    const staleHealthIds: string[] = [];
    const staleUrls: string[] = [];
    
    for (const record of healthRecords) {
      if (!truthSet.has(record.url)) {
        staleHealthIds.push(record.id);
        staleUrls.push(record.url);
      }
    }

    console.log(`Found ${staleHealthIds.length} stale health records out of ${healthRecords.length} total`);

    // Step 3: Delete stale data from all three tables
    let deletedHealth = 0;
    let deletedReplacements = 0;
    let deletedTracking = 0;

    if (staleUrls.length > 0) {
      console.log('🗑️ Step 3: Deleting stale entries...');
      
      // Delete from dead_link_replacements
      const { error: replError, count: replCount } = await supabase
        .from('dead_link_replacements')
        .delete()
        .in('original_url', staleUrls);
      
      if (!replError && replCount !== null) {
        deletedReplacements = replCount;
        console.log(`Deleted ${deletedReplacements} stale replacement suggestions`);
      }

      // Delete from citation_usage_tracking
      const { error: trackError, count: trackCount } = await supabase
        .from('citation_usage_tracking')
        .delete()
        .in('citation_url', staleUrls);
      
      if (!trackError && trackCount !== null) {
        deletedTracking = trackCount;
        console.log(`Deleted ${deletedTracking} stale tracking records`);
      }

      // Delete from external_citation_health
      const { error: healthDelError, count: healthCount } = await supabase
        .from('external_citation_health')
        .delete()
        .in('id', staleHealthIds);
      
      if (!healthDelError && healthCount !== null) {
        deletedHealth = healthCount;
        console.log(`Deleted ${deletedHealth} stale health records`);
      }
    } else {
      console.log('✨ No stale entries to delete');
    }

    // Step 4: Insert missing health records
    console.log('➕ Step 4: Adding missing health records...');
    const existingUrls = new Set(healthRecords.map(r => r.url));
    const missingUrls: string[] = [];
    
    for (const url of truthSet.keys()) {
      if (!existingUrls.has(url)) {
        missingUrls.push(url);
      }
    }

    let newHealthRecords = 0;
    if (missingUrls.length > 0) {
      const newRecords = missingUrls.map(url => ({
        url,
        source_name: urlToSource.get(url) || 'Unknown',
        status: 'pending',
        first_seen_at: new Date().toISOString(),
        last_checked_at: null,
        times_verified: 0,
        times_failed: 0,
      }));

      const { error: insertError, count } = await supabase
        .from('external_citation_health')
        .insert(newRecords);

      if (!insertError && count !== null) {
        newHealthRecords = count;
        console.log(`✅ Created ${newHealthRecords} new health records`);
      } else if (insertError) {
        console.error('Failed to insert new health records:', insertError);
      }
    } else {
      console.log('✨ All URLs already tracked');
    }

    // Step 5: Update citation usage tracking
    console.log('🔄 Step 5: Updating citation usage tracking...');
    
    // First, delete all existing tracking records
    await supabase.from('citation_usage_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Build new tracking records
    const trackingRecords: any[] = [];
    for (const article of articles) {
      if (!article.external_citations) continue;
      
      const citations = article.external_citations as any[];
      citations.forEach((citation, index) => {
        if (!citation.url) return;
        
        const domain = new URL(citation.url).hostname.replace('www.', '');
        
        trackingRecords.push({
          article_id: article.id,
          citation_url: citation.url.trim(),
          citation_source: citation.source || 'Unknown',
          citation_domain: domain,
          anchor_text: citation.text || null,
          position_in_article: index + 1,
          is_active: true,
          first_added_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
        });
      });
    }

    let trackingRecordsUpdated = 0;
    if (trackingRecords.length > 0) {
      const { error: trackInsertError, count } = await supabase
        .from('citation_usage_tracking')
        .insert(trackingRecords);

      if (!trackInsertError && count !== null) {
        trackingRecordsUpdated = count;
        console.log(`✅ Created ${trackingRecordsUpdated} tracking records`);
      } else if (trackInsertError) {
        console.error('Failed to insert tracking records:', trackInsertError);
      }
    }

    // Step 6: Return sync report
    const report = {
      success: true,
      articlesScanned: articles.length,
      uniqueUrlsFound: truthSet.size,
      totalCitations,
      staleEntriesDeleted: deletedHealth + deletedReplacements + deletedTracking,
      newHealthRecordsCreated: newHealthRecords,
      trackingRecordsUpdated,
      deletedFrom: {
        health: deletedHealth,
        replacements: deletedReplacements,
        tracking: deletedTracking,
      },
      details: {
        staleUrls: staleUrls.slice(0, 10), // First 10 for reference
        missingUrls: missingUrls.slice(0, 10),
      }
    };

    console.log('✅ Citation health sync complete!', report);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Sync failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
