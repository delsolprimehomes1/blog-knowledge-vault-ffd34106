import { Link } from "react-router-dom";
import { ChevronRight, MapPin, ChevronDown, Sparkles } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface LocationHeroProps {
  headline: string;
  cityName: string;
  citySlug: string;
  topicSlug: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  featuredImageCaption?: string;
}

// Floating particles for luxury effect
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `particle-float ${8 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
};

export function LocationHero({
  headline,
  cityName,
  citySlug,
  topicSlug,
  featuredImageUrl,
  featuredImageAlt,
  featuredImageCaption,
}: LocationHeroProps) {
  const [scrollY, setScrollY] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight - 100, behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex items-center overflow-hidden">
      {/* Full-screen Background Image with Parallax */}
      {featuredImageUrl && (
        <figure className="absolute inset-0" itemScope itemType="https://schema.org/ImageObject">
          <div 
            className="absolute inset-0 transition-transform duration-100"
            style={{ transform: `translateY(${scrollY * 0.3}px) scale(1.1)` }}
          >
            <OptimizedImage
              src={featuredImageUrl}
              alt={featuredImageAlt || `Aerial view of ${cityName}, Costa del Sol showing Mediterranean coastline and luxury properties`}
              className="w-full h-full object-cover"
              loading="eager"
              itemProp="contentUrl"
            />
            <meta itemProp="name" content={`${cityName} - ${headline}`} />
            <meta itemProp="description" content={featuredImageAlt || `View of ${cityName}, Costa del Sol`} />
            {featuredImageCaption && <meta itemProp="caption" content={featuredImageCaption} />}
          </div>
          {/* Sophisticated overlay gradient */}
          <div className="absolute inset-0 hero-overlay" />
          {/* Additional gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        </figure>
      )}

      {/* Fallback gradient background if no image */}
      {!featuredImageUrl && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full bg-secondary/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      )}

      {/* Floating Particles */}
      <FloatingParticles />

      <div className="container mx-auto px-4 relative z-10 pt-24 md:pt-28">
        {/* Breadcrumbs - Glass Style */}
        <nav 
          aria-label="Breadcrumb" 
          className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <ol className="flex items-center gap-2 text-sm flex-wrap">
            <li>
              <Link 
                to="/" 
                className="text-white/80 hover:text-white transition-colors"
              >
                Home
              </Link>
            </li>
            <ChevronRight className="w-4 h-4 text-white/50" />
            <li>
              <Link 
                to="/locations" 
                className="text-white/80 hover:text-white transition-colors"
              >
                Locations
              </Link>
            </li>
            <ChevronRight className="w-4 h-4 text-white/50" />
            <li>
              <Link 
                to={`/locations/${citySlug}`} 
                className="text-white/80 hover:text-white transition-colors"
              >
                {cityName}
              </Link>
            </li>
            <ChevronRight className="w-4 h-4 text-white/50" />
            <li className="text-white font-medium truncate max-w-[200px]">
              {headline}
            </li>
          </ol>
        </nav>

        {/* Main Content */}
        <div className="max-w-4xl">
          {/* Animated Badge */}
          <div 
            className={`mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <Badge 
              className="badge-luxury px-4 py-2 text-sm font-medium backdrop-blur-sm bg-white/10 border-white/20 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              Expert Location Guide
            </Badge>
          </div>
          
          {/* Headline with Reveal Animation */}
          <h1 
            className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold text-white mb-6 leading-[1.1] transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="block">{headline}</span>
          </h1>

          {/* Subtitle */}
          <p 
            className={`text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mb-8 transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            Comprehensive guide to {cityName}, Costa del Sol — expert insights on neighborhoods, costs, and lifestyle.
          </p>

          {/* Trust Signals */}
          <div 
            className={`flex flex-wrap items-center gap-6 transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-3 px-4 py-2 rounded-full glass-luxury">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">✓</span>
              </div>
              <span className="text-sm font-medium text-foreground">Expert Verified</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full glass-luxury">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">{cityName}, Costa del Sol</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToContent}
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/80 hover:text-white transition-all cursor-pointer group ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDelay: '600ms' }}
        aria-label="Scroll to content"
      >
        <span className="text-xs uppercase tracking-widest font-medium">Explore</span>
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2 group-hover:border-white/60 transition-colors">
          <ChevronDown className="w-4 h-4 animate-scroll-indicator" />
        </div>
      </button>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
