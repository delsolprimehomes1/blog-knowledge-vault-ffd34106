import React, { useEffect } from 'react';
import { useTranslation } from '../i18n';
import { Header } from '../components/home/Header';
import { Footer } from '../components/home/Footer';
import { LanguageSuggestionBanner } from '../components/LanguageSuggestionBanner';
import { Hero } from '../components/home/sections/Hero';
import { WhyChooseUs } from '../components/home/sections/WhyChooseUs';
import { QuickSearch } from '../components/home/sections/QuickSearch';
import { MiniAbout, USPSection } from '../components/home/sections/ContentBlocks';
import { FeaturedAreas } from '../components/home/sections/FeaturedAreas';
import { Process } from '../components/home/sections/Process';
import { Reviews, BlogTeaser, GlossaryTeaser } from '../components/home/sections/ReviewsAndBlog';
import { Section } from '../components/home/ui/Section';
import { Button } from '../components/home/ui/Button';
import BlogEmmaChat from '../components/blog-article/BlogEmmaChat';

function Home() {
  const { t, currentLanguage } = useTranslation();

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
      {/* SEO tags are handled by server/edge (SSG) - no Helmet needed */}
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <Header />

      <main className="flex-grow">
        
        {/* 1. Hero Section */}
        <Hero />
        
        {/* 2. Why Choose Us - Moved content from Hero */}
        <WhyChooseUs />
        
        {/* 3 & 4. Quick Search & Mini About */}
        <div className="relative z-20">
          <QuickSearch />
          <div className="mt-0">
            <MiniAbout />
          </div>
        </div>

        {/* 5. USPs */}
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
               <Button 
                 variant="secondary" 
                 size="lg" 
                 className="shadow-lg shadow-prime-gold/20"
                 onClick={() => window.dispatchEvent(new CustomEvent('openEmmaChat'))}
               >
                 {t.finalCta.ctaPrimary}
               </Button>
                <a 
                  href="https://wa.me/34630039090?text=Hi,%20I'm%20interested%20in%20Costa%20del%20Sol%20properties"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).gtag) {
                      (window as any).gtag('event', 'whatsapp_click', { 
                        category: 'Contact', 
                        location: 'homepage_final_cta' 
                      });
                    }
                  }}
                >
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="border-white/30 text-white hover:bg-white hover:text-prime-900"
                  >
                    {t.finalCta.ctaSecondary}
                  </Button>
                </a>
             </div>
           </div>
        </Section>
        </div>

      </main>

      <Footer />
      <LanguageSuggestionBanner />
      <BlogEmmaChat language={currentLanguage} />
    </div>
    </>
  );
}

export default Home;
