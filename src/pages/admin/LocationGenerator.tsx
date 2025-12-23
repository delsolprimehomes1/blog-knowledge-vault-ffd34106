import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Save, MapPin, Image as ImageIcon, RefreshCw, CheckCircle, Globe, Languages } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OptimizedImage } from "@/components/OptimizedImage";

// Aligned with src/types/hreflang.ts SUPPORTED_LANGUAGES
const SUPPORTED_LANGUAGES = [
  { code: 'en', label: '🇬🇧 English', name: 'English' },
  { code: 'nl', label: '🇳🇱 Dutch', name: 'Dutch' },
  { code: 'es', label: '🇪🇸 Spanish', name: 'Spanish' },
  { code: 'de', label: '🇩🇪 German', name: 'German' },
  { code: 'fr', label: '🇫🇷 French', name: 'French' },
  { code: 'sv', label: '🇸🇪 Swedish', name: 'Swedish' },
  { code: 'pl', label: '🇵🇱 Polish', name: 'Polish' },
  { code: 'no', label: '🇳🇴 Norwegian', name: 'Norwegian' },
  { code: 'fi', label: '🇫🇮 Finnish', name: 'Finnish' },
  { code: 'da', label: '🇩🇰 Danish', name: 'Danish' },
];

type LanguageCode = 'en' | 'nl' | 'es' | 'de' | 'fr' | 'sv' | 'pl' | 'no' | 'fi' | 'da';

const intentOptions = [
  { value: 'buying-property', label: 'Buying Property' },
  { value: 'best-areas-families', label: 'Best Areas for Families' },
  { value: 'best-areas-investors', label: 'Best Areas for Investors' },
  { value: 'best-areas-expats', label: 'Best Areas for Expats' },
  { value: 'best-areas-retirees', label: 'Best Areas for Retirees' },
  { value: 'cost-of-living', label: 'Cost of Living' },
  { value: 'cost-of-property', label: 'Cost of Property' },
  { value: 'investment-guide', label: 'Investment Guide' },
  { value: 'relocation-guide', label: 'Relocation Guide' },
];

const cityOptions = [
  'Marbella',
  'Estepona',
  'Fuengirola',
  'Benalmádena',
  'Mijas',
  'Sotogrande',
  'Casares',
  'Torremolinos',
  'Manilva',
  'Málaga',
  'Nerja',
  'Vélez-Málaga',
  'Benahavís',
  'Monda',
  'Ojén',
];

