import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface VillasHeroProps {
  language: string;
}

interface PageContent {
  headline: string;
  subheadline: string | null;
  cta_text: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1920&q=80';

const VillasHero: React.FC<VillasHeroProps> = ({ language }) => {
  const [content, setContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from('villas_page_content')
        .select('headline, subheadline, cta_text, hero_image_url, hero_image_alt')
        .eq('language', language)
        .eq('is_published', true)
        .single();
      setContent(data);
      setLoading(false);
    };
    fetchContent();
  }, [language]);

  const handleScrollToProperties = () => {
    document.getElementById('properties-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="relative h-screen w-full">
        <Skeleton className="absolute inset-0" />
      </div>
    );
  }

  // Fallback content so the hero never renders blank
  const displayContent = content ?? {
    headline: 'Luxury Villas on the Costa del Sol',
    subheadline: 'Discover handpicked villas in Marbella, Estepona, Benahavís and more.',
    cta_text: 'View Villas',
    hero_image_url: FALLBACK_IMAGE,
    hero_image_alt: 'Luxury villa Costa del Sol',
  };

  const heroImage = displayContent.hero_image_url?.startsWith('http')
    ? displayContent.hero_image_url
    : FALLBACK_IMAGE;

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 leading-tight"
        >
          {displayContent.headline}
        </motion.h1>

        {displayContent.subheadline && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto"
          >
            {displayContent.subheadline}
          </motion.p>
        )}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          onClick={handleScrollToProperties}
          className="px-8 py-4 bg-landing-gold text-white rounded-lg font-bold text-lg hover:bg-landing-goldDark transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        >
          {displayContent.cta_text || 'View Villas'}
        </motion.button>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <button
          onClick={handleScrollToProperties}
          className="text-white/70 hover:text-white transition-colors"
          aria-label="Scroll to properties"
        >
          <ChevronDown size={32} />
        </button>
      </motion.div>
    </section>
  );
};

export default VillasHero;
