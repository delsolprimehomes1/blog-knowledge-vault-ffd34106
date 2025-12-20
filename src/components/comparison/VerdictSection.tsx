import { CheckCircle } from "lucide-react";

interface VerdictSectionProps {
  verdict: string;
}

export function VerdictSection({ verdict }: VerdictSectionProps) {
  if (!verdict) return null;

  return (
    <section className="final-verdict mt-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-8 border border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="h-7 w-7 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Final Verdict</h2>
      </div>
      <div 
        className="prose prose-lg max-w-none text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: verdict }}
      />
    </section>
  );
}
