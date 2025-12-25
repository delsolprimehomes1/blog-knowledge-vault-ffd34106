import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import NotFound from "@/pages/NotFound";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileText, Clock, ArrowRight, Sparkles, TrendingUp, Users, Home as HomeIcon, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";

// Intent type icons and colors
const INTENT_CONFIG: Record<string, { icon: typeof FileText; color: string; bgColor: string }> = {
  'buying-property': { icon: HomeIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  'best-areas-families': { icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  'best-areas-investors': { icon: TrendingUp, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  'best-areas-expats': { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  'best-areas-retirees': { icon: Users, color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
  'cost-of-living': { icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  'cost-of-property': { icon: DollarSign, color: 'text-cyan-600', bgColor: 'bg-cyan-500/10' },
  'investment-guide': { icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
  'relocation-guide': { icon: FileText, color: 'text-indigo-600', bgColor: 'bg-indigo-500/10' },
};

const intentLabels: Record<string, string> = {
  'buying-property': 'Buying Guide',
  'best-areas-families': 'Best Areas for Families',
  'best-areas-investors': 'Investment Areas',
  'best-areas-expats': 'Expat Guide',
  'best-areas-retirees': 'Retirement Guide',
  'cost-of-living': 'Cost of Living',
  'cost-of-property': 'Property Prices',
  'investment-guide': 'Investment Guide',
  'relocation-guide': 'Relocation Guide',
};

const LocationIndex = () => {
  const { citySlug, lang = 'en' } = useParams<{ citySlug: string; lang: string }>();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const { data: pages, isLoading, error } = useQuery({
    queryKey: ['location-pages', citySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_pages')
        .select('*')
        .eq('city_slug', citySlug)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!citySlug,
  });

  const cityName = pages?.[0]?.city_name || citySlug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const cityImage = pages?.[0]?.featured_image_url;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading guides...</p>
        </div>
      </div>
    );
  }

  if (error || !pages || pages.length === 0) {
    return <NotFound />;
  }

  const BASE_URL = "https://www.delsolprimehomes.com";

  // Generate CollectionPage schema
  const locationIndexSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/locations/${citySlug}#collectionpage`,
        "name": `${cityName} Property & Lifestyle Guide | Del Sol Prime Homes`,
        "description": `Comprehensive guides about ${cityName}, Costa del Sol. Property buying, best areas, cost of living, and more.`,
        "url": `${BASE_URL}/locations/${citySlug}`,
        "isPartOf": {
          "@id": `${BASE_URL}/#website`
        },
        "about": {
          "@type": "Place",
          "name": cityName
        },
        "inLanguage": "en-GB",
        "mainEntity": {
          "@type": "ItemList",
          "numberOfItems": pages.length,
          "itemListElement": pages.map((page, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "name": page.headline,
            "url": `${BASE_URL}/locations/${citySlug}/${page.topic_slug}`
          }))
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
          { "@type": "ListItem", "position": 2, "name": "Locations", "item": `${BASE_URL}/locations` },
          { "@type": "ListItem", "position": 3, "name": cityName, "item": `${BASE_URL}/locations/${citySlug}` }
        ]
      },
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/locations/${citySlug}#webpage`,
        "url": `${BASE_URL}/locations/${citySlug}`,
        "name": `${cityName} Property & Lifestyle Guide`,
        "description": `Everything you need to know about living, investing, and buying property in ${cityName}, Costa del Sol.`,
        "isPartOf": {
          "@id": `${BASE_URL}/#website`
        },
        "inLanguage": "en-GB",
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": ["h1", ".location-intro"]
        }
      },
      {
        "@type": "Place",
        "name": cityName,
        "description": `${cityName} - Costa del Sol destination for property and lifestyle`,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": cityName,
          "addressRegion": "Andalucía",
          "addressCountry": "ES"
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>{cityName} Property & Lifestyle Guide | Del Sol Prime Homes</title>
        <meta name="description" content={`Comprehensive guides about ${cityName}, Costa del Sol. Property buying, best areas, cost of living, and more.`} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={`${BASE_URL}/locations/${citySlug}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${cityName} Property & Lifestyle Guide`} />
        <meta property="og:description" content={`Everything you need to know about ${cityName}, Costa del Sol.`} />
        <meta property="og:url" content={`${BASE_URL}/locations/${citySlug}`} />
        {cityImage && <meta property="og:image" content={cityImage} />}
        {cityImage && <meta property="og:image:alt" content={`${cityName} - Costa del Sol`} />}
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        
        {/* Hreflang */}
        <link rel="alternate" hrefLang="en-GB" href={`${BASE_URL}/locations/${citySlug}`} />
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/locations/${citySlug}`} />
        
        {/* JSON-LD Schema */}
        <script type="application/ld+json">
          {JSON.stringify(locationIndexSchema)}
        </script>
      </Helmet>

      <Header variant="solid" />
      
      <main className="min-h-screen">
        {/* Immersive City Hero */}
        <section className="relative min-h-[60vh] flex items-center overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            {cityImage ? (
              <>
                <img 
                  src={cityImage} 
                  alt={cityName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 hero-overlay" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full bg-secondary/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              </div>
            )}
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary/30"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `particle-float ${8 + Math.random() * 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 4}s`,
                }}
              />
            ))}
          </div>

          <div className="container mx-auto px-4 relative z-10 pt-24 md:pt-28">
            {/* Breadcrumbs */}
            <nav 
              aria-label="Breadcrumb" 
              className={`mb-6 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <ol className={`flex items-center gap-2 text-sm flex-wrap ${cityImage ? 'text-white/80' : 'text-muted-foreground'}`}>
                <li>
                  <Link to="/" className={`hover:${cityImage ? 'text-white' : 'text-primary'} transition-colors`}>Home</Link>
                </li>
                <ChevronRight className="w-4 h-4" />
                <li>
                  <Link to="/locations" className={`hover:${cityImage ? 'text-white' : 'text-primary'} transition-colors`}>Locations</Link>
                </li>
                <ChevronRight className="w-4 h-4" />
                <li className={`${cityImage ? 'text-white' : 'text-foreground'} font-medium`}>{cityName}</li>
              </ol>
            </nav>

            {/* Badge */}
            <div 
              className={`mb-4 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <Badge className="badge-luxury px-4 py-2 text-sm font-medium backdrop-blur-sm bg-white/10 border-white/20 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                {pages.length} Expert {pages.length === 1 ? 'Guide' : 'Guides'}
              </Badge>
            </div>

            {/* Headline */}
            <h1 
              className={`text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 leading-[1.1] transition-all duration-1000 delay-200 ${cityImage ? 'text-white' : 'text-foreground'} ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              {cityName}
              <span className={`block text-2xl md:text-3xl font-sans font-normal mt-2 ${cityImage ? 'text-white/80' : 'text-muted-foreground'}`}>
                Property & Lifestyle Guides
              </span>
            </h1>

            {/* Subtitle */}
            <p 
              className={`text-lg md:text-xl leading-relaxed max-w-2xl mb-8 transition-all duration-1000 delay-300 ${cityImage ? 'text-white/90' : 'text-muted-foreground'} ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              Everything you need to know about living, investing, and buying property in {cityName}, Costa del Sol.
            </p>
          </div>

          {/* Bottom Gradient Fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </section>

        {/* Guides Grid */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {pages.map((page, index) => {
              const intentConfig = INTENT_CONFIG[page.intent_type] || { icon: FileText, color: 'text-primary', bgColor: 'bg-primary/10' };
              const Icon = intentConfig.icon;
              
              return (
                <Link 
                  key={page.id} 
                  to={`/${lang}/locations/${citySlug}/${page.topic_slug}`}
                  className={`group relative bg-card rounded-2xl overflow-hidden card-immersive border border-border/50 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ animationDelay: `${index * 100}ms`, transitionDelay: `${index * 50}ms` }}
                >
                  {/* Card Header with Icon */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${intentConfig.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-6 h-6 ${intentConfig.color}`} />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {intentLabels[page.intent_type] || page.intent_type}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-serif font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {page.headline}
                    </h3>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                      {page.meta_description}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 pb-6 pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>5 min read</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-primary font-medium text-sm opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        <span>Read Guide</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Hover Gradient Line */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LocationIndex;
