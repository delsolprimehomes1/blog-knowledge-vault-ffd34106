import { motion } from "framer-motion";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { History, Lightbulb, TrendingUp } from "lucide-react";

interface OurStoryProps {
  content: string;
}

export const OurStory = ({ content }: OurStoryProps) => {
  // Parse markdown to HTML
  const parseMarkdown = (markdown: string): string => {
    try {
      const html = marked.parse(markdown, { async: false }) as string;
      return DOMPurify.sanitize(html);
    } catch {
      return markdown;
    }
  };

  const timelineItems = [
    { year: "1997", event: "Steven Roberts arrives in Spain", icon: History },
    { year: "1998", event: "Cédric Van Hecke relocates to Costa del Sol", icon: History },
    { year: "2016", event: "Steven founds Sentinel Estates", icon: Lightbulb },
    { year: "2020", event: "Hans Beeckman joins the team", icon: TrendingUp }
  ];

  return (
    <section className="py-20 bg-prime-50" aria-labelledby="story-heading">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-16">
            <h2 id="story-heading" className="font-serif text-3xl md:text-4xl font-bold text-prime-900 mb-4">
              Our Story
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From three individual journeys to one shared mission
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
            {/* Timeline */}
            <div className="space-y-8">
              <h3 className="font-serif text-2xl font-bold text-prime-900 mb-6">
                Our Journey
              </h3>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-prime-gold/30" />
                
                {timelineItems.map((item, index) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.15 }}
                    className="relative flex gap-6 pb-8 last:pb-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-prime-gold flex items-center justify-center shrink-0 z-10 shadow-lg">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="pt-2">
                      <span className="text-prime-gold font-bold text-lg">{item.year}</span>
                      <p className="text-prime-800 mt-1">{item.event}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Markdown content */}
            <div 
              className="prose prose-lg prose-slate prose-headings:font-serif prose-headings:text-prime-900 prose-h2:text-2xl prose-h3:text-xl prose-a:text-prime-gold prose-strong:text-prime-800 max-w-none"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
