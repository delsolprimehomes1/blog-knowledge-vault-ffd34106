import { Euro, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CostItem } from "@/lib/locationSchemaGenerator";

interface CostBreakdownSectionProps {
  costs: CostItem[];
  cityName: string;
}

export function CostBreakdownSection({ costs, cityName }: CostBreakdownSectionProps) {
  if (!costs || costs.length === 0) return null;

  return (
    <section className="py-12 md:py-16 relative">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-4 mb-10 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
          <Euro className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Cost Breakdown in {cityName}
          </h2>
          <p className="text-muted-foreground mt-1">
            Current market prices and fees
          </p>
        </div>
      </div>
      
      {/* Table Container with gradient border */}
      <div className="relative group animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {/* Gradient border effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 rounded-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500 blur-sm" />
        
        <div className="relative rounded-2xl overflow-hidden bg-card shadow-xl">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
          
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/40 border-b border-border/50">
                <TableHead className="font-semibold text-foreground py-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Item
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-foreground py-4">Price Range</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost, index) => (
                <TableRow 
                  key={index}
                  className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="font-medium py-4">
                    {cost.item}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      variant="secondary" 
                      className="bg-primary/10 text-primary border-primary/20 font-semibold"
                    >
                      {cost.range}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm py-4 max-w-xs">
                    {cost.notes}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
