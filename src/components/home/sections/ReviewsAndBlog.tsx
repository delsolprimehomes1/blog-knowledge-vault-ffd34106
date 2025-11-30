import React from 'react';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { LATEST_POSTS } from '../../../constants/home';
import { Star, Quote, ArrowRight } from 'lucide-react';

export const Reviews: React.FC = () => {
  return (
    <Section className="bg-slate-50 relative">
      <div className="text-center mb-16 reveal-on-scroll">
        <h2 className="text-4xl font-serif font-bold text-prime-900 mb-6">What Our Clients Say</h2>
        <div className="flex justify-center gap-1 mb-4">
            {[1,2,3,4,5].map(i => <Star key={i} size={28} className="fill-prime-gold text-prime-gold" />)}
        </div>
        <p className="text-slate-500 font-medium">Real words from real buyers who trusted us with one of the most important decisions of their lives.</p>
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
        <Button variant="outline">Read All Reviews</Button>
      </div>
    </Section>
  );
};

export const BlogTeaser: React.FC = () => {
  return (
    <Section background="white">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 reveal-on-scroll">
        <div>
          <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">Knowledge Base</span>
          <h2 className="text-4xl font-serif font-bold text-prime-900 mb-4">Insights & Guides for Foreign Buyers</h2>
          <p className="text-slate-600 font-light text-lg max-w-2xl">Learn more about taxes, legal processes, market trends, and everything you need to make a safe and well-informed decision.</p>
        </div>
        <Button variant="ghost" className="hidden md:flex text-prime-gold font-bold group">
           Visit the Blog <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {LATEST_POSTS.map((post, idx) => (
          <article key={post.id} className={`bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col h-full group reveal-on-scroll stagger-${idx + 1}`}>
            <div className="h-56 overflow-hidden relative">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-bold text-prime-900 uppercase tracking-wider shadow-sm">
                  {post.date}
                </div>
            </div>
            <div className="p-8 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-prime-900 mb-4 group-hover:text-prime-gold transition-colors cursor-pointer leading-tight">{post.title}</h3>
              <p className="text-slate-600 text-sm mb-6 flex-1 font-light leading-relaxed">{post.excerpt}</p>
              <a href={`/blog/${post.id}`} className="text-prime-900 font-bold text-sm hover:text-prime-gold transition-colors mt-auto flex items-center gap-2 group/link">
                Read Article <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
              </a>
            </div>
          </article>
        ))}
      </div>
      
       <div className="mt-12 md:hidden text-center reveal-on-scroll">
        <Button variant="ghost" className="text-prime-gold font-bold">
          Visit the Blog
        </Button>
      </div>
    </Section>
  );
};