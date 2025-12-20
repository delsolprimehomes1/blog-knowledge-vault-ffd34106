import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, DollarSign, Users, AlertTriangle, Lightbulb, Target } from "lucide-react";

interface ComparisonTableProps {
  data: Array<{
    criterion: string;
    option_a_value: string;
    option_b_value: string;
  }>;
  optionA: string;
  optionB: string;
}

// Map criterion names to icons
const getCriterionIcon = (criterion: string) => {
  const lower = criterion.toLowerCase();
  if (lower.includes('cost') || lower.includes('price')) return <DollarSign className="h-4 w-4" />;
  if (lower.includes('pro')) return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (lower.includes('con')) return <XCircle className="h-4 w-4 text-red-500" />;
  if (lower.includes('time')) return <Clock className="h-4 w-4" />;
  if (lower.includes('best for') || lower.includes('audience')) return <Users className="h-4 w-4" />;
  if (lower.includes('risk')) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (lower.includes('flexibility') || lower.includes('control')) return <Lightbulb className="h-4 w-4" />;
  return <Target className="h-4 w-4" />;
};

export function ComparisonTable({ data, optionA, optionB }: ComparisonTableProps) {
  if (!data?.length) return null;

  return (
    <div className="my-10">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        Quick Comparison
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-primary/10 to-secondary/10 hover:bg-primary/10">
              <TableHead className="font-bold w-[22%] py-4 text-foreground">Criterion</TableHead>
              <TableHead className="font-bold w-[39%] py-4">
                <span className="inline-flex items-center gap-2 text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {optionA}
                </span>
              </TableHead>
              <TableHead className="font-bold w-[39%] py-4">
                <span className="inline-flex items-center gap-2 text-secondary-foreground">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  {optionB}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow 
                key={index} 
                className={`
                  transition-colors hover:bg-muted/50
                  ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                `}
              >
                <TableCell className="font-semibold py-4">
                  <span className="inline-flex items-center gap-2">
                    {getCriterionIcon(row.criterion)}
                    {row.criterion}
                  </span>
                </TableCell>
                <TableCell className="py-4 text-muted-foreground">{row.option_a_value}</TableCell>
                <TableCell className="py-4 text-muted-foreground">{row.option_b_value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
