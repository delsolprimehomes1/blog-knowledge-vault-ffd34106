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
import { BlogArticle as BlogArticleType, Author, ExternalCitation, QAEntity, FunnelStage, InternalLink } from "@/types/blog";
import { ExpertInsight } from "@/components/blog-article/ExpertInsight";
import { DecisionSnapshot } from "@/components/blog-article/DecisionSnapshot";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import PersonSchema from '@/components/schema/PersonSchema';
import ArticleSchema from '@/components/schema/ArticleSchema';
import AuthorByline from '@/components/blog-article/AuthorByline';

const BlogArticle = () => {
  const { slug, lang = 'en' } = useParams<{ slug: string; lang: string }>();

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
        {/* Keep noindex for error pages */}
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
        {/* Keep noindex for not found pages */}
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

  return (
    <>
      {/* Schema Markup */}
      <PersonSchema context="blog" />
      <ArticleSchema
        headline={article.headline}
        description={article.meta_description}
        datePublished={article.date_published || article.created_at}
        dateModified={article.date_modified || article.updated_at}
        articleUrl={`https://www.delsolprimehomes.com/${article.language}/blog/${article.slug}`}
        imageUrl={article.featured_image_url}
        imageCaption={article.featured_image_caption}
        imageAlt={article.featured_image_alt}
        context="blog"
      />

      {/* SEO tags are handled by server/edge - no Helmet needed for published articles */}
      <div className="min-h-screen py-8 md:py-12">
        <div className="flex flex-col">
          {/* Mobile-first single column with max-width for readability */}
          <div className="max-w-4xl mx-auto w-full px-5 sm:px-6 space-y-12 md:space-y-16">
            <div>
              <ArticleHeader
                article={article}
                author={author || null}
                reviewer={reviewer || null}
                translations={article.translations as Record<string, string | { id: string; slug: string }>}
              />

              <AuthorByline
                datePublished={article.date_published || article.created_at}
                dateModified={article.date_modified}
                context="blog"
              />
            </div>

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

            {/* Authority Blocks */}
            {article.expert_insight && (
              <ExpertInsight insight={article.expert_insight} />
            )}

            {article.decision_snapshot && (
              <DecisionSnapshot snapshot={article.decision_snapshot} />
            )}

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

            {/* Related Q&A Pages - Hans' funnel-based linking (up to 4) */}
            {(article.cluster_id || (article.generated_qa_page_ids && article.generated_qa_page_ids.length > 0)) && (
              <RelatedQAPages
                articleId={article.id}
                language={article.language}
                qaPageIds={article.generated_qa_page_ids as string[] || []}
                clusterId={article.cluster_id || undefined}
                articleFunnelStage={article.funnel_stage}
              />
            )}

            {author && <AuthorBio author={author} language={article.language} localizedBio={article.author_bio_localized} />}

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
