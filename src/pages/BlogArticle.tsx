import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleHeader } from "@/components/blog-article/ArticleHeader";
import { SpeakableBox } from "@/components/blog-article/SpeakableBox";
import { QuickSummary } from "@/components/blog-article/QuickSummary";
import { TableOfContents } from "@/components/blog-article/TableOfContents";
import { ArticleContent } from "@/components/blog-article/ArticleContent";
import { InternalLinksSection } from "@/components/blog-article/InternalLinksSection";
import { RelatedArticles } from "@/components/blog-article/RelatedArticles";
import { TrustSignals } from "@/components/blog-article/TrustSignals";
import { QASection } from "@/components/blog-article/QASection";
import { AuthorBio } from "@/components/blog-article/AuthorBio";
import { RelatedQAPages } from "@/components/blog-article/RelatedQAPages";
import { FunnelCTA } from "@/components/blog-article/FunnelCTA";
import { ArticleFooter } from "@/components/blog-article/ArticleFooter";
import { StickyMobileCTA } from "@/components/blog-article/StickyMobileCTA";
import { BlogHreflangTags } from "@/components/BlogHreflangTags";
import { generateAllSchemas, type QAPageReference } from "@/lib/schemaGenerator";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { BlogArticle as BlogArticleType, Author, ExternalCitation, QAEntity, FunnelStage, InternalLink } from "@/types/blog";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";

// Language to og:locale mapping - Only 10 supported languages
const LOCALE_MAP: Record<string, string> = {
  en: 'en_GB',
  nl: 'nl_NL',
  de: 'de_DE',
  fr: 'fr_FR',
  sv: 'sv_SE',
  no: 'nb_NO',
  da: 'da_DK',
  fi: 'fi_FI',
  pl: 'pl_PL',
  hu: 'hu_HU'
};

