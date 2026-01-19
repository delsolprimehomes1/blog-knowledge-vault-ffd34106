import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const locations = [
  {
    name: 'Marbella',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    slug: 'marbella',
    description: 'Luxury capital of the Costa del Sol'
  },
  {
    name: 'Puerto Banús',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
    slug: 'marbella',
    description: 'World-famous marina and nightlife'
  },
  {
    name: 'Estepona',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80',
    slug: 'estepona',
    description: 'The Garden of the Costa del Sol'
  },
  {
    name: 'Fuengirola',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80',
    slug: 'fuengirola',
    description: 'Family-friendly beach town'
  },
  {
    name: 'Benalmádena',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
    slug: 'benalmadena',
    description: 'Marina and charming pueblo'
  },
  {
    name: 'Mijas',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80',
    slug: 'mijas',
    description: 'White village with sea views'
  },
];

export const LocationShowcase: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const animate = () => {
      if (!isPaused && scrollContainer) {
        scrollPosition += scrollSpeed;
        
        // Reset position when we've scrolled half (since we duplicate items)
        if (scrollPosition >= scrollContainer.scrollWidth / 2) {
          scrollPosition = 0;
        }
        
        scrollContainer.scrollLeft = scrollPosition;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  return (
    <section className="py-16 md:py-20 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <div className="flex items-center justify-between">
          <div className="reveal-on-scroll">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-prime-gold/10 border border-prime-gold/20 rounded-full mb-4">
              <MapPin className="w-3 h-3 text-prime-gold" />
              <span className="text-prime-gold text-xs font-semibold tracking-wide uppercase">Explore Locations</span>
            </span>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              Prime Costa del Sol Locations
            </h2>
          </div>
          <Link 
            to="/en/locations"
            className="hidden md:flex items-center gap-2 text-prime-gold font-medium hover:gap-3 transition-all duration-300"
          >
            View all locations
            <span className="text-lg">→</span>
          </Link>
        </div>
      </div>

      {/* Scrolling Gallery */}
      <div 
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="flex gap-6 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ scrollBehavior: 'auto' }}
      >
        {/* Duplicate items for infinite scroll effect */}
        {[...locations, ...locations].map((location, index) => (
          <Link
            key={`${location.slug}-${index}`}
            to={`/en/locations/${location.slug}`}
            className="group relative flex-shrink-0 w-80 h-48 rounded-2xl overflow-hidden"
          >
            {/* Image */}
            <img 
              src={location.image} 
              alt={location.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-prime-900/90 via-prime-900/30 to-transparent" />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-prime-gold" />
                <h3 className="text-xl font-bold text-white group-hover:text-prime-gold transition-colors duration-300">
                  {location.name}
                </h3>
              </div>
              <p className="text-white/70 text-sm">{location.description}</p>
            </div>

            {/* Hover border effect */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-prime-gold/50 transition-colors duration-300" />
          </Link>
        ))}
      </div>

      {/* Mobile CTA */}
      <div className="md:hidden mt-8 text-center">
        <Link 
          to="/en/locations"
          className="inline-flex items-center gap-2 text-prime-gold font-medium"
        >
          View all locations
          <span className="text-lg">→</span>
        </Link>
      </div>
    </section>
  );
};
