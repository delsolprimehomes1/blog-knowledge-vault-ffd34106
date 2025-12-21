import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { BrochureHero } from '@/components/brochures/BrochureHero';
import { BrochureDescription } from '@/components/brochures/BrochureDescription';
import { InvestmentHighlights } from '@/components/brochures/InvestmentHighlights';
import { LifestyleFeatures } from '@/components/brochures/LifestyleFeatures';
import { BrochureGallery } from '@/components/brochures/BrochureGallery';
import { BrochureOptInForm } from '@/components/brochures/BrochureOptInForm';
import { CrossCityDiscovery } from '@/components/brochures/CrossCityDiscovery';
import { BrochureChatbot } from '@/components/brochures/BrochureChatbot';
import NotFound from './NotFound';
import { Loader2, ArrowUp } from 'lucide-react';

// Fallback images from existing assets
import marbellaHero from '@/assets/brochures/marbella-hero.jpg';
import esteponaHero from '@/assets/brochures/estepona-hero.jpg';
import fuengirolaHero from '@/assets/brochures/fuengirola-hero.jpg';
import benalmadenaHero from '@/assets/brochures/benalmadena-hero.jpg';
import mijasHero from '@/assets/brochures/mijas-hero.jpg';
import sotograndeHero from '@/assets/brochures/sotogrande-hero.jpg';
import malagaHero from '@/assets/brochures/malaga-hero.jpg';

const FALLBACK_IMAGES: Record<string, string> = {
  marbella: marbellaHero,
  estepona: esteponaHero,
  fuengirola: fuengirolaHero,
  benalmadena: benalmadenaHero,
  mijas: mijasHero,
  sotogrande: sotograndeHero,
  'malaga-city': malagaHero,
};

interface GalleryItem {
  title: string;
  image: string;
}

interface CityBrochureData {
  id: string;
  slug: string;
  name: string;
  hero_image: string | null;
  hero_video_url: string | null;
  hero_headline: string | null;
  hero_subtitle: string | null;
  description: string | null;
  gallery_images: unknown;
  features: string[];
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
}

const parseGalleryImages = (data: unknown): GalleryItem[] => {
  if (!data || !Array.isArray(data)) return [];
  return data.map((item) => {
    if (typeof item === 'string') return { title: '', image: item };
    if (typeof item === 'object' && item !== null) {
      return { title: (item as GalleryItem).title || '', image: (item as GalleryItem).image || '' };
    }
    return { title: '', image: '' };
  });
};

