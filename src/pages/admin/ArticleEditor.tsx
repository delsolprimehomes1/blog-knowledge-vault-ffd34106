import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { LazyRichTextEditor } from "@/components/LazyRichTextEditor";
import { AIImageGenerator } from "@/components/AIImageGenerator";
import { DiagramGenerator } from "@/components/DiagramGenerator";
import { toast } from "sonner";
import { AlertCircle, Upload, Save, Eye, Loader2, Sparkles } from "lucide-react";
import { 
  generateSlug, 
  countWords, 
  getWordCountStatus, 
  getCharCountStatus,
  uploadImage 
} from "@/lib/articleUtils";
import { Language, FunnelStage, ArticleStatus, InternalLink, ExternalCitation, QAEntity } from "@/types/blog";
import { EEATSection } from "@/components/article-editor/EEATSection";
import { ContentSection } from "@/components/article-editor/ContentSection";
import { ExternalCitationsSection } from "@/components/article-editor/ExternalCitationsSection";
import { InternalLinksSection } from "@/components/article-editor/InternalLinksSection";
import { RelatedArticlesSection } from "@/components/article-editor/RelatedArticlesSection";
import { FunnelCTASection } from "@/components/article-editor/FunnelCTASection";
import { QASection } from "@/components/article-editor/QASection";
import { TranslationsSection } from "@/components/article-editor/TranslationsSection";
import { SchemaPreviewSection } from "@/components/article-editor/SchemaPreviewSection";
import { SEOPreviewSection } from "@/components/article-editor/SEOPreviewSection";
import { CitationReplacer } from "@/components/article-editor/CitationReplacer";
import { CitationValidation } from "@/components/article-editor/CitationValidation";
import { CitationHealthStatus } from "@/components/article-editor/CitationHealthStatus";
import { LinkValidationPanel } from "@/components/admin/LinkValidationPanel";
import { SchemaValidationAlert } from "@/components/admin/SchemaValidationAlert";

const ArticleEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  // Form state
  const [headline, setHeadline] = useState("");
  const [slug, setSlug] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [category, setCategory] = useState("");
  const [funnelStage, setFunnelStage] = useState<FunnelStage>("TOFU");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  
  const [speakableAnswer, setSpeakableAnswer] = useState("");
  const [detailedContent, setDetailedContent] = useState("");
  
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredImageAlt, setFeaturedImageAlt] = useState("");
  const [featuredImageCaption, setFeaturedImageCaption] = useState("");
  const [diagramMermaidCode, setDiagramMermaidCode] = useState("");
  const [diagramDescription, setDiagramDescription] = useState("");
  
  const [authorId, setAuthorId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);
  const [externalCitations, setExternalCitations] = useState<ExternalCitation[]>([]);
  const [relatedArticleIds, setRelatedArticleIds] = useState<string[]>([]);
  const [ctaArticleIds, setCtaArticleIds] = useState<string[]>([]);
  const [qaEntities, setQaEntities] = useState<QAEntity[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const [imageUploading, setImageUploading] = useState(false);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [isCaptionGenerating, setIsCaptionGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [citationSelectionMode, setCitationSelectionMode] = useState(false);
  const [citationTargetContext, setCitationTargetContext] = useState("");

  // Generate caption using AI
  const handleGenerateCaption = async () => {
    if (!headline.trim()) {
      toast.error("Please add a headline first");
      return;
    }

    setIsCaptionGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-missing-captions', {
        body: {
          singleArticleId: id || null,
          dryRun: !id, // If creating new article, just generate caption without saving
          batchSize: 1,
          language
        }
      });

      if (error) throw error;

      // For new articles, manually craft the caption request
      if (!id) {
        const { data: newCaptionData, error: newCaptionError } = await supabase.functions.invoke('generate-missing-captions', {
          body: {
            // Simulate article data for caption generation
            singleArticleId: null,
            language,
            dryRun: true,
            // Custom prompt data
            customHeadline: headline,
            customLanguage: language
          }
        });

        if (newCaptionError) throw newCaptionError;
        if (newCaptionData?.caption) {
          setFeaturedImageCaption(newCaptionData.caption);
          toast.success("Caption generated!");
        }
      } else if (data?.caption) {
        setFeaturedImageCaption(data.caption);
        toast.success("Caption generated and saved!");
      }
    } catch (error) {
      console.error('Caption generation error:', error);
      toast.error("Failed to generate caption");
    } finally {
      setIsCaptionGenerating(false);
    }
  };

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch authors
  const { data: authors } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch published articles for related articles and CTA
  const { data: publishedArticles } = useQuery({
    queryKey: ["publishedArticles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, headline, category, funnel_stage")
        .eq("status", "published")
        .order("headline");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all articles for translation linking
  const { data: allArticles } = useQuery({
    queryKey: ["allArticles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, language")
        .order("headline");
      if (error) throw error;
      return data;
    },
  });

  // Fetch article if editing
  const { data: article, isLoading: articleLoading, error: articleError } = useQuery({
    queryKey: ["article", id],
    enabled: isEditing,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error("Article not found");
      
      return data;
    },
  });

  // Load article data when editing
  useEffect(() => {
    if (article) {
      setHeadline(article.headline || "");
      setSlug(article.slug || "");
      setLanguage(article.language as Language);
      setCategory(article.category || "");
      setFunnelStage(article.funnel_stage as FunnelStage);
      setStatus(article.status as ArticleStatus);
      setMetaTitle(article.meta_title || "");
      setMetaDescription(article.meta_description || "");
      setCanonicalUrl(article.canonical_url || "");
      setSpeakableAnswer(article.speakable_answer || "");
      setDetailedContent(article.detailed_content || "");
      setFeaturedImageUrl(article.featured_image_url || "");
      setFeaturedImageAlt(article.featured_image_alt || "");
      setFeaturedImageCaption(article.featured_image_caption || "");
      setDiagramMermaidCode(article.diagram_url || ""); // diagram_url stores Mermaid code
      setDiagramDescription(article.diagram_description || "");
      setAuthorId(article.author_id || "");
      setReviewerId(article.reviewer_id || "");
      setInternalLinks((article.internal_links as unknown as InternalLink[]) || []);
      setExternalCitations((article.external_citations as unknown as ExternalCitation[]) || []);
      setRelatedArticleIds(article.related_article_ids || []);
      setCtaArticleIds(article.cta_article_ids || []);
      setQaEntities((article.qa_entities as unknown as QAEntity[]) || []);
      setTranslations((article.translations as Record<string, string>) || {});
    }
  }, [article]);

  // Auto-generate slug from headline
  useEffect(() => {
    if (headline && !isEditing) {
      setSlug(generateSlug(headline));
    }
  }, [headline, isEditing]);

  // Word/character counters
  const speakableWords = countWords(speakableAnswer);
  const speakableStatus = getWordCountStatus(speakableWords, 40, 60);
  const metaTitleStatus = getCharCountStatus(metaTitle.length, 60);
  const metaDescStatus = getCharCountStatus(metaDescription.length, 160);

  // Estimate word count from HTML
  const contentText = detailedContent.replace(/<[^>]*>/g, ' ').trim();
  const contentWords = countWords(contentText);
  const contentStatus = getWordCountStatus(contentWords, 1500, 2500);

  // Image upload handler
  const handleImageUpload = async (file: File, setter: (url: string) => void) => {
    try {
      setImageUploading(true);
      const url = await uploadImage(file, supabase);
      setter(url);
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload image");
      console.error(error);
    } finally {
      setImageUploading(false);
    }
  };

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!headline.trim()) newErrors.headline = "Headline is required";
    if (!slug.trim()) newErrors.slug = "Slug is required";
    if (!language) newErrors.language = "Language is required";
    if (!category) newErrors.category = "Category is required";
    if (!metaTitle.trim()) newErrors.metaTitle = "Meta title is required";
    if (metaTitle.length > 60) newErrors.metaTitle = "Meta title must be 60 characters or less";
    if (!metaDescription.trim()) newErrors.metaDescription = "Meta description is required";
    if (metaDescription.length > 160) newErrors.metaDescription = "Meta description must be 160 characters or less";
    if (!speakableAnswer.trim()) newErrors.speakableAnswer = "Speakable answer is required";
    if (!detailedContent.trim()) newErrors.detailedContent = "Detailed content is required";
    
    // Image validation - stricter for published articles
    if (!featuredImageUrl.trim()) {
      newErrors.featuredImageUrl = "Featured image is required";
    }
    if (featuredImageUrl && !featuredImageAlt.trim()) {
      newErrors.featuredImageAlt = "Alt text is required when image is provided";
    }
    if (!authorId) newErrors.authorId = "Author is required";
    
    // External citations validation
    if (externalCitations.length < 2) {
      newErrors.externalCitations = "Minimum 2 citations required";
    } else if (externalCitations.length > 5) {
      newErrors.externalCitations = "Maximum 5 citations allowed";
    }
    // Government domains (.gov, .gob.es) are recommended but not required

    // Check for unreplaced citation markers
    const markerCount = (detailedContent.match(/\[CITATION_NEEDED\]/g) || []).length;
    if (markerCount > 0) {
      newErrors.detailedContent = `Cannot save: ${markerCount} [CITATION_NEEDED] marker${markerCount !== 1 ? 's' : ''} must be replaced or removed before saving`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (publishStatus: ArticleStatus) => {
      // Block publishing without image
      if (publishStatus === 'published' && !featuredImageUrl.trim()) {
        toast.error("Cannot publish without a featured image. Save as draft or add an image.");
        throw new Error("Featured image required for publishing");
      }
      
      if (!validate()) throw new Error("Validation failed");

      const articleData = {
        headline,
        slug,
        language,
        category,
        funnel_stage: funnelStage,
        status: publishStatus,
        meta_title: metaTitle,
        meta_description: metaDescription,
        canonical_url: canonicalUrl || null,
        speakable_answer: speakableAnswer,
        detailed_content: detailedContent,
        featured_image_url: featuredImageUrl,
        featured_image_alt: featuredImageAlt,
        featured_image_caption: featuredImageCaption || null,
        diagram_url: diagramMermaidCode || null, // Store Mermaid code in diagram_url
        diagram_description: diagramDescription || null,
        author_id: authorId || null,
        reviewer_id: reviewerId || null,
        internal_links: internalLinks as any,
        external_citations: externalCitations as any,
        related_article_ids: relatedArticleIds,
        cta_article_ids: ctaArticleIds,
        qa_entities: qaEntities.length > 0 ? (qaEntities as any) : null,
        translations: translations,
        read_time: Math.ceil(contentWords / 200),
        date_modified: new Date().toISOString(),
        ...(publishStatus === 'published' && !article?.date_published ? { date_published: new Date().toISOString() } : {}),
      };

      if (isEditing) {
        const { error } = await supabase
          .from("blog_articles")
          .update(articleData)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blog_articles")
          .insert(articleData);
        if (error) throw error;
      }
    },
    onSuccess: (_, publishStatus) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      const message = publishStatus === 'published' 
        ? "✅ Article published successfully! All changes including images have been saved." 
        : "✅ Article saved as draft. All changes including images have been saved.";
      toast.success(message, { duration: 3000 });
      
      // Delay navigation to let user see the success message
      setTimeout(() => {
        navigate("/admin/articles");
      }, 1500);
    },
    onError: (error: any) => {
      if (error.message === "Validation failed") {
        const firstError = Object.values(errors)[0] as string;
        toast.error(firstError || "Please check all required fields", { duration: 5000 });
      } else if (error.message === "Featured image required for publishing") {
        // Already shown via toast in the mutation function
      } else {
        toast.error("Failed to save article");
        console.error(error);
      }
    },
  });

  if (isEditing && articleLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">Loading article...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (isEditing && articleError) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
                <h2 className="text-2xl font-bold">Unable to Load Article</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {articleError instanceof Error 
                    ? articleError.message 
                    : "There was a problem loading this article. Please try again."}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => window.location.reload()}>
                    Reload Page
                  </Button>
                  <Button onClick={() => navigate('/admin/articles')} variant="outline">
                    Back to Articles
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? "Edit Article" : "Create New Article"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update your blog article" : "Write a new blog article"}
            </p>
          </div>
        </div>

        {/* Schema Validation Status */}
        <SchemaValidationAlert 
          article={{
            headline,
            slug,
            language,
            category,
            funnel_stage: funnelStage,
            meta_title: metaTitle,
            meta_description: metaDescription,
            speakable_answer: speakableAnswer,
            detailed_content: detailedContent,
            featured_image_url: featuredImageUrl,
            featured_image_alt: featuredImageAlt,
            author_id: authorId,
            reviewer_id: reviewerId,
            external_citations: externalCitations,
            qa_entities: qaEntities,
            date_published: article?.date_published,
            date_modified: article?.date_modified,
          } as any}
          author={authors?.find(a => a.id === authorId)}
          reviewer={authors?.find(a => a.id === reviewerId)}
        />

        {/* Section 1: Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="headline">Headline *</Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="How to Buy Property in Costa del Sol?"
                className={errors.headline ? "border-red-500" : ""}
              />
              {errors.headline && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.headline}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="how-to-buy-property-costa-del-sol"
                className={errors.slug ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated from headline. Lowercase and hyphens only.
              </p>
              {errors.slug && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.slug}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="language">Language *</Label>
                <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                  <SelectTrigger className={errors.language ? "border-red-500" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                    <SelectItem value="de">🇩🇪 German</SelectItem>
                    <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
                    <SelectItem value="fr">🇫🇷 French</SelectItem>
                    <SelectItem value="pl">🇵🇱 Polish</SelectItem>
                    <SelectItem value="sv">🇸🇪 Swedish</SelectItem>
                    <SelectItem value="da">🇩🇰 Danish</SelectItem>
                    <SelectItem value="hu">🇭🇺 Hungarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="funnelStage">Funnel Stage *</Label>
                <Select value={funnelStage} onValueChange={(val) => setFunnelStage(val as FunnelStage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOFU">TOFU - Top of Funnel (Awareness)</SelectItem>
                    <SelectItem value="MOFU">MOFU - Middle of Funnel (Consideration)</SelectItem>
                    <SelectItem value="BOFU">BOFU - Bottom of Funnel (Decision)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as ArticleStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: SEO Meta */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Meta Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="metaTitle">Meta Title *</Label>
              <Input
                id="metaTitle"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Compelling title for search results"
                className={errors.metaTitle ? "border-red-500" : ""}
              />
              <p className={`text-xs mt-1 ${metaTitleStatus.color}`}>
                {metaTitleStatus.message}
              </p>
              {errors.metaTitle && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.metaTitle}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="metaDescription">Meta Description *</Label>
              <Textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Brief description for search results"
                rows={3}
                className={errors.metaDescription ? "border-red-500" : ""}
              />
              <p className={`text-xs mt-1 ${metaDescStatus.color}`}>
                {metaDescStatus.message}
              </p>
              {errors.metaDescription && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.metaDescription}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="canonicalUrl">Canonical URL (Optional)</Label>
              <Input
                id="canonicalUrl"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="Leave blank for auto-generated"
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO Preview */}
        <SEOPreviewSection
          metaTitle={metaTitle}
          metaDescription={metaDescription}
          featuredImageUrl={featuredImageUrl}
          translations={translations}
        />

        {/* Section 3: Content */}
        <div data-content-section>
          <ContentSection
            speakableAnswer={speakableAnswer}
            detailedContent={detailedContent}
            onSpeakableAnswerChange={setSpeakableAnswer}
            onDetailedContentChange={setDetailedContent}
            errors={errors}
            selectionMode={citationSelectionMode}
            onTextSelected={(selectedText) => {
              setCitationSelectionMode(false);
              setCitationTargetContext(selectedText.substring(0, 150)); // Respect max length
              // Scroll back to citations section with the selected text
              const citationsSection = document.querySelector('[data-citations-section]');
              if (citationsSection) {
                citationsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              toast.success(`Citation target set: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`);
            }}
            onCancelSelection={() => {
              setCitationSelectionMode(false);
              toast.info("Text selection cancelled");
            }}
          />
        </div>

        {/* Citation Replacement Tool - Always show helper */}
        {detailedContent.includes('[CITATION_NEEDED]') ? (
          <CitationReplacer
            content={detailedContent}
            headline={headline}
            language={language}
            category={category}
            onContentUpdate={setDetailedContent}
          />
        ) : detailedContent && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Need citations?</strong> Add{' '}
                <code className="bg-blue-100 px-2 py-0.5 rounded font-mono text-xs">
                  [CITATION_NEEDED]
                </code>{' '}
                markers in your content where claims need sources, then use AI to find them automatically.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Citation Quality Validation */}
        {detailedContent && !detailedContent.includes('[CITATION_NEEDED]') && (
          <CitationValidation
            content={detailedContent}
            externalCitations={externalCitations}
            language={language}
          />
        )}

        {/* Section 4: Media */}
        <Card>
          <CardHeader>
            <CardTitle>Featured Image & Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIImageGenerator
              headline={headline}
              imageUrl={featuredImageUrl}
              imageAlt={featuredImageAlt}
              onImageChange={(url, alt) => {
                setFeaturedImageUrl(url);
                setFeaturedImageAlt(alt);
              }}
              onGeneratingChange={(generating) => {
                if (generating) {
                  setIsImageGenerating(true);
                } else {
                  // Add 500ms delay after generation completes to ensure state sync
                  setTimeout(() => setIsImageGenerating(false), 500);
                }
              }}
              onImageUpload={(file) => handleImageUpload(file, setFeaturedImageUrl)}
              imageUploading={imageUploading}
            />
            {errors.featuredImageUrl && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.featuredImageUrl}
              </p>
            )}
            {errors.featuredImageAlt && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.featuredImageAlt}
              </p>
            )}

            <div>
              <Label htmlFor="featuredImageCaption">Featured Image Caption (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="featuredImageCaption"
                  value={featuredImageCaption}
                  onChange={(e) => setFeaturedImageCaption(e.target.value)}
                  placeholder="Optional caption for the image"
                  className="flex-1"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleGenerateCaption}
                        disabled={isCaptionGenerating || !headline.trim()}
                      >
                        {isCaptionGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Generate caption with AI</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Caption will appear below the image on article pages
              </p>
            </div>

            <DiagramGenerator
              articleContent={detailedContent}
              headline={headline}
              currentMermaidCode={diagramMermaidCode}
              currentDescription={diagramDescription}
              onDiagramGenerated={(mermaidCode, description) => {
                setDiagramMermaidCode(mermaidCode);
                setDiagramDescription(description);
              }}
            />
          </CardContent>
        </Card>

        {/* Section 5: E-E-A-T Attribution */}
        <EEATSection
          authors={authors}
          authorId={authorId}
          reviewerId={reviewerId}
          datePublished={article?.date_published || ""}
          dateModified={article?.date_modified || ""}
          readTime={Math.ceil(contentWords / 200)}
          onAuthorChange={setAuthorId}
          onReviewerChange={setReviewerId}
          errors={errors}
        />

        {/* Section 6: External Citations */}
        <div data-citations-section>
          <ExternalCitationsSection
            citations={externalCitations}
            onCitationsChange={setExternalCitations}
            errors={errors}
            articleContent={detailedContent}
            headline={headline}
            language={language}
            targetContext={citationTargetContext}
            onTargetContextChange={setCitationTargetContext}
            onRequestTextSelection={() => {
              setCitationSelectionMode(true);
              // Scroll to content section
              const contentSection = document.querySelector('[data-content-section]');
              if (contentSection) {
                contentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          />
        </div>

        {/* Section 6.5: Citation Health Status */}
        {isEditing && (
          <CitationHealthStatus
            articleId={id!}
            externalCitations={externalCitations}
          />
        )}

        {/* Section 7: Internal Links */}
        <InternalLinksSection
          links={internalLinks}
          onLinksChange={setInternalLinks}
          articleContent={detailedContent}
          headline={headline}
          currentArticleId={id}
          language={language}
        />

        {/* Section 7.5: Link Validation & Discovery (AI-Powered) */}
        {isEditing && (
          <LinkValidationPanel
            articleId={id!}
            articleSlug={slug}
          />
        )}

        {/* Section 8: Related Articles */}
        <RelatedArticlesSection
          articles={publishedArticles}
          selectedIds={relatedArticleIds}
          onSelectedIdsChange={setRelatedArticleIds}
        />

        {/* Section 9: Funnel CTA Articles */}
        <FunnelCTASection
          funnelStage={funnelStage}
          articles={publishedArticles}
          selectedIds={ctaArticleIds}
          onSelectedIdsChange={setCtaArticleIds}
        />

        {/* Section 10: QA Entities */}
        <QASection
          qaEntities={qaEntities}
          onQaEntitiesChange={setQaEntities}
        />

        {/* Section 11: Translations */}
        <TranslationsSection
          currentLanguage={language}
          currentSlug={slug}
          translations={translations}
          articles={allArticles}
          onTranslationsChange={setTranslations}
          onCreateTranslation={(lang) => {
            toast.info(`Creating ${lang} translation - coming soon`);
          }}
          hasNoTranslations={Object.keys(translations).length === 0}
          isPublished={status === "published"}
        />

        {/* Section 12: JSON-LD Schema Preview */}
        <SchemaPreviewSection
          article={{
            slug,
            headline,
            meta_description: metaDescription,
            category,
            featured_image_url: featuredImageUrl,
            detailed_content: detailedContent,
            author_id: authorId,
            reviewer_id: reviewerId,
            date_published: article?.date_published || "",
            date_modified: article?.date_modified || "",
            qa_entities: qaEntities,
            external_citations: externalCitations,
            status,
          }}
          author={authors?.find(a => a.id === authorId) || null}
          reviewer={authors?.find(a => a.id === reviewerId) || null}
        />

        {/* Validation Summary Alert */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot Save Article</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Please fix the following issues:</p>
              <ul className="list-disc list-inside space-y-1">
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field} className="text-sm">{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <TooltipProvider>
          <div className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    onClick={() => saveMutation.mutate('draft')}
                    disabled={saveMutation.isPending || isImageGenerating}
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save as Draft
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {(saveMutation.isPending || isImageGenerating) && (
                <TooltipContent>
                  {isImageGenerating && "Waiting for image generation to complete..."}
                  {saveMutation.isPending && "Saving in progress..."}
                </TooltipContent>
              )}
            </Tooltip>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => toast.info("Preview feature coming soon")}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={() => saveMutation.mutate('published')}
                      disabled={saveMutation.isPending || isImageGenerating}
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Publish Article
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {(saveMutation.isPending || isImageGenerating) && (
                  <TooltipContent>
                    {isImageGenerating && "Waiting for image generation to complete..."}
                    {saveMutation.isPending && "Publishing in progress..."}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </AdminLayout>
  );
};

export default ArticleEditor;
