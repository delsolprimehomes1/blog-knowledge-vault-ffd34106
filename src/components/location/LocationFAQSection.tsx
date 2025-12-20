import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { QAEntity } from "@/lib/locationSchemaGenerator";

interface LocationFAQSectionProps {
  faqs: QAEntity[];
  cityName: string;
}

export function LocationFAQSection({ faqs, cityName }: LocationFAQSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="py-12" id="faq">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Frequently Asked Questions About {cityName}
        </h2>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger className="text-left text-base font-medium hover:text-primary">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
