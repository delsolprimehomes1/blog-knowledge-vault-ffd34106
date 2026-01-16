import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { Search, Book, ChevronRight, ExternalLink, Award, CheckCircle2 } from "lucide-react";
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

const BASE_URL = "https://www.delsolprimehomes.com";

const Glossary: React.FC = () => {
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'en';
  
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
  const canonicalUrl = `${BASE_URL}/glossary`;
  const ogImageUrl = `${BASE_URL}/assets/logo-new.png`;
  const pageTitle = "Costa del Sol Real Estate Glossary | Spanish Property Terms Explained";
  const pageDescription = "Complete glossary of 65+ Spanish real estate, tax, and legal terms. Essential definitions for NIE, IBI, Golden Visa, and more when buying property on the Costa del Sol.";

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="Spanish property glossary, NIE definition, IBI tax, Golden Visa Spain, Spanish real estate terms, Costa del Sol buying guide, escritura, plusvalia, notario" />
        <meta name="author" content="Del Sol Prime Homes" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Costa del Sol Real Estate Glossary - Spanish Property Terms" />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        <meta name="twitter:image:alt" content="Costa del Sol Real Estate Glossary - Spanish Property Terms" />
        
        {/* Article Metadata */}
        <meta property="article:published_time" content="2024-01-15T00:00:00Z" />
        <meta property="article:modified_time" content={glossaryData.last_updated} />
        <meta property="article:section" content="Real Estate" />
        <meta property="article:tag" content="Spanish Property" />
        <meta property="article:tag" content="Real Estate Glossary" />
        <meta property="article:tag" content="Costa del Sol" />
        
        {/* Hreflang - only for existing translations (English only for now) */}
        <link rel="alternate" hrefLang="en" href={canonicalUrl} />
        <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
        
        {/* JSON-LD Schema */}
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <Header />

      <main className="min-h-screen bg-slate-50">
        {/* Hero Section - Premium Dark */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          {/* Dark gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-prime-900 via-prime-800 to-prime-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-prime-gold/10 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-prime-gold/30 to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center reveal-on-scroll">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-prime-gold/20 flex items-center justify-center">
                  <Book className="h-6 w-6 text-prime-gold" />
                </div>
                <Badge className="bg-prime-gold/20 text-prime-gold border-prime-gold/30 hover:bg-prime-gold/30">
                  {glossaryData.total_terms}+ Terms Explained
                </Badge>
              </div>
              {/* Speakable H1 - glossary-category-title class for voice assistants */}
              <h1 className="glossary-category-title text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 tracking-tight">
                Costa del Sol Real Estate <span className="text-prime-gold italic">Glossary</span>
              </h1>
              <p className="text-lg text-slate-300 mb-10 font-light leading-relaxed max-w-2xl mx-auto">
                Your comprehensive guide to Spanish property, tax, legal, and residency terminology. 
                Essential knowledge for buying property on the Costa del Sol.
              </p>
              
              {/* Search - Premium Style */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search terms (e.g., NIE, Golden Visa, IBI...)"
                  className="pl-14 h-14 text-lg rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder:text-slate-400 focus:border-prime-gold focus:bg-white/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search glossary terms"
                />
              </div>
            </div>
          </div>
        </section>

        {/* E-E-A-T Trust Signals - Expert Attribution */}
        <section className="bg-white border-b border-slate-200 py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-prime-gold" />
                <span>Compiled by <strong className="text-prime-900">Licensed Real Estate Experts</strong></span>
              </div>
              <div className="h-4 w-px bg-slate-300 hidden sm:block" />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>Last updated: <time dateTime={glossaryData.last_updated}>{new Date(glossaryData.last_updated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time></span>
              </div>
              <div className="h-4 w-px bg-slate-300 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Book className="h-5 w-5 text-prime-700" />
                <span><strong>{glossaryData.total_terms}</strong> verified definitions</span>
              </div>
            </div>
          </div>
        </section>

        {/* Alphabet Navigation - Glassmorphism */}
        <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm" aria-label="Alphabet navigation">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap justify-center gap-1">
              {alphabet.map(letter => {
                const hasTerms = alphabetGroups[letter]?.length > 0;
                return (
                  <a
                    key={letter}
                    href={hasTerms ? `#letter-${letter}` : undefined}
                    aria-label={hasTerms ? `Jump to terms starting with ${letter}` : `No terms starting with ${letter}`}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-200
                      ${hasTerms 
                        ? "hover:bg-prime-gold hover:text-white cursor-pointer text-prime-900 hover:scale-110 hover:shadow-lg hover:shadow-prime-gold/20" 
                        : "text-slate-300 cursor-default"
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
        <section className="container mx-auto px-4 py-10" aria-label="Glossary categories">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-center mb-10 reveal-on-scroll">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-prime-gold data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-prime-gold/20 rounded-full px-5 py-2 font-medium transition-all"
              >
                All Terms ({allTerms.length})
              </TabsTrigger>
              {Object.entries(glossaryData.categories).map(([key, category]) => (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="glossary-category-title data-[state=active]:bg-prime-gold data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-prime-gold/20 rounded-full px-5 py-2 font-medium transition-all"
                >
                  {categoryIcons[key]} {category.title} ({category.terms.length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeCategory} className="mt-0">
              {filteredTerms.length === 0 ? (
                <div className="text-center py-16 reveal-on-scroll">
                  <p className="text-slate-500 text-lg">No terms found matching your search.</p>
                  <Button variant="link" onClick={() => setSearchQuery("")} className="text-prime-gold mt-2">
                    Clear search
                  </Button>
                </div>
              ) : (
                <div className="space-y-16">
                  {alphabet.map(letter => {
                    const terms = alphabetGroups[letter];
                    if (!terms?.length) return null;
                    
                    return (
                      <div key={letter} id={`letter-${letter}`} className="scroll-mt-28 reveal-on-scroll">
                        {/* Letter heading with speakable class */}
                        <h2 className="glossary-category-title text-4xl font-serif font-bold text-prime-gold mb-8 pb-3 border-b-2 border-prime-100">
                          {letter}
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2">
                          {terms.map((term, idx) => (
                            <Card 
                              key={term.term} 
                              id={term.term.toLowerCase().replace(/\s+/g, '-')}
                              className={`group bg-white border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2 transition-all duration-500 scroll-mt-28 stagger-${(idx % 4) + 1}`}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    {/* Term name with speakable class for voice assistants */}
                                    <CardTitle className="glossary-term-name text-xl font-bold text-prime-900 group-hover:text-prime-gold transition-colors">
                                      {term.term}
                                    </CardTitle>
                                    {term.full_name !== term.term && (
                                      <p className="text-sm text-slate-500 italic mt-1">
                                        {term.full_name}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="shrink-0 border-prime-200 text-prime-700 bg-prime-50">
                                    {categoryIcons[term.categoryKey]} {term.categoryTitle.split(' ')[0]}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Definition with speakable class for voice assistants */}
                                <p className="glossary-term-definition text-slate-700 leading-relaxed">
                                  {term.definition}
                                </p>
                                
                                {term.related_terms.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    <span className="text-xs text-slate-500 font-medium">Related:</span>
                                    {term.related_terms.map(related => (
                                      <a
                                        key={related}
                                        href={`#${related.toLowerCase().replace(/\s+/g, '-')}`}
                                        className="text-xs text-prime-gold hover:text-prime-600 hover:underline font-medium"
                                      >
                                        {related}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                
                                {term.see_also.length > 0 && (
                                  <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
                                    {term.see_also.map(link => (
                                      <Link
                                        key={link}
                                        to={link}
                                        className="inline-flex items-center gap-1.5 text-sm text-prime-gold hover:text-prime-600 font-medium group/link"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Learn more
                                        <ChevronRight className="h-3.5 w-3.5 opacity-0 -ml-1 group-hover/link:opacity-100 group-hover/link:ml-0 transition-all" />
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

        {/* CTA Section - Premium Dark */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-prime-900 via-prime-800 to-prime-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-prime-gold/10 via-transparent to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10 text-center reveal-on-scroll">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6">
              Need Help Understanding the <span className="text-prime-gold italic">Property Buying Process?</span>
            </h2>
            <p className="text-slate-300 mb-10 max-w-2xl mx-auto text-lg font-light leading-relaxed">
              Our expert team can guide you through every step of purchasing property in Spain. 
              Get personalized advice tailored to your situation.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-prime-gold text-prime-900 hover:bg-prime-gold/90 shadow-lg shadow-prime-gold/20">
                <Link to={`/${currentLang}/blog`}>
                  Read Our Guides <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white hover:text-prime-900">
                <Link to={`/${currentLang}/qa`}>
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
