import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ChevronRight, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Skeleton } from '@/components/ui/skeleton';

interface CityData {
  city_slug: string;
  city_name: string;
  region: string;
  count: number;
  image?: string;
  imageAlt?: string;
}

interface FeaturedCitiesSectionProps {
  language: string;
  cities: CityData[];
  isLoading: boolean;
}

// City metadata for overlay tags
const CITY_METADATA: Record<string, { avgPrice: string; bestFor: string; vibe: string }> = {
  marbella: { avgPrice: 'From €650K', bestFor: 'Luxury & Golf', vibe: 'Glamorous' },
  estepona: { avgPrice: 'From €350K', bestFor: 'Authentic Spain', vibe: 'Charming' },
  fuengirola: { avgPrice: 'From €250K', bestFor: 'Families & Expats', vibe: 'Vibrant' },
  benalmadena: { avgPrice: 'From €280K', bestFor: 'Beach & Nightlife', vibe: 'Lively' },
  torremolinos: { avgPrice: 'From €220K', bestFor: 'Budget Friendly', vibe: 'Bustling' },
  malaga: { avgPrice: 'From €300K', bestFor: 'City & Culture', vibe: 'Urban' },
  casares: { avgPrice: 'From €400K', bestFor: 'Rural Retreat', vibe: 'Peaceful' },
  mijas: { avgPrice: 'From €320K', bestFor: 'Village Charm', vibe: 'Picturesque' },
  nerja: { avgPrice: 'From €280K', bestFor: 'Natural Beauty', vibe: 'Relaxed' },
  'la-cala': { avgPrice: 'From €350K', bestFor: 'Golf & Beach', vibe: 'Exclusive' },
  benahavis: { avgPrice: 'From €500K', bestFor: 'Mountain Views', vibe: 'Serene' },
};

