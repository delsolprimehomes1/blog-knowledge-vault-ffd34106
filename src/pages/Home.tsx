import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { HomeHreflangTags } from '../components/HomeHreflangTags';
import { useTranslation } from '../i18n';
import { Header } from '../components/home/Header';
import { Footer } from '../components/home/Footer';
import { Hero } from '../components/home/sections/Hero';
import { QuickSearch } from '../components/home/sections/QuickSearch';
import { MiniAbout, USPSection } from '../components/home/sections/ContentBlocks';
import { FeaturedAreas } from '../components/home/sections/FeaturedAreas';
import { Process } from '../components/home/sections/Process';
import { Reviews, BlogTeaser, GlossaryTeaser } from '../components/home/sections/ReviewsAndBlog';
import { Section } from '../components/home/ui/Section';
import { Button } from '../components/home/ui/Button';
import { getStructuredData } from '../constants/home';

const BASE_URL = 'https://www.delsolprimehomes.com';

function Home() {
  const { t } = useTranslation();

  // JSON-LD is now injected via Helmet above

  // Intersection Observer for Animations
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    
    // We do NOT hide elements immediately to ensure content is always visible.
    // Instead, we let the observer handle the 'visible' class if it works.
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('pending-reveal');
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); 
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    elements.forEach(el => {
      // Only apply 'pending-reveal' (opacity 0) if we are sure we are observing it
      el.classList.add('pending-reveal');
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <HomeHreflangTags />
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>Del Sol Prime Homes | Luxury Costa del Sol Real Estate</title>
        <meta name="title" content="Del Sol Prime Homes | Luxury Costa del Sol Real Estate" />
        <meta name="description" content="Premium real estate agency specializing in Costa del Sol properties. Expert guidance for buying luxury villas, apartments, and investment properties in Marbella, Estepona, and more." />
        <meta name="keywords" content="Costa del Sol real estate, Marbella properties, Estepona villas, Spanish property investment, luxury homes Spain" />
        <meta name="author" content="Del Sol Prime Homes" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={BASE_URL} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={BASE_URL} />
        <meta property="og:title" content="Del Sol Prime Homes | Luxury Costa del Sol Real Estate" />
        <meta property="og:description" content="Premium real estate agency specializing in Costa del Sol properties. Expert guidance for buying luxury villas, apartments, and investment properties." />
        <meta property="og:image" content={`${BASE_URL}/assets/logo-new.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Del Sol Prime Homes - Costa del Sol Real Estate" />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        <meta property="og:locale" content="en_GB" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={BASE_URL} />
        <meta name="twitter:title" content="Del Sol Prime Homes | Luxury Costa del Sol Real Estate" />
        <meta name="twitter:description" content="Premium real estate agency specializing in Costa del Sol properties." />
        <meta name="twitter:image" content={`${BASE_URL}/assets/logo-new.png`} />
        <meta name="twitter:image:alt" content="Del Sol Prime Homes - Costa del Sol Real Estate" />
        
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(getStructuredData())}
        </script>
      </Helmet>
      
      <Header />

      <main className="flex-grow">
        
        {/* 1. Hero Section */}
        <Hero />
        
        {/* 2 & 3. Quick Search (overlaps Hero) & Mini About */}
        <div className="relative z-20">
          <QuickSearch />
          <div className="mt-0">
            <MiniAbout />
          </div>
        </div>

        {/* 4. USPs */}
        <USPSection />

        {/* 5. Featured Areas */}
        <div id="areas">
          <FeaturedAreas />
        </div>

        {/* 6. Process (Buyer's Guide) */}
        <div id="guide">
          <Process />
        </div>

        {/* 7. Reviews */}
        <Reviews />

        {/* 8. Blog */}
        <BlogTeaser />

        {/* 9. Glossary */}
        <GlossaryTeaser />

        {/* 10. Final CTA (Contact) */}
        <div id="contact">
        <Section background="dark" className="text-center relative overflow-hidden">
           {/* Abstract Background Element */}
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-prime-800 via-prime-900 to-prime-950 -z-0"></div>
           <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
           
           <div className="relative z-10 reveal-on-scroll">
             <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6 text-white tracking-tight">{t.finalCta.headline} <span className="text-prime-gold italic">{t.finalCta.headlineHighlight}</span></h2>
             <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed">
               {t.finalCta.description}
             </p>
             <div className="flex flex-col sm:flex-row justify-center gap-6">
               <Button variant="secondary" size="lg" className="shadow-lg shadow-prime-gold/20">{t.finalCta.ctaPrimary}</Button>
               <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white hover:text-prime-900">
                  {t.finalCta.ctaSecondary}
               </Button>
             </div>
           </div>
        </Section>
        </div>

      </main>

      <Footer />

    </div>
    </>
  );
}

export default Home;