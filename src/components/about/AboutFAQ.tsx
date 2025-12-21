import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQ {
  question: string;
  answer: string;
}

interface AboutFAQProps {
  faqs: FAQ[];
}

export const AboutFAQ = ({ faqs }: AboutFAQProps) => {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="py-20 bg-prime-50" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-prime-gold/10 mb-4">
              <HelpCircle className="w-7 h-7 text-prime-gold" />
            </div>
            <h2 id="faq-heading" className="font-serif text-3xl md:text-4xl font-bold text-prime-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600">
              Common questions about Del Sol Prime Homes
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="bg-white rounded-xl border border-prime-gold/10 px-6 shadow-sm"
              >
                <AccordionTrigger className="text-left font-semibold text-prime-900 hover:text-prime-gold py-5 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 pb-5 faq-answer">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
