import { CheckCircle, Award } from "lucide-react";
import { markdownToHtml } from "@/lib/markdownToHtml";

interface VerdictSectionProps {
  verdict: string | null | undefined;
}

export function VerdictSection({ verdict }: VerdictSectionProps) {
  if (!verdict) return null;

  return (
    <section className="final-verdict mt-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/15 rounded-3xl" />
      <div className="absolute top-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-secondary/20 rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />
      
      {/* Content */}
      <div className="relative z-10 p-8 md:p-10 border border-primary/20 rounded-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-2xl">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Final Verdict</h2>
            <p className="text-sm text-muted-foreground">Expert recommendation based on the analysis</p>
          </div>
        </div>
        
        {/* Verdict content */}
        <div 
          className="prose prose-lg max-w-none text-foreground
            prose-headings:text-foreground prose-headings:font-semibold
            prose-strong:text-foreground prose-strong:font-semibold
            prose-ul:my-4 prose-li:my-1
            prose-p:my-3 prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(verdict) }}
        />
        
        {/* Bottom accent */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-primary/20">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm text-muted-foreground">
            This verdict is based on comprehensive analysis of both options
          </span>
        </div>
      </div>
    </section>
  );
}
