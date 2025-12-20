import { Euro, Calculator } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface PricingItem {
  category: string;
  item: string;
  amount: string;
  notes?: string;
}

export interface PriceExample {
  price: string;
  label: string;
  breakdown: Record<string, string>;
}

interface PricingTableProps {
  title: string;
  items: PricingItem[];
  totalLabel?: string;
  totalAmount?: string;
  currency?: string;
  priceExamples?: PriceExample[];
  language?: string;
}

const labelTranslations: Record<string, { 
  category: string; 
  item: string; 
  amount: string; 
  notes: string;
  total: string;
  example: string;
}> = {
  en: { category: "Category", item: "Item", amount: "Amount", notes: "Notes", total: "Total", example: "Example" },
  de: { category: "Kategorie", item: "Posten", amount: "Betrag", notes: "Hinweise", total: "Gesamt", example: "Beispiel" },
  nl: { category: "Categorie", item: "Post", amount: "Bedrag", notes: "Opmerkingen", total: "Totaal", example: "Voorbeeld" },
  fr: { category: "Catégorie", item: "Poste", amount: "Montant", notes: "Notes", total: "Total", example: "Exemple" },
  pl: { category: "Kategoria", item: "Pozycja", amount: "Kwota", notes: "Uwagi", total: "Suma", example: "Przykład" },
  sv: { category: "Kategori", item: "Post", amount: "Belopp", notes: "Anteckningar", total: "Totalt", example: "Exempel" },
  da: { category: "Kategori", item: "Post", amount: "Beløb", notes: "Noter", total: "Total", example: "Eksempel" },
  hu: { category: "Kategória", item: "Tétel", amount: "Összeg", notes: "Megjegyzések", total: "Összesen", example: "Példa" },
  fi: { category: "Kategoria", item: "Erä", amount: "Summa", notes: "Huomautukset", total: "Yhteensä", example: "Esimerkki" },
  no: { category: "Kategori", item: "Post", amount: "Beløp", notes: "Notater", total: "Totalt", example: "Eksempel" }
};

export const PricingTable = ({
  title,
  items,
  totalLabel,
  totalAmount,
  currency = "€",
  priceExamples,
  language = "en"
}: PricingTableProps) => {
  const labels = labelTranslations[language] || labelTranslations.en;
  
  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PricingItem[]>);

  return (
    <div className="pricing-table my-8 md:my-12 rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-accent/20 border-b border-border">
        <div className="p-2 rounded-lg bg-primary/10">
          <Euro className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
      </div>
      
      {/* Main Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">{labels.item}</TableHead>
              <TableHead className="font-semibold text-right">{labels.amount}</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">{labels.notes}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <>
                {/* Category Header Row */}
                <TableRow key={`cat-${category}`} className="bg-muted/30">
                  <TableCell colSpan={3} className="font-semibold text-primary py-2">
                    {category}
                  </TableCell>
                </TableRow>
                {/* Items in Category */}
                {categoryItems.map((item, index) => (
                  <TableRow key={`${category}-${index}`}>
                    <TableCell className="pl-6">{item.item}</TableCell>
                    <TableCell className="text-right font-medium">{item.amount}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {item.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ))}
            
            {/* Total Row */}
            {totalLabel && totalAmount && (
              <TableRow className="bg-primary/10 font-bold">
                <TableCell className="text-foreground">{totalLabel}</TableCell>
                <TableCell className="text-right text-primary text-lg">{totalAmount}</TableCell>
                <TableCell className="hidden sm:table-cell"></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Price Examples */}
      {priceExamples && priceExamples.length > 0 && (
        <div className="border-t border-border px-6 py-5 bg-muted/20">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{labels.example}:</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {priceExamples.map((example, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-background border border-border">
                <div className="text-lg font-bold text-primary mb-2">
                  {currency}{example.price}
                </div>
                <div className="text-sm text-muted-foreground mb-2">{example.label}</div>
                <div className="space-y-1 text-sm">
                  {Object.entries(example.breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
