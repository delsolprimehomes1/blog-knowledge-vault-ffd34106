import { Users, Target } from "lucide-react";

interface UseCaseSectionProps {
  content: string;
  cityName: string;
}

export function UseCaseSection({ content, cityName }: UseCaseSectionProps) {
  if (!content) return null;

  return (
    <section className="py-12 md:py-16 relative">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-72 h-72 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-4 mb-8 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            When {cityName} Makes Sense
          </h2>
          <p className="text-muted-foreground mt-1">
            Ideal scenarios and buyer profiles
          </p>
        </div>
      </div>
      
      {/* Content with premium prose styling */}
      <div 
        className="prose prose-lg max-w-none animate-fade-in
          prose-headings:text-foreground prose-headings:font-bold
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
          prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
          prose-ul:text-muted-foreground prose-ul:my-4
          prose-li:marker:text-primary prose-li:my-1
          prose-strong:text-foreground prose-strong:font-semibold
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
        style={{ animationDelay: '0.1s' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </section>
  );
}
