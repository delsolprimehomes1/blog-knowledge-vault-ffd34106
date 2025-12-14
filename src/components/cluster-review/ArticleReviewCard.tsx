import { BlogArticle, ExternalCitation, InternalLink } from "@/types/blog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CharacterCounter } from "./CharacterCounter";
import { GooglePreview } from "./GooglePreview";
import { CitationCard } from "./CitationCard";
import { InternalLinkCard } from "./InternalLinkCard";
import { AuthorSuggestionCard } from "./AuthorSuggestionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import { countWords } from "@/lib/articleUtils";
import { LazyRichTextEditor } from "@/components/LazyRichTextEditor";
import { AIImageGenerator } from "@/components/AIImageGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface ArticleReviewCardProps {
  article: Partial<BlogArticle>;
  allArticles?: any[];
  categories?: Array<{ id: string; name: string }>;
  authors?: Array<{ 
    id: string; 
    name: string; 
    job_title: string; 
    photo_url: string; 
    bio: string; 
    credentials: string[]; 
    years_experience: number;
  }>;
  publishedArticles?: Array<{ 
    id: string; 
    headline: string; 
    category: string; 
    funnel_stage: string;
  }>;
  onRegenerate: (field: string) => Promise<void>;
  onEdit: (updates: Partial<BlogArticle>) => void;
  onAccept: () => void;
  onRemoveCitation: (index: number) => void;
  onRemoveInternalLink: (index: number) => void;
  isRegenerating?: boolean;
}

