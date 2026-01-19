import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Compass, ChevronDown, TrendingUp, MapPin, Globe, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";

// New components
import { SpeakableHubIntro } from "@/components/location-hub/SpeakableHubIntro";
import { WhatToExpectSection } from "@/components/location-hub/WhatToExpectSection";
import { FeaturedCitiesSection } from "@/components/location-hub/FeaturedCitiesSection";
import { HubFAQSection } from "@/components/location-hub/HubFAQSection";
import { 
  getLocalizedHubContent, 
  generateHubSchemaGraph, 
  getHubCanonicalUrl,
  getHubLocale,
  getHubHreflangArray
} from "@/lib/locationHubSchemaGenerator";

// STATS array is now dynamically generated from localized content

interface CityData {
  city_slug: string;
  city_name: string;
  region: string;
  count: number;
  image?: string;
  imageAlt?: string;
}

const LocationHub = () => {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['location-cities', lang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_pages')
        .select('id, city_slug, city_name, region, topic_slug, featured_image_url, featured_image_alt')
        .eq('status', 'published')
        .eq('language', lang);

      if (error) throw error;

      const cityMap = new Map<string, CityData>();
      data?.forEach(page => {
        const existing = cityMap.get(page.city_slug);
        if (existing) {
          existing.count++;
          if (!existing.image && page.featured_image_url) {
            existing.image = page.featured_image_url;
            existing.imageAlt = page.featured_image_alt || undefined;
          }
        } else {
          cityMap.set(page.city_slug, {
            city_slug: page.city_slug,
            city_name: page.city_name,
            region: page.region,
            count: 1,
            image: page.featured_image_url || undefined,
            imageAlt: page.featured_image_alt || undefined,
          });
        }
      });

      return Array.from(cityMap.values()).sort((a, b) => b.count - a.count);
    },
  });

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight - 100, behavior: 'smooth' });
  };

  // Get localized content and generate schema
  const hubContent = getLocalizedHubContent(lang);
  const canonicalUrl = getHubCanonicalUrl(lang);
  const locale = getHubLocale(lang);
  const hreflangTags = getHubHreflangArray();
  const totalGuides = cities.reduce((sum, city) => sum + city.count, 0);

  // Dynamically create stats from localized content
  const stats = [
    { icon: MapPin, label: hubContent.statsLabels.cities, value: String(cities.length || 11), suffix: "" },
    { icon: BookOpen, label: hubContent.statsLabels.guides, value: `${totalGuides || 19}+`, suffix: "" },
    { icon: Globe, label: hubContent.statsLabels.languages, value: "10", suffix: "" },
    { icon: TrendingUp, label: hubContent.statsLabels.dataPoints, value: "8", suffix: "" },
  ];
  
  const schemaGraph = generateHubSchemaGraph(lang, {
    language: lang,
    title: hubContent.title,
    description: hubContent.description,
    speakableSummary: hubContent.speakableSummary,
    cities: cities.map(c => ({ name: c.city_name, slug: c.city_slug, guideCount: c.count })),
    totalGuides,
    intentTypes: 8
  });

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>{hubContent.title}</title>
        <meta name="description" content={hubContent.description} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Hreflang tags - 10 languages + x-default */}
        {hreflangTags.map((tag) => (
          <link 
            key={tag.lang}
            rel="alternate" 
            hrefLang={tag.lang} 
            href={tag.href} 
          />
        ))}
        
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={hubContent.title} />
        <meta property="og:description" content={hubContent.description} />
        <meta property="og:locale" content={locale} />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={hubContent.title} />
        <meta name="twitter:description" content={hubContent.description} />
        <script type="application/ld+json">{JSON.stringify(schemaGraph)}</script>
      </Helmet>

      <Header variant="solid" />
      
      <main className="min-h-screen">
        {/* Hero Section with Background Image */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <OptimizedImage
              src="https://images.unsplash.com/photo-1555990793-da11153b2473?w=1920&q=80"
              alt="Aerial view of the Costa del Sol coastline, Spain"
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          </div>

          {/* Speakable Summary - AI-optimized (screen reader accessible) */}
          <div id="speakable-summary" className="sr-only">
            Del Sol Prime Homes Location Intelligence Hub provides comprehensive 
            real estate guides for 11 cities across the Costa del Sol. Explore 
            data-driven insights on property prices, investment yields, school 
            zones, safety ratings, and cost of living analysis for Marbella, 
            Estepona, Fuengirola, and more. Each guide includes expert recommendations
            tailored to families, investors, retirees, and expats.
          </div>

          <div className="container mx-auto px-4 relative z-10 text-center pt-24">
            {/* Breadcrumbs */}
            <nav 
              aria-label="Breadcrumb" 
              className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <ol className="flex items-center justify-center gap-2 text-sm text-white/70">
                <li>
                  <Link to={`/${lang}`} className="hover:text-primary transition-colors">{hubContent.breadcrumbs.home}</Link>
                </li>
                <ChevronRight className="w-4 h-4" />
                <li className="text-white font-medium">{hubContent.breadcrumbs.locations}</li>
              </ol>
            </nav>

            {/* Badge */}
            <div className={`mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-white px-5 py-2.5 text-sm font-medium">
                <Compass className="w-4 h-4 mr-2" />
                {cities.length || 11} {hubContent.statsLabels.cities} • {totalGuides || '19+'} {hubContent.statsLabels.guides} • 10 {hubContent.statsLabels.languages}
              </Badge>
            </div>

            {/* Main H1 - Speakable */}
            <h1 
              className={`speakable-answer text-4xl md:text-5xl lg:text-7xl font-serif font-bold text-white mb-6 leading-[1.1] transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              {hubContent.heroTitle}
              <span className="block text-gradient-gold">{hubContent.heroSubtitle.replace('{count}', String(cities.length || 11))}</span>
            </h1>

            {/* Subtitle */}
            <p 
              className={`text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto mb-12 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              {hubContent.description}
            </p>

            {/* Stats Bar - Glass morphism */}
            <div 
              className={`inline-flex flex-wrap justify-center gap-6 md:gap-10 bg-white/5 backdrop-blur-lg rounded-2xl px-8 py-6 border border-white/10 transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-2xl md:text-3xl font-bold text-white">
                    {stat.value}{stat.suffix}
                  </span>
                  <span className="text-xs text-white/60 uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll Indicator */}
          <button
            onClick={scrollToContent}
            className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 hover:text-primary transition-all cursor-pointer group ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Scroll to content"
          >
            <span className="text-xs uppercase tracking-widest font-medium">{hubContent.scrollCta}</span>
            <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2 group-hover:border-primary transition-colors">
              <ChevronDown className="w-4 h-4 animate-scroll-indicator" />
            </div>
          </button>
        </section>

        {/* AI-Ready Speakable Section */}
        <SpeakableHubIntro language={lang} cityCount={cities.length} guideCount={totalGuides} />

        {/* Intelligence Grid (E-E-A-T Proof Section) */}
        <WhatToExpectSection language={lang} />

        {/* Featured Cities Grid with Metadata */}
        <FeaturedCitiesSection language={lang} cities={cities} isLoading={isLoading} />

        {/* FAQ Section - Semantic HTML */}
        <HubFAQSection language={lang} />

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {hubContent.ctaTitle}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {hubContent.ctaDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="btn-luxury">
                <Link to={`/${lang}/#contact`}>{hubContent.ctaButton1}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to={`/${lang}/properties`}>{hubContent.ctaButton2}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LocationHub;