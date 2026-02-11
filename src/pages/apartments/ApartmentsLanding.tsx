import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import ApartmentsHero from '@/components/apartments/ApartmentsHero';
import ApartmentsPropertiesSection from '@/components/apartments/ApartmentsPropertiesSection';
import ApartmentsLeadFormModal from '@/components/apartments/ApartmentsLeadFormModal';
import ExplainerVideo from '@/components/landing/ExplainerVideo';
import Footer from '@/components/landing/Footer';
import LanguageSelector from '@/components/landing/LanguageSelector';
import { LanguageCode } from '@/utils/landing/languageDetection';
import { supabase } from '@/integrations/supabase/client';

const ELFSIGHT_WIDGET_IDS: Record<string, string> = {
  en: '8f5b53be-f92c-42fa-9856-7a85dc633bb6',
  nl: '64aac0ee-d23b-45a3-aff4-86e89ffd2002',
  fr: 'a9e5dd69-b93f-41e8-a35e-f35e84c7f09b',
  de: '8c33eff5-c6a0-49f4-b77f-ae4d38e9bed4',
  fi: '18e2acb6-37ba-4939-b866-fc3a05c5eb58',
  pl: '6bbd06c7-0a7c-4c56-b066-64bd8804c1fb',
  da: '83c0d75b-e39c-4ea9-a6a2-9ff5ff8c831f',
  hu: '3c7584ed-c12f-4681-b0c5-6cf7aacf1c2f',
  sv: 'f18d3b36-a41a-4e85-a83a-f5ec3cf2dbf0',
  no: 'e6f96bd7-3e3b-4a1f-9a34-7c1cbf4e3a9e',
};

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
  const [metaTitle, setMetaTitle] = useState('Luxury Costa del Sol Apartments | Del Sol Prime Homes');
  const [metaDescription, setMetaDescription] = useState('Find your perfect apartment on the Costa del Sol.');

  const widgetId = ELFSIGHT_WIDGET_IDS[language] || ELFSIGHT_WIDGET_IDS.en;

  useEffect(() => {
    const fetchMeta = async () => {
      const { data } = await supabase
        .from('apartments_page_content')
        .select('meta_title, meta_description')
        .eq('language', language)
        .eq('is_published', true)
        .single();
      if (data) {
        if (data.meta_title) setMetaTitle(data.meta_title);
        if (data.meta_description) setMetaDescription(data.meta_description);
      }
    };
    fetchMeta();
  }, [language]);

  useEffect(() => {
    if (!document.querySelector('script[src*="elfsightcdn"]')) {
      const script = document.createElement('script');
      script.src = 'https://elfsightcdn.com/platform.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePropertyClick = (property: SelectedProperty) => {
    setSelectedProperty(property);
    setModalOpen(true);
  };

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

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <img
            src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
            alt="Del Sol Prime Homes"
            className="h-10"
          />
          <div className="flex items-center gap-4">
            <LanguageSelector currentLang={language as LanguageCode} />
            <button
              onClick={() => document.getElementById('properties-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:inline-flex px-4 py-2 bg-landing-gold text-white rounded-lg font-semibold hover:bg-landing-goldDark transition-colors text-sm"
            >
              View Properties
            </button>
          </div>
        </div>
      </header>

      <main>
        <ApartmentsHero language={language} />
        <ExplainerVideo language={language} />
        <ApartmentsPropertiesSection language={language} onPropertyClick={handlePropertyClick} />

        {/* Google Reviews */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-landing-navy text-center mb-12">
              What Our Clients Say
            </h2>
            <div key={widgetId} className={`elfsight-app-${widgetId}`} data-elfsight-app-lazy />
          </div>
        </section>
      </main>

      <Footer />

      <ApartmentsLeadFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        property={selectedProperty}
        language={language}
      />
    </>
  );
};

export default ApartmentsLanding;
