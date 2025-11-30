import React, { useState, useEffect } from 'react';
import { Header } from '../components/home/Header';
import { Footer } from '../components/home/Footer';
import { Hero } from '../components/home/sections/Hero';
import { QuickSearch } from '../components/home/sections/QuickSearch';
import { MiniAbout, USPSection } from '../components/home/sections/ContentBlocks';
import { FeaturedAreas } from '../components/home/sections/FeaturedAreas';
import { Process } from '../components/home/sections/Process';
import { Reviews, BlogTeaser } from '../components/home/sections/ReviewsAndBlog';
import { Section } from '../components/home/ui/Section';
import { Button } from '../components/home/ui/Button';
import { Language } from '../types/home';
import { getStructuredData } from '../constants/home';

function Home() {
  // State for Language - mimicking routing structure
  const [lang, setLang] = useState<Language>(Language.EN);

  // Inject Structured Data (JSON-LD)
  useEffect(() => {
    try {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(getStructuredData());
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    } catch (e) {
      console.error("Error injecting JSON-LD", e);
    }
  }, []);

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
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      
      <Header currentLang={lang} setLang={setLang} />

      <main className="flex-grow">
        
        {/* 1. Hero Section */}
        <Hero lang={lang} />
        
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
        <FeaturedAreas />

        {/* 6. Process */}
        <Process />

        {/* 7. Reviews */}
        <Reviews />

        {/* 8. Blog */}
        <BlogTeaser />

        {/* 9. Final CTA */}
        <Section background="dark" className="text-center relative overflow-hidden">
           {/* Abstract Background Element */}
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-prime-800 via-prime-900 to-prime-950 -z-0"></div>
           <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
           
           <div className="relative z-10 reveal-on-scroll">
             <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6 text-white tracking-tight">Ready to Find Your <span className="text-prime-gold italic">Dream Home?</span></h2>
             <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed">
               Whether you're just starting your search or ready to move forward, our API-accredited advisors are here to guide you — clearly, transparently, and in your language.
             </p>
             <div className="flex flex-col sm:flex-row justify-center gap-6">
               <Button variant="secondary" size="lg" className="shadow-lg shadow-prime-gold/20">Book a 1:1 Call</Button>
               <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white hover:text-prime-900">
                  Tell Us What You're Looking For
               </Button>
             </div>
           </div>
        </Section>

      </main>

      <Footer />

    </div>
  );
}

export default Home;