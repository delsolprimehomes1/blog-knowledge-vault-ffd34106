import { Zap, Target, TrendingUp } from "lucide-react";

interface TLDRItem {
  keyPoints: string[];
  priceRange: string;
  bestFor: string;
}

interface TLDRSummaryProps {
  optionA: string;
  optionB: string;
  optionAData?: TLDRItem;
  optionBData?: TLDRItem;
  quickComparisonTable?: Array<{ criterion: string; option_a_value: string; option_b_value: string }>;
}

// Extract TL;DR data from quick comparison table if no explicit data provided
function extractTLDR(
  table: Array<{ criterion: string; option_a_value: string; option_b_value: string }> | undefined,
  isOptionA: boolean
): TLDRItem {
  if (!table || table.length === 0) {
    return {
      keyPoints: [],
      priceRange: "Contact for pricing",
      bestFor: "Various buyers"
    };
  }

  const getValue = (criterion: string) => {
    const row = table.find(r => r.criterion.toLowerCase().includes(criterion.toLowerCase()));
    return isOptionA ? row?.option_a_value : row?.option_b_value;
  };

  const keyPoints: string[] = [];
  
  // Extract key differentiators
  const pros = getValue('pros');
  if (pros) {
    // Take first 2-3 short points from pros
    const points = pros.split(/[,;]/).map(p => p.trim()).filter(p => p.length > 0 && p.length < 60);
    keyPoints.push(...points.slice(0, 3));
  }
  
  // Add flexibility or unique value
  const flexibility = getValue('flexibility');
  if (flexibility && keyPoints.length < 3) {
    keyPoints.push(flexibility.substring(0, 50));
  }

  const priceRange = getValue('cost') || "Contact for pricing";
  const bestFor = getValue('best for') || "Various buyers";

  return {
    keyPoints: keyPoints.length > 0 ? keyPoints : ["Premium properties available", "Expert guidance included", "Personalized service"],
    priceRange,
    bestFor
  };
}

export function TLDRSummary({ 
  optionA, 
  optionB, 
  optionAData, 
  optionBData,
  quickComparisonTable 
}: TLDRSummaryProps) {
  const dataA = optionAData || extractTLDR(quickComparisonTable, true);
  const dataB = optionBData || extractTLDR(quickComparisonTable, false);

  return (
    <section className="mb-10" aria-labelledby="tldr-heading">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h2 id="tldr-heading" className="text-xl font-bold text-foreground">TL;DR – Quick Summary</h2>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Option A Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h3 className="font-semibold text-foreground">{optionA}</h3>
          </div>
          
          <ul className="space-y-1.5 mb-4 text-sm text-muted-foreground">
            {dataA.keyPoints.slice(0, 3).map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          
          <div className="flex items-center gap-4 pt-3 border-t border-primary/10 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">{dataA.priceRange}</span>
            </div>
          </div>
          
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">Best for:</span>
            <span className="text-muted-foreground">{dataA.bestFor}</span>
          </div>
        </div>

        {/* Option B Card */}
        <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
            <h3 className="font-semibold text-foreground">{optionB}</h3>
          </div>
          
          <ul className="space-y-1.5 mb-4 text-sm text-muted-foreground">
            {dataB.keyPoints.slice(0, 3).map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-secondary mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          
          <div className="flex items-center gap-4 pt-3 border-t border-secondary/10 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-secondary" />
              <span className="text-muted-foreground">{dataB.priceRange}</span>
            </div>
          </div>
          
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <Target className="h-3.5 w-3.5 text-secondary" />
            <span className="font-medium text-foreground">Best for:</span>
            <span className="text-muted-foreground">{dataB.bestFor}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
