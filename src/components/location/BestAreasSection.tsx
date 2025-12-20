import { MapPin, Check, X } from "lucide-react";
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
    <section className="py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
        Best Areas in {cityName}
      </h2>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map((area, index) => (
          <Card key={index} className="h-full hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{area.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">{area.description}</p>
              
              {/* Price Range */}
              <div>
                <Badge variant="secondary" className="text-xs">
                  {area.price_range}
                </Badge>
              </div>
              
              {/* Pros */}
              {area.pros && area.pros.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Pros</h4>
                  <ul className="space-y-1">
                    {area.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Cons */}
              {area.cons && area.cons.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Cons</h4>
                  <ul className="space-y-1">
                    {area.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
