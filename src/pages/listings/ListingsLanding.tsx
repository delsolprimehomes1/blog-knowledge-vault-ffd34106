import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import ApartmentsHero from '@/components/apartments/ApartmentsHero';
import ApartmentsPropertiesSection from '@/components/apartments/ApartmentsPropertiesSection';
import ApartmentsLeadFormModal from '@/components/apartments/ApartmentsLeadFormModal';
import { Footer } from '@/components/home/Footer';
import LanguageSelector from '@/components/landing/LanguageSelector';
import { LanguageCode } from '@/utils/landing/languageDetection';
import { supabase } from '@/integrations/supabase/client';

const SUPPORTED_LANGS = ['en', 'nl', 'fr', 'de', 'fi', 'pl', 'da', 'hu', 'sv', 'no'];

const VIEW_LISTINGS_TEXT: Record<string, string> = {
  en: 'View Listings', nl: 'Bekijk Woningen', fr: 'Voir les Annonces',
  de: 'Angebote Ansehen', fi: 'Näytä Kohteet', pl: 'Zobacz Oferty',
  da: 'Se Boliger', hu: 'Ingatlanok Megtekintése', sv: 'Visa Bostäder',
  no: 'Se Boliger',
};

const BASE_URL = 'https://www.delsolprimehomes.com';

interface SelectedProperty {
  id: string;
  title: string;
  location: string;
  price: number;
  property_type: string | null;
}

const ListingsLanding: React.FC = () => {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const language = SUPPORTED_LANGS.includes(lang || '') ? lang! : 'en';
  const [selectedProperty, setSelectedProperty] = useState<SelectedProperty | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState('Luxury Costa del Sol Listings | Del Sol Prime Homes');
  const [metaDescription, setMetaDescription] = useState('Find your perfect property on the Costa del Sol.');

  useEffect(() => {
    const fetchPageContent = async () => {
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
    fetchPageContent();
  }, [language]);

  const handlePropertyClick = (property: SelectedProperty) => {
    setSelectedProperty(property);
    setModalOpen(true);
  };

  const canonical = `${BASE_URL}/${language}/listings`;

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        {SUPPORTED_LANGS.map(l => (
          <link key={l} rel="alternate" hrefLang={l} href={`${BASE_URL}/${l}/listings`} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/en/listings`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          "name": "Del Sol Prime Homes",
          "url": canonical,
          "description": metaDescription,
          "areaServed": { "@type": "Place", "name": "Costa del Sol, Spain" },
        })}</script>
      </Helmet>

      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 flex items-center justify-center relative h-16">
          <span className="text-lg sm:text-xl font-serif font-bold tracking-widest text-landing-gold">DELSOLPRIMEHOMES</span>
          <div className="absolute right-4 flex items-center gap-2 sm:gap-3">
            <LanguageSelector currentLang={language as LanguageCode} onLanguageChange={(l) => navigate(`/${l}/listings`)} />
            <button
              onClick={() => document.getElementById('apartments-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-2 bg-landing-gold text-white rounded-lg font-semibold hover:bg-landing-gold/90 transition-colors text-sm"
            >
              {VIEW_LISTINGS_TEXT[language] || 'View Listings'}
            </button>
          </div>
        </div>
      </header>

      <main>
        <ApartmentsHero language={language} />
        <ApartmentsPropertiesSection language={language} onPropertyClick={handlePropertyClick} />
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

export default ListingsLanding;
