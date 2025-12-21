import React from 'react';
import { Helmet } from 'react-helmet';
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
import { generateBuyersGuideSchema, defaultBuyingSteps, defaultFAQs, defaultCosts } from '@/lib/buyersGuideSchemaGenerator';

const BASE_URL = 'https://www.delsolprimehomes.com';

const BuyersGuide: React.FC = () => {
  const schemas = generateBuyersGuideSchema(defaultBuyingSteps, defaultFAQs, defaultCosts, 'en');

  return (
    <>
      <Helmet>
        <title>Complete Buyers Guide to Costa del Sol Property | Del Sol Prime Homes</title>
        <meta name="description" content="Your comprehensive guide to buying property on the Costa del Sol. Step-by-step process, costs, legal requirements, Golden Visa information, and expert advice from local specialists." />
        <link rel="canonical" href={`${BASE_URL}/buyers-guide`} />
        <meta property="og:title" content="Complete Buyers Guide to Costa del Sol Property" />
        <meta property="og:description" content="Everything you need to know about purchasing real estate in Spain's Costa del Sol region. From NIE numbers to Golden Visa requirements." />
        <meta property="og:url" content={`${BASE_URL}/buyers-guide`} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={`${BASE_URL}/assets/costa-del-sol-bg.jpg`} />
        <meta property="og:image:alt" content="Costa del Sol property buying guide" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Complete Buyers Guide to Costa del Sol Property" />
        <meta name="twitter:description" content="Step-by-step guide to buying property in Spain's Costa del Sol" />
        <link rel="alternate" hrefLang="en" href={`${BASE_URL}/buyers-guide`} />
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/buyers-guide`} />
        {schemas.map((schema, index) => (
          <script key={index} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
      </Helmet>

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
