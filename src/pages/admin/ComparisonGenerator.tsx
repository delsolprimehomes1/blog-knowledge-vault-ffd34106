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
import { Loader2, Scale, Trash2, Eye, CheckCircle, Zap, Link as LinkIcon, Quote, Globe, Languages } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";

// Aligned with src/types/hreflang.ts SUPPORTED_LANGUAGES
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
];

type LanguageCode = 'en' | 'nl' | 'es' | 'de' | 'fr' | 'sv' | 'pl' | 'no' | 'fi' | 'da';

const SUGGESTED_COMPARISONS = [
  { a: 'Off-Plan Property', b: 'Resale Property', context: 'Which Should You Buy in Spain?' },
  { a: 'New Build', b: 'Renovation Project', context: 'Which Is Better for Investment?' },
  { a: 'Local Agent', b: 'International Broker', context: 'Who Should You Choose in Spain?' },
  { a: 'Marbella', b: 'Estepona', context: 'Where to Buy Property on Costa del Sol?' },
  { a: 'Golden Visa', b: 'Standard Residency', context: 'Which Path to Spanish Residency?' },
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
    relatedKeywords: ['golden visa', 'property investment', 'Marbella real estate'],
    description: 'Location comparison for high-end Marbella property seekers',
  },
  {
    optionA: 'Costa del Sol',
    optionB: 'Algarve Portugal',
    aiHeadline: 'Costa del Sol vs Algarve: Best Mediterranean Property Investment for 2025',
    targetAudience: 'international property investors comparing Mediterranean destinations',
    niche: 'real-estate',
    relatedKeywords: ['golden visa spain', 'property buying costs', 'tax comparison'],
    description: 'Destination comparison for European property investors',
  },
];

export default function ComparisonGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [niche, setNiche] = useState('real-estate');
  const [targetAudience, setTargetAudience] = useState('property buyers and investors');
  const [language, setLanguage] = useState('en');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<LanguageCode[]>(['en']);
  const [generatedComparison, setGeneratedComparison] = useState<any>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '' });

  const handleLanguageToggle = (langCode: LanguageCode) => {
    if (langCode === 'en') return;
    setSelectedLanguages(prev => 
      prev.includes(langCode) ? prev.filter(l => l !== langCode) : [...prev, langCode]
    );
  };

  const selectAllLanguages = () => setSelectedLanguages(LANGUAGES.map(l => l.code as LanguageCode));
  const deselectAllLanguages = () => setSelectedLanguages(['en']);

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

  // Generate comparison with internal links and citations
  const generateMutation = useMutation({
    mutationFn: async (params?: { optionA: string; optionB: string; targetAudience: string; niche: string; suggestedHeadline?: string }) => {
      const opts = params || { optionA, optionB, targetAudience, niche };
      const { data, error } = await supabase.functions.invoke('generate-comparison', {
        body: { 
          option_a: opts.optionA, 
          option_b: opts.optionB, 
          niche: opts.niche, 
          target_audience: opts.targetAudience, 
          suggested_headline: opts.suggestedHeadline,
          language,
          include_internal_links: true,
          include_citations: true,
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.comparison;
    },
    onSuccess: (data) => {
      setGeneratedComparison(data);
      toast({ title: "Comparison generated!", description: "Review and save when ready." });
    },
    onError: (error: Error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  // Save comparison
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

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Scale className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Comparison Generator</h1>
            <p className="text-muted-foreground">Create AI-citation optimized comparison pages</p>
          </div>
        </div>

        <Tabs defaultValue="phase3" className="space-y-6">
          <TabsList>
            <TabsTrigger value="phase3" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Phase 3 MOFU
            </TabsTrigger>
            <TabsTrigger value="generate">Generate Custom</TabsTrigger>
            <TabsTrigger value="manage">
              Manage ({comparisons?.length || 0})
            </TabsTrigger>
          </TabsList>

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
                                generateMutation.mutate({ 
                                  optionA: mofu.optionA, 
                                  optionB: mofu.optionB, 
                                  targetAudience: mofu.targetAudience, 
                                  niche: mofu.niche,
                                  suggestedHeadline: mofu.aiHeadline,
                                });
                              }}
                              disabled={generateMutation.isPending}
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

          <TabsContent value="generate" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Create Comparison</CardTitle>
                  <CardDescription>Enter the two options to compare</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Option A</Label>
                      <Input
                        value={optionA}
                        onChange={(e) => setOptionA(e.target.value)}
                        placeholder="e.g., Buying Off-Plan"
                      />
                    </div>
                    <div>
                      <Label>Option B</Label>
                      <Input
                        value={optionB}
                        onChange={(e) => setOptionB(e.target.value)}
                        placeholder="e.g., Resale Property"
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
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Niche</Label>
                      <Input
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        placeholder="e.g., real-estate"
                      />
                    </div>
                    <div>
                      <Label>Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(lang => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => generateMutation.mutate({ optionA, optionB, targetAudience, niche })}
                    disabled={!optionA || !optionB || generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Comparison'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Comparisons</CardTitle>
                  <CardDescription>Click to use as template</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_COMPARISONS.map((s, i) => (
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
                </CardContent>
              </Card>
            </div>

            {/* Generated Preview */}
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
                  <div>
                    <Label className="text-xs text-muted-foreground">Meta Description</Label>
                    <p className="text-sm text-muted-foreground">{generatedComparison.meta_description}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Quick Comparison Table</Label>
                    <div className="mt-2 text-sm">
                      {generatedComparison.quick_comparison_table?.length || 0} rows
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">FAQs</Label>
                    <div className="mt-2 text-sm">
                      {generatedComparison.qa_entities?.length || 0} questions
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>All Comparisons</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingComparisons ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : comparisons?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No comparisons yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Comparison</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisons?.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{c.option_a} vs {c.option_b}</p>
                              <p className="text-xs text-muted-foreground">{c.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase">{c.language}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'published' ? 'default' : 'secondary'}>
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                              >
                                <Link to={`/compare/${c.slug}`} target="_blank">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => togglePublishMutation.mutate({ id: c.id, currentStatus: c.status })}
                              >
                                <CheckCircle className={`h-4 w-4 ${c.status === 'published' ? 'text-green-500' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('Delete this comparison?')) {
                                    deleteMutation.mutate(c.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