const CityBrochure: React.FC = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const formRef = useRef<HTMLElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [citySlug]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 800);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: city, isLoading, error } = useQuery({
    queryKey: ['city-brochure', citySlug],
    queryFn: async () => {
      if (!citySlug) return null;
      const { data, error } = await supabase
        .from('city_brochures')
        .select('*')
        .eq('slug', citySlug)
        .eq('is_published', true)
        .single();
      if (error) throw error;
      return data as CityBrochureData;
    },
    enabled: !!citySlug,
  });

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' });
  const toggleChat = () => setChatOpen(!chatOpen);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  if (isLoading) {
    return (
      <>
        <Header variant="transparent" />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-10 h-10 animate-spin text-prime-gold" />
        </div>
        <Footer />
      </>
    );
  }

  if (!city || error) return <NotFound />;

  const heroImage = city.hero_image || FALLBACK_IMAGES[city.slug] || FALLBACK_IMAGES.marbella;
  const galleryImages = parseGalleryImages(city.gallery_images);
  const features = city.features || [];
  const description = city.description || `Discover exceptional real estate opportunities in ${city.name}.`;
  const BASE_URL = 'https://www.delsolprimehomes.com';

  // Generate JSON-LD schemas for brochure page
  const brochureSchemas = {
    "@context": "https://schema.org",
    "@graph": [
      // WebPage with Speakable
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/brochure/${city.slug}#webpage`,
        "name": city.meta_title || `Luxury Properties in ${city.name}`,
        "description": city.meta_description || `Discover exceptional luxury properties in ${city.name} on the Costa del Sol.`,
        "url": `${BASE_URL}/brochure/${city.slug}`,
        "inLanguage": "en-GB",
        "isPartOf": {
          "@id": `${BASE_URL}/#website`
        },
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": [".brochure-hero h1", ".brochure-hero p", ".brochure-description"]
        }
      },
      // Place schema
      {
        "@type": "Place",
        "name": city.name,
        "description": `${city.name} - Premium real estate destination on Spain's Costa del Sol`,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": city.name,
          "addressRegion": "Andalucía",
          "addressCountry": "ES"
        }
      },
      // RealEstateAgent (Organization)
      {
        "@type": "RealEstateAgent",
        "name": "Del Sol Prime Homes",
        "description": `API-accredited real estate agency specializing in luxury properties in ${city.name} and across the Costa del Sol.`,
        "url": BASE_URL,
        "logo": `${BASE_URL}/assets/logo-new.png`,
        "telephone": "+34 613 578 416",
        "email": "info@delsolprimehomes.com",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "ED SAN FERNAN, C. Alfonso XIII, 6, 1 OFICINA",
          "addressLocality": "Fuengirola",
          "addressRegion": "Málaga",
          "postalCode": "29640",
          "addressCountry": "ES"
        },
        "areaServed": {
          "@type": "Place",
          "name": city.name
        }
      },
      // Breadcrumb
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
          { "@type": "ListItem", "position": 2, "name": "Brochures", "item": `${BASE_URL}/brochure` },
          { "@type": "ListItem", "position": 3, "name": city.name, "item": `${BASE_URL}/brochure/${city.slug}` }
        ]
      },
      // ImageObject for hero
      {
        "@type": "ImageObject",
        "url": heroImage,
        "name": `${city.name} - Costa del Sol`,
        "description": city.meta_description || `Luxury properties in ${city.name}`,
        "caption": city.hero_headline || `Discover ${city.name}`,
        "contentLocation": {
          "@type": "Place",
          "name": city.name,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": city.name,
            "addressRegion": "Andalucía",
            "addressCountry": "ES"
          }
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>{city.meta_title || `Luxury Properties in ${city.name} | Del Sol Prime Homes`}</title>
        <meta name="description" content={city.meta_description || `Discover exceptional luxury properties in ${city.name} on the Costa del Sol.`} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={`${BASE_URL}/brochure/${city.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={city.hero_headline || `Luxury Properties in ${city.name}`} />
        <meta property="og:description" content={city.meta_description || description} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:image:alt" content={`${city.name} - Costa del Sol luxury properties`} />
        <meta property="og:url" content={`${BASE_URL}/brochure/${city.slug}`} />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        <meta property="og:locale" content="en_GB" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={city.hero_headline || `Luxury Properties in ${city.name}`} />
        <meta name="twitter:description" content={city.meta_description || description} />
        <meta name="twitter:image" content={heroImage} />
        <meta name="twitter:image:alt" content={`${city.name} - Costa del Sol luxury properties`} />
        
        {/* Hreflang */}
        <link rel="alternate" hrefLang="en-GB" href={`${BASE_URL}/brochure/${city.slug}`} />
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/brochure/${city.slug}`} />
        
        {/* JSON-LD Schema */}
        <script type="application/ld+json">
          {JSON.stringify(brochureSchemas)}
        </script>
      </Helmet>

      <Header variant="transparent" />

      <main className="overflow-hidden">
        <BrochureHero
          city={{ id: city.id, slug: city.slug, name: city.name, heroImage, heroVideoUrl: city.hero_video_url, hero_headline: city.hero_headline, hero_subtitle: city.hero_subtitle }}
          onViewBrochure={scrollToForm}
          onChat={toggleChat}
        />
        <BrochureDescription description={description} cityName={city.name} />
        <InvestmentHighlights cityName={city.name} />
        <LifestyleFeatures cityName={city.name} />
        <BrochureGallery images={galleryImages} features={features} cityName={city.name} />
        <BrochureOptInForm ref={formRef} cityName={city.name} citySlug={city.slug} />
        <CrossCityDiscovery currentCity={city.slug} />
      </main>

      <Footer />
      <BrochureChatbot cityName={city.name} isOpen={chatOpen} onToggle={toggleChat} />

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-24 right-6 z-40 p-3 bg-prime-gold text-prime-950 rounded-full shadow-lg transition-all duration-300 hover:bg-prime-goldDark hover:scale-110 ${showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </>
  );
};

export default CityBrochure;
