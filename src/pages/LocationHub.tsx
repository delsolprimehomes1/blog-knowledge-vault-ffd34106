import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, MapPin, Compass, ChevronDown, TrendingUp, Users, Home, ImagePlus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { toast } from "sonner";

const STATS = [
  { icon: Home, label: "Properties", value: "5,000+", suffix: "" },
  { icon: Users, label: "Happy Clients", value: "1,200+", suffix: "" },
  { icon: TrendingUp, label: "Avg. ROI", value: "8.5", suffix: "%" },
];

interface CityData {
  city_slug: string;
  city_name: string;
  region: string;
  count: number;
  image?: string;
  imageAlt?: string;
  needsImage: boolean;
  pageId?: string;
  topicSlug?: string;
}

const LocationHub = () => {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [generatingCity, setGeneratingCity] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const { data: cities, isLoading } = useQuery({
    queryKey: ['location-cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_pages')
        .select('id, city_slug, city_name, region, topic_slug, featured_image_url, featured_image_alt')
        .eq('status', 'published');

      if (error) throw error;

      const cityMap = new Map<string, CityData>();
      data?.forEach(page => {
        const existing = cityMap.get(page.city_slug);
        if (existing) {
          existing.count++;
          // Prefer pages with images
          if (!existing.image && page.featured_image_url) {
            existing.image = page.featured_image_url;
            existing.imageAlt = page.featured_image_alt || undefined;
            existing.needsImage = false;
          }
        } else {
          cityMap.set(page.city_slug, {
            city_slug: page.city_slug,
            city_name: page.city_name,
            region: page.region,
            count: 1,
            image: page.featured_image_url || undefined,
            imageAlt: page.featured_image_alt || undefined,
            needsImage: !page.featured_image_url,
            pageId: page.id,
            topicSlug: page.topic_slug
          });
        }
      });

      return Array.from(cityMap.values()).sort((a, b) => b.count - a.count);
    },
  });

  const generateImageMutation = useMutation({
    mutationFn: async (city: CityData) => {
      const { data, error } = await supabase.functions.invoke('generate-location-image', {
        body: {
          location_page_id: city.pageId,
          city_name: city.city_name,
          city_slug: city.city_slug,
          topic_slug: city.topicSlug || 'overview'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, city) => {
      toast.success(`Generated image for ${city.city_name}`);
      queryClient.invalidateQueries({ queryKey: ['location-cities'] });
    },
    onError: (error: Error, city) => {
      toast.error(`Failed to generate image for ${city.city_name}: ${error.message}`);
    },
    onSettled: () => {
      setGeneratingCity(null);
    }
  });

  const handleGenerateImage = (city: CityData) => {
    setGeneratingCity(city.city_slug);
    generateImageMutation.mutate(city);
  };

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight - 100, behavior: 'smooth' });
  };

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>Costa del Sol Location Guides | Del Sol Prime Homes</title>
        <meta name="description" content="Explore comprehensive guides for all Costa del Sol locations. Property buying guides, best areas, cost of living, and investment opportunities in Marbella, Estepona, Fuengirola, and more." />
        <link rel="canonical" href="https://www.delsolprimehomes.com/locations" />
      </Helmet>

      <Header variant="solid" />
      
      <main className="min-h-screen">
        {/* Immersive Hero Section */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
            <div className="absolute -bottom-40 -right-40 w-[800px] h-[800px] rounded-full bg-secondary/10 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-accent/5 blur-[120px]" />
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/20"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `particle-float ${10 + Math.random() * 5}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                }}
              />
            ))}
          </div>

          <div className="container mx-auto px-4 relative z-10 text-center pt-24">
            {/* Breadcrumbs */}
            <nav 
              aria-label="Breadcrumb" 
              className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <ol className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                </li>
                <ChevronRight className="w-4 h-4" />
                <li className="text-foreground font-medium">Locations</li>
              </ol>
            </nav>

            {/* Animated Badge */}
            <div 
              className={`mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <Badge className="badge-luxury px-5 py-2.5 text-sm font-medium">
                <Compass className="w-4 h-4 mr-2 animate-pulse" />
                Discover Your Perfect Location
              </Badge>
            </div>

            {/* Main Headline */}
            <h1 
              className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold text-foreground mb-6 leading-[1.1] transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              Costa del Sol
              <span className="block text-gradient-gold">Location Guides</span>
            </h1>

            {/* Subtitle */}
            <p 
              className={`text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-12 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              In-depth guides to help you find the perfect location in Spain's most sought-after coastal region. 
              From property buying to cost of living, we cover everything you need to know.
            </p>

            {/* Stats Bar */}
            <div 
              className={`flex flex-wrap justify-center gap-8 md:gap-12 mb-12 transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              {STATS.map((stat, index) => (
                <div 
                  key={stat.label}
                  className="flex flex-col items-center"
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-2xl md:text-3xl font-bold text-foreground">
                    {stat.value}{stat.suffix}
                  </span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll Indicator */}
          <button
            onClick={scrollToContent}
            className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-all cursor-pointer group ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '600ms' }}
            aria-label="Scroll to content"
          >
            <span className="text-xs uppercase tracking-widest font-medium">Explore Cities</span>
            <div className="w-6 h-10 rounded-full border-2 border-border flex items-start justify-center p-2 group-hover:border-primary transition-colors">
              <ChevronDown className="w-4 h-4 animate-scroll-indicator" />
            </div>
          </button>
        </section>

        {/* Cities Grid */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
              Explore by City
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Select a city to discover comprehensive guides about property, lifestyle, and investment opportunities.
            </p>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : cities && cities.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cities.map((city, index) => (
                <Link 
                  key={city.city_slug} 
                  to={`/${lang}/locations/${city.city_slug}`}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden card-immersive"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    {city.image ? (
                      <OptimizedImage
                        src={city.image}
                        alt={city.imageAlt || `Aerial view of ${city.city_name}, Costa del Sol showing Mediterranean coastline and property areas`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        {city.needsImage && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 z-10"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleGenerateImage(city);
                            }}
                            disabled={generatingCity === city.city_slug}
                          >
                            {generatingCity === city.city_slug ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <ImagePlus className="w-4 h-4 mr-2" />
                                Generate Image
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    {/* Badge */}
                    <Badge className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border-white/20 text-white">
                      {city.count} {city.count === 1 ? 'guide' : 'guides'}
                    </Badge>

                    {/* City Info */}
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-white mb-1 group-hover:text-primary transition-colors">
                        {city.city_name}
                      </h3>
                      <p className="text-white/70 text-sm mb-3">{city.region}, Spain</p>
                      
                      {/* CTA */}
                      <div className="flex items-center gap-2 text-primary font-medium text-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        <MapPin className="w-4 h-4" />
                        <span>Explore Guides</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 glass-luxury rounded-3xl">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-3">No Location Guides Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Location intelligence pages are coming soon. Check back later for comprehensive guides to Costa del Sol cities.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LocationHub;
