import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Scale } from "lucide-react";

export default function ComparisonIndex() {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const { data: comparisons, isLoading } = useQuery({
    queryKey: ['comparisons-published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparison_pages')
        .select('id, slug, headline, meta_description, option_a, option_b, category, language')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

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

          {/* Comparisons Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comparisons?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No comparisons available yet.</p>
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
