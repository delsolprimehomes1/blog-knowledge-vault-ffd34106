import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Scale } from "lucide-react";
import { ComparisonFilterBar } from "@/components/comparison/ComparisonFilterBar";
import { useMemo } from "react";

export default function ComparisonIndex() {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize language from URL param, default to URL language
  const selectedLanguage = searchParams.get('language') || lang;
  const selectedCategory = searchParams.get('category') || 'all';

  const { data: comparisons, isLoading } = useQuery({
    queryKey: ['comparisons-published', selectedLanguage, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('comparison_pages')
        .select('id, slug, headline, meta_description, option_a, option_b, category, language')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      // Apply language filter
      if (selectedLanguage !== 'all') {
        query = query.eq('language', selectedLanguage);
      }
      
      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  // Get unique categories from all comparisons
  const categories = useMemo(() => {
    if (!comparisons) return [];
    const uniqueCategories = [...new Set(comparisons.map(c => c.category).filter(Boolean))];
    return uniqueCategories as string[];
  }, [comparisons]);

  const handleLanguageChange = (language: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (language === 'all') {
      newParams.delete('language');
    } else {
      newParams.set('language', language);
    }
    setSearchParams(newParams);
  };

  const handleCategoryChange = (category: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (category === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', category);
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  return (
    <>
      {/* SEO tags are handled by server/edge - no Helmet needed */}
      <Header />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Scale className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Property Comparisons</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert comparisons to help you make informed decisions about buying property in Costa del Sol
            </p>
          </div>

          {/* Filter Bar */}
          <ComparisonFilterBar
            selectedLanguage={selectedLanguage}
            selectedCategory={selectedCategory}
            categories={categories}
            onLanguageChange={handleLanguageChange}
            onCategoryChange={handleCategoryChange}
            onClearFilters={handleClearFilters}
            resultCount={comparisons?.length || 0}
          />

          {/* Comparisons Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comparisons?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No comparisons available for the selected filters.</p>
              {(selectedLanguage !== 'all' || selectedCategory !== 'all') && (
                <button
                  onClick={handleClearFilters}
                  className="text-primary hover:underline"
                >
                  Clear filters to see all comparisons
                </button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comparisons?.map((comparison) => (
                <Link key={comparison.id} to={`/${lang}/compare/${comparison.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow group">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {comparison.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs uppercase">
                          {comparison.language}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {comparison.headline}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {comparison.meta_description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary">{comparison.option_a}</span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-medium">{comparison.option_b}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
