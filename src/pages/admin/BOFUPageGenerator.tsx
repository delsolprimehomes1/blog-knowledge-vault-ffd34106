import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Target,
  BookOpen,
  Calculator,
  FileCheck,
  Landmark,
  Zap
} from "lucide-react";

interface BOFUTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetKeyword: string;
  category: string;
  estimatedTime: string;
}

const BOFU_TEMPLATES: BOFUTemplate[] = [
  {
    id: 'golden-visa',
    title: 'Golden Visa Spain Guide',
    description: 'Complete guide covering €500K investment, 10-step process, benefits, and comparison with Portugal',
    icon: <Landmark className="h-5 w-5" />,
    targetKeyword: 'golden visa spain',
    category: 'Legal & Regulations',
    estimatedTime: '~2 min'
  },
  {
    id: 'property-costs',
    title: 'Property Buying Costs Calculator',
    description: 'Detailed breakdown of taxes, fees, legal costs with worked examples at different price points',
    icon: <Calculator className="h-5 w-5" />,
    targetKeyword: 'costa del sol property buying costs',
    category: 'Buying Guide',
    estimatedTime: '~2 min'
  },
  {
    id: 'nie-number',
    title: 'NIE Number Application Guide',
    description: 'Step-by-step guide for obtaining Spanish tax ID, documents needed, timelines, and tips',
    icon: <FileCheck className="h-5 w-5" />,
    targetKeyword: 'nie number spain',
    category: 'Legal & Regulations',
    estimatedTime: '~2 min'
  },
  {
    id: 'spanish-mortgage',
    title: 'Spanish Mortgage for Non-Residents',
    description: 'LTV ratios, bank options, documentation, and complete mortgage process for foreign buyers',
    icon: <Landmark className="h-5 w-5" />,
    targetKeyword: 'spanish mortgage non residents',
    category: 'Financing',
    estimatedTime: '~2 min'
  }
];

interface GenerationResult {
  templateId: string;
  status: 'created' | 'exists' | 'error';
  articleId?: string;
  slug?: string;
  headline?: string;
  error?: string;
}

