import React from 'react';
import { 
  Palmtree, Waves, Wine, Heart, 
  GraduationCap, Plane, Shield, Mountain,
  Utensils, ShoppingBag, Sailboat, Trophy
} from 'lucide-react';
import { useTranslation } from '@/i18n';

interface LifestyleFeature {
  icon: string;
  title: string;
  description: string;
}

interface LifestyleFeaturesProps {
  cityName: string;
  features?: LifestyleFeature[];
}

export const LifestyleFeatures: React.FC<LifestyleFeaturesProps> = ({ 
  cityName, 
  features
}) => {
  const { t } = useTranslation();
  const ui = (t.brochures as any)?.ui || {};

  const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    golf: Trophy, beach: Palmtree, dining: Utensils, marina: Sailboat,
    wellness: Heart, shopping: ShoppingBag, waves: Waves, wine: Wine,
    education: GraduationCap, airport: Plane, security: Shield, nature: Mountain,
  };

  const DEFAULT_FEATURES: LifestyleFeature[] = [
    { icon: 'golf', title: 'World-Class Golf', description: 'Over 70 championship courses within 30 minutes' },
    { icon: 'beach', title: 'Mediterranean Beaches', description: 'Crystal-clear waters and golden sand coastlines' },
    { icon: 'dining', title: 'Michelin Dining', description: 'Award-winning restaurants and vibrant culinary scene' },
    { icon: 'marina', title: 'Luxury Marinas', description: 'Premier yacht clubs and nautical lifestyle' },
    { icon: 'wellness', title: 'Wellness & Spa', description: 'World-renowned wellness retreats and thermal spas' },
    { icon: 'shopping', title: 'Designer Shopping', description: 'Boutiques, galleries, and luxury retail experiences' },
  ];

  const displayFeatures = features || DEFAULT_FEATURES;
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-prime-gold/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-prime-gold/30 to-transparent" />
      
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
          <span className="inline-block text-prime-gold font-nav text-sm tracking-wider uppercase mb-4">
            {ui.theLifestyle || 'The Lifestyle'}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            {(ui.liveTheDream || 'Live The {city} Dream').replace('{city}', cityName)}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {ui.lifestyleDescription || 'Experience a lifestyle where every day feels like a vacation. From world-class amenities to natural beauty, discover what makes this destination truly exceptional.'}
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {displayFeatures.map((feature, index) => {
            const Icon = ICON_MAP[feature.icon] || Heart;
            return (
              <div
                key={index}
                className="group relative reveal-on-scroll"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="h-full p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-prime-gold/10 hover:border-prime-gold/30 transition-all duration-500 hover:-translate-y-1">
                  {/* Icon Container */}
                  <div className="mb-6 inline-flex p-4 rounded-2xl bg-gradient-to-br from-prime-gold/20 to-prime-gold/5 border border-prime-gold/20 group-hover:from-prime-gold group-hover:to-prime-gold/80 transition-all duration-500">
                    <Icon className="w-7 h-7 text-prime-gold group-hover:text-prime-950 transition-colors duration-300" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="font-serif text-xl font-bold text-foreground mb-3 group-hover:text-prime-gold transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Hover Accent Line */}
                  <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-prime-gold/0 via-prime-gold to-prime-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};