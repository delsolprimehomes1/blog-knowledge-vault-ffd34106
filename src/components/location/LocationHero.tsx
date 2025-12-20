import { Link } from "react-router-dom";
import { ChevronRight, MapPin } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Badge } from "@/components/ui/badge";

interface LocationHeroProps {
  headline: string;
  cityName: string;
  citySlug: string;
  topicSlug: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
}

export function LocationHero({
  headline,
  cityName,
  citySlug,
  topicSlug,
  featuredImageUrl,
  featuredImageAlt,
}: LocationHeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 overflow-hidden pt-24 md:pt-28">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6 animate-fade-in">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <li>
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <ChevronRight className="w-4 h-4" />
            <li>
              <Link to="/locations" className="hover:text-primary transition-colors">
                Locations
              </Link>
            </li>
            <ChevronRight className="w-4 h-4" />
            <li>
              <Link 
                to={`/locations/${citySlug}`} 
                className="hover:text-primary transition-colors"
              >
                {cityName}
              </Link>
            </li>
            <ChevronRight className="w-4 h-4" />
            <li className="text-foreground font-medium truncate max-w-[200px]">
              {headline}
            </li>
          </ol>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {/* Topic Badge */}
            <Badge 
              variant="secondary" 
              className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <MapPin className="w-3 h-3 mr-1" />
              Location Guide
            </Badge>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              {headline}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Comprehensive guide to {cityName}, Costa del Sol — expert insights on neighborhoods, costs, and lifestyle.
            </p>
            
            {/* Trust indicator */}
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-1">
                <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">✓</span>
                </div>
              </div>
              <span>Expert-verified local insights</span>
            </div>
          </div>

          {/* Hero Image */}
          {featuredImageUrl && (
            <div 
              className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl group animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/50 via-accent/30 to-secondary/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              
              <div className="relative h-full rounded-2xl overflow-hidden">
                <OptimizedImage
                  src={featuredImageUrl}
                  alt={featuredImageAlt || headline}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                
                {/* Location badge on image */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md text-sm font-medium">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{cityName}, Costa del Sol</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
