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
import { Loader2, Scale, Trash2, Eye, CheckCircle, Edit } from "lucide-react";
import { Link } from "react-router-dom";

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'nl', name: 'Dutch' },
  { code: 'fr', name: 'French' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'pl', name: 'Polish' },
];

const SUGGESTED_COMPARISONS = [
  { a: 'Buying Off-Plan', b: 'Resale Property' },
  { a: 'New Build', b: 'Renovation' },
  { a: 'Local Agent', b: 'International Broker' },
  { a: 'Marbella', b: 'Estepona' },
  { a: 'Golden Visa', b: 'Standard Residency' },
  { a: 'Freehold', b: 'Leasehold' },
  { a: 'Beachfront Property', b: 'Golf Course Property' },
  { a: 'Holiday Home', b: 'Investment Property' },
  { a: 'Cash Purchase', b: 'Mortgage' },
  { a: 'Urban Apartment', b: 'Rural Villa' },
];

export default function ComparisonGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [niche, setNiche] = useState('real-estate');
  const [targetAudience, setTargetAudience] = useState('property buyers and investors');
  const [language, setLanguage] = useState('en');
  const [generatedComparison, setGeneratedComparison] = useState<any>(null);

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

  // Generate comparison
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-comparison', {
        body: { option_a: optionA, option_b: optionB, niche, target_audience: targetAudience, language }
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

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">Generate New</TabsTrigger>
            <TabsTrigger value="manage">
              Manage ({comparisons?.length || 0})
            </TabsTrigger>
          </TabsList>

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
                    onClick={() => generateMutation.mutate()}
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
