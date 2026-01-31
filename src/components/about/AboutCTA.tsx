import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";

export const AboutCTA = () => {
  const { t, currentLanguage } = useTranslation();
  const aboutUs = t.aboutUs as Record<string, unknown> | undefined;
  const ctaSection = aboutUs?.ctaSection as { heading?: string; subheading?: string; chatWithEmma?: string; callUs?: string; emailUs?: string; visitUs?: string; location?: string } | undefined;
  const cta = aboutUs?.cta as { meetTeam?: string } | undefined;
  
  return (
    <section className="py-20 bg-gradient-to-br from-prime-900 via-prime-800 to-prime-900 text-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-prime-gold rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-prime-gold rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            {ctaSection?.heading || "Ready to Find Your Dream Property?"}
          </h2>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            {ctaSection?.subheading || "Let's start your Costa del Sol journey together. Our team is ready to help you every step of the way."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              className="bg-prime-gold hover:bg-prime-gold/90 text-prime-900 font-semibold px-8"
              asChild
            >
              <Link to={`/${currentLanguage}/team`}>
                <Users className="w-4 h-4 mr-2" />
                {cta?.meetTeam || "Meet Our Team"}
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-transparent border-white/30 text-white hover:bg-white/10 px-8"
              onClick={() => window.dispatchEvent(new CustomEvent('openEmmaChat'))}
            >
              <Phone className="w-4 h-4 mr-2" />
              {ctaSection?.chatWithEmma || "Chat with Emma"}
            </Button>
          </div>

          {/* Contact info */}
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                <Phone className="w-5 h-5 text-prime-gold" />
              </div>
              <span className="text-sm text-slate-400 mb-1">{ctaSection?.callUs || "Call Us"}</span>
              <span className="font-medium">+34 630 03 90 90</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-prime-gold" />
              </div>
              <span className="text-sm text-slate-400 mb-1">{ctaSection?.emailUs || "Email Us"}</span>
              <span className="font-medium">info@delsolprimehomes.com</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                <MapPin className="w-5 h-5 text-prime-gold" />
              </div>
              <span className="text-sm text-slate-400 mb-1">{ctaSection?.visitUs || "Visit Us"}</span>
              <span className="font-medium">{ctaSection?.location || "Marbella, Spain"}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};