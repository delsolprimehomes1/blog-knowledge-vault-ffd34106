import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, HelpCircle, Sparkles, BookOpen, Lightbulb, TrendingUp, Target } from 'lucide-react';

interface QAPage {
  id: string;
  slug: string;
  language: string;
  qa_type: 'core' | 'decision' | 'practical' | 'problem';
  title: string;
  question_main: string;
  meta_description: string;
  source_article_id: string;
  funnel_stage?: 'TOFU' | 'MOFU' | 'BOFU';
}

interface RelatedQAPagesProps {
  articleId: string;
  language: string;
  qaPageIds: string[];
  clusterId?: string;
  articleFunnelStage?: string; // NEW: for Hans' funnel-based linking
}

// Hans' funnel-based Q&A selection pattern
const getQAPattern = (articleFunnelStage: string) => {
  switch (articleFunnelStage) {
    case 'TOFU':
      return [
        { source: 'THIS_ARTICLE', count: 2 },
        { source: 'SAME_CLUSTER', stage: 'MOFU', count: 2 }
      ];
    case 'MOFU':
      return [
        { source: 'THIS_ARTICLE', count: 2 },
        { source: 'SAME_CLUSTER', stage: 'MOFU', count: 1 },
        { source: 'SAME_CLUSTER', stage: 'BOFU', count: 1 }
      ];
    case 'BOFU':
      return [
        { source: 'THIS_ARTICLE', count: 2 },
        { source: 'SAME_CLUSTER', stage: 'MOFU', count: 2 }
      ];
    default:
      return [];
  }
};

