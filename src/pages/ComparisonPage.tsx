import { useState } from "react";
import { useParams, Link } from "react-router-dom";
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
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import { generateAllComparisonSchemas, ComparisonPage as ComparisonPageType } from "@/lib/comparisonSchemaGenerator";
import { markdownToHtml } from "@/lib/markdownToHtml";
import { ArrowRight, BookOpen, Layers, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ComparisonPage() {
  const { slug } = useParams<{ slug: string }>();
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);
  const [showUseCases, setShowUseCases] = useState(false);

  const { data: comparison, isLoading, error } = useQuery({
    queryKey: ['comparison', slug],
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

  const { data: author } = useQuery({
    queryKey: ['author', comparison?.author_id],
    queryFn: async () => {
      if (!comparison?.author_id) return null;
      const { data } = await supabase
        .from('authors')
        .select('name, job_title, linkedin_url')
        .eq('id', comparison.author_id)
        .single();
      return data;
    },
    enabled: !!comparison?.author_id,
  });

  const handleChatClick = () => {
    const widget = document.querySelector('[data-chatbot-trigger]') as HTMLButtonElement;
    if (widget) widget.click();
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
            <Link to="/compare" className="inline-flex items-center gap-2 text-primary hover:underline">
              View all comparisons
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const schemas = generateAllComparisonSchemas(comparison, author);
  const quickComparisonTable = Array.isArray(comparison.quick_comparison_table) 
    ? comparison.quick_comparison_table 
    : [];
  const qaEntities = Array.isArray(comparison.qa_entities) 
    ? comparison.qa_entities 
    : [];

  return (
    <>
      <Helmet>
        <title>{comparison.meta_title}</title>
        <meta name="description" content={comparison.meta_description} />
        <link rel="canonical" href={`https://www.delsolprimehomes.com/compare/${comparison.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={comparison.meta_title} />
        <meta property="og:description" content={comparison.meta_description} />
        <meta property="og:url" content={`https://www.delsolprimehomes.com/compare/${comparison.slug}`} />
        <meta property="og:type" content="article" />
        {comparison.featured_image_url && (
          <meta property="og:image" content={comparison.featured_image_url} />
        )}
        
        {/* JSON-LD Schemas */}
        <script type="application/ld+json">
          {JSON.stringify(schemas.article)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.speakable)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.breadcrumb)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.organization)}
        </script>
        {schemas.faq && (
          <script type="application/ld+json">
            {JSON.stringify(schemas.faq)}
          </script>
        )}
        {schemas.image && (
          <script type="application/ld+json">
            {JSON.stringify(schemas.image)}
          </script>
        )}
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
      
      {/* Chatbot Widget */}
      <ChatbotWidget 
        articleSlug={comparison.slug} 
        language={comparison.language || 'en'} 
      />
    </>
  );
}
