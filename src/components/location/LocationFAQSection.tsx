import { HelpCircle, ChevronDown } from "lucide-react";
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
    <section className="py-12 md:py-16 relative" id="faq">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-4 mb-10 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground mt-1">
            Common questions about {cityName}
          </p>
        </div>
      </div>
      
      {/* FAQ Accordion with premium styling */}
      <div className="relative group">
        {/* Subtle gradient border */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-2xl opacity-50 blur-sm" />
        
        <div className="relative bg-card rounded-2xl p-1 shadow-lg">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`}
                className="border-b border-border/50 last:border-0 px-4 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <AccordionTrigger className="text-left text-base font-medium py-5 hover:text-primary transition-colors group/trigger">
                  <span className="flex items-start gap-3 pr-4">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span>{faq.question}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pl-9 pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
