import { motion } from "framer-motion";
import { MapPin, Users, Award } from "lucide-react";
import { useTranslation } from "@/i18n";

interface AboutHeroProps {
  headline: string;
  subheadline: string;
  yearsInBusiness: number;
  propertiesSold: number;
  clientSatisfaction: number;
}

export const AboutHero = ({
  headline,
  subheadline,
  yearsInBusiness,
  propertiesSold,
  clientSatisfaction
}: AboutHeroProps) => {
  const { t, currentLanguage } = useTranslation();
  const aboutUs = t.aboutUs as Record<string, unknown> | undefined;
  const hero = aboutUs?.hero as { headline?: string; subheadline?: string; breadcrumbHome?: string; breadcrumbAbout?: string; statsYears?: string; statsClients?: string; statsSatisfaction?: string } | undefined;

  const stats = [
    { icon: Award, value: `${yearsInBusiness}+`, label: hero?.statsYears || "Years Experience" },
    { icon: Users, value: `${propertiesSold}+`, label: hero?.statsClients || "Happy Clients" },
    { icon: MapPin, value: `${clientSatisfaction}%`, label: hero?.statsSatisfaction || "Satisfaction Rate" }
  ];

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-prime-900 via-prime-800 to-prime-900">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-prime-gold rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-prime-gold rounded-full blur-3xl" />
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="container mx-auto px-4 md:px-6 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <li><a href={`/${currentLanguage}`} className="hover:text-prime-gold transition-colors">{hero?.breadcrumbHome || "Home"}</a></li>
              <li className="text-slate-600">/</li>
              <li className="text-prime-gold">{hero?.breadcrumbAbout || "About Us"}</li>
            </ol>
          </nav>

          {/* H1 - Main heading for SEO */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            {hero?.headline || headline}
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            {hero?.subheadline || subheadline}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 md:gap-12 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-prime-gold/20 mb-3">
                  <stat.icon className="w-6 h-6 text-prime-gold" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-slate-400 uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-3 bg-prime-gold rounded-full mt-2"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
