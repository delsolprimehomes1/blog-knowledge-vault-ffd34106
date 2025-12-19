import React, { useEffect } from 'react';
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

function Home() {
  const { t } = useTranslation();

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
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal-on-scroll")
    );

    if (elements.length === 0) return;

    const revealNow = (el: HTMLElement) => {
      el.classList.remove("pending-reveal");
      el.classList.add("visible");
    };

    // Fallback: if IntersectionObserver isn't available, keep everything visible.
    if (typeof IntersectionObserver === "undefined") {
      elements.forEach(revealNow);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealNow(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    // Ensure above-the-fold content never starts hidden.
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const isInInitialViewport = rect.top < window.innerHeight && rect.bottom > 0;

      if (isInInitialViewport) {
        revealNow(el);
        return;
      }

      el.classList.add("pending-reveal");
      observer.observe(el);
    });

    // Safety net: if an in-viewport element somehow remains hidden, reveal it shortly after.
    const safetyTimer = window.setTimeout(() => {
      elements.forEach((el) => {
        if (!el.classList.contains("pending-reveal")) return;
        const rect = el.getBoundingClientRect();
        const isInViewportNow = rect.top < window.innerHeight && rect.bottom > 0;
        if (isInViewportNow) revealNow(el);
      });
    }, 800);

    return () => {
      window.clearTimeout(safetyTimer);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      
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
        <FeaturedAreas />

        {/* 6. Process */}
        <Process />

        {/* 7. Reviews */}
        <Reviews />

        {/* 8. Blog */}
        <BlogTeaser />

        {/* 9. Glossary */}
        <GlossaryTeaser />

        {/* 10. Final CTA */}
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

      </main>

      <Footer />

    </div>
  );
}

export default Home;