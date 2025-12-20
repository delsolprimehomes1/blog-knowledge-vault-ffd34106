import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ComparisonFAQProps {
  faqs: Array<{ question: string; answer: string }>;
}

export function ComparisonFAQ({ faqs }: ComparisonFAQProps) {
  if (!faqs?.length) return null;

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`faq-${index}`} className="border rounded-lg px-4">
            <AccordionTrigger className="text-left font-medium py-4">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
