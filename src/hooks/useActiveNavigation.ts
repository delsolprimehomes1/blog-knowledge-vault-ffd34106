import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ActiveNavState {
  activeRoute: string | null;
  activeSection: string | null;
  isActive: (path: string) => boolean;
  isAnchorActive: (anchor: string) => boolean;
}

const SECTION_IDS = ['areas', 'about', 'guide', 'process', 'reviews'];

export const useActiveNavigation = (): ActiveNavState => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Determine active route
  const activeRoute = location.pathname;

  // Check if a route path is active
  const isActive = (path: string): boolean => {
    if (path === '/') {
      return activeRoute === '/';
    }
    return activeRoute.startsWith(path);
  };

  // Check if an anchor section is active (only on home page)
  const isAnchorActive = (anchor: string): boolean => {
    if (activeRoute !== '/') return false;
    return activeSection === anchor.replace('#', '');
  };

  // Track scroll position for section detection
  useEffect(() => {
    if (activeRoute !== '/') {
      setActiveSection(null);
      return;
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // Offset for header

      // Find which section is currently in view
      let currentSection: string | null = null;
      
      for (const sectionId of SECTION_IDS) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            currentSection = sectionId;
            break;
          }
        }
      }

      setActiveSection(currentSection);
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeRoute]);

  return {
    activeRoute,
    activeSection,
    isActive,
    isAnchorActive,
  };
};
