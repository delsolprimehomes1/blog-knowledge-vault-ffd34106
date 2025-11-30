import React from 'react';

export interface SectionProps {
  children: React.ReactNode;
  background?: 'light' | 'dark' | 'white';
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  background = 'white',
  className = ''
}) => {
  const bgStyles = {
    light: 'bg-slate-50',
    dark: 'bg-prime-950',
    white: 'bg-white'
  };
  
  return (
    <section className={`py-16 md:py-24 px-4 md:px-8 ${bgStyles[background]} ${className}`}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </section>
  );
};