export default function BOFUPageGenerator() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');
  const [customAudience, setCustomAudience] = useState('');
  const [language, setLanguage] = useState('en');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);

  // Fetch authors for assignment
  const { data: authors } = useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('authors')
        .select('id, name')
        .order('name');
      return data || [];
    }
  });

  // Check which templates already have articles
  const { data: existingArticles, refetch: refetchExisting } = useQuery({
    queryKey: ['existing-bofu-articles'],
    queryFn: async () => {
      const slugs = [
        'golden-visa-spain-complete-guide',
        'costa-del-sol-property-buying-costs',
        'nie-number-spain-complete-application',
        'spanish-mortgage-non-residents'
      ];
      
      const { data } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, status')
        .or(slugs.map(s => `slug.ilike.%${s}%`).join(','));
      
      return data || [];
    }
  });

  const getTemplateStatus = (templateId: string): 'new' | 'exists' => {
    const keywordMap: Record<string, string> = {
      'golden-visa': 'golden-visa',
      'property-costs': 'property-buying-costs',
      'nie-number': 'nie-number',
      'spanish-mortgage': 'mortgage'
    };
    
    const searchTerm = keywordMap[templateId] || templateId;
    return existingArticles?.some(a => a.slug?.includes(searchTerm)) ? 'exists' : 'new';
  };

  const handleGenerateSingle = async (templateId: string) => {
    setIsGenerating(true);
    setSelectedTemplate(templateId);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-bofu-page', {
        body: {
          templateId,
          language,
          generateAll: false
        }
      });

      if (error) throw error;

      if (data.results?.length > 0) {
        const result = data.results[0];
        if (result.status === 'created') {
          toast.success(`Created: ${result.headline}`);
          navigate(`/admin/articles/${result.articleId}`);
        } else if (result.status === 'exists') {
          toast.info('Article already exists');
          navigate(`/admin/articles/${result.articleId}`);
        }
      }

      if (data.errors?.length > 0) {
        toast.error(data.errors[0]);
      }

      refetchExisting();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate article');
    } finally {
      setIsGenerating(false);
      setSelectedTemplate(null);
    }
  };

  const handleGenerateCustom = async () => {
    if (!customTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-bofu-page', {
        body: {
          customTopic: customTopic.trim(),
          customKeyword: customKeyword.trim() || customTopic.toLowerCase(),
          customAudience: customAudience.trim() || 'International property buyers',
          language,
          generateAll: false
        }
      });

      if (error) throw error;

      if (data.results?.length > 0) {
        const result = data.results[0];
        if (result.status === 'created') {
          toast.success(`Created: ${result.headline}`);
          navigate(`/admin/articles/${result.articleId}`);
        }
      }

      if (data.errors?.length > 0) {
        toast.error(data.errors[0]);
      }

      refetchExisting();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate article');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    setIsBulkGenerating(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-bofu-page', {
        body: {
          generateAll: true,
          language
        }
      });

      if (error) throw error;

      setResults(data.results || []);
      
      toast.success(
        `Generated ${data.generated} articles, ${data.existing} already existed, ${data.failed} failed`
      );

      refetchExisting();
    } catch (error: any) {
      console.error('Bulk generation error:', error);
      toast.error(error.message || 'Bulk generation failed');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              BOFU Page Generator
            </h1>
            <p className="text-muted-foreground mt-1">
              Create high-converting Bottom of Funnel guides optimized for AI citation
            </p>
          </div>
          
          <Button 
            onClick={handleGenerateAll}
            disabled={isBulkGenerating || isGenerating}
            size="lg"
            className="gap-2"
          >
            {isBulkGenerating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Zap className="h-5 w-5" />
            )}
            Generate All Missing Pages
          </Button>
        </div>

        {/* Bulk Generation Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Generation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {result.status === 'created' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {result.status === 'exists' && (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium">{result.headline || result.templateId}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.status === 'created' ? 'Created as draft' : 'Already exists'}
                        </p>
                      </div>
                    </div>
                    {result.articleId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/articles/${result.articleId}`)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Pre-built Templates
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Custom Topic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BOFU_TEMPLATES.map((template) => {
                const status = getTemplateStatus(template.id);
                const isLoading = isGenerating && selectedTemplate === template.id;

                return (
                  <Card 
                    key={template.id}
                    className={`relative transition-all ${
                      status === 'exists' ? 'opacity-75' : 'hover:border-primary/50'
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {template.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{template.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {template.estimatedTime}
                              </span>
                            </div>
                          </div>
                        </div>
                        {status === 'exists' && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Exists
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Keyword:</span> {template.targetKeyword}
                        </div>
                        <Button
                          onClick={() => handleGenerateSingle(template.id)}
                          disabled={isGenerating || isBulkGenerating}
                          variant={status === 'exists' ? 'outline' : 'default'}
                          size="sm"
                          className="gap-2"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          {status === 'exists' ? 'Regenerate' : 'Generate'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Custom BOFU Page
                </CardTitle>
                <CardDescription>
                  Generate a custom Bottom of Funnel guide for any topic
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customTopic">Topic / Title *</Label>
                    <Input
                      id="customTopic"
                      placeholder="e.g., Buying Property in Marbella Complete Guide"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customKeyword">Target Keyword</Label>
                    <Input
                      id="customKeyword"
                      placeholder="e.g., buying property marbella"
                      value={customKeyword}
                      onChange={(e) => setCustomKeyword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customAudience">Target Audience</Label>
                    <Input
                      id="customAudience"
                      placeholder="e.g., UK buyers looking for holiday homes"
                      value={customAudience}
                      onChange={(e) => setCustomAudience(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="nl">Dutch</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="sv">Swedish</SelectItem>
                        <SelectItem value="no">Norwegian</SelectItem>
                        <SelectItem value="da">Danish</SelectItem>
                        <SelectItem value="fi">Finnish</SelectItem>
                        <SelectItem value="pl">Polish</SelectItem>
                        <SelectItem value="hu">Hungarian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateCustom}
                  disabled={isGenerating || isBulkGenerating || !customTopic.trim()}
                  className="w-full gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Custom BOFU Page
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* AI Citation Optimization Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              AI Citation Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-1">Speakable Content</h4>
                <p className="text-muted-foreground">
                  Each page includes a 50-80 word speakable answer optimized for voice search and AI extraction
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Structured FAQs</h4>
                <p className="text-muted-foreground">
                  8-10 decision-level Q&As formatted for FAQ schema and AI systems
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Approved Citations</h4>
                <p className="text-muted-foreground">
                  Only links to pre-approved authoritative domains for trust signals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
