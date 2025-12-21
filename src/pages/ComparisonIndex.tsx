import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Scale } from "lucide-react";

const BASE_URL = "https://www.delsolprimehomes.com";

export default function ComparisonIndex() {
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

  // Generate CollectionPage schema
  const comparisonIndexSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/compare#collectionpage`,
        "name": "Property Comparisons | Del Sol Prime Homes",
        "description": "Compare property options in Costa del Sol. Expert comparisons to help you make informed real estate decisions.",
        "url": `${BASE_URL}/compare`,
        "isPartOf": {
          "@id": `${BASE_URL}/#website`
        },
        "about": {
          "@type": "Thing",
          "name": "Costa del Sol Property Comparisons"
        },
        "inLanguage": "en-GB",
        ...(comparisons && comparisons.length > 0 && {
          "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": comparisons.length,
            "itemListElement": comparisons.slice(0, 50).map((comp, idx) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "name": comp.headline,
              "url": `${BASE_URL}/compare/${comp.slug}`
            }))
          }
        })
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
          { "@type": "ListItem", "position": 2, "name": "Comparisons", "item": `${BASE_URL}/compare` }
        ]
      },
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/compare#webpage`,
        "url": `${BASE_URL}/compare`,
        "name": "Property Comparisons | Del Sol Prime Homes",
        "description": "Expert property comparisons for Costa del Sol buyers.",
        "isPartOf": {
          "@id": `${BASE_URL}/#website`
        },
        "inLanguage": "en-GB",
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": ["h1", ".comparison-intro"]
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Property Comparisons | Del Sol Prime Homes</title>
        <meta name="description" content="Compare property options in Costa del Sol. Expert comparisons to help you make informed real estate decisions." />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={`${BASE_URL}/compare`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Property Comparisons | Del Sol Prime Homes" />
        <meta property="og:description" content="Expert property comparisons for Costa del Sol buyers." />
        <meta property="og:url" content={`${BASE_URL}/compare`} />
        <meta property="og:image" content={`${BASE_URL}/assets/logo-new.png`} />
        <meta property="og:image:alt" content="Del Sol Prime Homes Property Comparisons" />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        
        {/* Hreflang */}
        <link rel="alternate" hrefLang="en-GB" href={`${BASE_URL}/compare`} />
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/compare`} />
        
        {/* JSON-LD Schema */}
        <script type="application/ld+json">
          {JSON.stringify(comparisonIndexSchema)}
        </script>
      </Helmet>

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
                <Link key={comparison.id} to={`/compare/${comparison.slug}`}>
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
