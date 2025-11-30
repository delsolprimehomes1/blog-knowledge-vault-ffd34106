import React from 'react';
import { Star, ArrowRight, Calendar } from 'lucide-react';
import { Section } from '../ui/Section';
import { LATEST_POSTS } from '../../../constants/home';

export const Reviews: React.FC = () => {
  const reviews = [
    {
      name: 'Sophie M.',
      country: 'Belgium',
      rating: 5,
      text: 'As a first-time buyer from abroad, I was overwhelmed. The team explained everything in Dutch, helped me understand the legal process, and their AI tool confirmed the property was fairly priced. I couldn\'t have done it without them.'
    },
    {
      name: 'Lars P.',
      country: 'Sweden',
      rating: 5,
      text: 'Professional, transparent, and incredibly patient with all my questions. They went above and beyond to ensure I understood every step. Highly recommended!'
    },
    {
      name: 'Emma K.',
      country: 'UK',
      rating: 5,
      text: 'The AI valuation tool gave me confidence I was making a smart investment. Their after-sales support has been exceptional—they even helped set up my utilities and community fees.'
    }
  ];

  return (
    <Section background="white">
      <div className="text-center mb-16 reveal-on-scroll">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-prime-950 mb-4">
          What Our <span className="text-prime-gold italic">Clients Say</span>
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Real stories from real people who found their dream homes with us.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {reviews.map((review, index) => (
          <div 
            key={index}
            className={`bg-slate-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 reveal-on-scroll stagger-${index + 1}`}
          >
            <div className="flex items-center mb-4">
              {[...Array(review.rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-prime-gold text-prime-gold" />
              ))}
            </div>
            <p className="text-slate-700 mb-6 leading-relaxed italic">"{review.text}"</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-prime-950">{review.name}</p>
                <p className="text-sm text-slate-500">{review.country}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

export const BlogTeaser: React.FC = () => {
  return (
    <Section background="light">
      <div className="text-center mb-16 reveal-on-scroll">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-prime-950 mb-4">
          <span className="text-prime-gold italic">Latest Insights</span> from Our Blog
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Stay informed with expert advice on Costa del Sol real estate, legal tips, and market trends.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {LATEST_POSTS.map((post, index) => (
          <a 
            key={post.id}
            href={`/blog/${post.id}`}
            className={`group block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden reveal-on-scroll stagger-${index + 1}`}
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            <div className="p-6">
              <div className="flex items-center text-sm text-slate-500 mb-3">
                <Calendar className="w-4 h-4 mr-2" />
                {post.date}
              </div>
              <h3 className="text-xl font-bold text-prime-950 mb-3 group-hover:text-prime-gold transition-colors">
                {post.title}
              </h3>
              <p className="text-slate-600 mb-4 leading-relaxed">{post.excerpt}</p>
              <div className="flex items-center text-prime-gold group-hover:text-prime-goldDark transition-colors">
                <span className="font-medium">Read More</span>
                <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="text-center mt-12">
        <a 
          href="/blog"
          className="inline-flex items-center space-x-2 px-8 py-4 bg-prime-900 text-white rounded-lg hover:bg-prime-800 transition-colors font-medium shadow-lg"
        >
          <span>View All Articles</span>
          <ArrowRight className="w-5 h-5" />
        </a>
      </div>
    </Section>
  );
};