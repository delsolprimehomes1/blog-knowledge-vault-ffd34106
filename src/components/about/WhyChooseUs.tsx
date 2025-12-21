import { motion } from "framer-motion";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { MapPin, Handshake, Shield, Clock, HeartHandshake, FileCheck } from "lucide-react";

interface WhyChooseUsProps {
  content: string;
}

export const WhyChooseUs = ({ content }: WhyChooseUsProps) => {
  const parseMarkdown = (markdown: string): string => {
    try {
      const html = marked.parse(markdown, { async: false }) as string;
      return DOMPurify.sanitize(html);
    } catch {
      return markdown;
    }
  };

  const features = [
    {
      icon: MapPin,
      title: "Local Expertise",
      description: "40+ combined years living on the Costa del Sol"
    },
    {
      icon: Handshake,
      title: "End-to-End Service",
      description: "From property search to after-sales support"
    },
    {
      icon: Shield,
      title: "Licensed & Certified",
      description: "API registered and fully compliant"
    },
    {
      icon: Clock,
      title: "Responsive Support",
      description: "Available when you need us most"
    },
    {
      icon: HeartHandshake,
      title: "Client-First Approach",
      description: "Your needs drive every decision"
    },
    {
      icon: FileCheck,
      title: "Transparent Process",
      description: "No hidden fees, no surprises"
    }
  ];

  return (
    <section className="py-20 bg-prime-900 text-white relative overflow-hidden" aria-labelledby="why-choose-heading">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-prime-gold/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-tr from-prime-gold/5 to-transparent" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-16">
            <h2 id="why-choose-heading" className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Why Choose Us
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              We don't just help you find a property—we help you find a home
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-prime-gold/20 flex items-center justify-center mb-4 group-hover:bg-prime-gold/30 transition-colors">
                  <feature.icon className="w-6 h-6 text-prime-gold" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Markdown content */}
          <div className="max-w-3xl mx-auto">
            <div 
              className="prose prose-invert prose-lg prose-headings:font-serif prose-h2:text-2xl prose-h3:text-xl prose-a:text-prime-gold prose-strong:text-white max-w-none"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
