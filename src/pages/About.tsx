import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { AboutHero } from "@/components/about/AboutHero";
import { MissionStatement } from "@/components/about/MissionStatement";
import { OurStory } from "@/components/about/OurStory";
import { FounderProfiles } from "@/components/about/FounderProfiles";
import { WhyChooseUs } from "@/components/about/WhyChooseUs";
import { Credentials } from "@/components/about/Credentials";
import { AboutFAQ } from "@/components/about/AboutFAQ";
import { AboutCTA } from "@/components/about/AboutCTA";
import { generateAllAboutSchemas, type AboutPageContent } from "@/lib/aboutSchemaGenerator";

const BASE_URL = "https://www.delsolprimehomes.com";

// Default content fallback
const defaultContent: AboutPageContent = {
  meta_title: "About Del Sol Prime Homes | Expert Real Estate Agents Costa del Sol",
  meta_description: "Meet the founders of Del Sol Prime Homes. 15+ years experience helping international buyers find their perfect property in Marbella, Estepona, and the Costa del Sol.",
  canonical_url: `${BASE_URL}/about`,
  speakable_summary: "Del Sol Prime Homes is a premier real estate agency on the Costa del Sol, founded by experienced professionals with over 15 years of combined experience helping international buyers find their dream properties.",
  hero_headline: "Your Trusted Partners in Costa del Sol Real Estate",
  hero_subheadline: "Three founders, 15+ years of expertise, and one mission: making your Spanish property dreams a reality.",
  mission_statement: "We believe everyone deserves expert guidance when making one of life's biggest investments. Our mission is to provide transparent, personalized real estate services that put your interests first.",
  years_in_business: 15,
  properties_sold: 500,
  client_satisfaction_percent: 98,
  faq_entities: [],
  citations: [],
  founders: [],
  language: "en"
};

const About = () => {
  // Fetch content from database
  const { data: content, isLoading } = useQuery({
    queryKey: ["about-page-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("about_page_content")
        .select("*")
        .eq("slug", "main")
        .maybeSingle();

      if (error) {
        console.error("Error fetching about content:", error);
        return null;
      }

      return data;
    }
  });

  // Merge with defaults
  const pageContent: AboutPageContent = content
    ? {
        meta_title: content.meta_title,
        meta_description: content.meta_description,
        canonical_url: content.canonical_url || `${BASE_URL}/about`,
        speakable_summary: content.speakable_summary,
        hero_headline: content.hero_headline,
        hero_subheadline: content.hero_subheadline,
        mission_statement: content.mission_statement,
        years_in_business: content.years_in_business || 15,
        properties_sold: content.properties_sold || 500,
        client_satisfaction_percent: content.client_satisfaction_percent || 98,
        faq_entities: (content.faq_entities as unknown as AboutPageContent["faq_entities"]) || [],
        citations: (content.citations as unknown as AboutPageContent["citations"]) || [],
        founders: (content.founders as unknown as AboutPageContent["founders"]) || [],
        language: content.language || "en"
      }
    : defaultContent;

  // Generate JSON-LD schema
  const jsonLdSchema = generateAllAboutSchemas(pageContent);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        {/* SEO Meta */}
        <title>{pageContent.meta_title}</title>
        <meta name="description" content={pageContent.meta_description} />
        <link rel="canonical" href={pageContent.canonical_url} />

        {/* Open Graph */}
        <meta property="og:title" content={pageContent.meta_title} />
        <meta property="og:description" content={pageContent.meta_description} />
        <meta property="og:url" content={pageContent.canonical_url} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageContent.meta_title} />
        <meta name="twitter:description" content={pageContent.meta_description} />

        {/* Language */}
        <html lang={pageContent.language} />

        {/* JSON-LD Schema - Comprehensive for AI understanding */}
        <script type="application/ld+json">{jsonLdSchema}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main>
          {/* Hero with H1 */}
          <AboutHero
            headline={pageContent.hero_headline}
            subheadline={pageContent.hero_subheadline}
            yearsInBusiness={pageContent.years_in_business}
            propertiesSold={pageContent.properties_sold}
            clientSatisfaction={pageContent.client_satisfaction_percent}
          />

          {/* Mission with Speakable content */}
          <MissionStatement
            mission={pageContent.mission_statement}
            speakableSummary={pageContent.speakable_summary}
          />

          {/* Story section with H2/H3 structure */}
          {content?.our_story_content && (
            <OurStory content={content.our_story_content} />
          )}

          {/* Founders - E-E-A-T People */}
          <FounderProfiles founders={pageContent.founders} />

          {/* Why Choose Us */}
          {content?.why_choose_us_content && (
            <WhyChooseUs content={content.why_choose_us_content} />
          )}

          {/* Credentials & Citations - GEO */}
          <Credentials
            credentials={pageContent.founders.length > 0 ? [
              { name: "API Licensed", description: "Registered with Agentes de la Propiedad Inmobiliaria", icon: "shield-check" },
              { name: "RICS Affiliated", description: "Royal Institution of Chartered Surveyors standards", icon: "award" },
              { name: "AML Compliant", description: "Full Anti-Money Laundering compliance", icon: "file-check" },
              { name: "GDPR Certified", description: "EU data protection standards", icon: "lock" }
            ] : []}
            citations={pageContent.citations}
          />

          {/* FAQ Section - AEO */}
          <AboutFAQ faqs={pageContent.faq_entities} />

          {/* CTA */}
          <AboutCTA />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default About;
