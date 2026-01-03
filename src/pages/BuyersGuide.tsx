import React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { BuyersGuideHero } from '@/components/buyers-guide/BuyersGuideHero';
import { SpeakableIntro } from '@/components/buyers-guide/SpeakableIntro';
import { ProcessTimeline } from '@/components/buyers-guide/ProcessTimeline';
import { CostBreakdown } from '@/components/buyers-guide/CostBreakdown';
import { LegalChecklist } from '@/components/buyers-guide/LegalChecklist';
import { GoldenVisa } from '@/components/buyers-guide/GoldenVisa';
import { BuyersGuideFAQ } from '@/components/buyers-guide/BuyersGuideFAQ';
import { BuyersGuideCTA } from '@/components/buyers-guide/BuyersGuideCTA';

// SEO tags are injected server-side by Cloudflare middleware
// This component focuses on rendering the content only

const BuyersGuide: React.FC = () => {
  const { lang = 'en' } = useParams<{ lang: string }>();

  return (
    <>
      <Header />
      <main>
        <BuyersGuideHero />
        <SpeakableIntro />
        <ProcessTimeline />
        <CostBreakdown />
        <LegalChecklist />
        <GoldenVisa />
        <BuyersGuideFAQ />
        <BuyersGuideCTA />
      </main>
      <Footer />
    </>
  );
};

export default BuyersGuide;
