import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import NotFound from "@/pages/NotFound";
import { LocationHero } from "@/components/location/LocationHero";
import { SpeakableBox } from "@/components/location/SpeakableBox";
import { BestAreasSection } from "@/components/location/BestAreasSection";
import { CostBreakdownSection } from "@/components/location/CostBreakdownSection";
import { LocationFAQSection } from "@/components/location/LocationFAQSection";
import { UseCaseSection } from "@/components/location/UseCaseSection";
import { LocationCTASection } from "@/components/location/LocationCTASection";
import { StickyMobileCTA } from "@/components/blog-article/StickyMobileCTA";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import { LocationHreflangTags } from "@/components/LocationHreflangTags";
import { TrendingUp, Building, Info } from "lucide-react";
import { 
  generateAllLocationSchemas, 
  type LocationPage as LocationPageType,
  type BestArea,
  type CostItem,
  type QAEntity
} from "@/lib/locationSchemaGenerator";
import type { Author } from "@/types/blog";

// Language code mapping for hreflang
const langToHreflang: Record<string, string> = {
  en: 'en-GB',
  de: 'de-DE',
  nl: 'nl-NL',
  fr: 'fr-FR',
  pl: 'pl-PL',
  sv: 'sv-SE',
  da: 'da-DK',
  hu: 'hu-HU',
  fi: 'fi-FI',
  no: 'nb-NO'
};

const BASE_URL = 'https://www.delsolprimehomes.com';

