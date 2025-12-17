// City Brochure Data Constants
// All 10 Costa del Sol cities with unique content and imagery

// AI-generated location-specific hero images
import marbellaHero from '@/assets/brochures/marbella-hero.jpg';
import esteponaHero from '@/assets/brochures/estepona-hero.jpg';
import sotograndeHero from '@/assets/brochures/sotogrande-hero.jpg';
import malagaHero from '@/assets/brochures/malaga-hero.jpg';
import fuengirolaHero from '@/assets/brochures/fuengirola-hero.jpg';
import benalmadenaHero from '@/assets/brochures/benalmadena-hero.jpg';
import mijasHero from '@/assets/brochures/mijas-hero.jpg';
import casaresHero from '@/assets/brochures/casares-hero.jpg';
import manilvaHero from '@/assets/brochures/manilva-hero.jpg';
import torremolinosHero from '@/assets/brochures/torremolinos-hero.jpg';

export interface CityBrochureData {
  id: string;
  slug: string;
  name: string;
  nameLocalized?: Record<string, string>;
  heroImage: string;
  heroVideo?: string;
  coordinates: { lat: number; lng: number };
  gallery: string[];
  propertyTypes: string[];
  neighborhoods: string[];
  investmentHighlights: string[];
  lifestyleKeywords: string[];
}

