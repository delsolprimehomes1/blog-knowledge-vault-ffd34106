import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, HelpCircle, Sparkles, BookOpen, Lightbulb } from 'lucide-react';

interface QAPage {
  id: string;
  slug: string;
  language: string;
  qa_type: 'core' | 'decision';
  title: string;
  question_main: string;
  meta_description: string;
  source_article_id: string;
}

interface RelatedQAPagesProps {
  articleId: string;
  language: string;
  qaPageIds: string[];
  clusterId?: string; // NEW: for cluster-wide Q&As
}

export function RelatedQAPages({ articleId, language, qaPageIds, clusterId }: RelatedQAPagesProps) {
  const [qaPages, setQAPages] = useState<QAPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQAPages = async () => {
      // If we have a clusterId, fetch Q&As from all articles in the cluster
      if (clusterId) {
        // Step 1: Get all article IDs in this cluster with same language
        const { data: clusterArticles, error: clusterError } = await supabase
          .from('blog_articles')
          .select('id')
          .eq('cluster_id', clusterId)
          .eq('language', language)
          .eq('status', 'published');

        if (clusterError) {
          console.error('Error fetching cluster articles:', clusterError);
          setLoading(false);
          return;
        }

        const clusterArticleIds = clusterArticles?.map(a => a.id) || [];

        if (clusterArticleIds.length === 0) {
          setLoading(false);
          return;
        }

        // Step 2: Fetch Q&As from all those articles
        const { data: allQAs, error: qaError } = await supabase
          .from('qa_pages')
          .select('id, slug, language, qa_type, title, question_main, meta_description, source_article_id')
          .in('source_article_id', clusterArticleIds)
          .eq('language', language)
          .eq('status', 'published')
          .limit(10); // Get more than 4 for sorting

        if (qaError) {
          console.error('Error fetching cluster QA pages:', qaError);
          setLoading(false);
          return;
        }

        // Step 3: Sort to prioritize current article's Q&As first
        const sorted = (allQAs || []).sort((a, b) => {
          if (a.source_article_id === articleId && b.source_article_id !== articleId) return -1;
          if (b.source_article_id === articleId && a.source_article_id !== articleId) return 1;
          return 0;
        });

        // Step 4: Take top 4
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
        .select('id, slug, language, qa_type, title, question_main, meta_description, source_article_id')
        .in('id', qaPageIds)
        .eq('language', language)
        .eq('status', 'published')
        .order('qa_type', { ascending: true });

      if (error) {
        console.error('Error fetching QA pages:', error);
      } else {
        setQAPages((data as QAPage[]) || []);
      }
      
      setLoading(false);
    };

    fetchQAPages();
  }, [articleId, language, qaPageIds, clusterId]);

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
                {/* Badge and Icon */}
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={qa.qa_type === 'core' ? 'default' : 'secondary'}
                    className={`${
                      qa.qa_type === 'core' 
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20' 
                        : 'bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20'
                    } font-medium`}
                  >
                    {qa.qa_type === 'core' ? (
                      <><BookOpen className="h-3 w-3 mr-1" /> Essential Guide</>
                    ) : (
                      <><Lightbulb className="h-3 w-3 mr-1" /> Expert Tips</>
                    )}
                  </Badge>
                  <Sparkles className={`h-5 w-5 ${
                    qa.qa_type === 'core' ? 'text-blue-400' : 'text-purple-400'
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
