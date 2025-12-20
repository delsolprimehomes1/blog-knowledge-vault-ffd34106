import { MapPin, Check, X, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BestArea } from "@/lib/locationSchemaGenerator";

interface BestAreasSectionProps {
  areas: BestArea[];
  cityName: string;
}

export function BestAreasSection({ areas, cityName }: BestAreasSectionProps) {
  if (!areas || areas.length === 0) return null;

  return (
    <section className="py-12 md:py-16 relative">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-4 mb-10 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
          <Layers className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Best Areas in {cityName}
          </h2>
          <p className="text-muted-foreground mt-1">
            Top neighborhoods for property buyers
          </p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map((area, index) => (
          <Card 
            key={index} 
            className="group relative h-full overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-500 animate-fade-in bg-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Gradient border on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/40 via-accent/20 to-secondary/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm -z-10" />
            
            {/* Card inner container */}
            <div className="relative h-full bg-card rounded-2xl overflow-hidden">
              {/* Top gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-secondary opacity-60" />
              
              <CardHeader className="pb-3 pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {area.name}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 pb-6">
                <p className="text-muted-foreground text-sm leading-relaxed">{area.description}</p>
                
                {/* Price Range Badge */}
                <div>
                  <Badge 
                    variant="secondary" 
                    className="bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-primary/20 font-semibold"
                  >
                    {area.price_range}
                  </Badge>
                </div>
                
                {/* Pros */}
                {area.pros && area.pros.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Advantages</h4>
                    <ul className="space-y-1.5">
                      {area.pros.map((pro, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-foreground/80">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Cons */}
                {area.cons && area.cons.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Considerations</h4>
                    <ul className="space-y-1.5">
                      {area.cons.map((con, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-foreground/80">{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
