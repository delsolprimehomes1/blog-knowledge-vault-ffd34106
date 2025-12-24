import { motion } from "framer-motion";
import { Quote } from "lucide-react";

interface PropertyDescriptionProps {
  description: string;
  propertyType: string;
  location: string;
}

export const PropertyDescription = ({ description, propertyType, location }: PropertyDescriptionProps) => {
  // Extract first sentence for pull quote
  const firstSentence = description.split(/[.!?]/)[0] + ".";
  const remainingText = description.slice(firstSentence.length).trim();

  return (
    <section className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground accent-line-gold">
          About This Property
        </h2>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Main Description */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-2"
        >
          {/* Pull Quote */}
          <div className="relative mb-8 pl-8 border-l-4 border-primary/30">
            <Quote className="absolute -left-5 -top-2 w-10 h-10 text-primary/20" />
            <p className="text-xl md:text-2xl font-display text-foreground/90 italic leading-relaxed">
              {firstSentence}
            </p>
          </div>

          {/* Rest of Description */}
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-muted-foreground leading-relaxed drop-cap">
              {remainingText || description}
            </p>
          </div>
        </motion.div>

        {/* Side Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Property Type Card */}
          <div className="glass-luxury rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Property Type
            </h3>
            <p className="text-2xl font-display font-bold text-foreground capitalize">
              {propertyType}
            </p>
          </div>

          {/* Location Card */}
          <div className="glass-luxury rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Location
            </h3>
            <p className="text-xl font-display font-bold text-foreground">
              {location}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Costa del Sol, Spain
            </p>
          </div>

          {/* Why This Property */}
          <div className="glass-luxury rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Why This Property?
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Prime location in {location}
              </li>
              <li className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Luxury finishes throughout
              </li>
              <li className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Exceptional investment opportunity
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