const LOCALIZED_CONTENT: Record<string, {
  sectionTitle: string;
  sectionSubtitle: string;
  guidesLabel: string;
  guideLabel: string;
  exploreLabel: string;
  noGuides: string;
  noGuidesSubtitle: string;
}> = {
  en: {
    sectionTitle: "Explore by City",
    sectionSubtitle: "Select a city to discover comprehensive guides with property insights, lifestyle data, and investment analysis.",
    guidesLabel: "guides",
    guideLabel: "guide",
    exploreLabel: "Explore Guides",
    noGuides: "No Location Guides Yet",
    noGuidesSubtitle: "Location intelligence pages are coming soon. Check back later for comprehensive guides to Costa del Sol cities."
  },
  nl: {
    sectionTitle: "Verken per Stad",
    sectionSubtitle: "Selecteer een stad om uitgebreide gidsen te ontdekken met vastgoedinzichten, levensstijldata en investeringsanalyse.",
    guidesLabel: "gidsen",
    guideLabel: "gids",
    exploreLabel: "Gidsen Verkennen",
    noGuides: "Nog Geen Locatiegidsen",
    noGuidesSubtitle: "Locatie-intelligentiepagina's komen binnenkort. Kom later terug voor uitgebreide gidsen."
  },
  de: {
    sectionTitle: "Nach Stadt Erkunden",
    sectionSubtitle: "Wählen Sie eine Stadt, um umfassende Führer mit Immobilieneinblicken, Lebensstildaten und Investitionsanalysen zu entdecken.",
    guidesLabel: "Führer",
    guideLabel: "Führer",
    exploreLabel: "Führer Erkunden",
    noGuides: "Noch Keine Standortführer",
    noGuidesSubtitle: "Standort-Intelligenzseiten kommen bald. Schauen Sie später für umfassende Führer vorbei."
  },
  fr: {
    sectionTitle: "Explorer par Ville",
    sectionSubtitle: "Sélectionnez une ville pour découvrir des guides complets avec des aperçus immobiliers, des données lifestyle et une analyse d'investissement.",
    guidesLabel: "guides",
    guideLabel: "guide",
    exploreLabel: "Explorer les Guides",
    noGuides: "Pas Encore de Guides",
    noGuidesSubtitle: "Les pages d'intelligence de localisation arrivent bientôt. Revenez plus tard."
  },
  sv: {
    sectionTitle: "Utforska per Stad",
    sectionSubtitle: "Välj en stad för att upptäcka omfattande guider med fastighetsinsikter, livsstilsdata och investeringsanalys.",
    guidesLabel: "guider",
    guideLabel: "guide",
    exploreLabel: "Utforska Guider",
    noGuides: "Inga Platsguider Ännu",
    noGuidesSubtitle: "Platsintelligensidor kommer snart. Kom tillbaka senare."
  },
  no: {
    sectionTitle: "Utforsk etter By",
    sectionSubtitle: "Velg en by for å oppdage omfattende guider med eiendomsinnsikt, livsstilsdata og investeringsanalyse.",
    guidesLabel: "guider",
    guideLabel: "guide",
    exploreLabel: "Utforsk Guider",
    noGuides: "Ingen Stedsguider Ennå",
    noGuidesSubtitle: "Stedsintelligensider kommer snart. Kom tilbake senere."
  },
  da: {
    sectionTitle: "Udforsk efter By",
    sectionSubtitle: "Vælg en by for at opdage omfattende guider med ejendomsindsigt, livsstilsdata og investeringsanalyse.",
    guidesLabel: "guider",
    guideLabel: "guide",
    exploreLabel: "Udforsk Guider",
    noGuides: "Ingen Stedguider Endnu",
    noGuidesSubtitle: "Stedintelligensider kommer snart. Kom tilbage senere."
  },
  fi: {
    sectionTitle: "Tutustu Kaupungeittain",
    sectionSubtitle: "Valitse kaupunki löytääksesi kattavat oppaat kiinteistönäkymillä, elämäntapadatalla ja sijoitusanalyysillä.",
    guidesLabel: "opasta",
    guideLabel: "opas",
    exploreLabel: "Tutustu Oppaisiin",
    noGuides: "Ei Sijaintioppaita Vielä",
    noGuidesSubtitle: "Sijaintiälysivut tulossa pian. Tule takaisin myöhemmin."
  },
  pl: {
    sectionTitle: "Przeglądaj według Miasta",
    sectionSubtitle: "Wybierz miasto, aby odkryć kompleksowe przewodniki z analizą nieruchomości, danymi o stylu życia i analizą inwestycyjną.",
    guidesLabel: "przewodników",
    guideLabel: "przewodnik",
    exploreLabel: "Przeglądaj Przewodniki",
    noGuides: "Brak Przewodników po Lokalizacjach",
    noGuidesSubtitle: "Strony inteligencji lokalizacji już wkrótce. Sprawdź później."
  },
  hu: {
    sectionTitle: "Fedezze Fel Városonként",
    sectionSubtitle: "Válasszon egy várost, hogy átfogó útmutatókat találjon ingatlan-betekintésekkel, életmód-adatokkal és befektetési elemzéssel.",
    guidesLabel: "útmutató",
    guideLabel: "útmutató",
    exploreLabel: "Útmutatók Felfedezése",
    noGuides: "Még Nincs Helyszín Útmutató",
    noGuidesSubtitle: "A helyszín intelligencia oldalak hamarosan érkeznek. Nézzen vissza később."
  }
};

// Fallback images for cities without custom images
const CITY_FALLBACK_IMAGES: Record<string, string> = {
  marbella: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=800&q=80',
  estepona: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=800&q=80',
  fuengirola: 'https://images.unsplash.com/photo-1504019347908-b45f9b0b8dd5?w=800&q=80',
  benalmadena: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?w=800&q=80',
  malaga: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80',
  torremolinos: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
  casares: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=800&q=80',
  mijas: 'https://images.unsplash.com/photo-1504019347908-b45f9b0b8dd5?w=800&q=80'
};

