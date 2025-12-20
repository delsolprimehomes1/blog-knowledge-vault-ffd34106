import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ComparisonTableProps {
  data: Array<{
    criterion: string;
    option_a_value: string;
    option_b_value: string;
  }>;
  optionA: string;
  optionB: string;
}

export function ComparisonTable({ data, optionA, optionB }: ComparisonTableProps) {
  if (!data?.length) return null;

  return (
    <div className="my-8 overflow-x-auto">
      <h2 className="text-2xl font-semibold mb-4">Quick Comparison</h2>
      <Table className="border">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold w-[20%]">Criterion</TableHead>
            <TableHead className="font-semibold w-[40%] text-primary">{optionA}</TableHead>
            <TableHead className="font-semibold w-[40%] text-secondary-foreground">{optionB}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              <TableCell className="font-medium">{row.criterion}</TableCell>
              <TableCell>{row.option_a_value}</TableCell>
              <TableCell>{row.option_b_value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
