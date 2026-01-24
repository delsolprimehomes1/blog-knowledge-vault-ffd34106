import { Language, Area, BlogPost } from '../types/home';

// Import location-specific hero images from brochures
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

// Map of full language names
export const LANGUAGE_NAMES: Record<Language, string> = {
  [Language.EN]: 'English',
  [Language.NL]: 'Nederlands',
  [Language.FR]: 'Français',
  [Language.DE]: 'Deutsch',
  [Language.FI]: 'Suomi',
  [Language.PL]: 'Polski',
  [Language.DA]: 'Dansk',
  [Language.HU]: 'Magyar',
  [Language.SV]: 'Svenska',
  [Language.NO]: 'Norsk',
};

// Locations for dropdown - Expanded list based on requirements
export const LOCATIONS = [
  { label: 'Málaga', value: 'Málaga' },
  { label: 'Torremolinos', value: 'Torremolinos' },
  { label: 'Benalmádena', value: 'Benalmádena' },
  { label: 'Fuengirola', value: 'Fuengirola' },
  { label: 'Mijas', value: 'Mijas' },
  { label: 'Marbella', value: 'Marbella' },
  { label: 'San Pedro de Alcántara', value: 'San Pedro de Alcántara' },
  { label: 'Ojén', value: 'Ojén' },
  { label: 'Istán', value: 'Istán' },
  { label: 'Benahavís', value: 'Benahavís' },
  { label: 'Estepona', value: 'Estepona' },
  { label: 'Casares', value: 'Casares' },
  { label: 'Manilva', value: 'Manilva' },
  { label: 'Sotogrande', value: 'Sotogrande' }
];

export const PROPERTY_TYPES = [
  { label: 'All Residential', value: 'all' },
  { label: 'Villa', value: 'Villa' },
  { label: 'Detached Villa', value: 'Detached Villa' },
  { label: 'Apartment', value: 'Apartment' },
  { label: 'Penthouse', value: 'Penthouse' },
  { label: 'Townhouse', value: 'Townhouse' },
  { label: 'Semi-Detached', value: 'Semi-Detached' },
  { label: 'Duplex', value: 'Duplex' },
  { label: 'Ground Floor', value: 'Ground Floor Apartment' },
  { label: 'Middle Floor', value: 'Middle Floor Apartment' },
  { label: 'Top Floor', value: 'Top Floor Apartment' },
];

export const BUDGET_RANGES = [
  { label: '€400k - €600k', value: '400000-600000' },
  { label: '€600k - €900k', value: '600000-900000' },
  { label: '€900k - €1.5M', value: '900000-1500000' },
  { label: '€1.5M - €3M', value: '1500000-3000000' },
  { label: '€3M+', value: '3000000+' },
];

// Featured Areas Data - All 10 Costa del Sol locations for carousel
export const FEATURED_AREAS: Area[] = [
  {
    id: 'marbella',
    name: 'Marbella',
    image: marbellaHero,
    description: 'The jewel of the Costa del Sol. Luxury living, golden miles, and exclusive amenities.'
  },
  {
    id: 'estepona',
    name: 'Estepona',
    image: esteponaHero,
    description: 'The Garden of the Costa del Sol. Traditional charm meets modern luxury developments.'
  },
  {
    id: 'fuengirola',
    name: 'Fuengirola',
    image: fuengirolaHero,
    description: 'Family-friendly beach town with vibrant promenade and excellent amenities.'
  },
  {
    id: 'benalmadena',
    name: 'Benalmádena',
    image: benalmadenaHero,
    description: 'Marina lifestyle and hillside charm with stunning coastal panoramas.'
  },
  {
    id: 'mijas',
    name: 'Mijas',
    image: mijasHero,
    description: 'Authentic white village with panoramic views and traditional Andalusian character.'
  },
  {
    id: 'sotogrande',
    name: 'Sotogrande',
    image: sotograndeHero,
    description: 'Privacy and prestige. World-class polo, golf, and marina lifestyle.'
  },
  {
    id: 'malaga-city',
    name: 'Málaga City',
    image: malagaHero,
    description: 'A vibrant cultural hub blending history with futuristic urban living.'
  },
  {
    id: 'casares',
    name: 'Casares',
    image: casaresHero,
    description: 'Traditional pueblo blanco perched on a hillside with breathtaking valley views.'
  },
  {
    id: 'manilva',
    name: 'Manilva',
    image: manilvaHero,
    description: 'Marina and vineyard lifestyle where the mountains meet the Mediterranean.'
  },
  {
    id: 'torremolinos',
    name: 'Torremolinos',
    image: torremolinosHero,
    description: 'Classic beach promenade destination with a vibrant entertainment scene.'
  }
];

// Mock Blog Posts
export const LATEST_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'Buying Off-Plan in Spain: A Legal Checklist',
    excerpt: 'Understand bank guarantees and the importance of the LPO before you sign.',
    date: 'Oct 12, 2023',
    image: 'https://picsum.photos/id/450/600/400'
  },
  {
    id: '2',
    title: 'The Rise of AI in Real Estate Valuation',
    excerpt: 'How we use advanced algorithms to ensure you are paying the fair market price.',
    date: 'Sep 28, 2023',
    image: 'https://picsum.photos/id/3/600/400'
  },
  {
    id: '3',
    title: 'Digital Nomad Visa Updates for 2026',
    excerpt: 'What remote workers and digital nomads need to know about living and working in Spain.',
    date: 'Jan 15, 2026',
    image: 'https://picsum.photos/id/20/600/400'
  }
];

// Navigation Structure
export const NAV_LINKS = [
  { label: 'Properties', href: '/property-finder' },
  { label: 'Areas', href: '/areas' },
  { label: 'About Us', href: '/about' },
  { label: 'Buyers Guide', href: '/buyers-guide' },
  { label: 'Blog', href: '/blog' },
];

// JSON-LD Structured Data Generator
export const getStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Del Sol Prime Homes",
  "description": "Premium real estate agency specializing in Costa del Sol properties",
  "image": "https://www.delsolprimehomes.com/assets/logo-new.png",
  "logo": "https://www.delsolprimehomes.com/assets/logo-new.png",
  "url": "https://www.delsolprimehomes.com",
  "telephone": "+34 630 03 90 90",
  "email": "info@delsolprimehomes.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA",
    "addressLocality": "Fuengirola",
    "addressRegion": "Málaga",
    "postalCode": "29640",
    "addressCountry": "ES"
  },
  "priceRange": "$$$",
  "founders": [
    { "@type": "Person", "name": "Hans Beeckman" },
    { "@type": "Person", "name": "Cédric Van Hecke" },
    { "@type": "Person", "name": "Steven Roberts" }
  ],
  "areaServed": [
    { "@type": "City", "name": "Marbella" },
    { "@type": "City", "name": "Estepona" },
    { "@type": "City", "name": "Fuengirola" },
    { "@type": "City", "name": "Benalmádena" },
    { "@type": "City", "name": "Mijas" },
    { "@type": "City", "name": "Sotogrande" },
    { "@type": "City", "name": "Málaga" }
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "availableLanguage": ["en", "de", "nl", "fr", "pl", "fi", "sv", "da", "no", "hu"],
    "telephone": "+34 630 03 90 90",
    "email": "info@delsolprimehomes.com"
  }
});
