import { ChevronRight, Scale } from "lucide-react";
import { Link } from "react-router-dom";

interface ComparisonHeroProps {
  headline: string;
  topic: string;
  optionA: string;
  optionB: string;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  featuredImageCaption?: string | null;
}

export function ComparisonHero({
  headline,
  topic,
  optionA,
  optionB,
  featuredImageUrl,
  featuredImageAlt,
  featuredImageCaption,
}: ComparisonHeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-secondary blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/compare" className="hover:text-foreground transition-colors">Comparisons</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{topic}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Content */}
          <div className="space-y-6">
            {/* VS Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
              <Scale className="h-4 w-4" />
              <span className="font-semibold text-sm">Expert Comparison</span>
            </div>
            
            {/* Options Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-semibold text-sm">
                {optionA}
              </span>
              <span className="text-muted-foreground font-bold">VS</span>
              <span className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full font-semibold text-sm">
                {optionB}
              </span>
            </div>
            
            {/* Headline */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              {headline}
            </h1>
          </div>

          {/* Featured Image */}
          <div className="relative">
            {featuredImageUrl ? (
              <figure className="relative">
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                  <img
                    src={featuredImageUrl}
                    alt={featuredImageAlt || `${optionA} vs ${optionB} comparison`}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
                </div>
                {featuredImageCaption && (
                  <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                    {featuredImageCaption}
                  </figcaption>
                )}
              </figure>
            ) : (
              /* Placeholder Visual */
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-border/50 shadow-xl">
                <div className="text-center space-y-4">
                  <Scale className="h-16 w-16 text-primary mx-auto" />
                  <div className="flex items-center gap-4 px-6">
                    <div className="flex-1 text-right">
                      <span className="text-xl font-bold text-primary">{optionA}</span>
                    </div>
                    <span className="text-2xl font-black text-muted-foreground">VS</span>
                    <div className="flex-1 text-left">
                      <span className="text-xl font-bold text-secondary-foreground">{optionB}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
