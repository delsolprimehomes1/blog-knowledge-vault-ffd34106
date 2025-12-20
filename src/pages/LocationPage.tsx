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
import { 
  generateAllLocationSchemas, 
  type LocationPage as LocationPageType,
  type BestArea,
  type CostItem,
  type QAEntity
} from "@/lib/locationSchemaGenerator";
import type { Author } from "@/types/blog";

const LocationPage = () => {
  const { citySlug, topicSlug } = useParams<{ citySlug: string; topicSlug: string }>();

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

  return (
    <>
      <Helmet>
        <title>{page.meta_title}</title>
        <meta name="description" content={page.meta_description} />
        <link rel="canonical" href={`https://www.delsolprimehomes.com/locations/${citySlug}/${topicSlug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={page.meta_title} />
        <meta property="og:description" content={page.meta_description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://www.delsolprimehomes.com/locations/${citySlug}/${topicSlug}`} />
        {page.featured_image_url && <meta property="og:image" content={page.featured_image_url} />}
        
        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">{JSON.stringify(schemas.place)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.localBusiness)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.webPage)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.speakable)}</script>
        {schemas.faq && <script type="application/ld+json">{JSON.stringify(schemas.faq)}</script>}
      </Helmet>

      <Header />
      
      <main>
        <LocationHero
          headline={page.headline}
          cityName={page.city_name}
          citySlug={page.city_slug}
          topicSlug={page.topic_slug}
          featuredImageUrl={page.featured_image_url}
          featuredImageAlt={page.featured_image_alt}
        />

        <div className="container mx-auto px-4 py-12">
          {/* Speakable Answer - AI Citation Ready */}
          <SpeakableBox content={page.speakable_answer} className="mb-12" />

          {/* Location Overview */}
          {page.location_overview && (
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                About {page.city_name}
              </h2>
              <div 
                className="prose prose-lg max-w-none text-foreground
                  prose-headings:text-foreground prose-p:text-muted-foreground
                  prose-ul:text-muted-foreground prose-li:marker:text-primary
                  prose-strong:text-foreground"
                dangerouslySetInnerHTML={{ __html: page.location_overview }}
              />
            </section>
          )}

          {/* Market Breakdown */}
          {page.market_breakdown && (
            <section className="mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                Market Overview
              </h2>
              <div 
                className="prose prose-lg max-w-none text-foreground
                  prose-headings:text-foreground prose-p:text-muted-foreground
                  prose-ul:text-muted-foreground prose-li:marker:text-primary
                  prose-strong:text-foreground"
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
            <section className="py-12 border-t">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                Summary
              </h2>
              <div 
                className="prose prose-lg max-w-none text-foreground location-summary
                  prose-headings:text-foreground prose-p:text-muted-foreground
                  prose-strong:text-foreground"
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
      </main>

      <Footer />
    </>
  );
};

export default LocationPage;