export const ArticleReviewCard = ({
  article,
  categories,
  authors,
  onRegenerate,
  onEdit,
  onAccept,
  onRemoveCitation,
  onRemoveInternalLink,
  isRegenerating = false,
}: ArticleReviewCardProps) => {
  const [expandedContent, setExpandedContent] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const contentWords = countWords(article?.detailed_content?.replace(/<[^>]*>/g, ' ').trim() || "");
  const targetKeyword = article?.meta_title?.split(' ')[0] || '';

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('article-images')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(fileName);
      
      onEdit({ 
        featured_image_url: publicUrl,
        featured_image_alt: article.headline || ''
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setImageUploading(false);
    }
  };

  const getWordCountColor = (count: number) => {
    if (count < 1500) return 'text-destructive';
    if (count < 2000) return 'text-amber-600';
    if (count <= 2500) return 'text-green-600';
    if (count <= 3000) return 'text-amber-600';
    return 'text-destructive';
  };

  const citationStatus = (article as any).citation_status;
  const citationFailureReason = (article as any).citation_failure_reason;

  return (
    <div className="space-y-6">
      {/* Citation Status Banner */}
      {citationStatus === 'failed' && (
        <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive mb-1">Missing Required Citations</h4>
              <p className="text-sm text-muted-foreground mb-2">
                This article failed citation requirements and cannot be published until fixed.
              </p>
              {citationFailureReason && (
                <p className="text-xs text-muted-foreground italic">
                  Reason: {citationFailureReason}
                </p>
              )}
              <p className="text-sm font-medium mt-2">
                ⚠️ Manually add at least 2 verified, non-competitor citations before publishing.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {citationStatus === 'verified' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Citations Verified ✓
            </span>
          </div>
        </div>
      )}
      
      <Accordion type="multiple" defaultValue={["seo", "image", "content", "links"]} className="space-y-4">
        {/* SEO Section */}
        <AccordionItem value="seo" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <h3 className="text-lg font-semibold">📝 Headline & SEO</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-6">
            {/* Headline */}
            <div className="space-y-2">
              <Label>Headline</Label>
              <div className="flex gap-2">
                <Input 
                  value={article.headline || ''}
                  onChange={(e) => onEdit({ headline: e.target.value })}
                  className="flex-1"
                />
                <Button 
                  onClick={() => onRegenerate('headline')}
                  size="icon"
                  variant="outline"
                  disabled={isRegenerating}
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={article.category}
                onValueChange={(value) => onEdit({ category: value })}
              >
                <SelectTrigger>
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

            {/* Slug */}
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input 
                value={article.slug || ''}
                onChange={(e) => onEdit({ slug: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                https://www.delsolprimehomes.com/blog/{article.slug || 'your-slug'}
              </p>
            </div>

            {/* Meta Title */}
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <div className="flex gap-2">
                <Input 
                  value={article.meta_title || ''}
                  onChange={(e) => onEdit({ meta_title: e.target.value })}
                  maxLength={60}
                  className="flex-1"
                />
                <Button 
                  onClick={() => onRegenerate('meta_title')}
                  size="icon"
                  variant="outline"
                  disabled={isRegenerating}
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <CharacterCounter current={article.meta_title?.length || 0} max={60} type="title" />
            </div>

            {/* Meta Description */}
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <div className="flex gap-2">
                <Textarea 
                  value={article.meta_description || ''}
                  onChange={(e) => onEdit({ meta_description: e.target.value })}
                  maxLength={160}
                  rows={3}
                  className="flex-1"
                />
                <Button 
                  onClick={() => onRegenerate('meta_description')}
                  size="icon"
                  variant="outline"
                  disabled={isRegenerating}
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <CharacterCounter current={article.meta_description?.length || 0} max={160} type="description" />
            </div>

            {/* Google Preview */}
            <div className="space-y-2">
              <Label>Google Search Preview</Label>
              <GooglePreview 
                title={article.meta_title || ''}
                description={article.meta_description || ''}
                slug={article.slug || ''}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Featured Image Section */}
        <AccordionItem value="image" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <h3 className="text-lg font-semibold">🖼️ Featured Image</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <AIImageGenerator
              headline={article.headline || ''}
              imageUrl={article.featured_image_url || ''}
              imageAlt={article.featured_image_alt || ''}
              onImageChange={(url, alt) => onEdit({ 
                featured_image_url: url, 
                featured_image_alt: alt 
              })}
              onImageUpload={handleImageUpload}
              imageUploading={imageUploading}
            />
            
            <div className="space-y-2">
              <Label>Image Caption (Optional)</Label>
              <Input
                value={article.featured_image_caption || ''}
                onChange={(e) => onEdit({ featured_image_caption: e.target.value })}
                placeholder="Image caption"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* E-E-A-T Attribution Section */}
        <AccordionItem value="eeat" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <h3 className="text-lg font-semibold">👤 E-E-A-T Attribution</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            {article.author_id && authors ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">✅ Accepted Attribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Author:</strong> {authors.find(a => a.id === article.author_id)?.name || 'Unknown'}
                    </p>
                    {article.reviewer_id && (
                      <p className="text-sm">
                        <strong>Reviewer:</strong> {authors.find(a => a.id === article.reviewer_id)?.name || 'Unknown'}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No author assigned yet. Click "Get New Suggestions" to get AI-powered recommendations.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Content Section */}
        <AccordionItem value="content" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <h3 className="text-lg font-semibold">📄 Content</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-6">
            {/* Speakable Answer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Speakable Answer</Label>
                <Button 
                  onClick={() => onRegenerate('speakable')}
                  size="sm"
                  variant="outline"
                  disabled={isRegenerating}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>
              <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎙️</span>
                  <Textarea 
                    value={article.speakable_answer || ''}
                    onChange={(e) => onEdit({ speakable_answer: e.target.value })}
                    rows={3}
                    className="bg-transparent border-0 p-0 resize-none"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {countWords(article.speakable_answer || '')} words (target: 50-80)
              </p>
            </div>

            {/* Detailed Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Detailed Content</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${getWordCountColor(contentWords)}`}>
                    {contentWords} words
                  </span>
                  <Badge variant="secondary">{Math.ceil(contentWords / 200)} min read</Badge>
                </div>
              </div>
              
              {expandedContent ? (
                <div className="space-y-2">
                  <LazyRichTextEditor
                    content={article.detailed_content || ''}
                    onChange={(content) => onEdit({ detailed_content: content })}
                  />
                  <Button 
                    onClick={() => setExpandedContent(false)}
                    variant="outline"
                    size="sm"
                  >
                    Collapse Editor
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div 
                    className="p-4 border rounded-lg bg-muted/30 prose prose-sm max-w-none line-clamp-6"
                    dangerouslySetInnerHTML={{ __html: article.detailed_content?.substring(0, 1000) + '...' || '' }}
                  />
                  <Button 
                    onClick={() => setExpandedContent(true)}
                    variant="outline"
                    size="sm"
                  >
                    Expand Full Content
                  </Button>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Links Section */}
        <AccordionItem value="links" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <h3 className="text-lg font-semibold">🔗 Internal & External Links</h3>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerate('links');
                }}
                size="sm"
                variant="outline"
                disabled={isRegenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                Refind Links
              </Button>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-6">
            {/* External Citations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">External Citations</h4>
                <Badge variant="secondary">{article.external_citations?.length || 0} citations</Badge>
              </div>
              {article.external_citations && article.external_citations.length > 0 ? (
                <div className="space-y-2">
                  {(article.external_citations as unknown as ExternalCitation[]).map((citation, i) => (
                    <CitationCard
                      key={i}
                      citation={citation}
                      index={i}
                      onRemove={() => onRemoveCitation(i)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No external citations yet.</p>
              )}
            </div>

            {/* Internal Links */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Internal Links</h4>
                <Badge variant="secondary">{article.internal_links?.length || 0} links</Badge>
              </div>
              {article.internal_links && article.internal_links.length > 0 ? (
                <div className="space-y-2">
                  {(article.internal_links as unknown as InternalLink[]).map((link, i) => (
                    <InternalLinkCard
                      key={i}
                      link={link}
                      index={i}
                      onRemove={() => onRemoveInternalLink(i)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No internal links yet.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Accept Button */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <Button 
            onClick={onAccept}
            size="lg"
            className="w-full"
          >
            <Check className="h-5 w-5 mr-2" />
            Accept & Save Article
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
