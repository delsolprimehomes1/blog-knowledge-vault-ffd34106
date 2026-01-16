import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, Save, MapPin, Image as ImageIcon, RefreshCw, CheckCircle, Globe, Languages } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OptimizedImage } from "@/components/OptimizedImage";

// Aligned with src/types/hreflang.ts SUPPORTED_LANGUAGES (uses hu not es)
const SUPPORTED_LANGUAGES = [
  { code: 'en', label: '🇬🇧 English', name: 'English' },
  { code: 'nl', label: '🇳🇱 Dutch', name: 'Dutch' },
  { code: 'hu', label: '🇭🇺 Hungarian', name: 'Hungarian' },
  { code: 'de', label: '🇩🇪 German', name: 'German' },
  { code: 'fr', label: '🇫🇷 French', name: 'French' },
  { code: 'sv', label: '🇸🇪 Swedish', name: 'Swedish' },
  { code: 'pl', label: '🇵🇱 Polish', name: 'Polish' },
  { code: 'no', label: '🇳🇴 Norwegian', name: 'Norwegian' },
  { code: 'fi', label: '🇫🇮 Finnish', name: 'Finnish' },
  { code: 'da', label: '🇩🇰 Danish', name: 'Danish' },
];

type LanguageCode = 'en' | 'nl' | 'hu' | 'de' | 'fr' | 'sv' | 'pl' | 'no' | 'fi' | 'da';

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

interface GenerationJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  languages: string[];
  completed_languages: string[];
  hreflang_group_id: string;
  error_message?: string;
}

// Check if a string is a valid UUID v4
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Generate a proper UUID v4
const generateUUID = (): string => {
  return crypto.randomUUID();
};

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
  
  // Job polling state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState({ 
    current: 0, 
    total: 0, 
    status: '',
    completedLangs: [] as string[]
  });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const selectedCity = city === 'custom' ? customCity : city;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Poll for job completion
  const pollJobStatus = useCallback(async (jobId: string, hreflangGroupId: string, totalLanguages: number) => {
    try {
      const { data: job, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error polling job:', error);
        return;
      }

      const typedJob = job as GenerationJob;
      const completedCount = typedJob.completed_languages?.length || 0;

      // Update progress
      setGenerationProgress({
        current: completedCount,
        total: totalLanguages,
        status: typedJob.status === 'completed' 
          ? 'Complete!' 
          : typedJob.status === 'failed'
          ? 'Failed'
          : `Generating ${completedCount}/${totalLanguages} languages...`,
        completedLangs: typedJob.completed_languages || []
      });

      // Check if completed or failed
      if (typedJob.status === 'completed') {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        // Fetch all generated pages from location_pages
        const { data: pages, error: pagesError } = await supabase
          .from('location_pages')
          .select('*')
          .eq('hreflang_group_id', hreflangGroupId)
          .order('language');

        if (pagesError) {
          console.error('Error fetching generated pages:', pagesError);
          toast.error('Generation completed but failed to fetch pages');
        } else if (pages && pages.length > 0) {
          setGeneratedPages(pages);
          // Show English version in preview (or first available)
          const englishPage = pages.find(p => p.language === 'en') || pages[0];
          setGeneratedPage(englishPage);
          toast.success(`Generated ${pages.length} language versions!`);
        }

        setIsGenerating(false);
        setCurrentJobId(null);

      } else if (typedJob.status === 'failed') {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        toast.error(typedJob.error_message || 'Generation failed');
        setIsGenerating(false);
        setCurrentJobId(null);
      }

    } catch (err) {
      console.error('Polling error:', err);
    }
  }, []);

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
    setCurrentJobId(null);

    try {
      if (batchMode) {
        // BATCH MODE: Fire-and-forget with polling
        setGenerationProgress({ 
          current: 0, 
          total: selectedLanguages.length, 
          status: 'Starting generation...',
          completedLangs: []
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

        // Handle potential timeout errors gracefully (the job continues in background)
        if (error) {
          console.warn('Initial request error (may be timeout, checking job):', error);
        }

        if (data?.status === 'started' && data?.job_id) {
          // Job started successfully - begin polling
          setCurrentJobId(data.job_id);
          const jobId = data.job_id;
          const hreflangGroupId = data.hreflang_group_id;
          const totalLanguages = data.languages?.length || selectedLanguages.length;

          toast.info(`Generation started for ${totalLanguages} languages. Tracking progress...`);

          // Start polling every 3 seconds
          pollingIntervalRef.current = setInterval(() => {
            pollJobStatus(jobId, hreflangGroupId, totalLanguages);
          }, 3000);

          // Also poll immediately
          setTimeout(() => pollJobStatus(jobId, hreflangGroupId, totalLanguages), 1000);

        } else if (data?.error) {
          throw new Error(data.error);
        } else {
          throw new Error('Failed to start generation job');
        }

      } else {
        // SINGLE LANGUAGE MODE: Synchronous
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
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate location page');
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0, status: '', completedLangs: [] });
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
      // For pages already saved via background job, just update status
      if (batchMode && generatedPages.length > 0 && generatedPages[0]?.id) {
        // Pages already exist in DB from background job - just navigate
        toast.success(`${pagesToSave.length} location page(s) already saved as draft!`);
        navigate(`/admin/articles`);
        return;
      }

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
      
      // Fix invalid hreflang_group_id if needed (legacy format like loc_xxx)
      let sharedGroupId: string | null = null;
      if (pagesToPublish.length > 0 && pagesToPublish[0].hreflang_group_id) {
        if (!isValidUUID(pagesToPublish[0].hreflang_group_id)) {
          sharedGroupId = generateUUID();
          console.log(`Fixed invalid hreflang_group_id: ${pagesToPublish[0].hreflang_group_id} → ${sharedGroupId}`);
        }
      }
      
      for (const page of pagesToPublish) {
        const { error } = await supabase
          .from('location_pages')
          .upsert({
            ...page,
            // Use fixed UUID if the original was invalid
            hreflang_group_id: sharedGroupId || page.hreflang_group_id,
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

              {/* Generation Progress (Batch Mode) */}
              {isGenerating && batchMode && generationProgress.total > 0 && (
                <div className="space-y-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{generationProgress.status}</span>
                    <span className="text-sm text-muted-foreground">
                      {generationProgress.current}/{generationProgress.total}
                    </span>
                  </div>
                  <Progress 
                    value={(generationProgress.current / generationProgress.total) * 100} 
                    className="h-2"
                  />
                  {generationProgress.completedLangs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {generationProgress.completedLangs.map(lang => {
                        const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);
                        return (
                          <Badge key={lang} variant="secondary" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                            {langInfo?.label || lang}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
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
                      ? generationProgress.total > 0 
                        ? `Generating ${generationProgress.current}/${generationProgress.total}...`
                        : 'Starting...'
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
