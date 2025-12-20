import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import NotFound from "@/pages/NotFound";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileText } from "lucide-react";

const LocationIndex = () => {
  const { citySlug } = useParams<{ citySlug: string }>();

  const { data: pages, isLoading, error } = useQuery({
    queryKey: ['location-pages', citySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_pages')
        .select('*')
        .eq('city_slug', citySlug)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!citySlug,
  });

  // Get city name from first page or format slug
  const cityName = pages?.[0]?.city_name || citySlug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !pages || pages.length === 0) {
    return <NotFound />;
  }

  const intentLabels: Record<string, string> = {
    'buying-property': 'Buying Guide',
    'best-areas-families': 'Best Areas for Families',
    'best-areas-investors': 'Investment Areas',
    'best-areas-expats': 'Expat Guide',
    'best-areas-retirees': 'Retirement Guide',
    'cost-of-living': 'Cost of Living',
    'cost-of-property': 'Property Prices',
    'investment-guide': 'Investment Guide',
    'relocation-guide': 'Relocation Guide',
  };

  return (
    <>
      <Helmet>
        <title>{cityName} Property & Lifestyle Guide | Del Sol Prime Homes</title>
        <meta name="description" content={`Comprehensive guides about ${cityName}, Costa del Sol. Property buying, best areas, cost of living, and more.`} />
        <link rel="canonical" href={`https://www.delsolprimehomes.com/locations/${citySlug}`} />
      </Helmet>

      <Header />
      
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 pt-24 md:pt-28 pb-12">
          <div className="container mx-auto px-4">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                </li>
                <ChevronRight className="w-4 h-4" />
                <li>
                  <Link to="/locations" className="hover:text-primary transition-colors">Locations</Link>
                </li>
                <ChevronRight className="w-4 h-4" />
                <li className="text-foreground font-medium">{cityName}</li>
              </ol>
            </nav>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {cityName} Guides
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Everything you need to know about living, investing, and buying property in {cityName}, Costa del Sol.
            </p>
          </div>
        </section>

        {/* Pages Grid */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map((page) => (
              <Link 
                key={page.id} 
                to={`/locations/${citySlug}/${page.topic_slug}`}
                className="group"
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="secondary">
                        {intentLabels[page.intent_type] || page.intent_type}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                      {page.headline}
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {page.meta_description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-primary font-medium">
                      Read Guide
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LocationIndex;
