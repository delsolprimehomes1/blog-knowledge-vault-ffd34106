import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import ApartmentsHero from '@/components/apartments/ApartmentsHero';
import ApartmentsPropertiesSection from '@/components/apartments/ApartmentsPropertiesSection';
import ApartmentsLeadFormModal from '@/components/apartments/ApartmentsLeadFormModal';
import AutoplayVideo from '@/components/landing/AutoplayVideo';
import EmmaSection from '@/components/landing/EmmaSection';
import EmmaChat from '@/components/landing/EmmaChat';
import { Footer } from '@/components/home/Footer';
import LanguageSelector from '@/components/landing/LanguageSelector';
import { LanguageCode } from '@/utils/landing/languageDetection';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle } from 'lucide-react';

const SUPPORTED_LANGS = ['en', 'nl', 'fr', 'de', 'fi', 'pl', 'da', 'hu', 'sv', 'no'];

interface SelectedProperty {
  id: string;
  title: string;
  location: string;
  price: number;
  property_type: string | null;
}

const ApartmentsLanding: React.FC = () => {
  const { lang } = useParams<{ lang: string }>();
  const language = SUPPORTED_LANGS.includes(lang || '') ? lang! : 'en';
  const [selectedProperty, setSelectedProperty] = useState<SelectedProperty | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEmmaOpen, setIsEmmaOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState('Luxury Costa del Sol Apartments | Del Sol Prime Homes');
  const [metaDescription, setMetaDescription] = useState('Find your perfect apartment on the Costa del Sol.');
  const [widgetId, setWidgetId] = useState('');

  useEffect(() => {
    const fetchPageContent = async () => {
      const { data } = await supabase
        .from('apartments_page_content')
        .select('meta_title, meta_description, elfsight_embed_code, reviews_enabled')
        .eq('language', language)
        .eq('is_published', true)
        .single();
      if (data) {
        if (data.meta_title) setMetaTitle(data.meta_title);
        if (data.meta_description) setMetaDescription(data.meta_description);
        if (data.reviews_enabled && data.elfsight_embed_code) {
          const match = data.elfsight_embed_code.match(/elfsight-app-([a-f0-9-]+)/);
          if (match) setWidgetId(match[1]);
        }
      }
    };
    fetchPageContent();
  }, [language]);

  // Load Elfsight platform script
  useEffect(() => {
    if (!widgetId) return;
    if (!document.querySelector('script[src*="elfsightcdn"]')) {
      const script = document.createElement('script');
      script.src = 'https://elfsightcdn.com/platform.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [widgetId]);

  // Listen for openEmmaChat events
  useEffect(() => {
    const handleOpenEmma = () => setIsEmmaOpen(true);
    window.addEventListener('openEmmaChat', handleOpenEmma);
    return () => window.removeEventListener('openEmmaChat', handleOpenEmma);
  }, []);

  const handlePropertyClick = (property: SelectedProperty) => {
    setSelectedProperty(property);
    setModalOpen(true);
  };

  const openEmma = () => setIsEmmaOpen(true);

  const canonical = `https://blog-knowledge-vault.lovable.app/${language}/apartments`;

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        {SUPPORTED_LANGS.map(l => (
          <link key={l} rel="alternate" hrefLang={l} href={`https://blog-knowledge-vault.lovable.app/${l}/apartments`} />
        ))}
        <link rel="alternate" hrefLang="x-default" href="https://blog-knowledge-vault.lovable.app/en/apartments" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          "name": "Del Sol Prime Homes",
          "url": canonical,
          "description": metaDescription,
          "areaServed": { "@type": "Place", "name": "Costa del Sol, Spain" },
        })}</script>
      </Helmet>

      {/* Fixed Header - matching landing page glass style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <img
            src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
            alt="Del Sol Prime Homes"
            className="h-10"
          />
          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageSelector currentLang={language as LanguageCode} />
            <button
              onClick={() => document.getElementById('properties-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:inline-flex px-4 py-2 bg-transparent text-landing-navy border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm"
            >
              View Properties
            </button>
            <button
              onClick={openEmma}
              className="inline-flex items-center gap-2 px-4 py-2 bg-landing-gold text-white rounded-lg font-semibold hover:bg-landing-goldDark transition-colors text-sm"
            >
              <MessageCircle size={16} />
              <span className="hidden sm:inline">Speak with Emma</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <ApartmentsHero language={language} />
        <AutoplayVideo language={language} onOpenEmmaChat={openEmma} />
        <EmmaSection onStartChat={openEmma} />
        <ApartmentsPropertiesSection language={language} onPropertyClick={handlePropertyClick} />

        {/* Google Reviews */}
        {widgetId && (
          <section className="py-20 bg-muted">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground text-center mb-12">
                What Our Clients Say
              </h2>
              <div key={widgetId} className={`elfsight-app-${widgetId}`} data-elfsight-app-lazy />
            </div>
          </section>
        )}
      </main>

      <Footer />

      <ApartmentsLeadFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        property={selectedProperty}
        language={language}
      />

      <EmmaChat
        isOpen={isEmmaOpen}
        onClose={() => setIsEmmaOpen(false)}
        language={language}
      />
    </>
  );
};

export default ApartmentsLanding;
