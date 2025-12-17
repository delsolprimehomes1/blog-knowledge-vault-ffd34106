import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronRight, Sparkles, HelpCircle } from 'lucide-react';

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

export default function FAQIndex() {
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [isFocused, setIsFocused] = useState(false);

  const { data: faqPages = [], isLoading } = useQuery({
    queryKey: ['published-faq-pages', languageFilter],
    queryFn: async () => {
      let query = supabase
        .from('faq_pages')
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

  const filteredFaqs = faqPages.filter((faq: any) =>
    faq.question_main.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

  return (
    <>
      <Helmet>
        <title>Frequently Asked Questions | Del Sol Prime Homes</title>
        <meta
          name="description"
          content="Find answers to common questions about buying property in Costa del Sol, Spain. Expert advice on real estate, legal processes, and lifestyle."
        />
        <link rel="canonical" href="https://www.delsolprimehomes.com/faq" />
      </Helmet>

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
              <span className="text-white">FAQ</span>
            </nav>

            <div className="text-center max-w-3xl mx-auto">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-prime-gold/20 rounded-2xl mb-6 animate-fade-in-up">
                <HelpCircle className="h-8 w-8 text-prime-gold" />
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                Frequently Asked
                <span className="block text-prime-gold">Questions</span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/70 mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
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
                    {LANGUAGES.map((lang) => (
                      <SelectItem 
                        key={lang.code} 
                        value={lang.code}
                        className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                      >
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Cards Grid */}
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
            ) : filteredFaqs.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">No FAQs Found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filter to find what you're looking for.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {filteredFaqs.map((faq: any, index: number) => (
                  <Link 
                    key={faq.id} 
                    to={`/faq/${faq.slug}`}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <Card className="overflow-hidden h-full border-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-all duration-500 hover:-translate-y-2 group">
                      {faq.featured_image_url && (
                        <div className="relative h-52 overflow-hidden">
                          <img
                            src={faq.featured_image_url}
                            alt={faq.featured_image_alt || faq.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-prime-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          
                          {/* Badges */}
                          <div className="absolute top-4 left-4 flex gap-2">
                            <Badge className="bg-white/95 backdrop-blur-sm text-prime-950 border-0 shadow-sm px-3 py-1 font-nav text-xs font-semibold">
                              {faq.language.toUpperCase()}
                            </Badge>
                            <Badge
                              className={`backdrop-blur-sm border-0 shadow-sm px-3 py-1 font-nav text-xs font-semibold ${
                                faq.faq_type === 'core' 
                                  ? 'bg-prime-gold text-prime-950' 
                                  : 'bg-white/95 text-prime-950'
                              }`}
                            >
                              {faq.faq_type === 'core' ? 'Guide' : 'Tips'}
                            </Badge>
                          </div>
                        </div>
                      )}
                      <CardContent className="p-6">
                        <h2 className="font-display font-bold text-lg text-foreground mb-3 line-clamp-2 group-hover:text-prime-gold transition-colors duration-300">
                          {faq.question_main}
                        </h2>
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-5">
                          {stripHtml(faq.answer_main).substring(0, 150)}...
                        </p>
                        <div className="flex items-center text-prime-gold text-sm font-nav font-semibold group-hover:translate-x-1 transition-transform duration-300">
                          Read Answer
                          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
