import { Zap, CheckCircle } from "lucide-react";

interface QuickSummaryProps {
  headline: string;
  keyTakeaways?: string[];
  bottomLine: string;
  readTime?: number;
  language?: string;
}

const labelTranslations: Record<string, { title: string; bottomLineLabel: string; readTimeLabel: string }> = {
  en: { title: "Quick Summary", bottomLineLabel: "Bottom Line", readTimeLabel: "min read" },
  de: { title: "Kurzübersicht", bottomLineLabel: "Fazit", readTimeLabel: "Min. Lesezeit" },
  nl: { title: "Samenvatting", bottomLineLabel: "Conclusie", readTimeLabel: "min lezen" },
  fr: { title: "Résumé Rapide", bottomLineLabel: "Conclusion", readTimeLabel: "min de lecture" },
  pl: { title: "Podsumowanie", bottomLineLabel: "Konkluzja", readTimeLabel: "min czytania" },
  sv: { title: "Snabbsammanfattning", bottomLineLabel: "Slutsats", readTimeLabel: "min läsning" },
  da: { title: "Hurtig Oversigt", bottomLineLabel: "Konklusion", readTimeLabel: "min læsning" },
  hu: { title: "Gyors Összefoglaló", bottomLineLabel: "Végkövetkeztetés", readTimeLabel: "perc olvasás" },
  fi: { title: "Nopea Yhteenveto", bottomLineLabel: "Johtopäätös", readTimeLabel: "min lukuaika" },
  no: { title: "Rask Sammendrag", bottomLineLabel: "Konklusjon", readTimeLabel: "min lesning" }
};

// Extract key takeaways from headline/content if not provided
function extractKeyTakeaways(headline: string, bottomLine: string): string[] {
  // Default takeaways based on common BOFU patterns
  const takeaways: string[] = [];
  
  // Add headline-derived takeaway
  if (headline.toLowerCase().includes('digital nomad') || 
      headline.toLowerCase().includes('remote work visa')) {
    takeaways.push('€2,520/month minimum income requirement for Digital Nomad Visa');
    takeaways.push('Work remotely for non-Spanish companies or 80%+ non-Spanish clients');
    takeaways.push('3-year initial visa, renewable for additional 2 years');
    takeaways.push('Family members (spouse, children, dependents) can be included');
  } else if (headline.toLowerCase().includes('cost') || headline.toLowerCase().includes('tax')) {
    takeaways.push('Budget 10-15% for purchase costs beyond property price');
    takeaways.push('Transfer tax (ITP) ranges from 7-10% depending on region');
    takeaways.push('Notary, registry, and legal fees add 2-3%');
  } else if (headline.toLowerCase().includes('lawyer') || headline.toLowerCase().includes('legal')) {
    takeaways.push('Always use an independent Spanish property lawyer');
    takeaways.push('Legal fees typically 1-1.5% of purchase price');
    takeaways.push('Lawyer handles NIE, due diligence, and contracts');
  } else if (headline.toLowerCase().includes('uk') || headline.toLowerCase().includes('british')) {
    takeaways.push('Post-Brexit: 90-day limit without visa');
    takeaways.push('Non-resident tax implications to consider');
    takeaways.push('Currency exchange timing can save thousands');
  }
  
  // Fallback if no specific pattern matched
  if (takeaways.length === 0) {
    takeaways.push('Expert guidance for Spanish property purchase');
    takeaways.push('Up-to-date information for 2025');
    takeaways.push('Step-by-step process explained');
  }
  
  return takeaways.slice(0, 4);
}

export const QuickSummary = ({ 
  headline, 
  keyTakeaways, 
  bottomLine, 
  readTime,
  language = 'en'
}: QuickSummaryProps) => {
  const labels = labelTranslations[language] || labelTranslations.en;
  
  const takeaways = keyTakeaways && keyTakeaways.length > 0 
    ? keyTakeaways 
    : extractKeyTakeaways(headline, bottomLine);

  return (
    <div className="quick-summary my-8 md:my-12 rounded-2xl bg-gradient-to-br from-accent/10 via-background to-primary/5 border border-border shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-accent/20 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{labels.title}</h2>
        </div>
        {readTime && (
          <span className="text-sm text-muted-foreground">
            {readTime} {labels.readTimeLabel}
          </span>
        )}
      </div>
      
      {/* Key Takeaways */}
      <div className="px-6 py-5 space-y-3">
        <ul className="space-y-2.5">
          {takeaways.map((takeaway, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-foreground/90">{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Bottom Line */}
      <div className="px-6 py-4 bg-primary/5 border-t border-border">
        <div className="flex items-start gap-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary whitespace-nowrap">
            {labels.bottomLineLabel}:
          </span>
          <p className="text-foreground/90 leading-relaxed">{bottomLine}</p>
        </div>
      </div>
    </div>
  );
};
