import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { getCityBySlug } from '@/constants/brochures';
import { generateBrochureSchemas, generateBrochureMetaTags } from '@/lib/brochureSchemaGenerator';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { BrochureHero } from '@/components/brochures/BrochureHero';
import { LifestyleNarrative } from '@/components/brochures/LifestyleNarrative';
import { InvestmentAppeal } from '@/components/brochures/InvestmentAppeal';
import { PropertyTypesTeaser } from '@/components/brochures/PropertyTypesTeaser';
import { CityGallery } from '@/components/brochures/CityGallery';
import { CrossCityDiscovery } from '@/components/brochures/CrossCityDiscovery';
import { BrochureLeadForm } from '@/components/brochures/BrochureLeadForm';
import NotFound from './NotFound';

const CityBrochure: React.FC = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const city = citySlug ? getCityBySlug(citySlug) : undefined;

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [citySlug]);

  // 404 if invalid city
  if (!city) {
    return <NotFound />;
  }

  const meta = generateBrochureMetaTags(city);
  const schemas = generateBrochureSchemas({ city });

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="keywords" content={meta.keywords} />
        <link rel="canonical" href={meta.canonical} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={meta.ogTitle} />
        <meta property="og:description" content={meta.ogDescription} />
        <meta property="og:image" content={meta.ogImage} />
        <meta property="og:url" content={meta.canonical} />
        <meta property="og:site_name" content="Del Sol Prime Homes" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.ogTitle} />
        <meta name="twitter:description" content={meta.ogDescription} />
        <meta name="twitter:image" content={meta.ogImage} />

        {/* JSON-LD Schemas */}
        <script type="application/ld+json">{schemas}</script>
      </Helmet>

      <Header variant="transparent" />
      
      <main>
        <BrochureHero city={city} />
        <LifestyleNarrative city={city} />
        <InvestmentAppeal city={city} />
        <PropertyTypesTeaser city={city} />
        <CityGallery city={city} />
        <CrossCityDiscovery currentCity={city.slug} />
        <BrochureLeadForm city={city} />
      </main>

      <Footer />
    </>
  );
};

export default CityBrochure;
