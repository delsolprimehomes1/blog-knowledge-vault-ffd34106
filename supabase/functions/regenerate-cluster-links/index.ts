import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Strategic funnel-based linking rules
const FUNNEL_LINK_STRATEGY = {
  TOFU: {
    maxWithinCluster: 3,
    targetStages: ['MOFU', 'TOFU'],
    description: '1-2 MOFU (funnel progression), 1 sibling TOFU (related topic)'
  },
  MOFU: {
    maxWithinCluster: 3,
    targetStages: ['TOFU', 'BOFU', 'MOFU'],
    description: '1 TOFU (context), 1 BOFU (conversion), 1 sibling MOFU (comparison)'
  },
  BOFU: {
    maxWithinCluster: 3,
    targetStages: ['MOFU', 'TOFU'],
    description: '2 MOFU (evidence), 1 TOFU (foundation)'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clusterId, language, dryRun = false } = await req.json();

    if (!clusterId) {
      return new Response(JSON.stringify({ error: 'clusterId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all articles in the cluster
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, slug, funnel_stage, language, cluster_number, detailed_content')
      .eq('cluster_id', clusterId)
      .eq('status', 'published');

    if (fetchError) throw fetchError;
    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({ error: 'No articles found in cluster' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Regenerate Links] Found ${articles.length} articles in cluster`);

    // Group by language
    const byLanguage: Record<string, typeof articles> = {};
    for (const article of articles) {
      const lang = article.language || 'en';
      if (!byLanguage[lang]) byLanguage[lang] = [];
      byLanguage[lang].push(article);
    }

    // Filter to specific language if requested
    const languagesToProcess = language ? [language] : Object.keys(byLanguage);
    const results: any[] = [];
    const updates: any[] = [];

    for (const lang of languagesToProcess) {
      const langArticles = byLanguage[lang];
      if (!langArticles || langArticles.length === 0) continue;

      console.log(`[Regenerate Links] Processing ${lang}: ${langArticles.length} articles`);

      for (const article of langArticles) {
        const funnelStage = article.funnel_stage || 'TOFU';
        const strategy = FUNNEL_LINK_STRATEGY[funnelStage as keyof typeof FUNNEL_LINK_STRATEGY] || FUNNEL_LINK_STRATEGY.TOFU;
        
        // Get other articles in same language (excluding self)
        const otherArticles = langArticles.filter(a => a.id !== article.id);
        
        // Generate strategic links based on funnel stage
        const strategicLinks = generateStrategicLinks(article, otherArticles, strategy, funnelStage);

        results.push({
          id: article.id,
          headline: article.headline,
          language: lang,
          funnelStage,
          linkCount: strategicLinks.length,
          maxAllowed: strategy.maxWithinCluster,
          links: strategicLinks.map(l => ({
            target: l.title,
            targetStage: l.funnelStage,
            purpose: l.purpose
          }))
        });

        if (!dryRun) {
          updates.push({
            id: article.id,
            internal_links: strategicLinks
          });
        }
      }
    }

    // Apply updates if not dry run
    if (!dryRun && updates.length > 0) {
      console.log(`[Regenerate Links] Applying ${updates.length} updates...`);
      
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({ internal_links: update.internal_links })
          .eq('id', update.id);

        if (updateError) {
          console.error(`[Regenerate Links] Failed to update ${update.id}:`, updateError);
        }
      }
      
      console.log(`[Regenerate Links] ✅ Applied ${updates.length} updates`);
    }

    // Summary
    const summary = {
      totalArticles: results.length,
      byFunnelStage: results.reduce((acc: any, r) => {
        if (!acc[r.funnelStage]) acc[r.funnelStage] = { count: 0, avgLinks: 0 };
        acc[r.funnelStage].count++;
        acc[r.funnelStage].avgLinks = 
          (acc[r.funnelStage].avgLinks * (acc[r.funnelStage].count - 1) + r.linkCount) / acc[r.funnelStage].count;
        return acc;
      }, {}),
      dryRun,
      updatesApplied: dryRun ? 0 : updates.length
    };

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Regenerate Links] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function generateStrategicLinks(
  article: any,
  otherArticles: any[],
  strategy: any,
  funnelStage: string
): any[] {
  const links: any[] = [];
  const { language } = article;

  // Categorize available articles by funnel stage
  const tofuArticles = otherArticles.filter(a => a.funnel_stage === 'TOFU');
  const mofuArticles = otherArticles.filter(a => a.funnel_stage === 'MOFU');
  const bofuArticles = otherArticles.filter(a => a.funnel_stage === 'BOFU');

  if (funnelStage === 'TOFU') {
    // TOFU strategy: 1-2 MOFU (funnel progression), 1 sibling TOFU
    
    // Add up to 2 MOFU links (funnel progression)
    for (let i = 0; i < Math.min(2, mofuArticles.length); i++) {
      const target = mofuArticles[i];
      links.push(createLink(target, 'funnel_progression', 9 - i));
    }

    // Add 1 sibling TOFU if we have room
    if (links.length < 3 && tofuArticles.length > 0) {
      links.push(createLink(tofuArticles[0], 'related_topic', 7));
    }

  } else if (funnelStage === 'MOFU') {
    // MOFU strategy: 1 TOFU (context), 1 BOFU (conversion), 1 sibling MOFU
    
    // Add 1 TOFU link (context)
    if (tofuArticles.length > 0) {
      links.push(createLink(tofuArticles[0], 'context', 8));
    }

    // Add 1 BOFU link (conversion - CRITICAL!)
    if (bofuArticles.length > 0) {
      links.push(createLink(bofuArticles[0], 'conversion', 9));
    }

    // Add 1 sibling MOFU if we have room
    if (links.length < 3 && mofuArticles.length > 0) {
      links.push(createLink(mofuArticles[0], 'related_topic', 7));
    }

  } else if (funnelStage === 'BOFU') {
    // BOFU strategy: 2 MOFU (evidence), 1 TOFU (foundation)
    
    // Add up to 2 MOFU links (evidence)
    for (let i = 0; i < Math.min(2, mofuArticles.length); i++) {
      const target = mofuArticles[i];
      links.push(createLink(target, 'evidence', 9 - i));
    }

    // Add 1 TOFU link (foundation)
    if (links.length < 3 && tofuArticles.length > 0) {
      links.push(createLink(tofuArticles[0], 'context', 7));
    }
  }

  // Enforce max limit
  return links.slice(0, strategy.maxWithinCluster);
}

function createLink(target: any, purpose: string, relevanceScore: number): any {
  return {
    text: target.headline.toLowerCase(),
    url: `/${target.language}/blog/${target.slug}`,
    title: target.headline,
    funnelStage: target.funnel_stage,
    purpose,
    relevanceScore
  };
}
