import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Scale, Trash2, Eye, CheckCircle, Zap, Link as LinkIcon, Quote, Globe, Languages, RefreshCcw, AlertTriangle, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

// Aligned with src/types/hreflang.ts SUPPORTED_LANGUAGES (uses hu not es)
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
];

type LanguageCode = 'en' | 'de' | 'nl' | 'fr' | 'pl' | 'sv' | 'da' | 'hu' | 'fi' | 'no';

const SUGGESTED_COMPARISONS = [
  { a: 'Off-Plan Property', b: 'Resale Property', context: 'Which Should You Buy in Spain?' },
  { a: 'New Build', b: 'Renovation Project', context: 'Which Is Better for Investment?' },
  { a: 'Local Agent', b: 'International Broker', context: 'Who Should You Choose in Spain?' },
  { a: 'Marbella', b: 'Estepona', context: 'Where to Buy Property on Costa del Sol?' },
  { a: 'Digital Nomad Visa', b: 'Standard Residency', context: 'Which Path to Spanish Residency?' },
  { a: 'Beachfront Property', b: 'Golf Property', context: 'Best Lifestyle Investment in Spain' },
  { a: 'Holiday Home', b: 'Investment Property', context: 'What Should You Buy in Spain?' },
  { a: 'Cash Purchase', b: 'Spanish Mortgage', context: 'How Should You Finance Property?' },
];

// Phase 3 MOFU Comparisons with AI-query friendly titles
const PHASE3_MOFU_COMPARISONS = [
  {
    optionA: 'New-Build',
    optionB: 'Resale Property',
    aiHeadline: 'New-Build vs Resale Property in Spain: Which Should You Buy in 2025?',
    targetAudience: 'first-time buyers and investors comparing property types in Costa del Sol',
    niche: 'real-estate',
    relatedKeywords: ['property buying costs', 'Spanish mortgage', 'NIE number'],
    description: 'Comprehensive guide comparing off-plan/new-build vs resale properties',
  },
  {
    optionA: 'Golden Mile',
    optionB: 'Nueva Andalucía',
    aiHeadline: 'Golden Mile vs Nueva Andalucía: Where Should You Buy Property in Marbella?',
    targetAudience: 'luxury property buyers comparing premium Marbella neighborhoods',
    niche: 'real-estate',
    relatedKeywords: ['digital nomad visa', 'property investment', 'Marbella real estate'],
    description: 'Location comparison for high-end Marbella property seekers',
  },
  {
    optionA: 'Costa del Sol',
    optionB: 'Algarve Portugal',
    aiHeadline: 'Costa del Sol vs Algarve: Best Mediterranean Property Investment for 2025',
    targetAudience: 'international property investors comparing Mediterranean destinations',
    niche: 'real-estate',
    relatedKeywords: ['digital nomad visa spain', 'property buying costs', 'tax comparison'],
    description: 'Destination comparison for European property investors',
  },
];

interface BatchProgress {
  isGenerating: boolean;
  currentLanguage: string;
  completedLanguages: string[];
  failedLanguages: { code: string; error: string }[];
  totalCount: number;
}

