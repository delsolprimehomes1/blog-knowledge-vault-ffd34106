import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Save, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const LocationGenerator = () => {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [intentType, setIntentType] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [goal, setGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPage, setGeneratedPage] = useState<any>(null);

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
      const { data, error } = await supabase
        .from('location_pages')
        .insert({
          ...generatedPage,
          status: 'published',
          date_published: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Location page published!');
      window.open(`/locations/${generatedPage.city_slug}/${generatedPage.topic_slug}`, '_blank');
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
            Generate AI-citation-ready location pages optimized for ChatGPT, Perplexity, and Google AI Overviews.
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
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Publish
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
