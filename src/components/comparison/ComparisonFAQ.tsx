import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { markdownToHtml } from "@/lib/markdownToHtml";

interface ComparisonFAQProps {
  faqs: Array<{ question: string; answer: string }>;
}

export function ComparisonFAQ({ faqs }: ComparisonFAQProps) {
  if (!faqs?.length) return null;

  return (
    <section className="mt-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-xl">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
      </div>
      
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, index) => (
          <AccordionItem 
            key={index} 
            value={`faq-${index}`} 
            className="border border-border/50 rounded-xl px-5 py-1 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <AccordionTrigger className="text-left font-semibold py-4 text-foreground hover:no-underline">
              <span className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {index + 1}
                </span>
                <span>{faq.question}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pl-9">
              <div 
                className="prose prose-sm max-w-none text-muted-foreground
                  prose-strong:text-foreground prose-strong:font-semibold"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(faq.answer) }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