export const FeaturedCitiesSection: React.FC<FeaturedCitiesSectionProps> = ({ 
  language, 
  cities, 
  isLoading 
}) => {
  const content = LOCALIZED_CONTENT[language] || LOCALIZED_CONTENT.en;

  // Sort cities: featured first (Marbella, Estepona, Fuengirola), then by guide count
  const sortedCities = React.useMemo(() => {
    const featured = ['marbella', 'estepona', 'fuengirola'];
    return [...cities].sort((a, b) => {
      const aFeatured = featured.indexOf(a.city_slug);
      const bFeatured = featured.indexOf(b.city_slug);
      
      if (aFeatured !== -1 && bFeatured !== -1) return aFeatured - bFeatured;
      if (aFeatured !== -1) return -1;
      if (bFeatured !== -1) return 1;
      return b.count - a.count;
    });
  }, [cities]);

  const featuredCities = sortedCities.slice(0, 3);
  const otherCities = sortedCities.slice(3);

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 bg-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!cities.length) {
    return (
      <section className="py-16 md:py-24 bg-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center py-16 glass-luxury rounded-3xl">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-3">{content.noGuides}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">{content.noGuidesSubtitle}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-secondary/5">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {content.sectionTitle}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {content.sectionSubtitle}
          </p>
        </div>

        {/* Featured Cities - Equal Large Cards with Metadata */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {featuredCities.map((city, index) => {
            const imageUrl = city.image || CITY_FALLBACK_IMAGES[city.city_slug] || CITY_FALLBACK_IMAGES.marbella;
            const imageAlt = city.imageAlt || `Aerial view of ${city.city_name}, Costa del Sol`;
            const metadata = CITY_METADATA[city.city_slug] || { avgPrice: 'From €300K', bestFor: 'Lifestyle', vibe: 'Mediterranean' };

            return (
              <Link
                key={city.city_slug}
                to={`/${language}/locations/${city.city_slug}`}
                className="group relative rounded-2xl overflow-hidden card-immersive aspect-[3/4] min-h-[350px] md:min-h-[420px]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <OptimizedImage
                    src={imageUrl}
                    alt={imageAlt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  {/* Top: Metadata Tags */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-primary/90 text-primary-foreground text-xs font-semibold shadow-lg">
                      {metadata.avgPrice}
                    </Badge>
                    <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white text-xs">
                      {metadata.bestFor}
                    </Badge>
                    <Badge className="bg-black/40 backdrop-blur-md border-white/10 text-white/90 text-xs">
                      {metadata.vibe}
                    </Badge>
                  </div>

                  {/* Bottom: City Info */}
                  <div>
                    {/* Guide Count Badge */}
                    <Badge className="mb-3 bg-white/10 backdrop-blur-md border-white/20 text-white">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {city.count} {city.count === 1 ? content.guideLabel : content.guidesLabel}
                    </Badge>

                    <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mb-1 group-hover:text-primary transition-colors">
                      {city.city_name}
                    </h3>
                    <p className="text-white/70 text-sm mb-3">{city.region}, Spain</p>
                    
                    {/* CTA */}
                    <div className="flex items-center gap-2 text-primary font-medium text-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <MapPin className="w-4 h-4" />
                      <span>{content.exploreLabel}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Other Cities - Smaller Grid */}
        {otherCities.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {otherCities.map((city, index) => {
              const imageUrl = city.image || CITY_FALLBACK_IMAGES[city.city_slug] || CITY_FALLBACK_IMAGES.marbella;
              const metadata = CITY_METADATA[city.city_slug] || { avgPrice: 'From €300K', bestFor: 'Lifestyle', vibe: 'Mediterranean' };

              return (
                <Link
                  key={city.city_slug}
                  to={`/${language}/locations/${city.city_slug}`}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden"
                  style={{ animationDelay: `${(index + 3) * 100}ms` }}
                >
                  {/* Background */}
                  <div className="absolute inset-0">
                    <OptimizedImage
                      src={imageUrl}
                      alt={`${city.city_name}, Costa del Sol`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 p-3 flex flex-col justify-between">
                    {/* Top: Price badge */}
                    <Badge className="self-start bg-primary/80 text-primary-foreground text-[10px] px-2 py-0.5">
                      {metadata.avgPrice}
                    </Badge>

                    {/* Bottom */}
                    <div>
                      <Badge className="mb-1 bg-white/10 backdrop-blur-sm border-white/20 text-white text-xs px-1.5 py-0.5">
                        {city.count} {city.count === 1 ? content.guideLabel : content.guidesLabel}
                      </Badge>
                      <h3 className="text-base font-semibold text-white group-hover:text-primary transition-colors">
                        {city.city_name}
                      </h3>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
