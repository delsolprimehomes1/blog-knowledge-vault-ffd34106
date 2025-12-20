import { Users } from "lucide-react";

interface UseCaseSectionProps {
  content: string;
  cityName: string;
}

export function UseCaseSection({ content, cityName }: UseCaseSectionProps) {
  if (!content) return null;

  return (
    <section className="py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          When {cityName} Makes Sense
        </h2>
      </div>
      
      <div 
        className="prose prose-lg max-w-none text-foreground
          prose-headings:text-foreground prose-headings:font-semibold
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-ul:text-muted-foreground prose-li:marker:text-primary
          prose-strong:text-foreground"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </section>
  );
}
