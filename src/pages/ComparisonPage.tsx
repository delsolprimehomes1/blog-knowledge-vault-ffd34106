import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { SpeakableBox } from "@/components/comparison/SpeakableBox";
import { ComparisonTable } from "@/components/comparison/ComparisonTable";
import { VerdictSection } from "@/components/comparison/VerdictSection";
import { ComparisonFAQ } from "@/components/comparison/ComparisonFAQ";
import { generateAllComparisonSchemas, ComparisonPage as ComparisonPageType } from "@/lib/comparisonSchemaGenerator";
import { ChevronRight } from "lucide-react";

export default function ComparisonPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: comparison, isLoading, error } = useQuery({
    queryKey: ['comparison', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparison_pages')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      
      // Cast the data - JSONB fields are already arrays from Supabase
      return data as unknown as ComparisonPageType;
    },
    enabled: !!slug,
  });

  const { data: author } = useQuery({
    queryKey: ['author', comparison?.author_id],
    queryFn: async () => {
      if (!comparison?.author_id) return null;
      const { data } = await supabase
        .from('authors')
        .select('name, job_title, linkedin_url')
        .eq('id', comparison.author_id)
        .single();
      return data;
    },
    enabled: !!comparison?.author_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Comparison Not Found</h1>
            <Link to="/compare" className="text-primary hover:underline">
              View all comparisons
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const schemas = generateAllComparisonSchemas(comparison, author);
  const quickComparisonTable = Array.isArray(comparison.quick_comparison_table) 
    ? comparison.quick_comparison_table 
    : [];
  const qaEntities = Array.isArray(comparison.qa_entities) 
    ? comparison.qa_entities 
    : [];

  return (
    <>
      <Helmet>
        <title>{comparison.meta_title}</title>
        <meta name="description" content={comparison.meta_description} />
        <link rel="canonical" href={`https://www.delsolprimehomes.com/compare/${comparison.slug}`} />
        
        <script type="application/ld+json">
          {JSON.stringify(schemas.article)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.speakable)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.breadcrumb)}
        </script>
        {schemas.faq && (
          <script type="application/ld+json">
            {JSON.stringify(schemas.faq)}
          </script>
        )}
      </Helmet>

      <Header />
      
      <main className="min-h-screen bg-background">
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/compare" className="hover:text-foreground">Comparisons</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{comparison.comparison_topic}</span>
          </nav>

          {/* H1 */}
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
            {comparison.headline}
          </h1>

          {/* Speakable Answer - Above the fold */}
          <SpeakableBox 
            answer={comparison.speakable_answer}
            optionA={comparison.option_a}
            optionB={comparison.option_b}
          />

          {/* Quick Comparison Table */}
          <ComparisonTable 
            data={quickComparisonTable}
            optionA={comparison.option_a}
            optionB={comparison.option_b}
          />

          {/* Option A Overview */}
          {comparison.option_a_overview && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold mb-4">{comparison.option_a}: Overview</h2>
              <div 
                className="prose prose-lg max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: comparison.option_a_overview }}
              />
            </section>
          )}

          {/* Option B Overview */}
          {comparison.option_b_overview && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold mb-4">{comparison.option_b}: Overview</h2>
              <div 
                className="prose prose-lg max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: comparison.option_b_overview }}
              />
            </section>
          )}

          {/* Side-by-Side Breakdown */}
          {comparison.side_by_side_breakdown && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold mb-4">Side-by-Side Breakdown</h2>
              <div 
                className="prose prose-lg max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: comparison.side_by_side_breakdown }}
              />
            </section>
          )}

          {/* Use Case Scenarios */}
          {comparison.use_case_scenarios && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold mb-4">When to Choose Each Option</h2>
              <div 
                className="prose prose-lg max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: comparison.use_case_scenarios }}
              />
            </section>
          )}

          {/* FAQ Section */}
          <ComparisonFAQ faqs={qaEntities} />

          {/* Final Verdict */}
          <VerdictSection verdict={comparison.final_verdict} />

          {/* Internal Links */}
          {comparison.internal_links && Array.isArray(comparison.internal_links) && comparison.internal_links.length > 0 && (
            <section className="mt-10 pt-8 border-t">
              <h3 className="text-lg font-semibold mb-4">Related Content</h3>
              <div className="flex flex-wrap gap-2">
                {(comparison.internal_links as Array<{ url: string; anchor: string }>).map((link, index) => (
                  <Link
                    key={index}
                    to={link.url}
                    className="px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors"
                  >
                    {link.anchor}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      <Footer />
    </>
  );
}