export const CITY_BROCHURES: Record<string, CityBrochureData> = {
  marbella: {
    id: 'marbella',
    slug: 'marbella',
    name: 'Marbella',
    coordinates: { lat: 36.5099, lng: -4.8861 },
    heroImage: marbellaHero,
    gallery: [
      'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?q=80&w=2070&auto=format&fit=crop', // Puerto Banus marina
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop', // Luxury villa
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop', // Modern architecture
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop', // Beachfront property
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2070&auto=format&fit=crop', // Luxury pool
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop', // Modern villa
    ],
    propertyTypes: ['luxury-villas', 'beachfront-apartments', 'penthouses', 'golf-properties', 'new-developments'],
    neighborhoods: ['Golden Mile', 'Puerto Banús', 'Nueva Andalucía', 'Sierra Blanca', 'Los Monteros', 'Guadalmina'],
    investmentHighlights: ['premium-rentals', 'capital-appreciation', 'international-demand', 'luxury-market-leader'],
    lifestyleKeywords: ['luxury', 'glamour', 'international', 'marina', 'golf', 'beach-clubs'],
  },
  estepona: {
    id: 'estepona',
    slug: 'estepona',
    name: 'Estepona',
    coordinates: { lat: 36.4263, lng: -5.1451 },
    heroImage: esteponaHero,
    gallery: [
      'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    ],
    propertyTypes: ['modern-apartments', 'townhouses', 'beachfront', 'new-developments'],
    neighborhoods: ['Old Town', 'El Paraiso', 'Cancelada', 'New Golden Mile', 'Seghers'],
    investmentHighlights: ['value-growth', 'emerging-market', 'authentic-spain', 'new-infrastructure'],
    lifestyleKeywords: ['authentic', 'flowers', 'charming', 'family-friendly', 'beaches', 'promenade'],
  },
  sotogrande: {
    id: 'sotogrande',
    slug: 'sotogrande',
    name: 'Sotogrande',
    coordinates: { lat: 36.2847, lng: -5.2833 },
    heroImage: sotograndeHero,
    gallery: [
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2070&auto=format&fit=crop', // Golf
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    ],
    propertyTypes: ['estates', 'golf-villas', 'marina-apartments', 'frontline-golf'],
    neighborhoods: ['La Reserva', 'Sotogrande Alto', 'Sotogrande Costa', 'Marina', 'Kings & Queens'],
    investmentHighlights: ['ultra-exclusive', 'privacy', 'world-class-golf', 'polo-lifestyle'],
    lifestyleKeywords: ['exclusive', 'golf', 'polo', 'marina', 'privacy', 'prestige'],
  },
  'malaga-city': {
    id: 'malaga-city',
    slug: 'malaga-city',
    name: 'Málaga City',
    coordinates: { lat: 36.7213, lng: -4.4214 },
    heroImage: malagaHero,
    gallery: [
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    ],
    propertyTypes: ['city-apartments', 'penthouses', 'historic-conversions', 'new-developments'],
    neighborhoods: ['Centro Histórico', 'Soho', 'Malagueta', 'El Limonar', 'Teatinos'],
    investmentHighlights: ['capital-growth', 'rental-demand', 'tech-hub', 'cultural-destination'],
    lifestyleKeywords: ['urban', 'culture', 'gastronomy', 'museums', 'nightlife', 'connectivity'],
  },
  fuengirola: {
    id: 'fuengirola',
    slug: 'fuengirola',
    name: 'Fuengirola',
    coordinates: { lat: 36.5440, lng: -4.6249 },
    heroImage: fuengirolaHero,
    gallery: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    ],
    propertyTypes: ['beachfront-apartments', 'family-homes', 'new-developments'],
    neighborhoods: ['Los Boliches', 'Carvajal', 'Torreblanca', 'Myramar'],
    investmentHighlights: ['family-market', 'rental-yields', 'amenities', 'transport-links'],
    lifestyleKeywords: ['family', 'beaches', 'promenade', 'international', 'amenities', 'active'],
  },
  benalmadena: {
    id: 'benalmadena',
    slug: 'benalmadena',
    name: 'Benalmádena',
    coordinates: { lat: 36.5987, lng: -4.5168 },
    heroImage: benalmadenaHero,
    gallery: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2070&auto=format&fit=crop',
    ],
    propertyTypes: ['marina-apartments', 'hillside-villas', 'new-developments'],
    neighborhoods: ['Puerto Marina', 'Benalmádena Pueblo', 'Benalmádena Costa', 'Arroyo de la Miel'],
    investmentHighlights: ['marina-lifestyle', 'views', 'tourism-hub', 'value-proposition'],
    lifestyleKeywords: ['marina', 'cable-car', 'hillside', 'views', 'entertainment', 'family'],
  },
  mijas: {
    id: 'mijas',
    slug: 'mijas',
    name: 'Mijas',
    coordinates: { lat: 36.5958, lng: -4.6371 },
    heroImage: mijasHero,
    gallery: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    ],
    propertyTypes: ['village-houses', 'hillside-villas', 'golf-properties', 'new-developments'],
    neighborhoods: ['Mijas Pueblo', 'La Cala de Mijas', 'Mijas Golf', 'Riviera del Sol', 'Calahonda'],
    investmentHighlights: ['authentic-andalusia', 'golf-variety', 'mountain-sea-views', 'value'],
    lifestyleKeywords: ['white-village', 'mountains', 'authentic', 'donkeys', 'views', 'traditional'],
  },
  casares: {
    id: 'casares',
    slug: 'casares',
    name: 'Casares',
    coordinates: { lat: 36.4444, lng: -5.2739 },
    heroImage: casaresHero,
    gallery: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    ],
    propertyTypes: ['village-houses', 'golf-villas', 'new-developments', 'country-estates'],
    neighborhoods: ['White Village', 'Casares Costa', 'Secadero', 'Doña Julia Golf'],
    investmentHighlights: ['authentic-pueblo', 'golf-lifestyle', 'mountain-views', 'value-growth'],
    lifestyleKeywords: ['white-village', 'authentic', 'mountains', 'golf', 'tranquil', 'traditional'],
  },
  manilva: {
    id: 'manilva',
    slug: 'manilva',
    name: 'Manilva',
    coordinates: { lat: 36.3756, lng: -5.2497 },
    heroImage: manilvaHero,
    gallery: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    ],
    propertyTypes: ['marina-apartments', 'beachfront', 'townhouses', 'new-developments'],
    neighborhoods: ['Manilva Pueblo', 'San Luis de Sabinillas', 'Duquesa Marina', 'Castillo de la Duquesa'],
    investmentHighlights: ['marina-lifestyle', 'wine-culture', 'beaches', 'value-proposition'],
    lifestyleKeywords: ['marina', 'vineyards', 'authentic', 'beaches', 'peaceful', 'wine'],
  },
  torremolinos: {
    id: 'torremolinos',
    slug: 'torremolinos',
    name: 'Torremolinos',
    coordinates: { lat: 36.6221, lng: -4.5008 },
    heroImage: torremolinosHero,
    gallery: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    ],
    propertyTypes: ['beachfront-apartments', 'city-apartments', 'new-developments', 'penthouses'],
    neighborhoods: ['La Carihuela', 'Centro', 'Playamar', 'El Bajondillo', 'Montemar'],
    investmentHighlights: ['beach-lifestyle', 'rental-demand', 'airport-access', 'vibrant-nightlife'],
    lifestyleKeywords: ['beaches', 'nightlife', 'accessibility', 'promenade', 'tourism', 'vibrant'],
  },
};

export const ALL_CITY_SLUGS = Object.keys(CITY_BROCHURES);

export const getCityBySlug = (slug: string): CityBrochureData | undefined => {
  return CITY_BROCHURES[slug];
};

export const getOtherCities = (currentSlug: string): CityBrochureData[] => {
  return Object.values(CITY_BROCHURES).filter(city => city.slug !== currentSlug);
};
