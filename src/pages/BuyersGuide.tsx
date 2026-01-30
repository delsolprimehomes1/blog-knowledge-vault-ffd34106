import React from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { BuyersGuideHero } from '@/components/buyers-guide/BuyersGuideHero';
import { SpeakableIntro } from '@/components/buyers-guide/SpeakableIntro';
import { ProcessTimeline } from '@/components/buyers-guide/ProcessTimeline';
import { CostBreakdown } from '@/components/buyers-guide/CostBreakdown';
import { LocationShowcase } from '@/components/buyers-guide/LocationShowcase';
import { LegalChecklist } from '@/components/buyers-guide/LegalChecklist';
import { DigitalNomadVisa } from '@/components/buyers-guide/DigitalNomadVisa';
import { BuyersGuideFAQ } from '@/components/buyers-guide/BuyersGuideFAQ';
import { BuyersGuideCTA } from '@/components/buyers-guide/BuyersGuideCTA';
import { useBuyersGuideTranslation } from '@/hooks/useBuyersGuideTranslation';
import BlogEmmaChat from '@/components/blog-article/BlogEmmaChat';
import { Language, AVAILABLE_LANGUAGES } from '@/types/home';

const BASE_URL = 'https://www.delsolprimehomes.com';

const BuyersGuide: React.FC = () => {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const { t, currentLanguage } = useBuyersGuideTranslation();

  return (
    <>
      <Helmet>
        <title>{t.meta.title}</title>
        <meta name="description" content={t.meta.description} />
        <link rel="canonical" href={`${BASE_URL}/${currentLanguage}/buyers-guide`} />
        
        {/* Hreflang tags for all languages */}
        {AVAILABLE_LANGUAGES.map((langInfo) => (
          <link
            key={langInfo.code}
            rel="alternate"
            hrefLang={langInfo.code}
            href={`${BASE_URL}/${langInfo.code}/buyers-guide`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/en/buyers-guide`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={t.meta.title} />
        <meta property="og:description" content={t.meta.description} />
        <meta property="og:locale" content={currentLanguage} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${BASE_URL}/${currentLanguage}/buyers-guide`} />
      </Helmet>

      <Header />
      <main>
        <BuyersGuideHero />
        <SpeakableIntro />
        <ProcessTimeline />
        <CostBreakdown />
        <LocationShowcase />
        <LegalChecklist />
        <DigitalNomadVisa />
        <BuyersGuideFAQ />
        <BuyersGuideCTA />
      </main>
      <Footer />
      <BlogEmmaChat language={lang} />
    </>
  );
};

export default BuyersGuide;
