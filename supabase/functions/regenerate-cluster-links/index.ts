import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Article interface with enhanced fields for semantic scoring
interface Article {
  id: string;
  headline: string;
  slug: string;
  funnel_stage: string;
  language: string;
  cluster_number?: number;
  detailed_content?: string;
  meta_description?: string;
  category?: string;
  cluster_theme?: string;
  canonical_url?: string;
}

// Authority link structure
interface AuthorityLink {
  url: string;
  title: string;
  type: string;
  rel: string;
  purpose: string;
}

// External authority links database - Spanish real estate focused
const AUTHORITY_LINKS: Record<string, AuthorityLink[]> = {
  legal: [
    {
      url: 'https://www.agenciatributaria.gob.es/AEAT.internet/en_gb/Inicio.shtml',
      title: 'Spanish Tax Agency - Official Guidelines',
      type: 'external_authority',
      rel: 'external nofollow',
      purpose: 'credibility_signal'
    },
    {
      url: 'https://www.registradores.org/en/',
      title: 'College of Registrars of Spain',
      type: 'external_authority',
      rel: 'external nofollow',
      purpose: 'credibility_signal'
    }
  ],
  market: [
    {
      url: 'https://www.ine.es/en/index.htm',
      title: 'National Statistics Institute Spain',
      type: 'external_authority',
      rel: 'external nofollow',
      purpose: 'credibility_signal'
    }
  ],
  buying: [
    {
      url: 'https://www.notariado.org/portal/',
      title: 'General Council of Spanish Notaries',
      type: 'external_authority',
      rel: 'external nofollow',
      purpose: 'credibility_signal'
    }
  ],
  visa: [
    {
      url: 'https://www.inclusion.gob.es/en/index.htm',
      title: 'Ministry of Inclusion - Immigration',
      type: 'external_authority',
      rel: 'external nofollow',
      purpose: 'credibility_signal'
    }
  ],
  property: [
    {
      url: 'https://www.idealista.com/en/news/property-market-spain/',
      title: 'Idealista Property Market Reports',
      type: 'external_authority',
      rel: 'external nofollow',
      purpose: 'credibility_signal'
    }
  ]
};

// Strategic funnel-based linking rules with semantic enhancement
const FUNNEL_LINK_STRATEGY = {
  TOFU: {
    description: '50% MOFU (funnel progression), 35% sibling TOFU (related topic), 15% authority',
    targetStages: ['MOFU', 'TOFU']
  },
  MOFU: {
    description: '25% TOFU (context), 35% BOFU (conversion), 25% sibling MOFU (comparison), 15% authority',
    targetStages: ['TOFU', 'BOFU', 'MOFU']
  },
  BOFU: {
    description: '40% MOFU (evidence), 25% TOFU (foundation), 20% sibling BOFU (conversion), 15% authority',
    targetStages: ['MOFU', 'TOFU', 'BOFU']
  }
};

// Calculate semantic relevance between two articles
const calculateRelevanceScore = (sourceArticle: Article, targetArticle: Article): number => {
  let score = 0;
  
  // Same category gets +30 points
  if (sourceArticle.category && targetArticle.category && 
      sourceArticle.category.toLowerCase() === targetArticle.category.toLowerCase()) {
    score += 30;
  }
  
  // Similar cluster themes get +25 points
  if (sourceArticle.cluster_theme && targetArticle.cluster_theme) {
    const sourceThemeWords = sourceArticle.cluster_theme.toLowerCase().split(/\s+/);
    const targetThemeWords = targetArticle.cluster_theme.toLowerCase().split(/\s+/);
    const sharedWords = sourceThemeWords.filter(word => 
      targetThemeWords.some(tw => tw.includes(word) || word.includes(tw))
    );
    if (sharedWords.length > 0) {
      score += Math.min(25, sharedWords.length * 8);
    }
  }
  
  // Headline keyword overlap gets +20 points
  if (sourceArticle.headline && targetArticle.headline) {
    const sourceWords = sourceArticle.headline.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const targetWords = targetArticle.headline.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const commonWords = sourceWords.filter(word => targetWords.includes(word));
    if (commonWords.length > 0) {
      score += Math.min(20, commonWords.length * 5);
    }
  }
  
  // Content overlap bonus +15 points (check first 500 chars for efficiency)
  if (sourceArticle.detailed_content && targetArticle.detailed_content) {
    const sourceContent = sourceArticle.detailed_content.substring(0, 500).toLowerCase();
    const targetContent = targetArticle.detailed_content.substring(0, 500).toLowerCase();
    
    // Check for key location terms
    const locations = ['marbella', 'costa del sol', 'malaga', 'estepona', 'benahavis', 'mijas', 'fuengirola'];
    const sharedLocations = locations.filter(loc => 
      sourceContent.includes(loc) && targetContent.includes(loc)
    );
    if (sharedLocations.length > 0) {
      score += Math.min(15, sharedLocations.length * 5);
    }
  }
  
  // Same cluster_number bonus +10 points
  if (sourceArticle.cluster_number && targetArticle.cluster_number &&
      sourceArticle.cluster_number === targetArticle.cluster_number) {
    score += 10;
  }
  
  return Math.min(score, 100);
};