export default function ComparisonGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [niche, setNiche] = useState('real-estate');
  const [targetAudience, setTargetAudience] = useState('property buyers and investors');
  const [suggestedHeadline, setSuggestedHeadline] = useState('');
  const [generatedComparison, setGeneratedComparison] = useState<any>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '' });
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  
  // Multi-language selection state
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    LANGUAGES.map(l => l.code) // All selected by default
  );
  
  // Batch generation progress state
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    isGenerating: false,
    currentLanguage: '',
    completedLanguages: [],
    failedLanguages: [],
    totalCount: 0,
  });
  
  // Backfill state for "Add All Missing" button
  const [backfillingTopic, setBackfillingTopic] = useState<string | null>(null);

  // Fetch existing comparisons
  const { data: comparisons, isLoading: loadingComparisons } = useQuery({
    queryKey: ['admin-comparisons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparison_pages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Check which Phase 3 comparisons are missing
  const missingPhase3 = PHASE3_MOFU_COMPARISONS.filter(mofu => {
    const exists = comparisons?.some(c => 
      (c.option_a.toLowerCase().includes(mofu.optionA.toLowerCase().split(' ')[0]) &&
       c.option_b.toLowerCase().includes(mofu.optionB.toLowerCase().split(' ')[0])) ||
      (c.option_a.toLowerCase().includes(mofu.optionB.toLowerCase().split(' ')[0]) &&
       c.option_b.toLowerCase().includes(mofu.optionA.toLowerCase().split(' ')[0]))
    );
    return !exists;
  });

  // Toggle language selection
  const toggleLanguage = (code: string) => {
    setSelectedLanguages(prev => 
      prev.includes(code) 
        ? prev.filter(l => l !== code)
        : [...prev, code]
    );
  };

  const selectAllLanguages = () => setSelectedLanguages(LANGUAGES.map(l => l.code));
  const deselectAllLanguages = () => setSelectedLanguages(['en']); // Always keep English

  // Generate comparison for multiple languages
  const generateMultiLanguageMutation = useMutation({
    mutationFn: async (params: { optionA: string; optionB: string; targetAudience: string; niche: string; suggestedHeadline?: string }) => {
      const langsToGenerate = selectedLanguages.length > 0 ? selectedLanguages : ['en'];
      
      setBatchProgress({
        isGenerating: true,
        currentLanguage: langsToGenerate[0],
        completedLanguages: [],
        failedLanguages: [],
        totalCount: langsToGenerate.length,
      });

      const results: { success: any[]; errors: { lang: string; error: string }[] } = {
        success: [],
        errors: [],
      };

      // Generate English first (source for translations)
      const englishIndex = langsToGenerate.indexOf('en');
      const orderedLangs = englishIndex > 0 
        ? ['en', ...langsToGenerate.filter(l => l !== 'en')]
        : langsToGenerate;

      let englishComparison: any = null;

      for (const lang of orderedLangs) {
        setBatchProgress(prev => ({
          ...prev,
          currentLanguage: lang,
        }));

        try {
          let comparison;
          
          if (lang === 'en' || !englishComparison) {
            // Generate fresh for English or if no English source
            const { data, error } = await supabase.functions.invoke('generate-comparison', {
              body: { 
                option_a: params.optionA, 
                option_b: params.optionB, 
                niche: params.niche, 
                target_audience: params.targetAudience, 
                suggested_headline: params.suggestedHeadline,
                language: lang,
                include_internal_links: true,
                include_citations: true,
              }
            });
            
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            comparison = data.comparison;
            
            if (lang === 'en') {
              englishComparison = comparison;
            }
          } else {
            // Translate from English for other languages
            const { data, error } = await supabase.functions.invoke('translate-comparison', {
              body: { 
                source_comparison: englishComparison,
                target_language: lang,
              }
            });
            
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            comparison = data.comparison || data;
          }

          // Save the comparison
          const { error: saveError } = await supabase
            .from('comparison_pages')
            .insert({
              ...comparison,
              status: 'draft',
              date_modified: new Date().toISOString(),
            });
          
          if (saveError) throw saveError;
          
          results.success.push({ lang, comparison });
          setBatchProgress(prev => ({
            ...prev,
            completedLanguages: [...prev.completedLanguages, lang],
          }));
        } catch (err: any) {
          console.error(`Failed to generate ${lang}:`, err);
          results.errors.push({ lang, error: err.message || 'Unknown error' });
          setBatchProgress(prev => ({
            ...prev,
            failedLanguages: [...prev.failedLanguages, { code: lang, error: err.message }],
          }));
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setBatchProgress(prev => ({ ...prev, isGenerating: false }));
      queryClient.invalidateQueries({ queryKey: ['admin-comparisons'] });
      
      const successCount = results.success.length;
      const errorCount = results.errors.length;
      
      toast({ 
        title: `Generated ${successCount} language${successCount !== 1 ? 's' : ''}`,
        description: errorCount > 0 
          ? `${errorCount} failed: ${results.errors.map(e => e.lang.toUpperCase()).join(', ')}`
          : 'All comparisons saved as drafts.',
        variant: errorCount > 0 ? 'destructive' : 'default',
      });
      
      // Reset form
      setOptionA('');
      setOptionB('');
      setSuggestedHeadline('');
    },
    onError: (error: Error) => {
      setBatchProgress(prev => ({ ...prev, isGenerating: false }));
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  // Save comparison (single)
  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'published') => {
      if (!generatedComparison) throw new Error('No comparison to save');
      
      const { error } = await supabase
        .from('comparison_pages')
        .insert({
          ...generatedComparison,
          status,
          date_published: status === 'published' ? new Date().toISOString() : null,
          date_modified: new Date().toISOString(),
        });
      
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      toast({ title: "Saved!", description: `Comparison ${status === 'published' ? 'published' : 'saved as draft'}.` });
      setGeneratedComparison(null);
      setOptionA('');
      setOptionB('');
      queryClient.invalidateQueries({ queryKey: ['admin-comparisons'] });
    },
    onError: (error: Error) => {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    },
  });

  // Delete comparison
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comparison_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      queryClient.invalidateQueries({ queryKey: ['admin-comparisons'] });
    },
  });

  // Toggle publish status
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      const { error } = await supabase
        .from('comparison_pages')
        .update({ 
          status: newStatus,
          date_published: newStatus === 'published' ? new Date().toISOString() : null,
          date_modified: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-comparisons'] });
    },
  });

  // Translate comparison to another language
  const translateMutation = useMutation({
    mutationFn: async ({ comparisonId, targetLanguage }: { comparisonId: string; targetLanguage: string }) => {
      setTranslatingId(comparisonId);
      setTranslatingLang(targetLanguage);
      
      const { data, error } = await supabase.functions.invoke('translate-comparison', {
        body: { comparison_id: comparisonId, target_language: targetLanguage }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Translation created!", 
        description: `Created ${LANGUAGES.find(l => l.code === data.language)?.name} version: ${data.slug}` 
      });
      queryClient.invalidateQueries({ queryKey: ['admin-comparisons'] });
      setTranslatingId(null);
      setTranslatingLang(null);
    },
    onError: (error: Error) => {
      toast({ title: "Translation failed", description: error.message, variant: "destructive" });
      setTranslatingId(null);
      setTranslatingLang(null);
    },
  });

  // Backfill all missing languages for a comparison topic
  const backfillMissingLanguagesMutation = useMutation({
    mutationFn: async ({ topic, englishId }: { topic: string; englishId: string }) => {
      setBackfillingTopic(topic);
      
      const existingLangs = getExistingLanguages(topic);
      const missingLangs = LANGUAGES.filter(l => !existingLangs.includes(l.code)).map(l => l.code);
      
      const results: { success: string[]; errors: { lang: string; error: string }[] } = {
        success: [],
        errors: [],
      };
      
      for (const lang of missingLangs) {
        try {
          const { data, error } = await supabase.functions.invoke('translate-comparison', {
            body: { comparison_id: englishId, target_language: lang }
          });
          
          if (error) throw error;
          if (data.error) throw new Error(data.error);
          
          results.success.push(lang);
        } catch (err: any) {
          results.errors.push({ lang, error: err.message });
        }
      }
      
      return results;
    },
    onSuccess: (results, variables) => {
      setBackfillingTopic(null);
      queryClient.invalidateQueries({ queryKey: ['admin-comparisons'] });
      
      toast({
        title: `Added ${results.success.length} translations`,
        description: results.errors.length > 0 
          ? `${results.errors.length} failed: ${results.errors.map(e => e.lang.toUpperCase()).join(', ')}`
          : 'All missing languages added.',
        variant: results.errors.length > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error: Error) => {
      setBackfillingTopic(null);
      toast({ title: "Backfill failed", description: error.message, variant: "destructive" });
    },
  });

  // Group comparisons by topic for showing language coverage
  const getComparisonsByTopic = () => {
    if (!comparisons) return {};
    const grouped: Record<string, typeof comparisons> = {};
    for (const c of comparisons) {
      const topic = c.comparison_topic;
      if (!grouped[topic]) grouped[topic] = [];
      grouped[topic].push(c);
    }
    return grouped;
  };

  const getExistingLanguages = (topic: string): string[] => {
    const grouped = getComparisonsByTopic();
    return grouped[topic]?.map(c => c.language) || [];
  };

  const getEnglishComparison = (topic: string) => {
    const grouped = getComparisonsByTopic();
    return grouped[topic]?.find(c => c.language === 'en');
  };

  // Bulk generate all missing Phase 3 comparisons
  const handleBulkGenerate = async () => {
    if (missingPhase3.length === 0) {
      toast({ title: "All Phase 3 pages exist", description: "No new comparisons to generate." });
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: missingPhase3.length, status: 'Starting...' });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < missingPhase3.length; i++) {
      const mofu = missingPhase3[i];
      setBulkProgress({ 
        current: i + 1, 
        total: missingPhase3.length, 
        status: `Generating: ${mofu.optionA} vs ${mofu.optionB}` 
      });

      try {
        const { data, error } = await supabase.functions.invoke('generate-comparison', {
          body: { 
            option_a: mofu.optionA, 
            option_b: mofu.optionB, 
            niche: mofu.niche, 
            target_audience: mofu.targetAudience, 
            suggested_headline: mofu.aiHeadline,
            language: 'en',
            include_internal_links: true,
            include_citations: true,
          }
        });

        if (error || data.error) throw error || new Error(data.error);

        // Save as draft
        const { error: saveError } = await supabase
          .from('comparison_pages')
          .insert({
            ...data.comparison,
            status: 'draft',
            date_modified: new Date().toISOString(),
          });

        if (saveError) throw saveError;
        successCount++;
      } catch (err) {
        console.error(`Failed to generate ${mofu.optionA} vs ${mofu.optionB}:`, err);
        errorCount++;
      }
    }

    setBulkGenerating(false);
    setBulkProgress({ current: 0, total: 0, status: '' });
    queryClient.invalidateQueries({ queryKey: ['admin-comparisons'] });

    toast({ 
      title: "Bulk generation complete", 
      description: `Generated ${successCount} comparisons. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
      variant: errorCount > 0 ? 'destructive' : 'default',
    });
  };

  const handleSuggestionClick = (suggestion: { a: string; b: string }) => {
    setOptionA(suggestion.a);
    setOptionB(suggestion.b);
  };

  // Calculate overall language coverage stats
  const languageCoverageStats = () => {
    const grouped = getComparisonsByTopic();
    const topics = Object.keys(grouped);
    const totalPossible = topics.length * LANGUAGES.length;
    const totalExisting = comparisons?.length || 0;
    const incompleteTopics = topics.filter(t => grouped[t].length < LANGUAGES.length).length;
    
    return { totalPossible, totalExisting, incompleteTopics, totalTopics: topics.length };
  };

  const stats = languageCoverageStats();

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Comparison Generator</h1>
            <p className="text-muted-foreground">Create AI-citation optimized comparison pages in all 10 languages</p>
          </div>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Generate Multi-Language
            </TabsTrigger>
            <TabsTrigger value="phase3" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Phase 3 MOFU
            </TabsTrigger>
            <TabsTrigger value="manage">
              <Languages className="h-4 w-4 mr-1" />
              Manage ({comparisons?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Multi-Language Generation Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Create Comparison
                  </CardTitle>
                  <CardDescription>Generate comparison pages in multiple languages at once</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Option A</Label>
                      <Input
                        value={optionA}
                        onChange={(e) => setOptionA(e.target.value)}
                        placeholder="e.g., Buying Off-Plan"
                        disabled={batchProgress.isGenerating}
                      />
                    </div>
                    <div>
                      <Label>Option B</Label>
                      <Input
                        value={optionB}
                        onChange={(e) => setOptionB(e.target.value)}
                        placeholder="e.g., Resale Property"
                        disabled={batchProgress.isGenerating}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Target Audience</Label>
                    <Textarea
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g., property buyers and investors"
                      rows={2}
                      disabled={batchProgress.isGenerating}
                    />
                  </div>

                  <div>
                    <Label>Suggested Headline (Optional)</Label>
                    <Input
                      value={suggestedHeadline}
                      onChange={(e) => setSuggestedHeadline(e.target.value)}
                      placeholder="e.g., Off-Plan vs Resale: Which Should You Buy in 2025?"
                      disabled={batchProgress.isGenerating}
                    />
                  </div>

                  <div>
                    <Label>Niche</Label>
                    <Input
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g., real-estate"
                      disabled={batchProgress.isGenerating}
                    />
                  </div>

                  {/* Suggestions */}
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Quick suggestions:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SUGGESTED_COMPARISONS.slice(0, 4).map((s, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => handleSuggestionClick(s)}
                        >
                          {s.a} vs {s.b}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Language Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Languages className="h-5 w-5" />
                      Select Languages
                    </span>
                    <Badge variant="secondary">
                      {selectedLanguages.length} / {LANGUAGES.length} selected
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Choose which languages to generate. English is created first, others are translated.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Select/Deselect All */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllLanguages}
                      disabled={batchProgress.isGenerating}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAllLanguages}
                      disabled={batchProgress.isGenerating}
                    >
                      Deselect All
                    </Button>
                  </div>

                  {/* Language Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {LANGUAGES.map(lang => (
                      <div 
                        key={lang.code}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors
                          ${selectedLanguages.includes(lang.code) 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-muted/30 border-border hover:bg-muted/50'
                          }
                          ${batchProgress.completedLanguages.includes(lang.code) ? 'bg-green-50 border-green-300' : ''}
                          ${batchProgress.failedLanguages.some(f => f.code === lang.code) ? 'bg-red-50 border-red-300' : ''}
                          ${batchProgress.currentLanguage === lang.code ? 'ring-2 ring-primary ring-offset-1' : ''}
                        `}
                        onClick={() => !batchProgress.isGenerating && toggleLanguage(lang.code)}
                      >
                        <Checkbox
                          id={`lang-${lang.code}`}
                          checked={selectedLanguages.includes(lang.code)}
                          onCheckedChange={() => toggleLanguage(lang.code)}
                          disabled={batchProgress.isGenerating}
                        />
                        <label 
                          htmlFor={`lang-${lang.code}`}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span className="text-sm font-medium">{lang.name}</span>
                          <span className="text-xs text-muted-foreground">({lang.code})</span>
                        </label>
                        
                        {/* Status indicators during generation */}
                        {batchProgress.isGenerating && (
                          <>
                            {batchProgress.completedLanguages.includes(lang.code) && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {batchProgress.currentLanguage === lang.code && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                            {batchProgress.failedLanguages.some(f => f.code === lang.code) && (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Batch Progress */}
                  {batchProgress.isGenerating && (
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Generating: {batchProgress.completedLanguages.length} / {batchProgress.totalCount}
                        </span>
                        <span className="font-medium">
                          {LANGUAGES.find(l => l.code === batchProgress.currentLanguage)?.name || batchProgress.currentLanguage}
                        </span>
                      </div>
                      <Progress 
                        value={(batchProgress.completedLanguages.length / batchProgress.totalCount) * 100} 
                      />
                    </div>
                  )}

                  {/* Generate Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => generateMultiLanguageMutation.mutate({ 
                      optionA, 
                      optionB, 
                      targetAudience, 
                      niche,
                      suggestedHeadline: suggestedHeadline || undefined,
                    })}
                    disabled={!optionA || !optionB || selectedLanguages.length === 0 || batchProgress.isGenerating}
                  >
                    {batchProgress.isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating {batchProgress.completedLanguages.length + 1} of {batchProgress.totalCount}...
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Generate in {selectedLanguages.length} Language{selectedLanguages.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Comparisons will be saved as drafts for review before publishing
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Generated Preview (for single generation) */}
            {generatedComparison && (
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Generated Comparison</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => saveMutation.mutate('draft')}
                        disabled={saveMutation.isPending}
                      >
                        Save as Draft
                      </Button>
                      <Button
                        onClick={() => saveMutation.mutate('published')}
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Headline</Label>
                    <p className="font-semibold">{generatedComparison.headline}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Speakable Answer</Label>
                    <p className="text-sm bg-primary/5 p-3 rounded-lg">{generatedComparison.speakable_answer}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Phase 3 MOFU Bulk Generation */}
          <TabsContent value="phase3" className="space-y-6">
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Phase 3: MOFU Expansion
                    </CardTitle>
                    <CardDescription>
                      Generate missing comparison pages with automatic internal linking to BOFU content
                    </CardDescription>
                  </div>
                  <Badge variant={missingPhase3.length === 0 ? "default" : "secondary"}>
                    {missingPhase3.length === 0 ? 'All Complete' : `${missingPhase3.length} Missing`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phase 3 Comparison Cards */}
                <div className="grid gap-4">
                  {PHASE3_MOFU_COMPARISONS.map((mofu, i) => {
                    const exists = !missingPhase3.includes(mofu);
                    return (
                      <div key={i} className={`p-4 rounded-lg border ${exists ? 'bg-green-50 border-green-200' : 'bg-background border-border'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              {mofu.aiHeadline || `${mofu.optionA} vs ${mofu.optionB}`}
                              {exists && <CheckCircle className="h-4 w-4 text-green-600" />}
                            </h3>
                            <p className="text-sm text-muted-foreground">{mofu.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <LinkIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Links to: {mofu.relatedKeywords.join(', ')}</span>
                            </div>
                          </div>
                          {!exists && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOptionA(mofu.optionA);
                                setOptionB(mofu.optionB);
                                setTargetAudience(mofu.targetAudience);
                                setNiche(mofu.niche);
                                generateMultiLanguageMutation.mutate({ 
                                  optionA: mofu.optionA, 
                                  optionB: mofu.optionB, 
                                  targetAudience: mofu.targetAudience, 
                                  niche: mofu.niche,
                                  suggestedHeadline: mofu.aiHeadline,
                                });
                              }}
                              disabled={generateMultiLanguageMutation.isPending}
                            >
                              Generate
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bulk Generate Button */}
                {missingPhase3.length > 0 && (
                  <div className="pt-4 border-t">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleBulkGenerate}
                      disabled={bulkGenerating}
                    >
                      {bulkGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {bulkProgress.status} ({bulkProgress.current}/{bulkProgress.total})
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Generate All {missingPhase3.length} Missing Comparisons
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Comparisons will be saved as drafts for review before publishing
                    </p>
                  </div>
                )}

                {/* Features */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-start gap-2">
                    <LinkIcon className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Internal Linking</p>
                      <p className="text-xs text-muted-foreground">Auto-links to BOFU articles (Golden Visa, Costs, NIE)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Quote className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">External Citations</p>
                      <p className="text-xs text-muted-foreground">Sources from approved domains only</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Tab with Enhanced Language Coverage */}
          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Languages className="h-5 w-5" />
                      All Comparisons by Topic
                    </CardTitle>
                    <CardDescription>
                      Language coverage matrix. Click language badges to translate, or use "Add Missing" to complete all.
                    </CardDescription>
                  </div>
                  
                  {/* Overall Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.totalTopics}</p>
                      <p className="text-xs text-muted-foreground">Topics</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{stats.totalExisting}</p>
                      <p className="text-xs text-muted-foreground">Pages</p>
                    </div>
                    {stats.incompleteTopics > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-600">{stats.incompleteTopics}</p>
                        <p className="text-xs text-muted-foreground">Incomplete</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingComparisons ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : comparisons?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No comparisons yet</p>
                ) : (
                  <div className="space-y-4">
                    {/* Group by comparison_topic and show language matrix */}
                    {Object.entries(getComparisonsByTopic()).map(([topic, topicComparisons]) => {
                      const englishVersion = topicComparisons.find(c => c.language === 'en');
                      const existingLangs = topicComparisons.map(c => c.language);
                      const missingLangs = LANGUAGES.filter(l => !existingLangs.includes(l.code));
                      const completionPercent = (existingLangs.length / LANGUAGES.length) * 100;
                      const isBackfilling = backfillingTopic === topic;
                      
                      return (
                        <Card key={topic} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {topic}
                                  {completionPercent === 100 && (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                </CardTitle>
                                <div className="flex items-center gap-3 mt-2">
                                  <Progress value={completionPercent} className="h-2 w-32" />
                                  <span className="text-xs text-muted-foreground">
                                    {existingLangs.length} / {LANGUAGES.length} languages
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {topicComparisons.every(c => c.status === 'published') ? (
                                  <Badge variant="default" className="text-xs">All Published</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    {topicComparisons.filter(c => c.status === 'published').length} Published
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {/* Language Matrix - Visual overview */}
                            <div className="flex flex-wrap gap-1.5 mb-4 p-3 bg-muted/30 rounded-lg">
                              {LANGUAGES.map(lang => {
                                const exists = existingLangs.includes(lang.code);
                                const comparison = topicComparisons.find(c => c.language === lang.code);
                                const isPublished = comparison?.status === 'published';
                                
                                return (
                                  <TooltipProvider key={lang.code}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div 
                                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all
                                            ${exists 
                                              ? isPublished 
                                                ? 'bg-green-100 text-green-700 border border-green-300' 
                                                : 'bg-amber-100 text-amber-700 border border-amber-300'
                                              : 'bg-muted text-muted-foreground border border-dashed border-border hover:bg-primary/10 hover:border-primary'
                                            }`}
                                          onClick={() => {
                                            if (exists && comparison) {
                                              window.open(`/${lang.code}/compare/${comparison.slug}`, '_blank');
                                            } else if (englishVersion) {
                                              translateMutation.mutate({ 
                                                comparisonId: englishVersion.id, 
                                                targetLanguage: lang.code 
                                              });
                                            }
                                          }}
                                        >
                                          {exists ? (
                                            isPublished ? '✓' : '○'
                                          ) : (
                                            translatingLang === lang.code && translatingId === englishVersion?.id
                                              ? <Loader2 className="h-3 w-3 animate-spin" />
                                              : '+'
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-medium">{lang.flag} {lang.name}</p>
                                        <p className="text-xs">
                                          {exists 
                                            ? isPublished ? 'Published - click to view' : 'Draft - click to view'
                                            : englishVersion ? 'Click to translate' : 'Need English first'
                                          }
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>

                            {/* Add Missing Languages Button */}
                            {englishVersion && missingLangs.length > 0 && (
                              <div className="flex items-center gap-2 mb-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => backfillMissingLanguagesMutation.mutate({ 
                                    topic, 
                                    englishId: englishVersion.id 
                                  })}
                                  disabled={isBackfilling || translateMutation.isPending}
                                >
                                  {isBackfilling ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Adding...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCcw className="h-3 w-3 mr-1" />
                                      Add Missing {missingLangs.length} Languages
                                    </>
                                  )}
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                  {missingLangs.map(l => l.flag).join(' ')}
                                </span>
                              </div>
                            )}

                            {!englishVersion && (
                              <p className="text-xs text-amber-600 mb-3 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                No English version - create English first to enable translations
                              </p>
                            )}

                            {/* Actions Table for each version */}
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[60px]">Lang</TableHead>
                                  <TableHead>Slug</TableHead>
                                  <TableHead className="w-[80px]">Status</TableHead>
                                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {topicComparisons.map((c) => (
                                  <TableRow key={c.id}>
                                    <TableCell>
                                      <Badge variant="outline" className="uppercase text-xs">
                                        {LANGUAGES.find(l => l.code === c.language)?.flag} {c.language}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                      {c.slug}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={c.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                                        {c.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                          <Link to={`/${c.language}/compare/${c.slug}`} target="_blank">
                                            <Eye className="h-3.5 w-3.5" />
                                          </Link>
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => togglePublishMutation.mutate({ id: c.id, currentStatus: c.status })}
                                        >
                                          <CheckCircle className={`h-3.5 w-3.5 ${c.status === 'published' ? 'text-green-500' : ''}`} />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => {
                                            if (confirm('Delete this comparison?')) {
                                              deleteMutation.mutate(c.id);
                                            }
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