const BlogArticle = () => {
  const { slug, lang = 'en' } = useParams<{ slug: string; lang: string }>();
  const [hreflangEnabled, setHreflangEnabled] = useState(false);
  const [qaPageReferences, setQAPageReferences] = useState<QAPageReference[]>([]);

  // Check feature flag on mount
  useEffect(() => {
    isFeatureEnabled('enhanced_hreflang').then(setHreflangEnabled);
  }, []);

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", lang, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Article not found");

      return data as unknown as BlogArticleType;
    },
    enabled: !!slug,
  });

  // Redirect if URL language doesn't match article's actual language
  if (article && article.language !== lang) {
    return <Navigate to={`/${article.language}/blog/${article.slug}`} replace />;
  }

  const { data: author } = useQuery({
    queryKey: ["author", article?.author_id],
    queryFn: async () => {
      if (!article?.author_id) return null;
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .eq("id", article.author_id)
        .single();
      if (error) throw error;
      return data as Author;
    },
    enabled: !!article?.author_id,
  });

  const { data: reviewer } = useQuery({
    queryKey: ["reviewer", article?.reviewer_id],
    queryFn: async () => {
      if (!article?.reviewer_id) return null;
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .eq("id", article.reviewer_id)
        .single();
      if (error) throw error;
      return data as Author;
    },
    enabled: !!article?.reviewer_id,
  });

  const { data: relatedArticles } = useQuery({
    queryKey: ["relatedArticles", article?.related_article_ids],
    queryFn: async () => {
      if (!article?.related_article_ids || article.related_article_ids.length === 0) return [];
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, category, language, featured_image_url")
        .in("id", article.related_article_ids)
        .eq("status", "published");
      if (error) throw error;
      return data;
    },
    enabled: !!article?.related_article_ids,
  });

  const { data: ctaArticles } = useQuery({
    queryKey: ["ctaArticles", article?.cta_article_ids],
    queryFn: async () => {
      if (!article?.cta_article_ids || article.cta_article_ids.length === 0) return [];
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, category, language, featured_image_url")
        .in("id", article.cta_article_ids)
        .eq("status", "published");
      if (error) throw error;
      return data;
    },
    enabled: !!article?.cta_article_ids,
  });

  // Phase 2: Fetch cluster siblings to determine canonical primary
  const { data: clusterSiblings } = useQuery({
    queryKey: ["clusterSiblings", article?.cluster_id],
    queryFn: async () => {
      if (!article?.cluster_id) return [];
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, language, is_primary")
        .eq("cluster_id", article.cluster_id)
        .eq("status", "published");
      if (error) throw error;
      return data;
    },
    enabled: !!article?.cluster_id,
  });

  // Fetch QA pages for JSON-LD schema (bidirectional linking)
  useEffect(() => {
    const fetchQAPagesForSchema = async () => {
      if (!article?.generated_qa_page_ids || article.generated_qa_page_ids.length === 0) {
        setQAPageReferences([]);
        return;
      }

      const { data, error } = await supabase
        .from('qa_pages')
        .select('id, slug, question_main, qa_type')
        .in('id', article.generated_qa_page_ids as string[])
        .eq('language', article.language)
        .eq('status', 'published')
        .order('qa_type', { ascending: true });

      if (error) {
        console.error('Error fetching QA pages for schema:', error);
        setQAPageReferences([]);
      } else if (data) {
        setQAPageReferences(data as QAPageReference[]);
      }
    };

    fetchQAPagesForSchema();
  }, [article?.id, article?.language, article?.generated_qa_page_ids]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
          <title>Error Loading Article | Del Sol Prime Homes</title>
        </Helmet>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
            <h1 className="text-3xl font-bold mb-4">Error Loading Article</h1>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Unable to load this article. Please try again."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()} variant="default">
                Reload Page
              </Button>
              <Button onClick={() => window.history.back()} variant="outline">
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
          <title>Article Not Found | Del Sol Prime Homes</title>
        </Helmet>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
            <p className="text-muted-foreground">The article you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </>
    );
  }

  const schemas = generateAllSchemas(article, author || null, reviewer || null, 'https://www.delsolprimehomes.com', qaPageReferences);

  // Consolidate all schemas into single @graph structure for Helmet
  const consolidatedSchema = {
    "@context": "https://schema.org",
    "@graph": [
      schemas.article,
      schemas.speakable,
      schemas.breadcrumb,
      ...(schemas.faq ? [schemas.faq] : []),
      ...(schemas.webPageElement ? [schemas.webPageElement] : []),
      schemas.organization
    ]
  };

  const baseUrl = 'https://www.delsolprimehomes.com';
  const currentUrl = `${baseUrl}/${lang}/blog/${article.slug}`;
  
  // Phase 2: Determine canonical URL based on cluster primary
  // Find the primary article in the cluster (or fallback to self)
  const primaryArticle = clusterSiblings?.find(a => a.is_primary);
  const canonicalUrl = primaryArticle 
    ? `${baseUrl}/${primaryArticle.language || 'en'}/blog/${primaryArticle.slug}`
    : currentUrl;

  // Language to hreflang mapping (all 10 supported languages)
  const langToHreflang: Record<string, string> = {
    en: 'en-GB',
    de: 'de-DE',
    nl: 'nl-NL',
    fr: 'fr-FR',
    pl: 'pl-PL',
    sv: 'sv-SE',
    da: 'da-DK',
    hu: 'hu-HU',
    fi: 'fi-FI',
    no: 'nb-NO',
  };

  // Generate hreflang tags array - ONLY when feature flag is enabled
  const hreflangTags: { lang: string; hrefLang: string; href: string }[] = [];
  
  if (hreflangEnabled) {
    // Phase 3: Use clusterSiblings for hreflang (more reliable than translations JSONB)
    
    // 1. Self-referencing hreflang (current page)
    const currentLangCode = langToHreflang[article.language] || article.language;
    hreflangTags.push({
      lang: article.language,
      hrefLang: currentLangCode,
      href: currentUrl
    });
    
    // 2. Add cluster siblings as alternate language versions
    if (clusterSiblings && clusterSiblings.length > 0) {
      clusterSiblings.forEach((sibling) => {
        // Skip current article (already added as self-reference)
        if (sibling.slug && sibling.language !== article.language) {
          const langCode = langToHreflang[sibling.language] || sibling.language;
          hreflangTags.push({
            lang: sibling.language,
            hrefLang: langCode,
            href: `${baseUrl}/${sibling.language}/blog/${sibling.slug}`
          });
        }
      });
    }
    
    // 3. x-default points to cluster primary (or self if standalone)
    const xDefaultUrl = primaryArticle 
      ? `${baseUrl}/${primaryArticle.language || 'en'}/blog/${primaryArticle.slug}`
      : currentUrl;
    hreflangTags.push({
      lang: 'x-default',
      hrefLang: 'x-default',
      href: xDefaultUrl
    });
  }

  return (
    <>
      {/* New hreflang tags component using hreflang_group_id */}
      {article && (
        <BlogHreflangTags
          id={article.id}
          hreflang_group_id={article.hreflang_group_id || null}
          language={article.language}
          slug={article.slug}
          canonical_url={article.canonical_url || null}
          content_type={article.content_type || null}
          source_language={article.source_language || 'en'}
        />
      )}
      
      <Helmet>
        {/* HTML Language Attribute */}
        <html lang={article.language} />
        
        {/* Basic Meta Tags */}
        <title>{article.meta_title} | Del Sol Prime Homes</title>
        <meta name="description" content={article.meta_description} />
        {/* Canonical - points to cluster primary (or self if standalone/primary) */}
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content={article.headline} />
        <meta property="og:description" content={article.meta_description} />
        <meta property="og:image" content={article.featured_image_url} />
        <meta property="og:image:alt" content={article.featured_image_alt} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="675" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        <meta property="og:locale" content={LOCALE_MAP[article.language] || 'en_GB'} />
        {article.date_published && (
          <meta property="article:published_time" content={article.date_published} />
        )}
        {article.date_modified && (
          <meta property="article:modified_time" content={article.date_modified} />
        )}
        {author && <meta property="article:author" content={author.name} />}
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.headline} />
        <meta name="twitter:description" content={article.meta_description} />
        <meta name="twitter:image" content={article.featured_image_url} />
        
        {/* Hreflang Tags - ONLY when feature flag is enabled */}
        {hreflangTags.map((tag) => (
          <link key={tag.lang} rel="alternate" hrefLang={tag.hrefLang} href={tag.href} />
        ))}
        
        {/* Additional Meta */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        {author && <meta name="author" content={author.name} />}
        <meta name="language" content={article.language} />
        
        {/* Consolidated JSON-LD Schema - Single @graph structure */}
        <script type="application/ld+json">
          {JSON.stringify(consolidatedSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen py-8 md:py-12">
        <div className="flex flex-col">
          {/* Mobile-first single column with max-width for readability */}
          <div className="max-w-4xl mx-auto w-full px-5 sm:px-6 space-y-12 md:space-y-16">
            <ArticleHeader
              article={article}
              author={author || null}
              reviewer={reviewer || null}
              translations={article.translations as Record<string, string>}
            />

            <SpeakableBox answer={article.speakable_answer} language={article.language} />

            {/* Quick Summary for BOFU articles */}
            {article.funnel_stage === "BOFU" && (
              <QuickSummary
                headline={article.headline}
                bottomLine={article.speakable_answer}
                readTime={article.read_time || undefined}
                language={article.language}
              />
            )}

            <ArticleContent
              content={article.detailed_content}
              featuredImageUrl={article.featured_image_url}
              featuredImageAlt={article.featured_image_alt}
              featuredImageCaption={article.featured_image_caption || undefined}
              diagramUrl={article.diagram_url || undefined}
              diagramDescription={article.diagram_description || undefined}
              externalCitations={article.external_citations as ExternalCitation[]}
              midArticleCTA={
                <FunnelCTA
                  funnelStage={article.funnel_stage as FunnelStage}
                  ctaArticles={ctaArticles || []}
                />
              }
            />

            <TableOfContents content={article.detailed_content} />

            <InternalLinksSection links={article.internal_links as InternalLink[]} />

            <TrustSignals
              reviewerName={reviewer?.name}
              dateModified={article.date_modified || undefined}
              citations={article.external_citations as ExternalCitation[]}
            />

            {article.qa_entities && (
              <QASection 
                faqs={article.qa_entities as QAEntity[]} 
                topic={article.headline}
                language={article.language}
              />
            )}

            {/* Related Q&A Pages - Cluster-wide display (up to 4) */}
            {(article.cluster_id || (article.generated_qa_page_ids && article.generated_qa_page_ids.length > 0)) && (
              <RelatedQAPages
                articleId={article.id}
                language={article.language}
                qaPageIds={article.generated_qa_page_ids as string[] || []}
                clusterId={article.cluster_id || undefined}
              />
            )}

            {author && <AuthorBio author={author} />}

            {relatedArticles && relatedArticles.length > 0 && (
              <RelatedArticles articles={relatedArticles} />
            )}

            <ArticleFooter />
          </div>
        </div>
      </div>

      {/* Sticky Mobile CTA Footer */}
      <StickyMobileCTA />

      {/* Chatbot Widget - Only for BOFU articles */}
      {article.funnel_stage === "BOFU" && (
        <ChatbotWidget articleSlug={article.slug} language={article.language} />
      )}
    </>
  );
};

export default BlogArticle;