import { Euro } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CostItem } from "@/lib/locationSchemaGenerator";

interface CostBreakdownSectionProps {
  costs: CostItem[];
  cityName: string;
}

export function CostBreakdownSection({ costs, cityName }: CostBreakdownSectionProps) {
  if (!costs || costs.length === 0) return null;

  return (
    <section className="py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Euro className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Cost Breakdown in {cityName}
        </h2>
      </div>
      
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Item</TableHead>
              <TableHead className="font-semibold">Price Range</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.map((cost, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{cost.item}</TableCell>
                <TableCell className="text-primary font-semibold">{cost.range}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{cost.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