// Select best links based on semantic relevance
const selectBestLinks = (
  sourceArticle: Article,
  candidates: Article[],
  count: number
): { article: Article; relevanceScore: number }[] => {
  return candidates
    .filter(c => c.id !== sourceArticle.id) // Exclude self
    .map(candidate => ({
      article: candidate,
      relevanceScore: calculateRelevanceScore(sourceArticle, candidate)
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, count);
};

// Generate question-based anchor text
const generateQuestionLink = (article: Article): string => {
  let question = article.headline;
  
  // If headline isn't a question, make it more engaging
  if (!question.includes('?')) {
    const lowerHeadline = question.toLowerCase();
    if (lowerHeadline.startsWith('how ') || 
        lowerHeadline.startsWith('what ') || 
        lowerHeadline.startsWith('why ') ||
        lowerHeadline.startsWith('when ') ||
        lowerHeadline.startsWith('where ')) {
      question = question + '?';
    } else if (lowerHeadline.includes('guide') || lowerHeadline.includes('tips')) {
      question = `How to: ${question}`;
    } else {
      question = `Learn more about ${question.toLowerCase()}`;
    }
  }
  
  return question;
};

// Calculate optimal number of links based on article length
const calculateOptimalLinkCount = (article: Article): number => {
  const wordCount = (article.detailed_content || '').split(/\s+/).length;
  
  // Industry best practice: 1 link per 350 words
  const baseLinkCount = Math.floor(wordCount / 350);
  
  // Adjust by funnel stage
  const funnelMultiplier: Record<string, number> = {
    'TOFU': 0.8,  // Fewer links in awareness stage
    'MOFU': 1.0,  // Normal in consideration
    'BOFU': 1.2   // More links in decision stage
  };
  
  const optimalCount = Math.ceil(baseLinkCount * (funnelMultiplier[article.funnel_stage] || 1.0));
  
  // Enforce minimum 2, maximum 6 links
  return Math.max(2, Math.min(optimalCount, 6));
};

// Distribute link types based on funnel stage
const distributeLinkTypes = (totalCount: number, funnelStage: string) => {
  const authorityCount = Math.max(1, Math.floor(totalCount * 0.15));
  const internalCount = totalCount - authorityCount;
  
  switch (funnelStage) {
    case 'TOFU':
      return {
        funnel_progression: Math.ceil(internalCount * 0.6),  // 60% to MOFU
        related_topic: Math.floor(internalCount * 0.4),      // 40% to sibling TOFU
        authority: authorityCount
      };
    case 'MOFU':
      return {
        context: Math.ceil(internalCount * 0.3),            // 30% back to TOFU
        conversion: Math.ceil(internalCount * 0.4),         // 40% to BOFU
        comparison: Math.floor(internalCount * 0.3),        // 30% to sibling MOFU
        authority: authorityCount
      };
    case 'BOFU':
      return {
        evidence: Math.ceil(internalCount * 0.5),           // 50% to MOFU
        foundation: Math.floor(internalCount * 0.3),        // 30% to TOFU
        conversion: Math.floor(internalCount * 0.2),        // 20% to sibling BOFU
        authority: authorityCount
      };
    default:
      return { funnel_progression: internalCount, authority: authorityCount };
  }
};

// Select relevant authority links based on article content
const selectAuthorityLinks = (article: Article): AuthorityLink[] => {
  const category = (article.category || '').toLowerCase();
  const headline = (article.headline || '').toLowerCase();
  const content = (article.detailed_content || '').toLowerCase().substring(0, 1000);
  const combined = `${category} ${headline} ${content}`;
  
  const selectedLinks: AuthorityLink[] = [];
  
  // Check keywords and add relevant authority links
  if (combined.includes('legal') || combined.includes('tax') || combined.includes('law') || 
      combined.includes('itp') || combined.includes('plusvalía')) {
    selectedLinks.push(...(AUTHORITY_LINKS.legal || []));
  }
  if (combined.includes('market') || combined.includes('investment') || combined.includes('statistics') ||
      combined.includes('price') || combined.includes('trend')) {
    selectedLinks.push(...(AUTHORITY_LINKS.market || []));
  }
  if (combined.includes('buying') || combined.includes('notary') || combined.includes('purchase') ||
      combined.includes('deed') || combined.includes('escritura')) {
    selectedLinks.push(...(AUTHORITY_LINKS.buying || []));
  }
  if (combined.includes('visa') || combined.includes('residency') || combined.includes('golden') ||
      combined.includes('nie') || combined.includes('immigration')) {
    selectedLinks.push(...(AUTHORITY_LINKS.visa || []));
  }
  if (combined.includes('property') || combined.includes('real estate') || combined.includes('apartment') ||
      combined.includes('villa') || combined.includes('house')) {
    selectedLinks.push(...(AUTHORITY_LINKS.property || []));
  }
  
  // Return max 2 unique authority links per article
  const uniqueLinks = selectedLinks.filter((link, index, self) => 
    index === self.findIndex(l => l.url === link.url)
  );
  return uniqueLinks.slice(0, 2);
};

// Create link object with all enhanced fields
const createEnhancedLink = (
  target: Article,
  purpose: string,
  relevanceScore: number,
  language: string
): any => {
  return {
    text: target.headline.toLowerCase(),
    url: `/${language}/blog/${target.slug}`,
    title: target.headline,
    question: generateQuestionLink(target),
    snippet: target.meta_description?.substring(0, 120) || '',
    funnel_stage: target.funnel_stage,
    purpose,
    relevance_score: relevanceScore,
    type: 'internal_blog'
  };
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

    // Fetch all articles in the cluster with enhanced fields
    const { data: articles, error: fetchError } = await supabase
      .from('blog_articles')
      .select('id, headline, slug, funnel_stage, language, cluster_number, detailed_content, meta_description, category, cluster_theme, canonical_url')
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
    const byLanguage: Record<string, Article[]> = {};
    for (const article of articles) {
      const lang = article.language || 'en';
      if (!byLanguage[lang]) byLanguage[lang] = [];
      byLanguage[lang].push(article as Article);
    }

    // Filter to specific language if requested
    const languagesToProcess = language ? [language] : Object.keys(byLanguage);
    const results: any[] = [];
    const updates: any[] = [];

    for (const lang of languagesToProcess) {
      const langArticles = byLanguage[lang];
      if (!langArticles || langArticles.length === 0) continue;

      console.log(`[Regenerate Links] Processing ${lang}: ${langArticles.length} articles`);

      // Categorize articles by funnel stage
      const tofuArticles = langArticles.filter(a => a.funnel_stage === 'TOFU');
      const mofuArticles = langArticles.filter(a => a.funnel_stage === 'MOFU');
      const bofuArticles = langArticles.filter(a => a.funnel_stage === 'BOFU');

      for (const article of langArticles) {
        const funnelStage = article.funnel_stage || 'TOFU';
        const optimalLinkCount = calculateOptimalLinkCount(article);
        const distribution = distributeLinkTypes(optimalLinkCount, funnelStage);
        
        const links: any[] = [];

        if (funnelStage === 'TOFU') {
          // TOFU: 60% to MOFU (funnel progression), 40% to sibling TOFU
          const mofuTargets = selectBestLinks(article, mofuArticles, distribution.funnel_progression || 2);
          for (const { article: target, relevanceScore } of mofuTargets) {
            links.push(createEnhancedLink(target, 'funnel_progression', relevanceScore, lang));
          }
          
          const tofuTargets = selectBestLinks(article, tofuArticles, distribution.related_topic || 1);
          for (const { article: target, relevanceScore } of tofuTargets) {
            links.push(createEnhancedLink(target, 'related_topic', relevanceScore, lang));
          }

        } else if (funnelStage === 'MOFU') {
          // MOFU: 30% TOFU (context), 40% BOFU (conversion), 30% sibling MOFU
          const tofuTargets = selectBestLinks(article, tofuArticles, distribution.context || 1);
          for (const { article: target, relevanceScore } of tofuTargets) {
            links.push(createEnhancedLink(target, 'context', relevanceScore, lang));
          }
          
          const bofuTargets = selectBestLinks(article, bofuArticles, distribution.conversion || 1);
          for (const { article: target, relevanceScore } of bofuTargets) {
            links.push(createEnhancedLink(target, 'conversion', relevanceScore, lang));
          }
          
          const mofuTargets = selectBestLinks(article, mofuArticles, distribution.comparison || 1);
          for (const { article: target, relevanceScore } of mofuTargets) {
            links.push(createEnhancedLink(target, 'comparison', relevanceScore, lang));
          }

        } else if (funnelStage === 'BOFU') {
          // BOFU: 50% MOFU (evidence), 30% TOFU (foundation), 20% sibling BOFU
          const mofuTargets = selectBestLinks(article, mofuArticles, distribution.evidence || 2);
          for (const { article: target, relevanceScore } of mofuTargets) {
            links.push(createEnhancedLink(target, 'evidence', relevanceScore, lang));
          }
          
          const tofuTargets = selectBestLinks(article, tofuArticles, distribution.foundation || 1);
          for (const { article: target, relevanceScore } of tofuTargets) {
            links.push(createEnhancedLink(target, 'context', relevanceScore, lang));
          }
          
          const bofuTargets = selectBestLinks(article, bofuArticles, distribution.conversion || 1);
          for (const { article: target, relevanceScore } of bofuTargets) {
            links.push(createEnhancedLink(target, 'conversion', relevanceScore, lang));
          }
        }

        // Add authority links
        const authorityLinks = selectAuthorityLinks(article);
        for (const authLink of authorityLinks) {
          links.push({
            text: authLink.title.toLowerCase(),
            url: authLink.url,
            title: authLink.title,
            type: authLink.type,
            rel: authLink.rel,
            purpose: authLink.purpose,
            relevance_score: 85 // Authority links get high base score
          });
        }

        results.push({
          id: article.id,
          headline: article.headline,
          language: lang,
          funnelStage,
          optimalLinkCount,
          actualLinkCount: links.length,
          internalLinks: links.filter(l => l.type === 'internal_blog').length,
          authorityLinks: links.filter(l => l.type === 'external_authority').length,
          links: links.map(l => ({
            target: l.title,
            purpose: l.purpose,
            relevance_score: l.relevance_score,
            type: l.type
          }))
        });

        if (!dryRun) {
          updates.push({
            id: article.id,
            internal_links: links
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
          .update({ 
            internal_links: update.internal_links,
            updated_at: new Date().toISOString()
          })
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
        if (!acc[r.funnelStage]) acc[r.funnelStage] = { count: 0, avgLinks: 0, avgRelevance: 0 };
        acc[r.funnelStage].count++;
        acc[r.funnelStage].avgLinks = 
          (acc[r.funnelStage].avgLinks * (acc[r.funnelStage].count - 1) + r.actualLinkCount) / acc[r.funnelStage].count;
        return acc;
      }, {}),
      totalInternalLinks: results.reduce((sum, r) => sum + r.internalLinks, 0),
      totalAuthorityLinks: results.reduce((sum, r) => sum + r.authorityLinks, 0),
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