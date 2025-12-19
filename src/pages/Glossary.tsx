import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Search, Book, ChevronRight, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { generateAllGlossarySchemas } from "@/lib/glossarySchemaGenerator";

interface GlossaryTerm {
  term: string;
  full_name: string;
  definition: string;
  related_terms: string[];
  see_also: string[];
}

interface GlossaryCategory {
  title: string;
  description: string;
  terms: GlossaryTerm[];
}

interface GlossaryData {
  version: string;
  last_updated: string;
  total_terms: number;
  categories: Record<string, GlossaryCategory>;
}

const categoryIcons: Record<string, string> = {
  legal_tax: "⚖️",
  property: "🏠",
  visa_residency: "🛂",
  financial: "💶",
  location: "📍",
  process: "📋"
};

const Glossary: React.FC = () => {
  const [glossaryData, setGlossaryData] = useState<GlossaryData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/glossary.json")
      .then(res => res.json())
      .then(data => {
        setGlossaryData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load glossary:", err);
        setLoading(false);
      });
  }, []);

  const allTerms = useMemo(() => {
    if (!glossaryData) return [];
    const terms: (GlossaryTerm & { categoryKey: string; categoryTitle: string })[] = [];
    Object.entries(glossaryData.categories).forEach(([key, category]) => {
      category.terms.forEach(term => {
        terms.push({ ...term, categoryKey: key, categoryTitle: category.title });
      });
    });
    return terms.sort((a, b) => a.term.localeCompare(b.term));
  }, [glossaryData]);

  const filteredTerms = useMemo(() => {
    let terms = allTerms;
    
    if (activeCategory !== "all") {
      terms = terms.filter(t => t.categoryKey === activeCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      terms = terms.filter(t => 
        t.term.toLowerCase().includes(query) ||
        t.full_name.toLowerCase().includes(query) ||
        t.definition.toLowerCase().includes(query)
      );
    }
    
    return terms;
  }, [allTerms, activeCategory, searchQuery]);

  const alphabetGroups = useMemo(() => {
    const groups: Record<string, typeof filteredTerms> = {};
    filteredTerms.forEach(term => {
      const letter = term.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(term);
    });
    return groups;
  }, [filteredTerms]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading glossary...</p>
        </div>
      </div>
    );
  }

  if (!glossaryData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Failed to load glossary data.</p>
      </div>
    );
  }

  const schemaData = generateAllGlossarySchemas(glossaryData);

  return (
    <>
      <Helmet>
        <title>Costa del Sol Real Estate Glossary | Spanish Property Terms Explained</title>
        <meta 
          name="description" 
          content="Complete glossary of 65+ Spanish real estate, tax, and legal terms. Essential definitions for NIE, IBI, Golden Visa, and more when buying property on the Costa del Sol." 
        />
        <meta name="keywords" content="Spanish property glossary, NIE definition, IBI tax, Golden Visa Spain, Spanish real estate terms, Costa del Sol buying guide" />
        <link rel="canonical" href="https://www.delsolprimehomes.com/glossary" />
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-accent/5 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Book className="h-8 w-8 text-primary" />
                <Badge variant="secondary">65+ Terms Explained</Badge>
              </div>
              <h1 className="glossary-category-title text-4xl md:text-5xl font-bold text-foreground mb-4">
                Costa del Sol Real Estate Glossary
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Your comprehensive guide to Spanish property, tax, legal, and residency terminology. 
                Essential knowledge for buying property on the Costa del Sol.
              </p>
              
              {/* Search */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search terms (e.g., NIE, Golden Visa, IBI...)"
                  className="pl-12 h-14 text-lg rounded-full border-2 focus:border-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Alphabet Navigation */}
        <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-wrap justify-center gap-1">
              {alphabet.map(letter => {
                const hasTerms = alphabetGroups[letter]?.length > 0;
                return (
                  <a
                    key={letter}
                    href={hasTerms ? `#letter-${letter}` : undefined}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors
                      ${hasTerms 
                        ? "hover:bg-primary hover:text-primary-foreground cursor-pointer text-foreground" 
                        : "text-muted-foreground/40 cursor-default"
                      }`}
                  >
                    {letter}
                  </a>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Category Tabs */}
        <section className="container mx-auto px-4 py-8">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-center mb-8">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All Terms ({allTerms.length})
              </TabsTrigger>
              {Object.entries(glossaryData.categories).map(([key, category]) => (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {categoryIcons[key]} {category.title} ({category.terms.length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeCategory} className="mt-0">
              {filteredTerms.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No terms found matching your search.</p>
                  <Button variant="link" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                </div>
              ) : (
                <div className="space-y-12">
                  {alphabet.map(letter => {
                    const terms = alphabetGroups[letter];
                    if (!terms?.length) return null;
                    
                    return (
                      <div key={letter} id={`letter-${letter}`} className="scroll-mt-24">
                        <h2 className="text-3xl font-bold text-primary mb-6 pb-2 border-b">
                          {letter}
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                          {terms.map(term => (
                            <Card 
                              key={term.term} 
                              id={term.term.toLowerCase().replace(/\s+/g, '-')}
                              className="hover:shadow-lg transition-shadow scroll-mt-24"
                            >
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <CardTitle className="glossary-term-name text-xl text-primary">
                                      {term.term}
                                    </CardTitle>
                                    {term.full_name !== term.term && (
                                      <p className="text-sm text-muted-foreground italic">
                                        {term.full_name}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="shrink-0">
                                    {categoryIcons[term.categoryKey]} {term.categoryTitle.split(' ')[0]}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <p className="glossary-term-definition text-foreground">
                                  {term.definition}
                                </p>
                                
                                {term.related_terms.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    <span className="text-xs text-muted-foreground mr-1">Related:</span>
                                    {term.related_terms.map(related => (
                                      <a
                                        key={related}
                                        href={`#${related.toLowerCase().replace(/\s+/g, '-')}`}
                                        className="text-xs text-primary hover:underline"
                                      >
                                        {related}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                
                                {term.see_also.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                                    {term.see_also.map(link => (
                                      <Link
                                        key={link}
                                        to={link}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Learn more
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/5 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Need Help Understanding the Property Buying Process?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Our expert team can guide you through every step of purchasing property in Spain. 
              Get personalized advice tailored to your situation.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/blog">
                  Read Our Guides <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/qa">
                  Browse Q&A <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Glossary;