interface GeneratedImage {
  url: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

const LocationGenerator = () => {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [intentType, setIntentType] = useState("");
  const [goal, setGoal] = useState("");
  
  // Single language mode
  const [language, setLanguage] = useState<LanguageCode>("en");
  
  // Batch multilingual mode
  const [batchMode, setBatchMode] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<LanguageCode[]>(['en']);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPage, setGeneratedPage] = useState<any>(null);
  const [generatedPages, setGeneratedPages] = useState<any[]>([]);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, status: '' });
  
  const selectedCity = city === 'custom' ? customCity : city;

  const handleLanguageToggle = (langCode: LanguageCode) => {
    if (langCode === 'en') return; // English is always required
    
    setSelectedLanguages(prev => 
      prev.includes(langCode)
        ? prev.filter(l => l !== langCode)
        : [...prev, langCode]
    );
  };

  const selectAllLanguages = () => {
    setSelectedLanguages(SUPPORTED_LANGUAGES.map(l => l.code as LanguageCode));
  };

  const deselectAllLanguages = () => {
    setSelectedLanguages(['en']); // Keep English
  };

  const handleGenerate = async () => {
    if (!selectedCity.trim()) {
      toast.error("Please select or enter a city");
      return;
    }
    if (!intentType) {
      toast.error("Please select a page intent");
      return;
    }

    setIsGenerating(true);
    setGeneratedPage(null);
    setGeneratedPages([]);
    setGeneratedImage(null);
    setIsPublished(false);

    try {
      if (batchMode) {
        setGenerationProgress({ 
          current: 0, 
          total: selectedLanguages.length, 
          status: 'Generating multilingual pages...' 
        });

        const { data, error } = await supabase.functions.invoke('generate-location-page', {
          body: {
            city: selectedCity,
            intent_type: intentType,
            goal: goal || undefined,
            batch_mode: true,
            languages: selectedLanguages,
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Generation failed');

        setGeneratedPages(data.locationPages);
        setGeneratedPage(data.locationPages[0]); // Show English version in preview
        toast.success(`Generated ${data.locationPages.length} language versions!`);
      } else {
        const { data, error } = await supabase.functions.invoke('generate-location-page', {
          body: {
            city: selectedCity,
            intent_type: intentType,
            goal: goal || undefined,
            language,
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Generation failed');

        setGeneratedPage(data.locationPage);
        toast.success('Location page generated successfully!');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate location page');
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0, status: '' });
    }
  };

  const handleGenerateImage = async () => {
    if (!generatedPage) return;

    setIsGeneratingImage(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-location-image', {
        body: {
          city_name: generatedPage.city_name,
          city_slug: generatedPage.city_slug,
          topic_slug: generatedPage.topic_slug,
          intent_type: generatedPage.intent_type,
          image_prompt: generatedPage.image_prompt,
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Image generation failed');

      setGeneratedImage(data.image);
      
      // Update all generated pages with the new image data
      const imageData = {
        featured_image_url: data.image.url,
        featured_image_alt: data.image.alt,
        featured_image_caption: data.image.caption,
        featured_image_width: data.image.width,
        featured_image_height: data.image.height,
      };
      
      setGeneratedPage((prev: any) => ({ ...prev, ...imageData }));
      setGeneratedPages((prev) => prev.map(p => ({ ...p, ...imageData })));
      
      toast.success('Location image generated successfully!');
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSave = async () => {
    const pagesToSave = batchMode && generatedPages.length > 0 ? generatedPages : (generatedPage ? [generatedPage] : []);
    if (pagesToSave.length === 0) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('location_pages')
        .insert(pagesToSave.map(p => ({ ...p, status: 'draft' })))
        .select();

      if (error) throw error;

      toast.success(`Saved ${pagesToSave.length} location page(s) as draft!`);
      navigate(`/admin/articles`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save location page');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    const pagesToPublish = batchMode && generatedPages.length > 0 ? generatedPages : (generatedPage ? [generatedPage] : []);
    if (pagesToPublish.length === 0) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      
      for (const page of pagesToPublish) {
        const { error } = await supabase
          .from('location_pages')
          .upsert({
            ...page,
            status: 'published',
            date_published: page.date_published || now,
            date_modified: now,
          }, { 
            onConflict: 'topic_slug',
            ignoreDuplicates: false 
          });

        if (error) throw error;
      }

      setIsPublished(true);
      toast.success(`Published ${pagesToPublish.length} location page(s) successfully!`, {
        action: {
          label: 'View Page',
          onClick: () => window.open(`/${generatedPage.language}/locations/${generatedPage.city_slug}/${generatedPage.topic_slug}`, '_blank'),
        },
      });
    } catch (error) {
      console.error('Publish error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish location page');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Location Intelligence Generator</h1>
          <p className="text-muted-foreground">
            Generate AI-citation-ready location pages with GEO-optimized images for ChatGPT, Perplexity, and Google AI Overviews.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Generator Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Generate Location Page
              </CardTitle>
              <CardDescription>
                Select a city and intent to generate a comprehensive location intelligence page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* City Selection */}
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="custom">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                {city === 'custom' && (
                  <Input
                    placeholder="Enter city name..."
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Intent Type */}
              <div className="space-y-2">
                <Label htmlFor="intent">Page Intent</Label>
                <Select value={intentType} onValueChange={setIntentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select page intent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {intentOptions.map((intent) => (
                      <SelectItem key={intent.value} value={intent.value}>
                        {intent.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Goal (optional) */}
              <div className="space-y-2">
                <Label htmlFor="goal">Target Audience (optional)</Label>
                <Input
                  id="goal"
                  placeholder="e.g., Families, Investors, Retirees..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>

              {/* Batch Mode Toggle */}
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
                <Checkbox
                  id="batch-mode"
                  checked={batchMode}
                  onCheckedChange={(checked) => setBatchMode(checked === true)}
                />
                <Label htmlFor="batch-mode" className="flex items-center gap-2 cursor-pointer">
                  <Languages className="w-4 h-4 text-primary" />
                  <span>Generate in multiple languages (batch mode)</span>
                </Label>
              </div>

              {/* Language Selection */}
              {batchMode ? (
                <div className="space-y-3 p-4 border rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Select Languages ({selectedLanguages.length}/10)
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllLanguages}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deselectAllLanguages}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <div
                        key={lang.code}
                        className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                          selectedLanguages.includes(lang.code as LanguageCode)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        } ${lang.code === 'en' ? 'opacity-75' : ''}`}
                        onClick={() => handleLanguageToggle(lang.code as LanguageCode)}
                      >
                        <Checkbox
                          checked={selectedLanguages.includes(lang.code as LanguageCode)}
                          disabled={lang.code === 'en'}
                          className="pointer-events-none"
                        />
                        <span className="text-sm">{lang.label}</span>
                        {lang.code === 'en' && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    English is always generated first as the source language. Other languages are translated from English.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Generate Button */}
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !selectedCity || !intentType}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {batchMode 
                      ? `Generating ${selectedLanguages.length} languages...`
                      : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {batchMode 
                      ? `Generate in ${selectedLanguages.length} Languages`
                      : 'Generate Location Page'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Generated Preview</span>
                {batchMode && generatedPages.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {generatedPages.length} languages
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review the generated content before saving.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedPage ? (
                <div className="space-y-6">
                  {/* Language badges for batch mode */}
                  {batchMode && generatedPages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {generatedPages.map((page) => {
                        const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === page.language);
                        return (
                          <Badge
                            key={page.language}
                            variant={page.language === generatedPage.language ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => setGeneratedPage(page)}
                          >
                            {langInfo?.label || page.language}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Generated Image or Generate Button */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Featured Image (GEO-Optimized)
                    </Label>
                    
                    {generatedImage ? (
                      <div className="space-y-2">
                        <div className="relative aspect-video rounded-lg overflow-hidden border">
                          <OptimizedImage
                            src={generatedImage.url}
                            alt={generatedImage.alt}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <span className="bg-green-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Generated
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><strong>Alt:</strong> {generatedImage.alt}</p>
                          <p><strong>Caption:</strong> {generatedImage.caption}</p>
                          <p><strong>Size:</strong> {generatedImage.width}×{generatedImage.height}</p>
                        </div>
                        <Button 
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImage}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          {isGeneratingImage ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate Image
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <ImageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground mb-3">
                          No image generated yet. Generate a location-specific image with AI.
                        </p>
                        <Button 
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImage}
                          variant="outline"
                          className="w-full"
                        >
                          {isGeneratingImage ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating Image...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Generate Location Image
                            </>
                          )}
                        </Button>
                        {generatedPage.image_prompt && (
                          <p className="text-xs text-muted-foreground mt-3 italic">
                            Prompt: {generatedPage.image_prompt}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Headline */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Headline</Label>
                    <p className="text-xl font-bold">{generatedPage.headline}</p>
                  </div>

                  {/* Meta */}
                  <div className="grid gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Meta Title</Label>
                      <p className="text-sm">{generatedPage.meta_title}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Meta Description</Label>
                      <p className="text-sm text-muted-foreground">{generatedPage.meta_description}</p>
                    </div>
                  </div>

                  {/* Speakable Answer */}
                  <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg">
                    <Label className="text-xs text-muted-foreground">Speakable Answer (AI-Citation Ready)</Label>
                    <p className="text-sm mt-1">{generatedPage.speakable_answer}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-primary">{generatedPage.best_areas?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Areas</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-primary">{generatedPage.cost_breakdown?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Cost Items</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-primary">{generatedPage.qa_entities?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">FAQs</p>
                    </div>
                  </div>

                  {/* hreflang info for batch mode */}
                  {batchMode && generatedPages.length > 0 && generatedPages[0]?.hreflang_group_id && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        All {generatedPages.length} language versions share hreflang_group_id for SEO linking
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || isPublished}
                      variant="outline"
                      className="flex-1"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save as Draft{batchMode && generatedPages.length > 1 ? ` (${generatedPages.length})` : ''}
                    </Button>
                    <Button
                      onClick={handlePublish}
                      disabled={isSaving || isPublished}
                      className="flex-1"
                    >
                      {isPublished ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Published
                        </>
                      ) : isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Publish{batchMode && generatedPages.length > 1 ? ` All (${generatedPages.length})` : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Generated content will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LocationGenerator;
