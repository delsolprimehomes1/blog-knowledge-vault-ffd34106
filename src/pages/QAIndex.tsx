import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronRight, Sparkles, HelpCircle, BookOpen, TrendingUp, Scale, MapPin, BarChart3, Building } from 'lucide-react';
import BlogEmmaChat from '@/components/blog-article/BlogEmmaChat';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'nl', name: 'Dutch' },
  { code: 'fr', name: 'French' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
];

const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  'Buying Guides': { icon: BookOpen, color: 'bg-blue-500' },
  'Investment Strategies': { icon: TrendingUp, color: 'bg-green-500' },
  'Legal & Regulations': { icon: Scale, color: 'bg-purple-500' },
  'Location Insights': { icon: MapPin, color: 'bg-orange-500' },
  'Market Analysis': { icon: BarChart3, color: 'bg-rose-500' },
  'Property Management': { icon: Building, color: 'bg-cyan-500' },
};

export default function QAIndex() {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isFocused, setIsFocused] = useState(false);

  const { data: qaPages = [], isLoading } = useQuery({
    queryKey: ['published-qa-pages', languageFilter],
    queryFn: async () => {
      let query = supabase
        .from('qa_pages')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (languageFilter !== 'all') {
        query = query.eq('language', languageFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Get unique categories from Q&As
  const categories = useMemo(() => {
    const cats = [...new Set(qaPages.map((qa: any) => qa.category).filter(Boolean))];
    return cats.sort();
  }, [qaPages]);

  // Filter Q&As by search and category
  const filteredQas = useMemo(() => {
    return qaPages.filter((qa: any) => {
      const matchesSearch = 
        qa.question_main.toLowerCase().includes(searchTerm.toLowerCase()) ||
        qa.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || qa.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [qaPages, searchTerm, categoryFilter]);

  // Group Q&As by category
  const qasByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredQas.forEach((qa: any) => {
      const cat = qa.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(qa);
    });
    return grouped;
  }, [filteredQas]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: qaPages.length };
    qaPages.forEach((qa: any) => {
      const cat = qa.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [qaPages]);

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

  return (
    <>
      {/* SEO tags are handled by server/edge - no Helmet needed */}
      <Header variant="transparent" />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-prime-950 via-prime-900 to-prime-800" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          
          {/* Decorative Elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-prime-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-prime-gold/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative">
            {/* Breadcrumb */}
            <nav className="flex items-center text-sm text-white/60 mb-8 animate-fade-in">
              <Link to="/" className="hover:text-prime-gold transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4 mx-2 text-prime-gold/50" />
              <span className="text-white">Q&A</span>
            </nav>

            <div className="text-center max-w-3xl mx-auto">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-prime-gold/20 rounded-2xl mb-6 animate-fade-in-up">
                <HelpCircle className="h-8 w-8 text-prime-gold" />
              </div>

              {/* qa-hero-title class for speakable schema */}
              <h1 className="qa-hero-title text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                Questions &
                <span className="block text-prime-gold">Answers</span>
              </h1>
              
              {/* qa-hero-description class for speakable schema */}
              <p className="qa-hero-description text-lg md:text-xl text-white/70 mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Expert answers to your questions about Costa del Sol real estate, property buying, and Mediterranean lifestyle.
              </p>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className={`relative flex-1 transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-300 ${isFocused ? 'text-prime-gold' : 'text-white/40'}`} />
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={`pl-12 h-14 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-white/40 rounded-xl font-nav transition-all duration-300 ${
                      isFocused 
                        ? 'border-prime-gold/50 shadow-lg shadow-prime-gold/20 bg-white/15' 
                        : 'hover:border-white/30'
                    }`}
                  />
                </div>
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-14 bg-white/10 backdrop-blur-xl border-white/20 text-white rounded-xl font-nav hover:border-white/30 transition-colors">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent className="bg-prime-900 border-white/20 backdrop-blur-xl">
                    <SelectItem value="all" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                      All Languages
                    </SelectItem>
                    {LANGUAGES.map((l) => (
                      <SelectItem 
                        key={l.code} 
                        value={l.code}
                        className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                      >
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Category Tabs */}
        <section className="py-8 border-b border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-5 py-2.5 rounded-full font-nav text-sm font-medium transition-all duration-300 ${
                  categoryFilter === 'all'
                    ? 'bg-prime-gold text-prime-950 shadow-lg shadow-prime-gold/30'
                    : 'bg-white text-muted-foreground hover:bg-prime-gold/10 hover:text-prime-950 border border-border'
                }`}
              >
                All Categories
                <span className="ml-2 px-2 py-0.5 rounded-full bg-prime-950/10 text-xs">
                  {categoryCounts.all || 0}
                </span>
              </button>
              {categories.map((category) => {
                const config = CATEGORY_CONFIG[category as string] || { icon: HelpCircle, color: 'bg-gray-500' };
                const Icon = config.icon;
                return (
                  <button
                    key={category as string}
                    onClick={() => setCategoryFilter(category as string)}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-nav text-sm font-medium transition-all duration-300 ${
                      categoryFilter === category
                        ? 'bg-prime-gold text-prime-950 shadow-lg shadow-prime-gold/30'
                        : 'bg-white text-muted-foreground hover:bg-prime-gold/10 hover:text-prime-950 border border-border'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {category as string}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      categoryFilter === category ? 'bg-prime-950/10' : 'bg-muted'
                    }`}>
                      {categoryCounts[category as string] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Q&A Cards by Category */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden border-0 shadow-lg">
                    <Skeleton className="h-52 w-full" />
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredQas.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">No Q&As Found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filter to find what you're looking for.</p>
              </div>
            ) : categoryFilter === 'all' ? (
              // Show grouped by category when "All" is selected
              <div className="space-y-16">
                {Object.entries(qasByCategory).map(([category, qas]) => {
                  const config = CATEGORY_CONFIG[category] || { icon: HelpCircle, color: 'bg-gray-500' };
                  const Icon = config.icon;
                  return (
                    <div key={category}>
                      {/* Category Header */}
                      <div className="flex items-center gap-4 mb-8">
                        <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-display font-bold text-foreground">{category}</h2>
                          <p className="text-muted-foreground text-sm">{qas.length} {qas.length === 1 ? 'question' : 'questions'}</p>
                        </div>
                      </div>
                      
                      {/* Q&A Cards Grid */}
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {qas.map((qa: any) => (
                          <QACard key={qa.id} qa={qa} lang={lang} stripHtml={stripHtml} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Show flat list when specific category is selected
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {filteredQas.map((qa: any) => (
                  <QACard key={qa.id} qa={qa} lang={lang} stripHtml={stripHtml} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
      
      {/* Emma Chat - Same as landing pages */}
      <BlogEmmaChat language={lang || 'en'} />
    </>
  );
}

// Q&A Card Component
function QACard({ qa, lang, stripHtml }: { qa: any; lang: string; stripHtml: (html: string) => string }) {
  return (
    <Link
      to={`/${lang}/qa/${qa.slug}`}
      className="group block"
    >
      <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
        {qa.featured_image_url && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={qa.featured_image_url}
              alt={qa.featured_image_alt || qa.question_main}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}
        <CardContent className="p-6">
          <h3 className="text-lg font-display font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-prime-gold transition-colors">
            {qa.question_main || qa.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
            {stripHtml(qa.speakable_answer || qa.answer_main || '').substring(0, 150)}...
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {qa.category || 'General'}
            </Badge>
            <Badge variant="outline" className="text-xs uppercase">
              {qa.language}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
