import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentLanguageSwitcher } from '@/components/ContentLanguageSwitcher';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronRight, Calendar, ExternalLink, Sparkles, Linkedin, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Author, QAEntity } from '@/types/blog';
import { translations } from '@/i18n/translations';
import BlogEmmaChat from '@/components/blog-article/BlogEmmaChat';

const BASE_URL = 'https://www.delsolprimehomes.com';

/**
 * Normalize a slug by removing hidden characters, URL-encoded garbage, 
 * and accidentally appended domains from copy-paste errors.
 */
function normalizeSlug(rawSlug: string): string {
  if (!rawSlug) return '';
  
  let clean = decodeURIComponent(rawSlug);
  // Remove newlines, carriage returns, tabs
  clean = clean.replace(/[\r\n\t]/g, '');
  // Remove accidentally appended domain (common copy-paste error)
  clean = clean.replace(/delsolprimehomes\.com.*$/i, '');
  // Trim whitespace
  clean = clean.trim();
  // Remove trailing slashes
  clean = clean.replace(/\/+$/, '');
  
  return clean;
}

export default function QAPage() {
  const { slug: rawSlug, lang = 'en' } = useParams<{ slug: string; lang: string }>();
  
  // Normalize slug to handle malformed URLs from copy-paste errors
  const slug = normalizeSlug(rawSlug || '');
  
  // If slug was normalized (cleaned up), redirect to clean URL
  if (rawSlug && slug !== rawSlug) {
    console.warn(`[QAPage] Normalized malformed slug: "${rawSlug}" → "${slug}"`);
    return <Navigate to={`/${lang}/qa/${slug}`} replace />;
  }

  // Fetch Q&A by slug AND language to ensure correct content for the URL
  const { data: qaPage, isLoading, error } = useQuery({
    queryKey: ['qa-page', lang, slug],
    queryFn: async () => {
      // First try to find by slug + language (correct match)
      const { data: exactMatch } = await supabase
        .from('qa_pages')
        .select('*, authors!author_id(*)')
        .eq('slug', slug)
        .eq('language', lang)
        .eq('status', 'published')
        .single();
      
      if (exactMatch) {
        // If source_article_slug is missing but source_article_id exists, fetch it
        if (!exactMatch.source_article_slug && exactMatch.source_article_id) {
          const { data: sourceArticle } = await supabase
            .from('blog_articles')
            .select('slug')
            .eq('id', exactMatch.source_article_id)
            .single();
          if (sourceArticle) {
            exactMatch.source_article_slug = sourceArticle.slug;
          }
        }
        return exactMatch;
      }
      
      // If not found, try slug only to find the actual language
      const { data: anyMatch } = await supabase
        .from('qa_pages')
        .select('*, authors!author_id(*)')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      
      if (anyMatch) {
        // Mark that we need to redirect (language mismatch)
        return { ...anyMatch, _needsRedirect: true };
      }
      
      // Log diagnostic info for debugging
      console.warn(`[QAPage] Q&A not found: slug="${slug}", lang="${lang}"`);
      return null;
    },
    enabled: !!slug,
  });

  // Fetch sibling translations
  const { data: siblings = [] } = useQuery({
    queryKey: ['qa-siblings', qaPage?.translations],
    queryFn: async () => {
      if (!qaPage?.translations || Object.keys(qaPage.translations).length === 0) {
        return [];
      }
      const slugs = Object.values(qaPage.translations) as string[];
      const { data } = await supabase
        .from('qa_pages')
        .select('slug, language, title')
        .in('slug', slugs)
        .eq('status', 'published');
      return data || [];
    },
    enabled: !!qaPage?.translations,
  });

  if (isLoading) {
    return (
      <>
        <Header variant="solid" />
        <main className="min-h-screen bg-background">
          {/* Hero Skeleton */}
          <div className="relative h-[50vh] bg-prime-900">
            <div className="absolute inset-0 flex items-end">
              <div className="container mx-auto px-4 pb-12">
                <Skeleton className="h-8 w-64 mb-4 bg-white/10" />
                <Skeleton className="h-12 w-3/4 mb-4 bg-white/10" />
                <Skeleton className="h-6 w-1/2 bg-white/10" />
              </div>
            </div>
          </div>
          <div className="container mx-auto px-4 max-w-4xl py-12">
            <Skeleton className="h-32 w-full rounded-2xl mb-8" />
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // If Q&A exists but in wrong language folder, show 404 (no cross-language redirect)
  // This prevents redirect chains that confuse search engines
  if (qaPage && (qaPage as any)._needsRedirect && qaPage.language !== lang) {
    return (
      <>
        <Header variant="solid" />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-prime-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-prime-gold" />
              </div>
              <h1 className="text-3xl font-display font-bold mb-4">Q&A Not Found</h1>
              <p className="text-muted-foreground mb-8">This Q&A is not available in this language.</p>
              <Link 
                to={`/${lang}/qa`}
                className="inline-flex items-center px-6 py-3 bg-prime-gold text-prime-950 font-nav font-semibold rounded-lg hover:bg-prime-goldLight transition-all duration-300 hover:shadow-lg hover:shadow-prime-gold/20"
              >
                Browse all Q&As
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !qaPage) {
    return (
      <>
        <Header variant="solid" />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-prime-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-prime-gold" />
              </div>
              <h1 className="text-3xl font-display font-bold mb-4">Q&A Not Found</h1>
              <p className="text-muted-foreground mb-8">The Q&A page you're looking for doesn't exist or has been moved.</p>
              <Link 
                to={`/${lang}/qa`}
                className="inline-flex items-center px-6 py-3 bg-prime-gold text-prime-950 font-nav font-semibold rounded-lg hover:bg-prime-goldLight transition-all duration-300 hover:shadow-lg hover:shadow-prime-gold/20"
              >
                Browse all Q&As
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const author: Author | null = qaPage.authors || null;
  const relatedQas: QAEntity[] = (qaPage.related_qas as unknown as QAEntity[]) || [];
  
  // Get translations for current language
  const t = translations[qaPage.language as keyof typeof translations] || translations.en;

  return (
    <>
      {/* SEO tags are handled by server/edge - no Helmet needed */}
      <Header variant="transparent" />

      <main className="min-h-screen bg-background">
        {/* Parallax Hero Section */}
        <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
          {qaPage.featured_image_url ? (
            <div 
              className="absolute inset-0 bg-cover bg-center bg-fixed"
              style={{ backgroundImage: `url(${qaPage.featured_image_url})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-prime-950 via-prime-900 to-prime-800" />
          )}
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-prime-950 via-prime-950/70 to-transparent" />
          <div className="absolute inset-0 bg-prime-950/30" />
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto px-4 pb-12 md:pb-16">
              {/* Breadcrumb */}
              <nav className="flex items-center text-sm text-white/70 mb-6 animate-fade-in">
                <Link to="/" className="hover:text-prime-gold transition-colors">Home</Link>
                <ChevronRight className="h-4 w-4 mx-2 text-prime-gold/50" />
                <Link to={`/${qaPage.language}/qa`} className="hover:text-prime-gold transition-colors">Q&A</Link>
                <ChevronRight className="h-4 w-4 mx-2 text-prime-gold/50" />
                <span className="text-white truncate max-w-[200px]">{qaPage.title}</span>
              </nav>

              {/* Badges */}
              <div className="flex items-center gap-3 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <Badge 
                  className={`${
                    qaPage.qa_type === 'core' 
                      ? 'bg-prime-gold text-prime-950' 
                      : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                  } px-4 py-1.5 text-sm font-nav font-medium`}
                >
                  {qaPage.qa_type === 'core' ? t.qa.essentialGuide : t.qa.expertTips}
                </Badge>
                <ContentLanguageSwitcher
                  currentLanguage={qaPage.language}
                  hreflangGroupId={(qaPage as any).hreflang_group_id}
                  contentType="qa"
                  currentSlug={slug}
                  variant="hero"
                />
              </div>
              {/* Main Question (H1) - qa-question-main class for speakable schema */}
              <h1 className="qa-question-main text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white leading-tight max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                {qaPage.question_main}
              </h1>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 max-w-4xl py-12 md:py-16">
          {/* Quick Answer Box - Glassmorphism */}
          <Card className="mb-10 border-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] bg-gradient-to-br from-white to-slate-50/80 backdrop-blur-xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-prime-gold to-prime-goldDark" />
            <CardContent className="p-6 md:p-8 pl-8 md:pl-10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-prime-gold" />
                <span className="text-sm font-nav font-semibold text-prime-gold uppercase tracking-wider">{t.qa.quickAnswer}</span>
              </div>
              <p className="speakable-answer text-foreground text-lg leading-relaxed font-sans">
                {qaPage.speakable_answer}
              </p>
            </CardContent>
          </Card>

          {/* Author Attribution */}
          {author && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10 p-5 bg-muted/30 rounded-2xl border border-border/50 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              {author.photo_url && (
                <img
                  src={author.photo_url}
                  alt={author.name}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-prime-gold/20"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display font-semibold text-foreground">{author.name}</p>
                  {author.linkedin_url && (
                    <a
                      href={author.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A66C2] hover:text-[#004182] transition-colors"
                      aria-label={`View ${author.name}'s LinkedIn profile`}
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{author.job_title}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                {/* Last Reviewed Badge */}
                <div className="flex items-center text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  <span className="font-medium">{t.qa.verified}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground bg-white/50 px-4 py-2 rounded-full">
                  <Calendar className="h-4 w-4 mr-2 text-prime-gold" />
                  {format(new Date(qaPage.updated_at), 'MMMM d, yyyy')}
                </div>
              </div>
            </div>
          )}

          {/* Main Answer */}
          <article
            className="prose prose-lg max-w-none mb-14 prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-prime-gold prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
            dangerouslySetInnerHTML={{ __html: qaPage.answer_main }}
          />

          {/* Related Q&As */}
          {relatedQas.length > 0 && (
            <section className="mb-14 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">{t.qa.relatedQuestions}</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
              
              <Accordion type="single" collapsible className="space-y-3">
                {relatedQas.map((qa, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`qa-${index}`}
                    className="border border-border/50 rounded-xl px-5 bg-white/50 data-[state=open]:bg-white data-[state=open]:shadow-lg data-[state=open]:border-prime-gold/30 transition-all duration-300"
                  >
                    <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:text-prime-gold hover:no-underline py-4">
                      {qa.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {qa.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* Source Article Link */}
          {qaPage.source_article_slug && (
            <section className="mb-14 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <Card className="border border-prime-gold/20 bg-gradient-to-r from-prime-gold/5 to-transparent overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-prime-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="h-5 w-5 text-prime-gold" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-foreground mb-2">{t.qa.fullArticle}</h3>
                      <p className="text-muted-foreground text-sm mb-3">{t.qa.readFullArticle}</p>
                      <Link 
                        to={`/${qaPage.language}/blog/${qaPage.source_article_slug}`}
                        className="inline-flex items-center text-prime-gold font-nav font-medium hover:underline"
                      >
                        {t.qa.basedOnGuide}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Language Switcher for Translations */}
          {siblings.length > 1 && (
            <section className="pt-8 border-t border-border/50 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">{t.qa.availableInOtherLanguages}</h3>
              <div className="flex flex-wrap gap-2">
                {siblings.map((sibling: any) => (
                  <Link
                    key={sibling.slug}
                    to={`/${sibling.language}/qa/${sibling.slug}`}
                    className={`px-4 py-2 rounded-full text-sm font-nav font-medium transition-all duration-300 ${
                      sibling.language === qaPage.language
                        ? 'bg-prime-gold text-prime-950'
                        : 'bg-muted text-muted-foreground hover:bg-prime-gold/10 hover:text-prime-gold'
                    }`}
                  >
                    {sibling.language.toUpperCase()}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
      
      {/* Emma Chat - Same as landing pages */}
      <BlogEmmaChat language={qaPage.language || 'en'} />
    </>
  );
}
