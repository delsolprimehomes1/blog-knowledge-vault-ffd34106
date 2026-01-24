import { useState, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/home/Header";
import { BlogHeader } from "@/components/blog-index/BlogHeader";
import { FilterBar } from "@/components/blog-index/FilterBar";
import { SearchBar } from "@/components/blog-index/SearchBar";
import { ArticleCard } from "@/components/blog-index/ArticleCard";
import { BlogPagination } from "@/components/blog-index/BlogPagination";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

const ARTICLES_PER_PAGE = 9;

// Stagger animation delays for cards
const getCardDelay = (index: number) => {
  return `${(index % 9) * 100}ms`;
};

const BlogIndex = () => {
  const { lang = 'en' } = useParams<{ lang: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const selectedCategory = searchParams.get("category") || "all";
  const selectedLanguage = searchParams.get("lang") || "all";

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      console.log('Fetching categories...');
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      if (error) {
        console.error('Categories error:', error);
        throw error;
      }
      console.log('Categories loaded:', data);
      return data;
    },
  });

  // Fetch articles with filters and server-side pagination
  const { data: articlesData, isLoading: articlesLoading, error: articlesError } = useQuery({
    queryKey: ["blog-articles", selectedCategory, selectedLanguage, searchQuery, currentPage],
    queryFn: async () => {
      console.log('Fetching articles with filters:', { selectedCategory, selectedLanguage, searchQuery, currentPage });
      
      const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
      const endIndex = startIndex + ARTICLES_PER_PAGE - 1;

      let query = supabase
        .from("blog_articles")
        .select(`
          id,
          slug,
          headline,
          category,
          language,
          featured_image_url,
          date_published,
          read_time,
          meta_description,
          authors!blog_articles_author_id_fkey(name, photo_url)
        `, { count: 'exact' })
        .eq("status", "published")
        .eq("funnel_stage", "TOFU")
        .order("date_published", { ascending: false })
        .range(startIndex, endIndex);

      if (selectedCategory !== "all" && categories) {
        const category = categories.find(c => c.id === selectedCategory);
        if (category) {
          query = query.eq("category", category.name);
        }
      }

      if (selectedLanguage !== "all") {
        query = query.eq("language", selectedLanguage);
      }

      if (searchQuery) {
        query = query.or(`headline.ilike.%${searchQuery}%,meta_description.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;
      if (error) {
        console.error('Articles error:', error);
        throw error;
      }
      console.log('Articles loaded:', data?.length, 'of', count, 'total articles');
      return { articles: data, totalCount: count || 0 };
    },
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedLanguage, searchQuery]);

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    setSearchParams(params);
  };

  const handleLanguageChange = (language: string) => {
    const params = new URLSearchParams(searchParams);
    if (language === "all") {
      params.delete("lang");
    } else {
      params.set("lang", language);
    }
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({});
    setSearchQuery("");
  };

  const isLoading = categoriesLoading || articlesLoading;
  const hasError = categoriesError || articlesError;

  const totalArticles = articlesData?.totalCount || 0;
  const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
  const currentArticles = articlesData?.articles || [];

  if (hasError) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Unable to load articles</h2>
          <p className="text-muted-foreground">
            {categoriesError ? 'Failed to load categories' : 'Failed to load articles'}
          </p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header variant="solid" />
      {/* SEO tags are handled by server/edge - no Helmet needed */}
      <div className="container mx-auto px-4 pt-24 pb-12">
        <BlogHeader totalCount={totalArticles} />

      <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <FilterBar
        selectedCategory={selectedCategory}
        selectedLanguage={selectedLanguage}
        categories={categories || []}
        onCategoryChange={handleCategoryChange}
        onLanguageChange={handleLanguageChange}
        onClearFilters={handleClearFilters}
        resultCount={totalArticles}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted h-64 rounded-lg mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : currentArticles.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">No articles found</h2>
          <p className="text-muted-foreground">
            Try adjusting your filters or search query
          </p>
          <Button onClick={handleClearFilters} variant="outline">
            Clear All Filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {currentArticles.map((article, index) => {
              const authorInfo = article.authors as any;
              return (
                <div 
                  key={article.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: getCardDelay(index) }}
                >
                  <ArticleCard
                    article={article}
                    author={authorInfo}
                  />
                </div>
              );
            })}
          </div>

          <BlogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
      </div>
    </>
  );
};

export default BlogIndex;
