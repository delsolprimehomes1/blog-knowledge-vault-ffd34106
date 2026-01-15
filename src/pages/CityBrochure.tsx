import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { BrochureHero } from '@/components/brochures/BrochureHero';
import { BrochureDescription } from '@/components/brochures/BrochureDescription';
import { InvestmentHighlights } from '@/components/brochures/InvestmentHighlights';
import { LifestyleFeatures } from '@/components/brochures/LifestyleFeatures';

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
  // i18n fields
  hero_headline_i18n: Record<string, string> | null;
  hero_subtitle_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  features_i18n: Record<string, string[]> | null;
  ai_hero_image: string | null;
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
  // Extract both lang and citySlug from URL params
  const { lang, citySlug } = useParams<{ lang: string; citySlug: string }>();
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

  // Helper to get localized content with fallback
  const getLocalized = (i18n: Record<string, any> | null | undefined, fallback: any) => {
    if (!i18n) return fallback;
    return i18n[lang] || i18n['en'] || fallback;
  };

  const heroImage = city.ai_hero_image || city.hero_image || FALLBACK_IMAGES[city.slug] || FALLBACK_IMAGES.marbella;
  
  const features = getLocalized(city.features_i18n, city.features) || [];
  const description = getLocalized(city.description_i18n, city.description) || `Discover exceptional real estate opportunities in ${city.name}.`;
  const heroHeadline = getLocalized(city.hero_headline_i18n, city.hero_headline);
  const heroSubtitle = getLocalized(city.hero_subtitle_i18n, city.hero_subtitle);

  // SEO is now handled server-side by Cloudflare middleware
  // No Helmet needed - server injects: title, meta, canonical, 11 hreflang tags, OG tags

  return (
    <>
      <Header variant="transparent" />

      <main className="overflow-hidden">
        <BrochureHero
          city={{ 
            id: city.id, 
            slug: city.slug, 
            name: city.name, 
            heroImage, 
            heroVideoUrl: city.hero_video_url, 
            hero_headline: heroHeadline, 
            hero_subtitle: heroSubtitle 
          }}
          onViewBrochure={scrollToForm}
          onChat={toggleChat}
        />
        <BrochureDescription description={description} cityName={city.name} />
        <InvestmentHighlights cityName={city.name} />
        <LifestyleFeatures cityName={city.name} />
        
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
