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
      // Marbella-specific: Puerto Banús marina, Golden Mile beaches, Old Town, La Concha mountain
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2070&auto=format&fit=crop', // Marbella marina yachts
      'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?q=80&w=2070&auto=format&fit=crop', // Mediterranean coast luxury
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop', // Costa del Sol beach view
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2070&auto=format&fit=crop', // Luxury villa exterior
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=2070&auto=format&fit=crop', // Spanish luxury property
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
      // Estepona-specific: Flower murals, orchid promenade, whitewashed old town
      'https://images.unsplash.com/photo-1559628233-100c798642d4?q=80&w=2070&auto=format&fit=crop', // Spanish white village flowers
      'https://images.unsplash.com/photo-1565294739588-4e0b98c7e38a?q=80&w=2070&auto=format&fit=crop', // Andalusian colorful streets
      'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=2070&auto=format&fit=crop', // Spanish coastal town
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=2070&auto=format&fit=crop', // Mediterranean beach promenade
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
      // Sotogrande-specific: Marina, polo, golf courses, exclusive estates
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2070&auto=format&fit=crop', // Golf course fairway
      'https://images.unsplash.com/photo-1575037614876-c38a4c44d0b4?q=80&w=2070&auto=format&fit=crop', // Luxury marina boats
      'https://images.unsplash.com/photo-1592595896551-12b371d546d5?q=80&w=2070&auto=format&fit=crop', // Golf sunset
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop', // Modern luxury home
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
      // Málaga-specific: Cathedral, Alcazaba, port, Soho street art
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?q=80&w=2070&auto=format&fit=crop', // Málaga cathedral
      'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?q=80&w=2070&auto=format&fit=crop', // Málaga Alcazaba fortress
      'https://images.unsplash.com/photo-1561632669-7f55f7975606?q=80&w=2070&auto=format&fit=crop', // Spanish city architecture
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=2070&auto=format&fit=crop', // Urban port city
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
      // Fuengirola-specific: Sohail Castle, beach, promenade, family areas
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2070&auto=format&fit=crop', // Mediterranean beach
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070&auto=format&fit=crop', // Spanish coastal promenade
      'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?q=80&w=2070&auto=format&fit=crop', // Beach town view
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
      // Benalmádena-specific: Puerto Marina, cable car views, Colomares Castle
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop', // Marina boats
      'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?q=80&w=2070&auto=format&fit=crop', // Coastal aerial view
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=2070&auto=format&fit=crop', // Mediterranean hillside
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
      // Mijas-specific: White village streets, mountain views, donkeys, traditional
      'https://images.unsplash.com/photo-1504019347908-b45f9b0b8dd5?q=80&w=2070&auto=format&fit=crop', // White Spanish village
      'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?q=80&w=2070&auto=format&fit=crop', // Andalusian white streets
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?q=80&w=2070&auto=format&fit=crop', // Mediterranean mountain village
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
      // Casares-specific: Hillside white village, castle, panoramic views
      'https://images.unsplash.com/photo-1559628233-100c798642d4?q=80&w=2070&auto=format&fit=crop', // White hillside village
      'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?q=80&w=2070&auto=format&fit=crop', // Andalusian mountain views
      'https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=2070&auto=format&fit=crop', // Spanish pueblo blanco
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
      // Manilva-specific: Duquesa Marina, vineyards, beaches
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2070&auto=format&fit=crop', // Marina harbor
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop', // Vineyard landscape
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=2070&auto=format&fit=crop', // Mediterranean beach
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
      // Torremolinos-specific: La Carihuela beach, chiringuitos, promenade
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2070&auto=format&fit=crop', // Sandy beach
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070&auto=format&fit=crop', // Beach promenade
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=2070&auto=format&fit=crop', // Mediterranean coastline
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