const LocationPage = () => {
  const { citySlug, topicSlug, lang = 'en' } = useParams<{ citySlug: string; topicSlug: string; lang: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['location-page', citySlug, topicSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_pages')
        .select(`
          *,
          author:authors!location_pages_author_id_fkey(*),
          reviewer:authors!location_pages_reviewer_id_fkey(*)
        `)
        .eq('city_slug', citySlug)
        .eq('topic_slug', topicSlug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!citySlug && !!topicSlug,
  });

  // Fetch sibling pages for hreflang (same city/topic, different languages)
  const { data: siblingPages } = useQuery({
    queryKey: ['location-page-siblings', citySlug, topicSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_pages')
        .select('city_slug, topic_slug, language')
        .eq('city_slug', citySlug)
        .eq('topic_slug', topicSlug)
        .eq('status', 'published');

      if (error) throw error;
      return data || [];
    },
    enabled: !!citySlug && !!topicSlug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return <NotFound />;
  }

  // Cast JSON fields to proper types
  const bestAreas = (page.best_areas as unknown as BestArea[]) || [];
  const costBreakdown = (page.cost_breakdown as unknown as CostItem[]) || [];
  const qaEntities = (page.qa_entities as unknown as QAEntity[]) || [];

  const author = page.author as Author | null;
  const currentUrl = `${BASE_URL}/${lang}/locations/${citySlug}/${topicSlug}`;
  
  // Build location page object for schema generation
  const locationPageData: LocationPageType = {
    ...page,
    best_areas: bestAreas,
    cost_breakdown: costBreakdown,
    qa_entities: qaEntities,
    internal_links: [],
    external_citations: [],
  };
  
  const schemas = generateAllLocationSchemas(locationPageData, author);

  // Build hreflang links from sibling pages
  const currentLangCode = langToHreflang[page.language] || page.language;
  const englishSibling = siblingPages?.find(s => s.language === 'en');
  const xDefaultUrl = englishSibling 
    ? `${BASE_URL}/en/locations/${englishSibling.city_slug}/${englishSibling.topic_slug}` 
    : currentUrl;

  return (
    <>
      {/* New hreflang tags component using hreflang_group_id */}
      <LocationHreflangTags
        id={page.id}
        hreflang_group_id={(page as any).hreflang_group_id || null}
        language={page.language}
        slug={`${page.city_slug}/${page.topic_slug}`}
        canonical_url={(page as any).canonical_url || null}
        city_slug={page.city_slug}
        topic_slug={page.topic_slug}
        source_language={(page as any).source_language || 'en'}
      />
      
      <Helmet>
        <html lang={page.language} />
        <title>{page.meta_title}</title>
        <meta name="description" content={page.meta_description} />
        <link rel="canonical" href={currentUrl} />
        
        {/* Hreflang Tags are handled by LocationHreflangTags component above */}
        
        {/* Open Graph */}
        <meta property="og:title" content={page.meta_title} />
        <meta property="og:description" content={page.meta_description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:locale" content={currentLangCode.replace('-', '_')} />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        {page.featured_image_url && <meta property="og:image" content={page.featured_image_url} />}
        {page.featured_image_alt && <meta property="og:image:alt" content={page.featured_image_alt} />}
        
        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.meta_title} />
        <meta name="twitter:description" content={page.meta_description} />
        {page.featured_image_url && <meta name="twitter:image" content={page.featured_image_url} />}
        {page.featured_image_alt && <meta name="twitter:image:alt" content={page.featured_image_alt} />}
        
        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">{JSON.stringify(schemas.place)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.localBusiness)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.webPage)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.speakable)}</script>
        {schemas.faq && <script type="application/ld+json">{JSON.stringify(schemas.faq)}</script>}
        {schemas.imageObject && <script type="application/ld+json">{JSON.stringify(schemas.imageObject)}</script>}
      </Helmet>

      <Header variant="solid" />
      
      <main className="min-h-screen">
        <LocationHero
          headline={page.headline}
          cityName={page.city_name}
          citySlug={page.city_slug}
          topicSlug={page.topic_slug}
          featuredImageUrl={page.featured_image_url}
          featuredImageAlt={page.featured_image_alt}
          featuredImageCaption={(page as any).featured_image_caption}
        />

        <div className="container mx-auto px-4 py-12 md:py-16 space-y-12 md:space-y-16">
          {/* Speakable Answer - AI Citation Ready */}
          <SpeakableBox content={page.speakable_answer} />

          {/* Location Overview */}
          {page.location_overview && (
            <section className="relative animate-fade-in">
              {/* Decorative background */}
              <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
                  <Info className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    About {page.city_name}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Local insights and overview
                  </p>
                </div>
              </div>
              
              <div 
                className="prose prose-lg max-w-none
                  prose-headings:text-foreground prose-headings:font-bold
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                  prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
                  prose-ul:text-muted-foreground prose-ul:my-4
                  prose-li:marker:text-primary prose-li:my-1
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: page.location_overview }}
              />
            </section>
          )}

          {/* Market Breakdown */}
          {page.market_breakdown && (
            <section className="relative animate-fade-in">
              {/* Decorative background */}
              <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    Market Overview
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Current trends and pricing data
                  </p>
                </div>
              </div>
              
              <div 
                className="prose prose-lg max-w-none
                  prose-headings:text-foreground prose-headings:font-bold
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                  prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
                  prose-ul:text-muted-foreground prose-ul:my-4
                  prose-li:marker:text-primary prose-li:my-1
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: page.market_breakdown }}
              />
            </section>
          )}

          {/* Best Areas */}
          <BestAreasSection 
            areas={bestAreas} 
            cityName={page.city_name} 
          />

          {/* Cost Breakdown */}
          <CostBreakdownSection 
            costs={costBreakdown} 
            cityName={page.city_name} 
          />

          {/* Use Cases */}
          <UseCaseSection 
            content={page.use_cases || ''} 
            cityName={page.city_name} 
          />

          {/* Final Summary */}
          {page.final_summary && (
            <section className="relative py-12 md:py-16 animate-fade-in">
              {/* Decorative background */}
              <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full bg-secondary/5 blur-3xl" />
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
                  <Building className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    Summary & Recommendations
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Key takeaways for buyers
                  </p>
                </div>
              </div>
              
              <div 
                className="prose prose-lg max-w-none
                  prose-headings:text-foreground prose-headings:font-bold
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                  prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
                  prose-ul:text-muted-foreground prose-ul:my-4
                  prose-li:marker:text-primary prose-li:my-1
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: page.final_summary }}
              />
            </section>
          )}

          {/* FAQs */}
          <LocationFAQSection 
            faqs={qaEntities} 
            cityName={page.city_name}
          />
        </div>
        
        {/* CTA Section */}
        <LocationCTASection 
          cityName={page.city_name}
          topicName={page.headline}
        />
      </main>

      <Footer />
      
      {/* Sticky Mobile CTA */}
      <StickyMobileCTA />
      
      {/* EMMA Chatbot */}
      <ChatbotWidget articleSlug={`location-${citySlug}-${topicSlug}`} language={page.language || 'en'} />
    </>
  );
};

export default LocationPage;
