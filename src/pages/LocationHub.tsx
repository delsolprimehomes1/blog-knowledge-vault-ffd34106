import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, MapPin } from "lucide-react";

const LocationHub = () => {
  // Get unique cities with their page counts
  const { data: cities, isLoading } = useQuery({
    queryKey: ['location-cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_pages')
        .select('city_slug, city_name, region')
        .eq('status', 'published');

      if (error) throw error;

      // Group by city and count
      const cityMap = new Map<string, { city_slug: string; city_name: string; region: string; count: number }>();
      data?.forEach(page => {
        const existing = cityMap.get(page.city_slug);
        if (existing) {
          existing.count++;
        } else {
          cityMap.set(page.city_slug, {
            city_slug: page.city_slug,
            city_name: page.city_name,
            region: page.region,
            count: 1
          });
        }
      });

      return Array.from(cityMap.values()).sort((a, b) => b.count - a.count);
    },
  });

  return (
    <>
      <Helmet>
        <title>Costa del Sol Location Guides | Del Sol Prime Homes</title>
        <meta name="description" content="Explore comprehensive guides for all Costa del Sol locations. Property buying guides, best areas, cost of living, and investment opportunities in Marbella, Estepona, Fuengirola, and more." />
        <link rel="canonical" href="https://www.delsolprimehomes.com/locations" />
      </Helmet>

      <Header />
      
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 pt-24 md:pt-28 pb-16">
          <div className="container mx-auto px-4">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                </li>
                <ChevronRight className="w-4 h-4" />
                <li className="text-foreground font-medium">Locations</li>
              </ol>
            </nav>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Costa del Sol Location Guides
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              In-depth guides to help you find the perfect location in Spain's most sought-after coastal region. 
              From property buying to cost of living, we cover everything you need to know.
            </p>
          </div>
        </section>

        {/* Cities Grid */}
        <section className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : cities && cities.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cities.map((city) => (
                <Link 
                  key={city.city_slug} 
                  to={`/locations/${city.city_slug}`}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        <Badge variant="outline">
                          {city.count} {city.count === 1 ? 'guide' : 'guides'}
                        </Badge>
                      </div>
                      <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                        {city.city_name}
                      </CardTitle>
                      <CardDescription>
                        {city.region}, Spain
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-primary font-medium">
                        Explore Guides
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Location Guides Yet</h2>
              <p className="text-muted-foreground">
                Location intelligence pages are coming soon. Check back later!
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LocationHub;
