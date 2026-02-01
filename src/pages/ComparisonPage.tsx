import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { ComparisonHero } from "@/components/comparison/ComparisonHero";
import { SpeakableBox } from "@/components/comparison/SpeakableBox";
import { ComparisonTable } from "@/components/comparison/ComparisonTable";
import { OptionCard } from "@/components/comparison/OptionCard";
import { VerdictSection } from "@/components/comparison/VerdictSection";
import { ComparisonFAQ } from "@/components/comparison/ComparisonFAQ";
import { CTASection } from "@/components/comparison/CTASection";
import { TLDRSummary } from "@/components/comparison/TLDRSummary";
import { ComparisonLanguageSwitcher } from "@/components/comparison/ComparisonLanguageSwitcher";
import BlogEmmaChat from "@/components/blog-article/BlogEmmaChat";
import { ComparisonPage as ComparisonPageType } from "@/lib/comparisonSchemaGenerator";
import { markdownToHtml } from "@/lib/markdownToHtml";
import { ArrowRight, ArrowLeft, BookOpen, Layers, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LanguageMismatchNotFound } from "@/components/LanguageMismatchNotFound";

const BASE_URL = "https://www.delsolprimehomes.com";

export default function ComparisonPage() {
  const { slug, lang = 'en' } = useParams<{ slug: string; lang: string }>();
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);
  const [showUseCases, setShowUseCases] = useState(false);

  const { data: comparison, isLoading, error } = useQuery({
    queryKey: ['comparison', lang, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparison_pages')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      
      return data as unknown as ComparisonPageType;
    },
    enabled: !!slug,
  });


  const handleChatClick = () => {
    window.dispatchEvent(new CustomEvent('openChatbot'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Comparison Not Found</h1>
            <p className="text-muted-foreground">The comparison you're looking for doesn't exist.</p>
            <Link to={`/${lang}/compare`} className="inline-flex items-center gap-2 text-primary hover:underline">
              View all comparisons
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Smart language mismatch handling:
  // 1. If translation exists for requested language → redirect to correct URL
  // 2. If no translation → show branded 404 with alternatives
  if (comparison.language !== lang) {
    const compTranslations = (comparison as any).translations as Record<string, string> | null;
    
    // Check if the requested language has a translation
    const correctSlug = compTranslations?.[lang];
    
    if (correctSlug) {
      // Translation exists → redirect to correct localized URL
      return <Navigate to={`/${lang}/compare/${correctSlug}`} replace />;
    }
    
    // No translation → show helpful 404 with language alternatives
    return (
      <>
        <Header />
        <LanguageMismatchNotFound
          requestedLang={lang}
          actualLang={comparison.language || 'en'}
          slug={slug || ''}
          translations={compTranslations}
          contentType="compare"
        />
        <Footer />
      </>
    );
  }

  const quickComparisonTable = Array.isArray(comparison.quick_comparison_table) 
    ? comparison.quick_comparison_table 
    : [];
  const qaEntities = Array.isArray(comparison.qa_entities) 
    ? comparison.qa_entities 
    : [];

  const canonicalUrl = (comparison as any).canonical_url || 
    `${BASE_URL}/${comparison.language}/compare/${comparison.slug}`;

  // Build hreflang tags from translations
  const translations = (comparison as any).translations as Record<string, string> | null;
  const hreflangTags: { lang: string; href: string }[] = [];
  
  // Add current language (self-referencing)
  hreflangTags.push({
    lang: comparison.language || 'en',
    href: `${BASE_URL}/${comparison.language}/compare/${comparison.slug}`,
  });
  
  // Add all translations
  if (translations) {
    Object.entries(translations).forEach(([lang, slug]) => {
      if (lang !== comparison.language) {
        hreflangTags.push({
          lang,
          href: `${BASE_URL}/${lang}/compare/${slug}`,
        });
      }
    });
  }

  // Determine x-default (English or current if no English)
  const xDefaultSlug = translations?.en || comparison.slug;
  const xDefaultLang = translations?.en ? 'en' : comparison.language;

  // Build JSON-LD schema with translations
  const comparisonSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": comparison.headline,
    "description": comparison.meta_description,
    "inLanguage": comparison.language,
    "datePublished": comparison.date_published,
    "dateModified": comparison.date_modified,
    "publisher": {
      "@type": "Organization",
      "name": "Del Sol Prime Homes",
      "url": BASE_URL,
    },
    "isPartOf": {
      "@type": "WebSite",
      "name": "Del Sol Prime Homes",
      "url": BASE_URL,
    },
    ...(translations && Object.keys(translations).length > 0 ? {
      "workTranslation": Object.entries(translations)
        .filter(([lang]) => lang !== comparison.language)
        .map(([lang, slug]) => ({
          "@type": "Article",
          "inLanguage": lang,
          "url": `${BASE_URL}/${lang}/compare/${slug}`,
        })),
    } : {}),
  };

  return (
    <>
      <Helmet>
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Hreflang tags for all translations */}
        {hreflangTags.map(({ lang, href }) => (
          <link key={lang} rel="alternate" hrefLang={lang} href={href} />
        ))}
        
        {/* x-default points to English or current language */}
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/${xDefaultLang}/compare/${xDefaultSlug}`} />
        
        {/* JSON-LD Schema */}
        <script type="application/ld+json">
          {JSON.stringify(comparisonSchema)}
        </script>
      </Helmet>
      <Header />
      
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <ComparisonHero
          headline={comparison.headline}
          topic={comparison.comparison_topic}
          optionA={comparison.option_a}
          optionB={comparison.option_b}
          featuredImageUrl={comparison.featured_image_url}
          featuredImageAlt={comparison.featured_image_alt}
          featuredImageCaption={comparison.featured_image_caption}
        />
        
        {/* Language Switcher */}
        <div className="container mx-auto px-4 -mt-4">
          <ComparisonLanguageSwitcher
            currentLanguage={comparison.language || 'en'}
            translations={translations}
            currentSlug={comparison.slug}
          />
        </div>

        <article className="container mx-auto px-4 py-12 max-w-5xl">
          {/* Speakable Answer - Most important for AI */}
          <SpeakableBox 
            answer={comparison.speakable_answer}
            optionA={comparison.option_a}
            optionB={comparison.option_b}
          />

          {/* TL;DR Summary - Quick extraction point for AI */}
          <TLDRSummary
            optionA={comparison.option_a}
            optionB={comparison.option_b}
            quickComparisonTable={quickComparisonTable}
          />

          {/* FAQ Section - Moved UP for better AI extraction */}
          <ComparisonFAQ faqs={qaEntities} />

          {/* Quick Comparison Table */}
          <ComparisonTable 
            data={quickComparisonTable}
            optionA={comparison.option_a}
            optionB={comparison.option_b}
          />

          {/* Option Overviews - With collapsible details */}
          <div className="grid lg:grid-cols-2 gap-6 mt-12">
            {comparison.option_a_overview && (
              <OptionCard 
                title={comparison.option_a}
                content={comparison.option_a_overview}
                variant="primary"
              />
            )}
            {comparison.option_b_overview && (
              <OptionCard 
                title={comparison.option_b}
                content={comparison.option_b_overview}
                variant="secondary"
              />
            )}
          </div>

          {/* Side-by-Side Breakdown - Collapsible for shorter initial load */}
          {comparison.side_by_side_breakdown && (
            <section className="mt-12">
              <button
                onClick={() => setShowFullBreakdown(!showFullBreakdown)}
                className="w-full flex items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-xl">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Side-by-Side Breakdown</h2>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  showFullBreakdown && "rotate-180"
                )} />
              </button>
              
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                showFullBreakdown ? "max-h-[3000px] opacity-100 mt-4" : "max-h-0 opacity-0"
              )}>
                <div 
                  className="prose prose-lg max-w-none text-muted-foreground bg-muted/30 p-6 rounded-2xl border border-border/50
                    prose-headings:text-foreground prose-headings:font-semibold
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-ul:my-4 prose-li:my-1
                    prose-p:my-3 prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(comparison.side_by_side_breakdown) }}
                />
              </div>
            </section>
          )}

          {/* Use Case Scenarios - Collapsible */}
          {comparison.use_case_scenarios && (
            <section className="mt-6">
              <button
                onClick={() => setShowUseCases(!showUseCases)}
                className="w-full flex items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-xl">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">When to Choose Each Option</h2>
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  showUseCases && "rotate-180"
                )} />
              </button>
              
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                showUseCases ? "max-h-[3000px] opacity-100 mt-4" : "max-h-0 opacity-0"
              )}>
                <div 
                  className="prose prose-lg max-w-none text-muted-foreground bg-muted/30 p-6 rounded-2xl border border-border/50
                    prose-headings:text-foreground prose-headings:font-semibold
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-ul:my-4 prose-li:my-1
                    prose-p:my-3 prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(comparison.use_case_scenarios) }}
                />
              </div>
            </section>
          )}

          {/* EMMA CTA Section */}
          <CTASection 
            optionA={comparison.option_a}
            optionB={comparison.option_b}
            onChatClick={handleChatClick}
          />

          {/* Final Verdict */}
          <VerdictSection verdict={comparison.final_verdict} />

          {/* Internal Links */}
          {comparison.internal_links && Array.isArray(comparison.internal_links) && comparison.internal_links.length > 0 && (
            <section className="mt-12 pt-8 border-t border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Related Content
              </h3>
              <div className="flex flex-wrap gap-3">
                {(comparison.internal_links as Array<{ url: string; anchor: string }>).map((link, index) => (
                  <Link
                    key={index}
                    to={link.url}
                    className="px-4 py-2 bg-muted hover:bg-primary/10 hover:text-primary rounded-full text-sm font-medium transition-colors"
                  >
                    {link.anchor}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      <Footer />
      
      {/* Emma Chat - Same as landing pages */}
      <BlogEmmaChat language={comparison.language || 'en'} />
    </>
  );
}
