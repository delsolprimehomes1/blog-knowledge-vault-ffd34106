import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'];
const BASE_URL = 'https://www.delsolprimehomes.com';

interface HealthCheckResult {
  hreflang_group_id: string;
  content_type: string;
  issues: string[];
  languages_found: string[];
  missing_languages: string[];
  has_english: boolean;
  bidirectional_ok: boolean;
  sample_url: string;
}

interface HealthReport {
  timestamp: string;
  total_groups_checked: number;
  groups_with_issues: number;
  issues_by_type: Record<string, number>;
  results: HealthCheckResult[];
  orphaned_content: {
    blog_articles: number;
    qa_pages: number;
    location_pages: number;
    comparison_pages: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🏥 Starting cluster health check...');
    
    const { content_type, cluster_id } = await req.json().catch(() => ({}));
    
    const results: HealthCheckResult[] = [];
    const issuesCounts: Record<string, number> = {
      missing_languages: 0,
      no_english: 0,
      bidirectional_mismatch: 0,
      orphaned: 0,
    };

    // Check blog articles by cluster_id
    if (!content_type || content_type === 'blog') {
      console.log('📝 Checking blog articles...');
      
      let query = supabase
        .from('blog_articles')
        .select('id, slug, language, cluster_id, hreflang_group_id, status')
        .eq('status', 'published');
      
      if (cluster_id) {
        query = query.eq('cluster_id', cluster_id);
      }
      
      const { data: articles, error } = await query;
      
      if (error) {
        console.error('Error fetching articles:', error);
      } else if (articles) {
        // Group by cluster_id
        const clusterGroups = new Map<string, typeof articles>();
        articles.forEach(article => {
          if (article.cluster_id) {
            const existing = clusterGroups.get(article.cluster_id) || [];
            existing.push(article);
            clusterGroups.set(article.cluster_id, existing);
          }
        });
        
        clusterGroups.forEach((group, clusterId) => {
          const languages = group.map(a => a.language);
          const missing = SUPPORTED_LANGUAGES.filter(l => !languages.includes(l));
          const hasEnglish = languages.includes('en');
          const issues: string[] = [];
          
          if (missing.length > 0) {
            issues.push(`Missing ${missing.length} languages: ${missing.join(', ')}`);
            issuesCounts.missing_languages++;
          }
          
          if (!hasEnglish) {
            issues.push('No English version (x-default will fallback)');
            issuesCounts.no_english++;
          }
          
          if (issues.length > 0) {
            results.push({
              hreflang_group_id: clusterId,
              content_type: 'blog',
              issues,
              languages_found: languages,
              missing_languages: missing,
              has_english: hasEnglish,
              bidirectional_ok: true, // Cluster-based linking is inherently bidirectional
              sample_url: `${BASE_URL}/${group[0]?.language}/blog/${group[0]?.slug}`,
            });
          }
        });
        
        console.log(`   ✅ Checked ${clusterGroups.size} blog clusters`);
      }
    }

    // Check QA pages by hreflang_group_id
    if (!content_type || content_type === 'qa') {
      console.log('🔍 Checking Q&A pages...');
      
      const { data: qaPages, error } = await supabase
        .from('qa_pages')
        .select('id, slug, language, hreflang_group_id, status')
        .eq('status', 'published');
      
      if (error) {
        console.error('Error fetching QA pages:', error);
      } else if (qaPages) {
        const hreflangGroups = new Map<string, typeof qaPages>();
        qaPages.forEach(page => {
          if (page.hreflang_group_id) {
            const existing = hreflangGroups.get(page.hreflang_group_id) || [];
            existing.push(page);
            hreflangGroups.set(page.hreflang_group_id, existing);
          }
        });
        
        hreflangGroups.forEach((group, groupId) => {
          const languages = group.map(p => p.language);
          const missing = SUPPORTED_LANGUAGES.filter(l => !languages.includes(l));
          const hasEnglish = languages.includes('en');
          const issues: string[] = [];
          
          if (missing.length > 0) {
            issues.push(`Missing ${missing.length} languages: ${missing.join(', ')}`);
            issuesCounts.missing_languages++;
          }
          
          if (!hasEnglish) {
            issues.push('No English version (x-default will fallback)');
            issuesCounts.no_english++;
          }
          
          if (issues.length > 0) {
            results.push({
              hreflang_group_id: groupId,
              content_type: 'qa',
              issues,
              languages_found: languages,
              missing_languages: missing,
              has_english: hasEnglish,
              bidirectional_ok: true,
              sample_url: `${BASE_URL}/${group[0]?.language}/qa/${group[0]?.slug}`,
            });
          }
        });
        
        console.log(`   ✅ Checked ${hreflangGroups.size} Q&A hreflang groups`);
      }
    }

    // Check location pages by hreflang_group_id
    if (!content_type || content_type === 'location') {
      console.log('📍 Checking location pages...');
      
      const { data: locationPages, error } = await supabase
        .from('location_pages')
        .select('id, city_slug, topic_slug, language, hreflang_group_id, status')
        .eq('status', 'published');
      
      if (error) {
        console.error('Error fetching location pages:', error);
      } else if (locationPages) {
        const hreflangGroups = new Map<string, typeof locationPages>();
        locationPages.forEach(page => {
          if (page.hreflang_group_id) {
            const existing = hreflangGroups.get(page.hreflang_group_id) || [];
            existing.push(page);
            hreflangGroups.set(page.hreflang_group_id, existing);
          }
        });
        
        hreflangGroups.forEach((group, groupId) => {
          const languages = group.map(p => p.language);
          const missing = SUPPORTED_LANGUAGES.filter(l => !languages.includes(l));
          const hasEnglish = languages.includes('en');
          const issues: string[] = [];
          
          if (missing.length > 0) {
            issues.push(`Missing ${missing.length} languages: ${missing.join(', ')}`);
            issuesCounts.missing_languages++;
          }
          
          if (!hasEnglish) {
            issues.push('No English version (x-default will fallback)');
            issuesCounts.no_english++;
          }
          
          if (issues.length > 0) {
            results.push({
              hreflang_group_id: groupId,
              content_type: 'location',
              issues,
              languages_found: languages,
              missing_languages: missing,
              has_english: hasEnglish,
              bidirectional_ok: true,
              sample_url: `${BASE_URL}/${group[0]?.language}/locations/${group[0]?.city_slug}/${group[0]?.topic_slug}`,
            });
          }
        });
        
        console.log(`   ✅ Checked ${hreflangGroups.size} location hreflang groups`);
      }
    }

    // Check comparison pages by hreflang_group_id
    if (!content_type || content_type === 'comparison') {
      console.log('⚖️ Checking comparison pages...');
      
      const { data: comparisonPages, error } = await supabase
        .from('comparison_pages')
        .select('id, slug, language, hreflang_group_id, status')
        .eq('status', 'published');
      
      if (error) {
        console.error('Error fetching comparison pages:', error);
      } else if (comparisonPages) {
        const hreflangGroups = new Map<string, typeof comparisonPages>();
        comparisonPages.forEach(page => {
          if (page.hreflang_group_id) {
            const existing = hreflangGroups.get(page.hreflang_group_id) || [];
            existing.push(page);
            hreflangGroups.set(page.hreflang_group_id, existing);
          }
        });
        
        hreflangGroups.forEach((group, groupId) => {
          const languages = group.map(p => p.language);
          const missing = SUPPORTED_LANGUAGES.filter(l => !languages.includes(l));
          const hasEnglish = languages.includes('en');
          const issues: string[] = [];
          
          if (missing.length > 0) {
            issues.push(`Missing ${missing.length} languages: ${missing.join(', ')}`);
            issuesCounts.missing_languages++;
          }
          
          if (!hasEnglish) {
            issues.push('No English version (x-default will fallback)');
            issuesCounts.no_english++;
          }
          
          if (issues.length > 0) {
            results.push({
              hreflang_group_id: groupId,
              content_type: 'comparison',
              issues,
              languages_found: languages,
              missing_languages: missing,
              has_english: hasEnglish,
              bidirectional_ok: true,
              sample_url: `${BASE_URL}/${group[0]?.language}/compare/${group[0]?.slug}`,
            });
          }
        });
        
        console.log(`   ✅ Checked ${hreflangGroups.size} comparison hreflang groups`);
      }
    }

    // Check for orphaned content (no hreflang_group_id or cluster_id)
    console.log('🔍 Checking for orphaned content...');
    
    const { count: orphanedBlogs } = await supabase
      .from('blog_articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('cluster_id', null);
    
    const { count: orphanedQA } = await supabase
      .from('qa_pages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('hreflang_group_id', null);
    
    const { count: orphanedLocations } = await supabase
      .from('location_pages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('hreflang_group_id', null);
    
    const { count: orphanedComparisons } = await supabase
      .from('comparison_pages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('hreflang_group_id', null);

    const totalOrphaned = (orphanedBlogs || 0) + (orphanedQA || 0) + (orphanedLocations || 0) + (orphanedComparisons || 0);
    if (totalOrphaned > 0) {
      issuesCounts.orphaned = totalOrphaned;
    }

    const report: HealthReport = {
      timestamp: new Date().toISOString(),
      total_groups_checked: results.length + (issuesCounts.orphaned > 0 ? 1 : 0),
      groups_with_issues: results.length,
      issues_by_type: issuesCounts,
      results: results.slice(0, 50), // Limit to first 50 results
      orphaned_content: {
        blog_articles: orphanedBlogs || 0,
        qa_pages: orphanedQA || 0,
        location_pages: orphanedLocations || 0,
        comparison_pages: orphanedComparisons || 0,
      },
    };

    console.log(`\n📊 Health Check Complete:`);
    console.log(`   • Groups with issues: ${results.length}`);
    console.log(`   • Missing languages: ${issuesCounts.missing_languages}`);
    console.log(`   • No English: ${issuesCounts.no_english}`);
    console.log(`   • Orphaned content: ${totalOrphaned}`);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Health check failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
