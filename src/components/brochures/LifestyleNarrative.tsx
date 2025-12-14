import React from 'react';
import { Sun, Wine, Waves, Mountain } from 'lucide-react';
import { CityBrochureData } from '@/constants/brochures';
import { useTranslation } from '@/i18n';

interface LifestyleNarrativeProps {
  city: CityBrochureData;
}

export const LifestyleNarrative: React.FC<LifestyleNarrativeProps> = ({ city }) => {
  const { t } = useTranslation();
  const brochureT = (t.brochures as any)?.[city.slug] || (t.brochures as any)?.marbella || {};
  const lifestyleT = brochureT?.lifestyle || {};

  const lifestyleIcons = [
    { icon: Sun, label: '320 Days of Sun' },
    { icon: Waves, label: 'Mediterranean Beaches' },
    { icon: Wine, label: 'World-Class Dining' },
    { icon: Mountain, label: 'Mountain Views' },
  ];

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
      
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <div className="reveal-on-scroll">
            <span className="inline-block text-primary font-nav text-sm tracking-wider uppercase mb-4">
              {lifestyleT.eyebrow || lifestyleT.title || 'The Lifestyle'}
            </span>
            
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              {lifestyleT.headline || `Experience Life in ${city.name}`}
            </h2>
            
            <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
              <p>
                {lifestyleT.paragraph1 || 
                  `${city.name} offers a unique blend of Mediterranean charm and international sophistication. Here, world-class amenities meet authentic Andalusian culture, creating an unparalleled quality of life.`
                }
              </p>
              <p>
                {lifestyleT.paragraph2 || 
                  `From sunrise beach walks to sunset dinners overlooking the sea, every day brings new experiences. The international community welcomes newcomers while preserving the warmth of Spanish hospitality.`
                }
              </p>
              <p>
                {lifestyleT.paragraph3 || 
                  `Whether you're seeking year-round sunshine, exceptional dining, world-class golf, or simply a more relaxed pace of life — ${city.name} delivers on every front.`
                }
              </p>
            </div>

            {/* Lifestyle Stats */}
            <div className="grid grid-cols-2 gap-4 mt-10">
              {lifestyleIcons.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image Grid */}
          <div className="relative reveal-on-scroll stagger-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={city.gallery[0]}
                    alt={`${city.name} lifestyle`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={city.gallery[1]}
                    alt={`${city.name} property`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="aspect-square rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={city.gallery[2]}
                    alt={`${city.name} architecture`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={city.gallery[3] || city.gallery[0]}
                    alt={`${city.name} views`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground px-6 py-4 rounded-xl shadow-xl">
              <p className="text-2xl font-serif font-bold">35+</p>
              <p className="text-sm opacity-90">Years Experience</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
