import { QAEntity } from "@/types/blog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface QASectionProps {
  faqs: QAEntity[];
}

export const QASection = ({ faqs }: QASectionProps) => {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="my-12 py-8 border-t border-border">
      <h2 className="text-3xl font-bold mb-6 text-foreground">
        Frequently Asked Questions
      </h2>
      
      <Accordion type="single" collapsible className="w-full space-y-4">
        {faqs.map((faq, index) => (
          <AccordionItem 
            key={index} 
            value={`item-${index}`}
            className="border border-border rounded-lg px-6 bg-card"
          >
            <AccordionTrigger className="text-left hover:no-underline py-4">
              <span className="font-semibold text-foreground">
                {faq.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">
              <div>{faq.answer}</div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
