import React from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { Star, Quote, ArrowRight, Book, Scale, Home, Laptop, Wallet } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const Reviews: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Section className="bg-slate-50 relative">
      <div className="text-center mb-16 reveal-on-scroll">
        <h2 className="text-4xl font-serif font-bold text-prime-900 mb-6">{t.reviews.headline}</h2>
        <div className="flex justify-center gap-1 mb-4">
            {[1,2,3,4,5].map(i => <Star key={i} size={28} className="fill-prime-gold text-prime-gold" />)}
        </div>
        <p className="text-slate-500 font-medium">{t.reviews.description}</p>
      </div>

      {/* Elfsight Placeholder - Styled */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-80 flex items-center justify-center mb-10 max-w-4xl mx-auto relative overflow-hidden group reveal-on-scroll">
        <Quote className="absolute top-8 left-8 text-slate-100 w-24 h-24 -z-0" />
        <div className="text-center text-slate-400 relative z-10 p-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
             <span className="text-2xl font-serif text-slate-300">G</span>
          </div>
          <p className="font-medium text-slate-600 mb-2">Google Reviews Widget Integration</p>
          <p className="text-xs bg-slate-100 px-3 py-1 rounded-full inline-block">Client-side Script Placeholder</p>
        </div>
      </div>

      <div className="text-center reveal-on-scroll">
        <a 
          href="https://www.google.com/search?sca_esv=ab4b4c8b17b2f68e&rlz=1C1FHFK_esES1176ES1176&sxsrf=ANbL-n6cwHuTgRtfDEJAzE8AcYPESuO9sA:1769744919200&kgmid=/g/11zj8zmh9b&q=DelSolPrimeHomes&shem=bdsle,ptotple,shrtsdl&shndl=30&source=sh/x/loc/uni/m1/1&kgs=3deac8e88e622d63&utm_source=bdsle,ptotple,shrtsdl,sh/x/loc/uni/m1/1"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline">{t.reviews.cta}</Button>
        </a>
      </div>
    </Section>
  );
};

export const BlogTeaser: React.FC = () => {
  const { t } = useTranslation();
  
  // Fetch 3 most recent published English articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ['homepage-blog-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, meta_description, featured_image_url, date_published')
        .eq('status', 'published')
        .eq('language', 'en')
        .order('date_published', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return '';
    }
  };
  
  return (
    <Section background="white">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 reveal-on-scroll">
        <div>
          <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">{t.blogTeaser.eyebrow}</span>
          <h2 className="text-4xl font-serif font-bold text-prime-900 mb-4">{t.blogTeaser.headline}</h2>
          <p className="text-slate-600 font-light text-lg max-w-2xl">{t.blogTeaser.description}</p>
        </div>
        <Link to="/blog" className="hidden md:flex">
          <Button variant="ghost" className="text-prime-gold font-bold group">
            {t.blogTeaser.cta} <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {isLoading ? (
          // Loading skeleton
          [1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
              <div className="h-56 bg-slate-200" />
              <div className="p-8">
                <div className="h-6 bg-slate-200 rounded mb-4" />
                <div className="h-4 bg-slate-100 rounded mb-2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))
        ) : articles && articles.length > 0 ? (
          articles.map((article, idx) => (
            <article key={article.id} className={`bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col h-full group reveal-on-scroll stagger-${idx + 1}`}>
              <div className="h-56 overflow-hidden relative">
                <img 
                  src={article.featured_image_url} 
                  alt={article.headline} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-bold text-prime-900 uppercase tracking-wider shadow-sm">
                  {formatDate(article.date_published)}
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-prime-900 mb-4 group-hover:text-prime-gold transition-colors cursor-pointer leading-tight">{article.headline}</h3>
                <p className="text-slate-600 text-sm mb-6 flex-1 font-light leading-relaxed line-clamp-3" style={{ lineHeight: '1.75' }}>{article.meta_description}</p>
                <Link to={`/en/blog/${article.slug}`} className="text-prime-900 font-bold text-sm hover:text-prime-gold transition-colors mt-auto flex items-center gap-2 group/link">
                  {t.blogTeaser.readArticle} <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-3 text-center py-12 text-slate-500">
            No articles available yet.
          </div>
        )}
      </div>
      
       <div className="mt-12 md:hidden text-center reveal-on-scroll">
        <Link to="/blog">
          <Button variant="ghost" className="text-prime-gold font-bold">
            {t.blogTeaser.cta}
          </Button>
        </Link>
      </div>
    </Section>
  );
};

const FEATURED_TERMS = [
  { term: "NIE", icon: Scale, description: "Tax identification number required for all property transactions in Spain." },
  { term: "Digital Nomad Visa", icon: Laptop, description: "Spanish visa for remote workers earning €2,520+/month from non-Spanish clients." },
  { term: "IBI", icon: Home, description: "Annual property tax (Impuesto sobre Bienes Inmuebles) paid to local councils." },
  { term: "Escritura", icon: Book, description: "Official public deed signed before a notary when purchasing property." },
];

export const GlossaryTeaser: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Section background="light" className="relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-prime-100/50 via-transparent to-transparent" />
      
      <div className="relative z-10">
        <div className="text-center mb-16 reveal-on-scroll">
          <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">
            {t.glossaryTeaser?.eyebrow || "Essential Terms"}
          </span>
          <h2 className="text-4xl font-serif font-bold text-prime-900 mb-4">
            {t.glossaryTeaser?.headline || "Understand Spanish Property Terminology"}
          </h2>
          <p className="text-slate-600 font-light text-lg max-w-2xl mx-auto">
            {t.glossaryTeaser?.description || "Navigate the buying process with confidence. Our glossary explains NIE numbers, taxes, legal terms, and everything you need to know."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {FEATURED_TERMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.term} 
                to={`/glossary#${item.term.toLowerCase().replace(/\s+/g, '-')}`}
                className={`group bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2 transition-all duration-500 reveal-on-scroll stagger-${idx + 1}`}
              >
                <div className="w-12 h-12 rounded-xl bg-prime-50 flex items-center justify-center mb-4 group-hover:bg-prime-gold group-hover:text-white transition-colors duration-300">
                  <Icon size={24} className="text-prime-gold group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-prime-900 mb-2 group-hover:text-prime-gold transition-colors">
                  {item.term}
                </h3>
                <p className="text-slate-600 text-sm font-light leading-relaxed">
                  {item.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-prime-gold text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ArrowRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center reveal-on-scroll">
          <Link to="/glossary">
            <Button variant="primary" size="lg" className="group">
              {t.glossaryTeaser?.cta || "Explore Full Glossary"} 
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
};
