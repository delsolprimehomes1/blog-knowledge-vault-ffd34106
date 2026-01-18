import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, ExternalLink, Plus, X, Loader2, Image as ImageIcon, Video,
  Sparkles, RefreshCw, ImagePlus, Check, Clock, AlertCircle, Globe
} from 'lucide-react';

const SUPPORTED_LANGUAGES = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu', 'fi', 'no'] as const;
type Language = typeof SUPPORTED_LANGUAGES[number];

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  nl: 'Nederlands',
  fr: 'Français',
  pl: 'Polski',
  sv: 'Svenska',
  da: 'Dansk',
  hu: 'Magyar',
  fi: 'Suomi',
  no: 'Norsk',
};

const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  nl: '🇳🇱',
  fr: '🇫🇷',
  pl: '🇵🇱',
  sv: '🇸🇪',
  da: '🇩🇰',
  hu: '🇭🇺',
  fi: '🇫🇮',
  no: '🇳🇴',
};

interface GalleryItem {
  title: string;
  image: string;
}

interface AIGalleryItem {
  type: string;
  image: string;
  prompt: string;
  title_i18n: Record<string, string>;
}

interface CityBrochure {
  id: string;
  slug: string;
  name: string;
  hero_image: string | null;
  hero_video_url: string | null;
  hero_headline: string | null;
  hero_subtitle: string | null;
  description: string | null;
  gallery_images: GalleryItem[];
  features: string[];
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  // New i18n fields
  hero_headline_i18n: Record<string, string> | null;
  hero_subtitle_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  features_i18n: Record<string, string[]> | null;
  meta_title_i18n: Record<string, string> | null;
  meta_description_i18n: Record<string, string> | null;
  // AI generation fields
  ai_hero_image: string | null;
  ai_gallery_images: AIGalleryItem[] | null;
  generation_status: string | null;
  content_generated: boolean;
  images_generated: boolean;
  last_generated_at: string | null;
}

const parseGalleryImages = (data: unknown): GalleryItem[] => {
  if (!data || !Array.isArray(data)) return [];
  return data.map((item) => {
    if (typeof item === 'string') return { title: '', image: item };
    if (typeof item === 'object' && item !== null) {
      return { title: (item as GalleryItem).title || '', image: (item as GalleryItem).image || '' };
    }
    return { title: '', image: '' };
  });
};

const BrochureManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [editData, setEditData] = useState<Partial<CityBrochure>>({});
  const [newFeature, setNewFeature] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  const emptyGallerySlots: GalleryItem[] = [
    { title: '', image: '' },
    { title: '', image: '' },
    { title: '', image: '' },
  ];

  // Fetch all brochures with polling during generation
  const { data: brochures, isLoading } = useQuery({
    queryKey: ['city-brochures-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('city_brochures')
        .select('*')
        .order('name');
      if (error) throw error;
      return data.map(brochure => ({
        ...brochure,
        gallery_images: parseGalleryImages(brochure.gallery_images),
        features: Array.isArray(brochure.features) ? brochure.features : [],
        hero_headline_i18n: brochure.hero_headline_i18n || {},
        hero_subtitle_i18n: brochure.hero_subtitle_i18n || {},
        description_i18n: brochure.description_i18n || {},
        features_i18n: brochure.features_i18n || {},
        meta_title_i18n: brochure.meta_title_i18n || {},
        meta_description_i18n: brochure.meta_description_i18n || {},
        ai_gallery_images: Array.isArray(brochure.ai_gallery_images) ? brochure.ai_gallery_images as unknown as AIGalleryItem[] : [],
      })) as CityBrochure[];
    },
    refetchInterval: isGenerating ? 3000 : false,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CityBrochure> & { id: string }) => {
      const updatePayload: any = {
        hero_image: data.hero_image,
        hero_video_url: data.hero_video_url,
        hero_headline: data.hero_headline,
        hero_subtitle: data.hero_subtitle,
        description: data.description,
        gallery_images: JSON.parse(JSON.stringify(data.gallery_images || [])),
        features: data.features,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        is_published: data.is_published,
      };

      // Also save i18n content for the current language
      if (data.hero_headline_i18n) updatePayload.hero_headline_i18n = data.hero_headline_i18n;
      if (data.hero_subtitle_i18n) updatePayload.hero_subtitle_i18n = data.hero_subtitle_i18n;
      if (data.description_i18n) updatePayload.description_i18n = data.description_i18n;
      if (data.features_i18n) updatePayload.features_i18n = data.features_i18n;
      if (data.meta_title_i18n) updatePayload.meta_title_i18n = data.meta_title_i18n;
      if (data.meta_description_i18n) updatePayload.meta_description_i18n = data.meta_description_i18n;

      const { error } = await supabase
        .from('city_brochures')
        .update(updatePayload)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['city-brochures-admin'] });
      toast({ title: 'Saved', description: 'Brochure updated successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
      console.error(error);
    },
  });

  // Detect generation completion via polling
  useEffect(() => {
    if (isGenerating && selectedCity && brochures) {
      const city = brochures.find(b => b.slug === selectedCity);
      
      // Check for completion states
      if (city?.generation_status === 'complete' || city?.generation_status === 'content_complete' || city?.generation_status === 'images_complete') {
        setIsGenerating(false);
        setGenerationProgress(100);
        setGenerationStartTime(null);
        toast({ 
          title: 'Generation Complete!', 
          description: `All content generated for ${city.name}.` 
        });
      } else if (city?.generation_status === 'failed') {
        setIsGenerating(false);
        setGenerationStartTime(null);
        toast({ 
          title: 'Generation Failed', 
          description: 'Check logs for details.',
          variant: 'destructive' 
        });
      }
      
      // Timeout fallback: if generating for more than 5 minutes, stop and prompt refresh
      if (generationStartTime && Date.now() - generationStartTime > 5 * 60 * 1000) {
        setIsGenerating(false);
        setGenerationStartTime(null);
        toast({
          title: 'Generation Timeout',
          description: 'Please click "Refresh Status" to check the current state.',
          variant: 'destructive'
        });
      }
    }
  }, [brochures, isGenerating, selectedCity, generationStartTime, toast]);

  // Generate content mutation - fire and forget
  const generateContentMutation = useMutation({
    mutationFn: async (brochureId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-brochure-content', {
        body: { brochureId }
      });
      // Accept started status or ignore timeout errors
      if (error && !String(error).includes('FunctionsFetchError')) throw error;
      return data || { status: 'started' };
    },
    onSuccess: (data) => {
      if (data?.status === 'started') {
        toast({ 
          title: 'Content Generation Started', 
          description: 'Generating content for 10 languages. This may take 2-3 minutes.' 
        });
        // Keep isGenerating true - polling will detect completion
      } else {
        queryClient.invalidateQueries({ queryKey: ['city-brochures-admin'] });
        toast({ 
          title: 'Content Generated', 
          description: `Generated content in ${data?.languagesGenerated || 10} languages.` 
        });
        setIsGenerating(false);
      }
    },
    onError: (error) => {
      // Ignore timeout errors - function likely still running
      if (String(error).includes('FunctionsFetchError') || String(error).includes('timeout')) {
        toast({ 
          title: 'Generation In Progress', 
          description: 'Content is being generated. Please wait...' 
        });
        return;
      }
      toast({ title: 'Generation Failed', description: String(error), variant: 'destructive' });
      setIsGenerating(false);
    },
  });

  // Generate images mutation - fire and forget
  const generateImagesMutation = useMutation({
    mutationFn: async (brochureId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-brochure-images', {
        body: { brochureId }
      });
      // Accept started status or ignore timeout errors
      if (error && !String(error).includes('FunctionsFetchError')) throw error;
      return data || { status: 'started' };
    },
    onSuccess: (data) => {
      if (data?.status === 'started') {
        toast({ 
          title: 'Image Generation Started', 
          description: 'Generating 4 AI images. This may take 2-3 minutes.' 
        });
        // Keep isGenerating true - polling will detect completion
      } else {
        queryClient.invalidateQueries({ queryKey: ['city-brochures-admin'] });
        toast({ 
          title: 'Images Generated', 
          description: `Generated ${data?.totalImages || 4} images.` 
        });
        setIsGenerating(false);
      }
    },
    onError: (error) => {
      // Ignore timeout errors - function likely still running
      if (String(error).includes('FunctionsFetchError') || String(error).includes('timeout')) {
        toast({ 
          title: 'Generation In Progress', 
          description: 'Images are being generated. Please wait...' 
        });
        return;
      }
      toast({ title: 'Image Generation Failed', description: String(error), variant: 'destructive' });
      setIsGenerating(false);
    },
  });

  // Set edit data when city or language changes
  useEffect(() => {
    if (selectedCity && brochures) {
      const city = brochures.find((b) => b.slug === selectedCity);
      if (city) {
        const galleryWithSlots = [...city.gallery_images];
        while (galleryWithSlots.length < 3) {
          galleryWithSlots.push({ title: '', image: '' });
        }
        setEditData({
          ...city,
          gallery_images: galleryWithSlots.slice(0, 3),
        });
      }
    }
  }, [selectedCity, brochures]);

  // Helper to get content for current language with fallback to English
  const getLocalizedValue = (i18nField: Record<string, any> | null | undefined, fallback: any = '') => {
    if (!i18nField) return fallback;
    return i18nField[selectedLanguage] || i18nField['en'] || fallback;
  };

  // Helper to check if a language has content
  const hasLanguageContent = (city: CityBrochure, lang: Language): boolean => {
    return !!(city.hero_headline_i18n?.[lang] && city.description_i18n?.[lang]);
  };

  const handleSave = () => {
    if (!editData.id) return;

    // Update the i18n fields for the current language
    const updatedData = { ...editData };
    
    // Sync current edits to i18n fields
    if (editData.hero_headline) {
      updatedData.hero_headline_i18n = {
        ...(editData.hero_headline_i18n || {}),
        [selectedLanguage]: editData.hero_headline,
      };
    }
    if (editData.hero_subtitle) {
      updatedData.hero_subtitle_i18n = {
        ...(editData.hero_subtitle_i18n || {}),
        [selectedLanguage]: editData.hero_subtitle,
      };
    }
    if (editData.description) {
      updatedData.description_i18n = {
        ...(editData.description_i18n || {}),
        [selectedLanguage]: editData.description,
      };
    }
    if (editData.features && editData.features.length > 0) {
      updatedData.features_i18n = {
        ...(editData.features_i18n || {}),
        [selectedLanguage]: editData.features,
      };
    }
    if (editData.meta_title) {
      updatedData.meta_title_i18n = {
        ...(editData.meta_title_i18n || {}),
        [selectedLanguage]: editData.meta_title,
      };
    }
    if (editData.meta_description) {
      updatedData.meta_description_i18n = {
        ...(editData.meta_description_i18n || {}),
        [selectedLanguage]: editData.meta_description,
      };
    }

    const cleanedGallery = (updatedData.gallery_images || []).map(item => ({
      title: item.title || '',
      image: item.image || '',
    }));

    updateMutation.mutate({
      ...updatedData,
      gallery_images: cleanedGallery,
    } as CityBrochure);
  };

  const handleGenerateAll = async () => {
    if (!editData.id) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Start content generation
    generateContentMutation.mutate(editData.id);
    
    // Simulate progress (actual progress comes from polling)
    const interval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + 5, 90));
    }, 2000);
    
    // Clear interval when done
    setTimeout(() => {
      clearInterval(interval);
      setGenerationProgress(100);
    }, 60000);
  };

  const handleGenerateContent = async () => {
    if (!editData.id) return;
    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    generateContentMutation.mutate(editData.id);
  };

  const handleGenerateImages = async () => {
    if (!editData.id) return;
    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    generateImagesMutation.mutate(editData.id);
  };

  const handleRefreshStatus = () => {
    queryClient.invalidateQueries({ queryKey: ['city-brochures-admin'] });
    toast({ title: 'Status Refreshed', description: 'Fetching latest brochure status...' });
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setEditData({
      ...editData,
      features: [...(editData.features || []), newFeature.trim()],
    });
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    const features = [...(editData.features || [])];
    features.splice(index, 1);
    setEditData({ ...editData, features });
  };

  const updateGalleryItem = (index: number, field: 'title' | 'image', value: string) => {
    const gallery = [...(editData.gallery_images || emptyGallerySlots)];
    gallery[index] = { ...gallery[index], [field]: value };
    setEditData({ ...editData, gallery_images: gallery });
  };

  // When language changes, update editable fields from i18n
  useEffect(() => {
    if (editData.id) {
      setEditData(prev => ({
        ...prev,
        hero_headline: getLocalizedValue(prev.hero_headline_i18n, prev.hero_headline),
        hero_subtitle: getLocalizedValue(prev.hero_subtitle_i18n, prev.hero_subtitle),
        description: getLocalizedValue(prev.description_i18n, prev.description),
        features: getLocalizedValue(prev.features_i18n, prev.features) || [],
        meta_title: getLocalizedValue(prev.meta_title_i18n, prev.meta_title),
        meta_description: getLocalizedValue(prev.meta_description_i18n, prev.meta_description),
      }));
    }
  }, [selectedLanguage]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const currentCity = brochures?.find(b => b.slug === selectedCity);
  const galleryItems = editData.gallery_images || emptyGallerySlots;

  const getStatusBadge = (city: CityBrochure) => {
    if (city.generation_status === 'generating' || city.generation_status === 'generating_images') {
      return <Badge variant="outline" className="animate-pulse"><Clock className="w-3 h-3 mr-1" />Generating...</Badge>;
    }
    if (city.content_generated && city.images_generated) {
      return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Complete</Badge>;
    }
    if (city.content_generated) {
      return <Badge variant="secondary"><Check className="w-3 h-3 mr-1" />Content Only</Badge>;
    }
    return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Not Generated</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Brochure Manager</h1>
            <p className="text-muted-foreground">
              AI-powered multilingual brochure content generation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* City List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Cities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {brochures?.map((city) => (
                <button
                  key={city.slug}
                  onClick={() => setSelectedCity(city.slug)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedCity === city.slug
                      ? 'bg-prime-gold text-prime-950'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{city.name}</div>
                    {city.is_published && (
                      <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">Live</span>
                    )}
                  </div>
                  <div className="mt-1">
                    {getStatusBadge(city)}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Editor */}
          <div className="lg:col-span-3">
            {selectedCity && editData.id ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <CardTitle>{editData.name}</CardTitle>
                    {currentCity && getStatusBadge(currentCity)}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Language Selector */}
                    <Select value={selectedLanguage} onValueChange={(v) => setSelectedLanguage(v as Language)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang}>
                            <span className="flex items-center gap-2">
                              <span>{LANGUAGE_FLAGS[lang]}</span>
                              <span>{LANGUAGE_LABELS[lang]}</span>
                              {currentCity && hasLanguageContent(currentCity, lang) && (
                                <Check className="w-3 h-3 text-green-500" />
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <a
                      href={`/${selectedLanguage}/brochure/${editData.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      Preview <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="bg-prime-gold hover:bg-prime-gold/90 text-prime-950"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Generation Controls */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-prime-gold/10 to-transparent rounded-lg border border-prime-gold/20">
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Button
                        onClick={handleGenerateAll}
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-prime-gold to-amber-500 text-prime-950 hover:from-prime-gold/90 hover:to-amber-500/90"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Generate All Content & Images
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleGenerateContent}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate Content
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleGenerateImages}
                        disabled={isGenerating}
                      >
                        <ImagePlus className="w-4 h-4 mr-2" />
                        Regenerate Images
                      </Button>
                    </div>

                    {isGenerating && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Progress value={generationProgress} className="h-2 flex-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefreshStatus}
                            className="text-xs"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Refresh Status
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Generating content for all 10 languages... This may take 1-2 minutes.
                        </p>
                      </div>
                    )}

                    {/* Language Status Grid */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {SUPPORTED_LANGUAGES.map(lang => {
                        const hasContent = currentCity && hasLanguageContent(currentCity, lang);
                        return (
                          <div
                            key={lang}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                              hasContent 
                                ? 'bg-green-500/20 text-green-600' 
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {LANGUAGE_FLAGS[lang]} {lang.toUpperCase()}
                            {hasContent && <Check className="w-3 h-3" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Tabs defaultValue="content">
                    <TabsList className="mb-6">
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="gallery">Gallery Cards</TabsTrigger>
                      <TabsTrigger value="ai-images">AI Images</TabsTrigger>
                      <TabsTrigger value="features">Features</TabsTrigger>
                      <TabsTrigger value="seo">SEO</TabsTrigger>
                    </TabsList>

                    {/* Content Tab */}
                    <TabsContent value="content" className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <Label className="font-medium">Published</Label>
                          <p className="text-sm text-muted-foreground">
                            Make this brochure visible to the public
                          </p>
                        </div>
                        <Switch
                          checked={editData.is_published}
                          onCheckedChange={(checked) =>
                            setEditData({ ...editData, is_published: checked })
                          }
                        />
                      </div>

                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Currently editing: <strong>{LANGUAGE_FLAGS[selectedLanguage]} {LANGUAGE_LABELS[selectedLanguage]}</strong>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Hero Video URL
                        </Label>
                        <Input
                          value={editData.hero_video_url || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, hero_video_url: e.target.value })
                          }
                          placeholder="https://... (YouTube, Vimeo, or direct video URL)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Hero Image URL (fallback)</Label>
                        <Input
                          value={editData.hero_image || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, hero_image: e.target.value })
                          }
                          placeholder="https://..."
                        />
                        {(editData.ai_hero_image || editData.hero_image) && (
                          <div className="relative">
                            <img
                              src={editData.ai_hero_image || editData.hero_image || ''}
                              alt="Hero preview"
                              className="w-full h-48 object-cover rounded-lg mt-2"
                            />
                            {editData.ai_hero_image && (
                              <Badge className="absolute top-4 left-4 bg-prime-gold text-prime-950">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI Generated
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Hero Headline ({selectedLanguage.toUpperCase()})</Label>
                        <Input
                          value={editData.hero_headline || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, hero_headline: e.target.value })
                          }
                          placeholder="Luxury Living in..."
                        />
                        <p className="text-xs text-muted-foreground">
                          {(editData.hero_headline || '').length}/60 characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Hero Subtitle ({selectedLanguage.toUpperCase()})</Label>
                        <Input
                          value={editData.hero_subtitle || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, hero_subtitle: e.target.value })
                          }
                          placeholder="The jewel of the Costa del Sol"
                        />
                        <p className="text-xs text-muted-foreground">
                          {(editData.hero_subtitle || '').length}/100 characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Description ({selectedLanguage.toUpperCase()})</Label>
                        <Textarea
                          value={editData.description || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, description: e.target.value })
                          }
                          rows={8}
                          placeholder="Write a compelling description..."
                        />
                        <p className="text-xs text-muted-foreground">
                          {(editData.description || '').length} characters (target: 1500-2000)
                        </p>
                      </div>
                    </TabsContent>

                    {/* Gallery Cards Tab */}
                    <TabsContent value="gallery" className="space-y-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        Manual gallery cards. These display below the description section.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[0, 1, 2].map((index) => (
                          <div key={index} className="space-y-4 p-4 border rounded-lg">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <ImageIcon className="w-4 h-4" />
                              Card {index + 1}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={galleryItems[index]?.title || ''}
                                onChange={(e) => updateGalleryItem(index, 'title', e.target.value)}
                                placeholder="e.g., Smart Homes"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Image URL</Label>
                              <Input
                                value={galleryItems[index]?.image || ''}
                                onChange={(e) => updateGalleryItem(index, 'image', e.target.value)}
                                placeholder="https://..."
                              />
                            </div>
                            
                            {galleryItems[index]?.image && (
                              <img
                                src={galleryItems[index].image}
                                alt={galleryItems[index].title || `Card ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* AI Images Tab */}
                    <TabsContent value="ai-images" className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">AI-Generated Images</h3>
                          <p className="text-sm text-muted-foreground">
                            Images generated by Nano Banana Pro AI, stored permanently.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleGenerateImages}
                          disabled={isGenerating}
                        >
                          <ImagePlus className="w-4 h-4 mr-2" />
                          Regenerate All
                        </Button>
                      </div>

                      {editData.ai_hero_image && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-prime-gold" />
                            Hero Image
                          </Label>
                          <img
                            src={editData.ai_hero_image}
                            alt="AI Hero"
                            className="w-full h-64 object-cover rounded-lg"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(editData.ai_gallery_images as AIGalleryItem[] || []).map((img, index) => (
                          <div key={index} className="space-y-2 p-3 border rounded-lg">
                            <Badge variant="outline" className="capitalize">{img.type}</Badge>
                            <img
                              src={img.image}
                              alt={img.type}
                              className="w-full h-40 object-cover rounded-lg"
                            />
                          </div>
                        ))}
                      </div>

                      {!editData.ai_hero_image && (!editData.ai_gallery_images || (editData.ai_gallery_images as AIGalleryItem[]).length === 0) && (
                        <div className="text-center py-12 bg-muted/50 rounded-lg">
                          <ImagePlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No AI images generated yet.</p>
                          <Button
                            className="mt-4"
                            onClick={handleGenerateImages}
                            disabled={isGenerating}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Images
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* Features Tab */}
                    <TabsContent value="features" className="space-y-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        Features for <strong>{LANGUAGE_FLAGS[selectedLanguage]} {LANGUAGE_LABELS[selectedLanguage]}</strong>
                      </p>
                      
                      <div className="space-y-2">
                        {editData.features?.map((feature, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                          >
                            <span className="flex-1">{feature}</span>
                            <button
                              onClick={() => removeFeature(index)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          placeholder="Add a feature..."
                          onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                        />
                        <Button onClick={addFeature} variant="outline">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </TabsContent>

                    {/* SEO Tab */}
                    <TabsContent value="seo" className="space-y-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        SEO metadata for <strong>{LANGUAGE_FLAGS[selectedLanguage]} {LANGUAGE_LABELS[selectedLanguage]}</strong>
                      </p>

                      <div className="space-y-2">
                        <Label>Meta Title</Label>
                        <Input
                          value={editData.meta_title || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, meta_title: e.target.value })
                          }
                          placeholder="Page title for search engines"
                        />
                        <p className="text-xs text-muted-foreground">
                          {(editData.meta_title || '').length}/60 characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Meta Description</Label>
                        <Textarea
                          value={editData.meta_description || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, meta_description: e.target.value })
                          }
                          rows={3}
                          placeholder="Brief description for search results"
                        />
                        <p className="text-xs text-muted-foreground">
                          {(editData.meta_description || '').length}/160 characters
                        </p>
                      </div>

                      {/* Google Preview */}
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-2">Search Preview</p>
                        <div className="space-y-1">
                          <p className="text-blue-600 dark:text-blue-400 text-lg hover:underline cursor-pointer truncate">
                            {editData.meta_title || `${editData.name} | Del Sol Prime Homes`}
                          </p>
                          <p className="text-green-700 dark:text-green-500 text-sm">
                            www.delsolprimehomes.com › {selectedLanguage} › brochure › {editData.slug}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {editData.meta_description || `Discover luxury properties in ${editData.name} on Spain's Costa del Sol.`}
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <Globe className="w-12 h-12 mb-4 opacity-50" />
                  <p>Select a city to edit its brochure content</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BrochureManager;
