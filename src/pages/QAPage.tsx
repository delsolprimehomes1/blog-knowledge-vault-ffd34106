import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronRight, Calendar, ExternalLink, Sparkles, Linkedin, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { generateAllQASchemas } from '@/lib/qaPageSchemaGenerator';
import { Author, QAEntity } from '@/types/blog';

const LANGUAGE_CODE_MAP: Record<string, string> = {
  en: 'en-GB',
  de: 'de-DE',
  nl: 'nl-NL',
  fr: 'fr-FR',
  pl: 'pl-PL',
  sv: 'sv-SE',
  da: 'da-DK',
  hu: 'hu-HU',
  fi: 'fi-FI',
  no: 'nb-NO',
};

const BASE_URL = 'https://www.delsolprimehomes.com';

export default function QAPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: qaPage, isLoading, error } = useQuery({
    queryKey: ['qa-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_pages')
        .select('*, authors!author_id(*)')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      
      if (error) throw error;
      return data;
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

  if (error || !qaPage) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
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
                to="/qa" 
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
  const schemas = generateAllQASchemas(qaPage as any, author);
  const langCode = LANGUAGE_CODE_MAP[qaPage.language] || qaPage.language;
  
  // Use canonical_url from database if set, otherwise fallback to generated URL
  const canonicalUrl = qaPage.canonical_url || `${BASE_URL}/qa/${qaPage.slug}`;
  
  // Calculate x-default URL - should point to English version
  const translations = (qaPage.translations as Record<string, string>) || {};
  const englishSlug = qaPage.language === 'en' 
    ? qaPage.slug 
    : (translations.en || qaPage.slug);
  const xDefaultUrl = `${BASE_URL}/qa/${englishSlug}`;

  return (
    <>
      <Helmet>
        <html lang={langCode} />
        <title>{qaPage.meta_title}</title>
        <meta name="description" content={qaPage.meta_description} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <meta name="author" content={author?.name || "Del Sol Prime Homes"} />
        <meta name="keywords" content={`${qaPage.category || 'Costa del Sol'}, Spain property, real estate Q&A, ${qaPage.question_main.split(' ').slice(0, 5).join(' ')}`} />
        
        {/* Hreflang for translations */}
        <link rel="alternate" hrefLang={langCode} href={`${BASE_URL}/qa/${qaPage.slug}`} />
        {siblings.map((sibling: any) => (
          <link
            key={sibling.language}
            rel="alternate"
            hrefLang={LANGUAGE_CODE_MAP[sibling.language] || sibling.language}
            href={`${BASE_URL}/qa/${sibling.slug}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={xDefaultUrl} />

        {/* Open Graph */}
        <meta property="og:title" content={qaPage.meta_title} />
        <meta property="og:description" content={qaPage.meta_description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        <meta property="og:locale" content={langCode.replace('-', '_')} />
        {qaPage.featured_image_url && (
          <meta property="og:image" content={qaPage.featured_image_url} />
        )}
        {qaPage.featured_image_url && <meta property="og:image:alt" content={qaPage.featured_image_alt || qaPage.question_main} />}
        <meta property="article:published_time" content={qaPage.created_at} />
        <meta property="article:modified_time" content={qaPage.updated_at} />
        {author && <meta property="article:author" content={author.name} />}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={qaPage.meta_title} />
        <meta name="twitter:description" content={qaPage.meta_description} />
        {qaPage.featured_image_url && <meta name="twitter:image" content={qaPage.featured_image_url} />}

        {/* JSON-LD - uses FAQPage schema type for SEO */}
        <script type="application/ld+json">{JSON.stringify(schemas)}</script>
      </Helmet>

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
                <Link to="/qa" className="hover:text-prime-gold transition-colors">Q&A</Link>
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
                  {qaPage.qa_type === 'core' ? 'Essential Guide' : 'Expert Tips'}
                </Badge>
                <Badge className="bg-white/10 backdrop-blur-sm text-white border border-white/20 px-4 py-1.5 text-sm font-nav">
                  {qaPage.language.toUpperCase()}
                </Badge>
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
                <span className="text-sm font-nav font-semibold text-prime-gold uppercase tracking-wider">Quick Answer</span>
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
                  <span className="font-medium">Verified</span>
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
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Related Questions</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
              
              <Accordion type="single" collapsible className="space-y-3">
                {relatedQas.map((qa, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`qa-${index}`}
                    className="border border-border/50 rounded-xl px-5 bg-white/50 data-[state=open]:bg-white data-[state=open]:shadow-lg data-[state=open]:border-prime-gold/30 transition-all duration-300"
                  >
                    <AccordionTrigger className="text-left py-5 font-display font-semibold text-foreground hover:text-prime-gold hover:no-underline transition-colors [&[data-state=open]]:text-prime-gold">
                      {qa.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                      {qa.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* Source Article Link */}
          {qaPage.source_article_slug && (
            <Card className="mb-14 border-0 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all duration-300 group animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-1/3 h-32 sm:h-auto bg-gradient-to-br from-prime-900 to-prime-950 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-prime-gold/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <ExternalLink className="h-6 w-6 text-prime-gold" />
                      </div>
                      <span className="text-white/60 text-sm font-nav">Full Article</span>
                    </div>
                  </div>
                  <div className="flex-1 p-6 flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground mb-2">This Q&A is based on our comprehensive guide:</p>
                    <Link
                      to={`/blog/${qaPage.source_article_slug}`}
                      className="inline-flex items-center text-lg font-display font-semibold text-foreground group-hover:text-prime-gold transition-colors"
                    >
                      Read the full article
                      <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform text-prime-gold" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Language Switcher */}
          {siblings.length > 0 && (
            <div className="border-t border-border/50 pt-10 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <p className="text-sm text-muted-foreground mb-4 font-nav uppercase tracking-wider">Available in other languages:</p>
              <div className="flex flex-wrap gap-3">
                {siblings
                  .filter((s: any) => s.slug !== qaPage.slug)
                  .map((sibling: any) => (
                    <Link
                      key={sibling.slug}
                      to={`/qa/${sibling.slug}`}
                      className="inline-flex items-center px-5 py-2.5 bg-white border border-border/50 rounded-full text-sm font-nav font-medium text-foreground hover:border-prime-gold hover:text-prime-gold hover:shadow-md hover:shadow-prime-gold/10 transition-all duration-300"
                    >
                      {sibling.language.toUpperCase()}
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
