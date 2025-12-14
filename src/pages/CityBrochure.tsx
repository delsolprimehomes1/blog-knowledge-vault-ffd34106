import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { BrochureHero } from '@/components/brochures/BrochureHero';
import { BrochureDescription } from '@/components/brochures/BrochureDescription';
import { BrochureGallery } from '@/components/brochures/BrochureGallery';
import { BrochureOptInForm } from '@/components/brochures/BrochureOptInForm';
import { BrochureChatbot } from '@/components/brochures/BrochureChatbot';
import NotFound from './NotFound';
import { Loader2 } from 'lucide-react';

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
  hero_headline: string | null;
  hero_subtitle: string | null;
  description: string | null;
  gallery_images: unknown;
  features: string[];
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
}

// Parse gallery_images from database (handles both old string[] and new GalleryItem[] format)
const parseGalleryImages = (data: unknown): GalleryItem[] => {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map((item) => {
    if (typeof item === 'string') {
      // Legacy format: convert string URL to GalleryItem
      return { title: '', image: item };
    }
    if (typeof item === 'object' && item !== null) {
      return {
        title: (item as GalleryItem).title || '',
        image: (item as GalleryItem).image || '',
      };
    }
    return { title: '', image: '' };
  });
};

const CityBrochure: React.FC = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const formRef = useRef<HTMLElement>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [citySlug]);

  // Fetch city brochure data from database
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

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

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

  // 404 if invalid city or not published
  if (!city || error) {
    return <NotFound />;
  }

  // Get hero image with fallback
  const heroImage = city.hero_image || FALLBACK_IMAGES[city.slug] || FALLBACK_IMAGES.marbella;
  const galleryImages = parseGalleryImages(city.gallery_images);
  const features = city.features || [];
  const description = city.description || `Discover exceptional real estate opportunities in ${city.name}.`;

  const BASE_URL = 'https://www.delsolprimehomes.com';

  return (
    <>
      <Helmet>
        <title>{city.meta_title || `Luxury Properties in ${city.name} | Del Sol Prime Homes`}</title>
        <meta
          name="description"
          content={city.meta_description || `Discover exceptional luxury properties in ${city.name} on the Costa del Sol.`}
        />
        <link rel="canonical" href={`${BASE_URL}/brochure/${city.slug}`} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={city.hero_headline || `Luxury Properties in ${city.name}`} />
        <meta property="og:description" content={city.meta_description || description} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:url" content={`${BASE_URL}/brochure/${city.slug}`} />
        <meta property="og:site_name" content="Del Sol Prime Homes" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={city.hero_headline || `Luxury Properties in ${city.name}`} />
        <meta name="twitter:description" content={city.meta_description || description} />
        <meta name="twitter:image" content={heroImage} />
      </Helmet>

      <Header variant="transparent" />

      <main>
        {/* 1. Hero Section */}
        <BrochureHero
          city={{
            id: city.id,
            slug: city.slug,
            name: city.name,
            heroImage: heroImage,
            hero_headline: city.hero_headline,
            hero_subtitle: city.hero_subtitle,
          }}
          onViewBrochure={scrollToForm}
          onChat={toggleChat}
        />

        {/* 2. City/Property Description */}
        <BrochureDescription description={description} />

        {/* 3. Image Gallery with Features */}
        <BrochureGallery images={galleryImages} features={features} cityName={city.name} />

        {/* 4. Brochure Opt-In Form */}
        <BrochureOptInForm ref={formRef} cityName={city.name} citySlug={city.slug} />
      </main>

      <Footer />

      {/* Floating Chatbot */}
      <BrochureChatbot cityName={city.name} isOpen={chatOpen} onToggle={toggleChat} />
    </>
  );
};

export default CityBrochure;
