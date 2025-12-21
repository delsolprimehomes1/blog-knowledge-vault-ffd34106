import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Save, MapPin, Image as ImageIcon, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OptimizedImage } from "@/components/OptimizedImage";

type Language = 'en' | 'de' | 'nl' | 'fr' | 'pl' | 'sv' | 'da' | 'hu' | 'fi' | 'no';

const languageOptions = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'de', label: '🇩🇪 German' },
  { value: 'nl', label: '🇳🇱 Dutch' },
  { value: 'fr', label: '🇫🇷 French' },
  { value: 'pl', label: '🇵🇱 Polish' },
  { value: 'sv', label: '🇸🇪 Swedish' },
  { value: 'da', label: '🇩🇰 Danish' },
  { value: 'hu', label: '🇭🇺 Hungarian' },
  { value: 'fi', label: '🇫🇮 Finnish' },
  { value: 'no', label: '🇳🇴 Norwegian' },
];

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
  const [language, setLanguage] = useState<Language>("en");
  const [goal, setGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPage, setGeneratedPage] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const selectedCity = city === 'custom' ? customCity : city;

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
    setGeneratedImage(null);

    try {
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
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate location page');
    } finally {
      setIsGenerating(false);
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
      
      // Update the generated page with the new image data
      setGeneratedPage((prev: any) => ({
        ...prev,
        featured_image_url: data.image.url,
        featured_image_alt: data.image.alt,
        featured_image_caption: data.image.caption,
        featured_image_width: data.image.width,
        featured_image_height: data.image.height,
      }));
      
      toast.success('Location image generated successfully!');
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSave = async () => {
    if (!generatedPage) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('location_pages')
        .insert({
          ...generatedPage,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Location page saved as draft!');
      navigate(`/admin/articles`); // TODO: Create location page editor
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save location page');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedPage) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('location_pages')
        .upsert({
          ...generatedPage,
          status: 'published',
          date_published: generatedPage.date_published || now,
          date_modified: now,
        }, { 
          onConflict: 'topic_slug',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;

      setIsPublished(true);
      toast.success('Location page published successfully!', {
        action: {
          label: 'View Page',
          onClick: () => window.open(`/locations/${generatedPage.city_slug}/${generatedPage.topic_slug}`, '_blank'),
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

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Location Page
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Preview</CardTitle>
              <CardDescription>
                Review the generated content before saving.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedPage ? (
                <div className="space-y-6">
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

                  {/* Success Message */}
                  {isPublished && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="font-semibold text-green-700 dark:text-green-400">Published Successfully!</p>
                      <Button
                        variant="link"
                        className="text-green-600 dark:text-green-400"
                        onClick={() => window.open(`/locations/${generatedPage.city_slug}/${generatedPage.topic_slug}`, '_blank')}
                      >
                        View Published Page →
                      </Button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving}
                      variant="outline"
                      className="flex-1"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save as Draft
                    </Button>
                    <Button 
                      onClick={handlePublish} 
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      {isPublished ? 'Update' : 'Publish'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Generate a location page to see the preview</p>
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