export function RelatedQAPages({ articleId, language, qaPageIds, clusterId, articleFunnelStage }: RelatedQAPagesProps) {
  const [qaPages, setQAPages] = useState<QAPage[]>([]);
  const [loading, setLoading] = useState(true);

  // Validate language is provided
  if (!language) {
    console.error('[RelatedQAPages] language prop is required but missing');
    return null;
  }

  useEffect(() => {
    const fetchQAPages = async () => {
      // NEW: If we have funnel stage and cluster, use Hans' funnel-based pattern
      if (articleFunnelStage && clusterId) {
        const pattern = getQAPattern(articleFunnelStage);
        const collectedQAs: QAPage[] = [];

        for (const rule of pattern) {
          if (collectedQAs.length >= 4) break;
          
          let query = supabase
            .from('qa_pages')
            .select('id, slug, language, qa_type, title, question_main, meta_description, source_article_id, funnel_stage')
            .eq('cluster_id', clusterId)
            .eq('language', language)
            .eq('status', 'published');

          if (rule.source === 'THIS_ARTICLE') {
            query = query.eq('source_article_id', articleId);
          } else {
            query = query.neq('source_article_id', articleId);
            if (rule.stage) {
              query = query.eq('funnel_stage', rule.stage);
            }
          }

          const { data, error } = await query.limit(rule.count);
          
          if (!error && data) {
            // Avoid duplicates AND filter by language as safety check
            const newQAs = data.filter((qa: any) => 
              !collectedQAs.some(existing => existing.id === qa.id) &&
              qa.language === language // Safety: ensure language match
            );
            collectedQAs.push(...(newQAs as QAPage[]));
          }
        }

        // If we don't have 4 Q&As, fill with any cluster Q&As
        if (collectedQAs.length < 4) {
          const existingIds = collectedQAs.map(qa => qa.id);
          const { data: fillerQAs } = await supabase
            .from('qa_pages')
            .select('id, slug, language, qa_type, title, question_main, meta_description, source_article_id, funnel_stage')
            .eq('cluster_id', clusterId)
            .eq('language', language)
            .eq('status', 'published')
            .not('id', 'in', `(${existingIds.join(',')})`)
            .limit(4 - collectedQAs.length);

          if (fillerQAs) {
            // Filter by language as safety check
            const validFillers = fillerQAs.filter((qa: any) => qa.language === language);
            collectedQAs.push(...(validFillers as QAPage[]));
          }
        }

        // Final language validation before setting
        const validatedQAs = collectedQAs.filter(qa => qa.language === language);
        if (validatedQAs.length !== collectedQAs.length) {
          console.warn(`[RelatedQAPages] Filtered out ${collectedQAs.length - validatedQAs.length} Q&As with wrong language`);
        }
        setQAPages(validatedQAs.slice(0, 4));
        setLoading(false);
        return;
      }

      // Fallback: Original cluster-based logic (no funnel stage)
      if (clusterId) {
        const { data: clusterQAs, error: qaError } = await supabase
          .from('qa_pages')
          .select('id, slug, language, qa_type, title, question_main, meta_description, source_article_id, funnel_stage')
          .eq('cluster_id', clusterId)
          .eq('language', language)
          .eq('status', 'published')
          .limit(10);

        if (qaError) {
          console.error('Error fetching cluster QA pages:', qaError);
          setLoading(false);
          return;
        }

        // Sort to prioritize current article's Q&As first, and filter by language as safety
        const sorted = (clusterQAs || [])
          .filter(qa => qa.language === language) // Safety: ensure language match
          .sort((a, b) => {
            if (a.source_article_id === articleId && b.source_article_id !== articleId) return -1;
            if (b.source_article_id === articleId && a.source_article_id !== articleId) return 1;
            return 0;
          });

        setQAPages((sorted.slice(0, 4) as QAPage[]) || []);
        setLoading(false);
        return;
      }

      // Fallback: use qaPageIds directly (legacy behavior)
      if (!qaPageIds || qaPageIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('qa_pages')
        .select('id, slug, language, qa_type, title, question_main, meta_description, source_article_id, funnel_stage')
        .in('id', qaPageIds)
        .eq('language', language)
        .eq('status', 'published')
        .order('qa_type', { ascending: true });

      if (error) {
        console.error('Error fetching QA pages:', error);
      } else {
        // Filter by language as safety check
        const validQAs = (data || []).filter((qa: any) => qa.language === language);
        setQAPages((validQAs as QAPage[]) || []);
      }
      
      setLoading(false);
    };

    fetchQAPages();
  }, [articleId, language, qaPageIds, clusterId, articleFunnelStage]);

  if (loading) {
    return (
      <section className="py-8 space-y-6">
        <div className="h-8 bg-muted/50 rounded-lg w-64 animate-pulse" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48 bg-muted/30 rounded-2xl animate-pulse" />
          <div className="h-48 bg-muted/30 rounded-2xl animate-pulse" />
          <div className="h-48 bg-muted/30 rounded-2xl animate-pulse" />
          <div className="h-48 bg-muted/30 rounded-2xl animate-pulse" />
        </div>
      </section>
    );
  }

  if (qaPages.length === 0) {
    return null;
  }

  // Funnel stage badge colors
  const getFunnelBadge = (funnelStage?: string) => {
    switch (funnelStage) {
      case 'TOFU':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
            <TrendingUp className="h-3 w-3 mr-1" /> Awareness
          </Badge>
        );
      case 'MOFU':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
            <Lightbulb className="h-3 w-3 mr-1" /> Consideration
          </Badge>
        );
      case 'BOFU':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
            <Target className="h-3 w-3 mr-1" /> Decision
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <section className="py-8 space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Common Questions Answered
          </h2>
          <p className="text-muted-foreground text-sm">
            Deep-dive Q&A pages based on this topic
          </p>
        </div>
      </div>

      {/* QA Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {qaPages.map((qa) => (
          <Link
            key={qa.id}
            to={`/${qa.language}/qa/${qa.slug}`}
            className="group block"
          >
            <Card className="h-full border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                {/* Badges Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={qa.qa_type === 'core' ? 'default' : 'secondary'}
                      className={`${
                        qa.qa_type === 'core' 
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20' 
                          : qa.qa_type === 'decision'
                          ? 'bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20'
                          : qa.qa_type === 'practical'
                          ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
                          : 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20'
                      } font-medium`}
                    >
                      {qa.qa_type === 'core' ? (
                        <><BookOpen className="h-3 w-3 mr-1" /> Essential Guide</>
                      ) : qa.qa_type === 'decision' ? (
                        <><Lightbulb className="h-3 w-3 mr-1" /> Expert Tips</>
                      ) : qa.qa_type === 'practical' ? (
                        <><Target className="h-3 w-3 mr-1" /> How-To</>
                      ) : (
                        <><HelpCircle className="h-3 w-3 mr-1" /> Avoid Mistakes</>
                      )}
                    </Badge>
                    {qa.funnel_stage && getFunnelBadge(qa.funnel_stage)}
                  </div>
                  <Sparkles className={`h-5 w-5 ${
                    qa.qa_type === 'core' ? 'text-blue-400' : 
                    qa.qa_type === 'decision' ? 'text-purple-400' :
                    qa.qa_type === 'practical' ? 'text-green-400' :
                    'text-orange-400'
                  } opacity-60`} />
                </div>

                {/* Question */}
                <h3 className="font-semibold text-lg text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {qa.question_main}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {qa.meta_description}
                </p>

                {/* Read More Link */}
                <div className="flex items-center text-primary font-medium text-sm pt-2">
                  <span>Read Full Answer</span>
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Footer Note */}
      {qaPages.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {qaPages.length} Q&A page{qaPages.length !== 1 ? 's' : ''} available in {language.toUpperCase()}
          </p>
        </div>
      )}
    </section>
  );
}