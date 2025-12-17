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
import { ChevronRight, Calendar, ExternalLink, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { generateAllFAQSchemas } from '@/lib/faqPageSchemaGenerator';
import { Author, FAQEntity } from '@/types/blog';

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

export default function FAQPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: faqPage, isLoading, error } = useQuery({
    queryKey: ['faq-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faq_pages')
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
    queryKey: ['faq-siblings', faqPage?.translations],
    queryFn: async () => {
      if (!faqPage?.translations || Object.keys(faqPage.translations).length === 0) {
        return [];
      }
      const slugs = Object.values(faqPage.translations) as string[];
      const { data } = await supabase
        .from('faq_pages')
        .select('slug, language, title')
        .in('slug', slugs)
        .eq('status', 'published');
      return data || [];
    },
    enabled: !!faqPage?.translations,
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

  if (error || !faqPage) {
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
              <h1 className="text-3xl font-display font-bold mb-4">FAQ Not Found</h1>
              <p className="text-muted-foreground mb-8">The FAQ page you're looking for doesn't exist or has been moved.</p>
              <Link 
                to="/faq" 
                className="inline-flex items-center px-6 py-3 bg-prime-gold text-prime-950 font-nav font-semibold rounded-lg hover:bg-prime-goldLight transition-all duration-300 hover:shadow-lg hover:shadow-prime-gold/20"
              >
                Browse all FAQs
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const author: Author | null = faqPage.authors || null;
  const relatedFaqs: FAQEntity[] = (faqPage.related_faqs as unknown as FAQEntity[]) || [];
  const schemas = generateAllFAQSchemas(faqPage as any, author);
  const langCode = LANGUAGE_CODE_MAP[faqPage.language] || faqPage.language;

  return (
    <>
      <Helmet>
        <html lang={langCode} />
        <title>{faqPage.meta_title}</title>
        <meta name="description" content={faqPage.meta_description} />
        <link rel="canonical" href={`${BASE_URL}/faq/${faqPage.slug}`} />
        
        {/* Hreflang for translations */}
        <link rel="alternate" hrefLang={langCode} href={`${BASE_URL}/faq/${faqPage.slug}`} />
        {siblings.map((sibling: any) => (
          <link
            key={sibling.language}
            rel="alternate"
            hrefLang={LANGUAGE_CODE_MAP[sibling.language] || sibling.language}
            href={`${BASE_URL}/faq/${sibling.slug}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/faq/${faqPage.slug}`} />

        {/* Open Graph */}
        <meta property="og:title" content={faqPage.meta_title} />
        <meta property="og:description" content={faqPage.meta_description} />
        <meta property="og:url" content={`${BASE_URL}/faq/${faqPage.slug}`} />
        <meta property="og:type" content="article" />
        {faqPage.featured_image_url && (
          <meta property="og:image" content={faqPage.featured_image_url} />
        )}

        {/* JSON-LD */}
        <script type="application/ld+json">{JSON.stringify(schemas)}</script>
      </Helmet>

      <Header variant="transparent" />

      <main className="min-h-screen bg-background">
        {/* Parallax Hero Section */}
        <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
          {faqPage.featured_image_url ? (
            <div 
              className="absolute inset-0 bg-cover bg-center bg-fixed"
              style={{ backgroundImage: `url(${faqPage.featured_image_url})` }}
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
                <Link to="/faq" className="hover:text-prime-gold transition-colors">FAQ</Link>
                <ChevronRight className="h-4 w-4 mx-2 text-prime-gold/50" />
                <span className="text-white truncate max-w-[200px]">{faqPage.title}</span>
              </nav>

              {/* Badges */}
              <div className="flex items-center gap-3 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <Badge 
                  className={`${
                    faqPage.faq_type === 'core' 
                      ? 'bg-prime-gold text-prime-950' 
                      : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                  } px-4 py-1.5 text-sm font-nav font-medium`}
                >
                  {faqPage.faq_type === 'core' ? 'Essential Guide' : 'Expert Tips'}
                </Badge>
                <Badge className="bg-white/10 backdrop-blur-sm text-white border border-white/20 px-4 py-1.5 text-sm font-nav">
                  {faqPage.language.toUpperCase()}
                </Badge>
              </div>

              {/* Main Question (H1) */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white leading-tight max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                {faqPage.question_main}
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
                {faqPage.speakable_answer}
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
                <p className="font-display font-semibold text-foreground">{author.name}</p>
                <p className="text-sm text-muted-foreground">{author.job_title}</p>
              </div>
              <div className="flex items-center text-sm text-muted-foreground bg-white/50 px-4 py-2 rounded-full">
                <Calendar className="h-4 w-4 mr-2 text-prime-gold" />
                {format(new Date(faqPage.updated_at), 'MMMM d, yyyy')}
              </div>
            </div>
          )}

          {/* Main Answer */}
          <article
            className="prose prose-lg max-w-none mb-14 prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-prime-gold prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
            dangerouslySetInnerHTML={{ __html: faqPage.answer_main }}
          />

          {/* Related FAQs */}
          {relatedFaqs.length > 0 && (
            <section className="mb-14 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Related Questions</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
              
              <Accordion type="single" collapsible className="space-y-3">
                {relatedFaqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`faq-${index}`}
                    className="border border-border/50 rounded-xl px-5 bg-white/50 data-[state=open]:bg-white data-[state=open]:shadow-lg data-[state=open]:border-prime-gold/30 transition-all duration-300"
                  >
                    <AccordionTrigger className="text-left py-5 font-display font-semibold text-foreground hover:text-prime-gold hover:no-underline transition-colors [&[data-state=open]]:text-prime-gold">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* Source Article Link */}
          {faqPage.source_article_slug && (
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
                    <p className="text-sm text-muted-foreground mb-2">This FAQ is based on our comprehensive guide:</p>
                    <Link
                      to={`/blog/${faqPage.source_article_slug}`}
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
                  .filter((s: any) => s.slug !== faqPage.slug)
                  .map((sibling: any) => (
                    <Link
                      key={sibling.slug}
                      to={`/faq/${sibling.slug}`}
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
