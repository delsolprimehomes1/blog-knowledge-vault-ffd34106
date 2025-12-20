import { QAEntity } from "@/types/blog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface QASectionProps {
  faqs: QAEntity[];
  topic?: string;
  language?: string;
}

const faqLabelTranslations: Record<string, string> = {
  en: "Frequently Asked Questions",
  de: "Häufig gestellte Fragen",
  nl: "Veelgestelde vragen",
  fr: "Questions fréquemment posées",
  pl: "Najczęściej zadawane pytania",
  sv: "Vanliga frågor",
  da: "Ofte stillede spørgsmål",
  hu: "Gyakran ismételt kérdések",
  fi: "Usein kysytyt kysymykset",
  no: "Ofte stilte spørsmål"
};

// Extract topic keyword from headline for SEO-friendly FAQ heading
function extractTopicKeyword(headline: string, language: string = 'en'): string {
  // Remove common suffixes like "2025", "Guide", "Complete", etc.
  const cleanHeadline = headline
    .replace(/\s*(2024|2025|Complete|Ultimate|Guide|Your|For|The|A|An)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Take first 3-4 meaningful words
  const words = cleanHeadline.split(' ').filter(w => w.length > 2);
  const topicWords = words.slice(0, 4).join(' ');
  
  return topicWords || headline.split(':')[0] || headline;
}

export const QASection = ({ faqs, topic, language = 'en' }: QASectionProps) => {
  if (!faqs || faqs.length === 0) return null;

  // Generate topic-specific heading for better SEO
  const baseFaqLabel = faqLabelTranslations[language] || faqLabelTranslations.en;
  const topicKeyword = topic ? extractTopicKeyword(topic, language) : null;
  
  // Format: "Golden Visa Spain FAQ" or "Frequently Asked Questions" if no topic
  const faqHeading = topicKeyword 
    ? `${topicKeyword} FAQ`
    : baseFaqLabel;

  return (
    <section className="my-12 py-8 border-t border-border" id="faq">
      <h2 className="text-3xl font-bold mb-6 text-foreground">
        {faqHeading}
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