import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import BlogEmmaChat from "@/components/blog-article/BlogEmmaChat";
import { TrendingUp, Building, Info } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { 
  type LocationPage as LocationPageType,
  type BestArea,
  type CostItem,
  type QAEntity
} from "@/lib/locationSchemaGenerator";
import type { Author } from "@/types/blog";

const LocationPage = () => {
  const { citySlug, topicSlug, lang = 'en' } = useParams<{ citySlug: string; topicSlug: string; lang: string }>();
  const { t } = useTranslation();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['location-page', citySlug, topicSlug, lang],
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
        .eq('language', lang)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!citySlug && !!topicSlug && !!lang,
  });

  // Helper function to replace placeholders
  const replaceCity = (text: string, city: string) => text.replace('{city}', city);

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

  return (
    <>
      {/* SEO tags are handled by server/edge - no Helmet needed */}
      <Header 
        variant="solid" 
        contentContext={{
          type: 'location',
          hreflangGroupId: page.hreflang_group_id,
          currentSlug: `${page.city_slug}/${page.topic_slug}`,
          currentLanguage: page.language || 'en'
        }}
      />
      
      <main className="min-h-screen">
        <LocationHero
          headline={page.headline}
          cityName={page.city_name}
          citySlug={page.city_slug}
          topicSlug={page.topic_slug}
          featuredImageUrl={page.featured_image_url}
          featuredImageAlt={page.featured_image_alt}
          featuredImageCaption={(page as any).featured_image_caption}
          currentLanguage={page.language || 'en'}
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
                    {replaceCity(t.locationGuides?.aboutCity || "About {city}", page.city_name)}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {t.locationGuides?.localInsights || "Local insights and overview"}
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
                    {t.locationGuides?.marketOverview || "Market Overview"}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {t.locationGuides?.marketTrends || "Current trends and pricing data"}
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
                    {t.locationGuides?.summaryRecommendations || "Summary & Recommendations"}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {t.locationGuides?.keyTakeaways || "Key takeaways for buyers"}
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
          language={page.language || 'en'}
        />
      </main>

      <Footer />
      
      {/* Sticky Mobile CTA */}
      <StickyMobileCTA />
      
      {/* Emma Chat - Same as landing pages */}
      <BlogEmmaChat language={page.language || 'en'} />
    </>
  );
};

export default LocationPage;
