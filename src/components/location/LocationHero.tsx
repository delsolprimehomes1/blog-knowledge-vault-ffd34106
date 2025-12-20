import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";

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
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-secondary blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6">
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

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Content */}
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              {headline}
            </h1>
            <p className="text-lg text-muted-foreground">
              Comprehensive guide to {cityName}, Costa del Sol
            </p>
          </div>

          {/* Hero Image */}
          {featuredImageUrl && (
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden shadow-xl">
              <OptimizedImage
                src={featuredImageUrl}
                alt={featuredImageAlt || headline}
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
