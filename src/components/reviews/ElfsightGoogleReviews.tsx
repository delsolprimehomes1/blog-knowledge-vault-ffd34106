import { useEffect } from 'react';

interface ElfsightGoogleReviewsProps {
  language: string;
  className?: string;
}

const WIDGET_IDS: Record<string, string> = {
  en: '4e9c9e21-aeb3-4a2d-97ac-014bfffab99b',
  fr: '8898acc6-d2d5-4b1d-96e4-5a3c29b317da',
  de: 'aa95873f-40c9-4b8a-a930-c887d6afb4c4',
  nl: 'aa95873f-40c9-4b8a-a930-c887d6afb4c4', // Uses same widget as German
  hu: 'b2db4ca0-4bf1-43d3-a6d3-f6dc172297d3',
  no: 'f9ccdb6e-80ea-465f-a496-8335a44ce8a0',
  pl: '83033982-0c67-4e1c-999f-ea74de7798fe',
  sv: '4246a651-3c46-4ecd-852a-2de035a6073a',
  da: 'f10a202e-43af-46b9-9ab3-cd2eeb91aedb',
  fi: '4e9c9e21-aeb3-4a2d-97ac-014bfffab99b', // Uses English widget
};

export const ElfsightGoogleReviews = ({ language, className = '' }: ElfsightGoogleReviewsProps) => {
  const widgetId = WIDGET_IDS[language] || WIDGET_IDS['en'];

  useEffect(() => {
    // Check if Elfsight script already exists
    if (!document.querySelector('script[src*="elfsightcdn"]')) {
      const script = document.createElement('script');
      script.src = 'https://elfsightcdn.com/platform.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div 
      key={widgetId}
      className={`elfsight-app-${widgetId} ${className}`}
      data-elfsight-app-lazy
    />
  );
};

export default ElfsightGoogleReviews;
