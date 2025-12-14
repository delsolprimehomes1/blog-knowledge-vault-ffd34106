import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, Building2, Castle, Palmtree, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CityBrochureData } from '@/constants/brochures';
import { useTranslation } from '@/i18n';

interface PropertyTypesTeaserProps {
  city: CityBrochureData;
}

const propertyTypeConfig: Record<string, { icon: React.ElementType; label: string; description: string }> = {
  'luxury-villas': {
    icon: Castle,
    label: 'Luxury Villas',
    description: 'Exclusive residences with private pools, gardens, and panoramic views.',
  },
  'beachfront-apartments': {
    icon: Palmtree,
    label: 'Beachfront Apartments',
    description: 'Wake up to the sound of waves in contemporary coastal living spaces.',
  },
  'penthouses': {
    icon: Star,
    label: 'Penthouses',
    description: 'Sky-high living with expansive terraces and spectacular vistas.',
  },
  'golf-properties': {
    icon: Home,
    label: 'Golf Properties',
    description: 'Frontline golf homes on world-renowned courses.',
  },
  'new-developments': {
    icon: Building2,
    label: 'New Developments',
    description: 'Off-plan opportunities with modern design and specifications.',
  },
  'modern-apartments': {
    icon: Building2,
    label: 'Modern Apartments',
    description: 'Contemporary living spaces with high-end finishes.',
  },
  'townhouses': {
    icon: Home,
    label: 'Townhouses',
    description: 'Spacious family homes with private outdoor areas.',
  },
  'beachfront': {
    icon: Palmtree,
    label: 'Beachfront',
    description: 'Direct beach access properties for the ultimate coastal lifestyle.',
  },
  'estates': {
    icon: Castle,
    label: 'Exclusive Estates',
    description: 'Sprawling private properties with extensive grounds.',
  },
  'golf-villas': {
    icon: Home,
    label: 'Golf Villas',
    description: 'Elegant homes overlooking championship golf courses.',
  },
  'marina-apartments': {
    icon: Building2,
    label: 'Marina Apartments',
    description: 'Waterfront living with yacht berth access.',
  },
  'frontline-golf': {
    icon: Home,
    label: 'Frontline Golf',
    description: 'Premium positioning on the first line of top courses.',
  },
  'city-apartments': {
    icon: Building2,
    label: 'City Apartments',
    description: 'Urban living in the heart of culture and commerce.',
  },
  'historic-conversions': {
    icon: Castle,
    label: 'Historic Conversions',
    description: 'Character properties with modern luxury amenities.',
  },
  'family-homes': {
    icon: Home,
    label: 'Family Homes',
    description: 'Spacious properties perfect for family living.',
  },
  'hillside-villas': {
    icon: Castle,
    label: 'Hillside Villas',
    description: 'Elevated homes with sweeping panoramic views.',
  },
  'village-houses': {
    icon: Home,
    label: 'Village Houses',
    description: 'Authentic Andalusian charm in whitewashed pueblos.',
  },
};

export const PropertyTypesTeaser: React.FC<PropertyTypesTeaserProps> = ({ city }) => {
  const { t } = useTranslation();
  const brochureT = t.brochures?.[city.slug as keyof typeof t.brochures] || t.brochures?.marbella;

  // Get property types for this city (max 5)
  const cityPropertyTypes = city.propertyTypes.slice(0, 5).map(type => ({
    key: type,
    ...propertyTypeConfig[type] || {
      icon: Building2,
      label: type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: 'Premium properties in this category.',
    },
  }));

  return (
    <section className="py-24 md:py-32 bg-background relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
          <span className="inline-block text-primary font-nav text-sm tracking-wider uppercase mb-4">
            {brochureT?.propertyTypes?.eyebrow || 'Property Types'}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            {brochureT?.propertyTypes?.headline || `What You'll Find in ${city.name}`}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {brochureT?.propertyTypes?.description || 
              `From contemporary apartments to sprawling villas, ${city.name} offers exceptional properties to match every lifestyle and investment goal.`
            }
          </p>
        </div>

        {/* Property Type Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {cityPropertyTypes.map((type, index) => (
            <Link
              key={type.key}
              to={`/property-finder?location=${city.name}&type=${type.key}`}
              className="group p-8 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 reveal-on-scroll"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <type.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                {type.label}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {type.description}
              </p>
              <span className="inline-flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                View Properties <ChevronRight size={16} className="ml-1" />
              </span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center reveal-on-scroll">
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-nav font-semibold px-8"
          >
            <Link to={`/property-finder?location=${city.name}`}>
              Explore All Properties in {city.name}
              <ChevronRight className="ml-2" size={18} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
