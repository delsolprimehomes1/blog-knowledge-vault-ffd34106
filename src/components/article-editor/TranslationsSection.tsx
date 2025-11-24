import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Languages, Code, Copy, Check, AlertCircle, Plus } from "lucide-react";
import { Language } from "@/types/blog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Article {
  id: string;
  slug: string;
  headline: string;
  language: string;
}

interface TranslationsSectionProps {
  currentLanguage: Language;
  currentSlug: string;
  translations: Record<string, string>;
  articles: Article[] | undefined;
  onTranslationsChange: (translations: Record<string, string>) => void;
  onCreateTranslation: (language: Language) => void;
  hasNoTranslations: boolean;
  isPublished: boolean;
}

const LANGUAGES: Array<{ code: Language; flag: string; name: string }> = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "de", flag: "🇩🇪", name: "German" },
  { code: "nl", flag: "🇳🇱", name: "Dutch" },
  { code: "fr", flag: "🇫🇷", name: "French" },
  { code: "pl", flag: "🇵🇱", name: "Polish" },
  { code: "sv", flag: "🇸🇪", name: "Swedish" },
  { code: "da", flag: "🇩🇰", name: "Danish" },
  { code: "hu", flag: "🇭🇺", name: "Hungarian" },
];

export const TranslationsSection = ({
  currentLanguage,
  currentSlug,
  translations,
  articles,
  onTranslationsChange,
  onCreateTranslation,
  hasNoTranslations,
  isPublished,
}: TranslationsSectionProps) => {
  const [open, setOpen] = useState(false);
  const [tempTranslations, setTempTranslations] = useState(translations);
  const [showHreflang, setShowHreflang] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentLangData = LANGUAGES.find(l => l.code === currentLanguage);
  const translationCount = Object.keys(translations).length;
  const totalLanguages = LANGUAGES.length;

  const handleSave = async () => {
    // 1. Save current article translations
    onTranslationsChange(tempTranslations);
    
    // 2. Build the full translation network
    const translationNetwork: Record<string, string> = {
      [currentLanguage]: currentSlug,
      ...tempTranslations
    };
    
    // 3. Update all linked articles to reference each other bidirectionally
    const updatePromises = Object.entries(tempTranslations).map(async ([lang, slug]) => {
      // Build the translations object for this linked article
      const linkedArticleTranslations: Record<string, string> = {};
      
      Object.entries(translationNetwork).forEach(([l, s]) => {
        if (l !== lang) { // Don't include self
          linkedArticleTranslations[l] = s;
        }
      });
      
      // Update the linked article
      return supabase
        .from('blog_articles')
        .update({ translations: linkedArticleTranslations })
        .eq('slug', slug);
    });
    
    try {
      await Promise.all(updatePromises);
      setOpen(false);
      toast.success("Translations synced bidirectionally across all articles");
    } catch (error) {
      console.error('Error syncing translations:', error);
      toast.error("Failed to sync translations");
    }
  };

  const handleLinkArticle = (language: Language, slug: string) => {
    setTempTranslations({ ...tempTranslations, [language]: slug });
  };

  const handleUnlink = (language: Language) => {
    const updated = { ...tempTranslations };
    delete updated[language];
    setTempTranslations(updated);
  };

  const getArticlesForLanguage = (language: Language) => {
    return articles?.filter(a => a.language === language && a.slug !== currentSlug) || [];
  };

  const getLinkedArticle = (language: Language) => {
    const slug = tempTranslations[language];
    return articles?.find(a => a.slug === slug);
  };

  const generateHreflangTags = () => {
    const tags = [`<link rel="alternate" hreflang="${currentLanguage}" href="https://example.com/${currentSlug}" />`];
    
    Object.entries(translations).forEach(([lang, slug]) => {
      tags.push(`<link rel="alternate" hreflang="${lang}" href="https://example.com/${slug}" />`);
    });
    
    tags.push(`<link rel="alternate" hreflang="x-default" href="https://example.com/${currentSlug}" />`);
    
    return tags.join("\n");
  };

  const copyHreflang = () => {
    navigator.clipboard.writeText(generateHreflangTags());
    setCopied(true);
    toast.success("Hreflang tags copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Translations</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Link this article to its translations in other languages
            </p>
          </div>
          <Badge variant={translationCount > 0 ? "default" : "secondary"}>
            {translationCount}/{totalLanguages - 1} linked
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
          <div className="flex items-center gap-3">
            <Languages className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Current Language</p>
              <p className="text-2xl font-bold">
                {currentLangData?.flag} {currentLangData?.name}
              </p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setTempTranslations(translations)}>
                <Languages className="h-4 w-4 mr-2" />
                Link Translations
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Translations</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {LANGUAGES.filter(l => l.code !== currentLanguage).map((lang) => {
                  const linkedArticle = getLinkedArticle(lang.code);
                  const availableArticles = getArticlesForLanguage(lang.code);

                  return (
                    <div key={lang.code} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">
                          {lang.flag} {lang.name}
                        </Label>
                        {linkedArticle && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlink(lang.code)}
                          >
                            Unlink
                          </Button>
                        )}
                      </div>

                      {linkedArticle ? (
                        <div className="p-3 bg-accent rounded-md">
                          <p className="text-sm font-medium">{linkedArticle.headline}</p>
                          <p className="text-xs text-muted-foreground">/{linkedArticle.slug}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {availableArticles.length > 0 ? (
                            <Select onValueChange={(value) => handleLinkArticle(lang.code, value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select existing article" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableArticles.map((article) => (
                                  <SelectItem key={article.id} value={article.slug}>
                                    {article.headline}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-muted-foreground">No articles in this language yet</p>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onCreateTranslation(lang.code);
                              setOpen(false);
                            }}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Translation
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    Save Translations
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isPublished && hasNoTranslations && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">No translations linked</p>
              <p className="text-xs mt-1">This published article has no translations. Consider adding translations to reach a wider audience.</p>
            </div>
          </div>
        )}

        {Object.keys(translations).length > 0 && (
          <div className="space-y-3">
            <Label>Linked Translations ({Object.keys(translations).length})</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(translations).map(([lang, slug]) => {
                const langData = LANGUAGES.find(l => l.code === lang);
                const article = articles?.find(a => a.slug === slug);
                return (
                  <Badge key={lang} variant="secondary" className="text-sm py-2 px-3">
                    {langData?.flag} {langData?.name}
                    {article && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {article.headline}
                      </span>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {Object.keys(translations).length > 0 && (
          <Collapsible open={showHreflang} onOpenChange={setShowHreflang}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full">
                <Code className="h-4 w-4 mr-2" />
                {showHreflang ? "Hide" : "Show"} Hreflang Tags Preview
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 relative">
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                  {generateHreflangTags()}
                </pre>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={copyHreflang}
                  className="absolute top-2 right-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};
