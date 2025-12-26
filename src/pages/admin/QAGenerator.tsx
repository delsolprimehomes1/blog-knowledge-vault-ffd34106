import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, FileQuestion, Loader2, CheckCircle, XCircle, RefreshCw, Eye, Edit, Trash2, Upload, ChevronLeft, ChevronRight, MapPin, Building, ExternalLink, Languages, Plus, Play, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'nl', name: 'Dutch' },
  { code: 'fr', name: 'French' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
];

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧', nl: '🇳🇱', hu: '🇭🇺', de: '🇩🇪', fr: '🇫🇷',
  sv: '🇸🇪', pl: '🇵🇱', no: '🇳🇴', fi: '🇫🇮', da: '🇩🇰',
};

const CITY_OPTIONS = [
  { slug: 'marbella', name: 'Marbella' },
  { slug: 'estepona', name: 'Estepona' },
  { slug: 'sotogrande', name: 'Sotogrande' },
  { slug: 'malaga-city', name: 'Málaga City' },
  { slug: 'fuengirola', name: 'Fuengirola' },
  { slug: 'benalmadena', name: 'Benalmádena' },
  { slug: 'mijas', name: 'Mijas' },
  { slug: 'casares', name: 'Casares' },
  { slug: 'manilva', name: 'Manilva' },
  { slug: 'torremolinos', name: 'Torremolinos' },
];

const ITEMS_PER_PAGE = 50;

interface TrackingRecord {
  id: string;
  source_article_id: string;
  source_article_headline: string;
  source_article_slug: string;
  hreflang_group_core: string;
  hreflang_group_decision: string;
  languages_generated: string[];
  total_qa_pages: number;
  status: string;
  created_at: string;
}

interface JobState {
  jobId: string;
  articleIds: string[];
  languages: string[];
  processedArticles: number;
  totalArticles: number;
  generatedPages: number;
  status: 'running' | 'completed' | 'failed';
  lastArticle?: { id: string; headline: string; pagesGenerated: number };
}

export default function FAQGenerator() {
  const queryClient = useQueryClient();
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['all']);
  const [activeTab, setActiveTab] = useState('available');
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // City Q&A state
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [cityLanguages, setCityLanguages] = useState<string[]>(['all']);
  const [cityJobId, setCityJobId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Job state for chunked processing
  const [jobState, setJobState] = useState<JobState | null>(null);
  const isProcessingRef = useRef(false);

  // Fetch tracking data
  const { data: trackingData = [], refetch: refetchTracking } = useQuery({
    queryKey: ['qa-article-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_article_tracking')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TrackingRecord[];
    },
  });

  // Fetch stuck jobs that can be resumed
  const { data: stuckJobs = [], refetch: refetchStuckJobs } = useQuery({
    queryKey: ['stuck-qa-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_generation_jobs')
        .select('*')
        .eq('status', 'running')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  const usedArticleIds = new Set(trackingData.map(t => t.source_article_id));

  // Fetch published English articles
  const { data: allArticles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ['published-english-articles-for-faq'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, language, category, funnel_stage, date_published, slug')
        .eq('status', 'published')
        .eq('language', 'en')
        .order('date_published', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const availableArticles = allArticles.filter(a => !usedArticleIds.has(a.id));

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch generated QA pages
  const { data: qaPages = [], refetch: refetchQaPages } = useQuery({
    queryKey: ['qa-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_pages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Process next article in the queue
  const processNextArticle = useCallback(async (currentJobState: JobState) => {
    if (isProcessingRef.current) return;
    if (currentJobState.status === 'completed' || currentJobState.status === 'failed') return;
    
    isProcessingRef.current = true;
    
    try {
      console.log(`[Frontend] Processing article ${currentJobState.processedArticles + 1}/${currentJobState.totalArticles}`);
      
      const response = await supabase.functions.invoke('generate-qa-pages', {
        body: {
          articleIds: currentJobState.articleIds,
          languages: currentJobState.languages,
          jobId: currentJobState.jobId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process article');
      }

      const data = response.data;
      
      const newJobState: JobState = {
        ...currentJobState,
        processedArticles: data.processedArticles,
        generatedPages: data.generatedPages || currentJobState.generatedPages,
        status: data.status === 'completed' ? 'completed' : 'running',
        lastArticle: data.lastArticle,
      };

      setJobState(newJobState);

      if (data.continueProcessing) {
        // Continue processing next article
        setTimeout(() => {
          isProcessingRef.current = false;
          processNextArticle(newJobState);
        }, 500); // Small delay between articles
      } else {
        // All done
        isProcessingRef.current = false;
        toast.success(`Generated ${data.generatedPages} Q&A pages!`);
        refetchQaPages();
        refetchTracking();
        refetchStuckJobs();
      }
    } catch (error) {
      console.error('[Frontend] Error processing article:', error);
      isProcessingRef.current = false;
      setJobState(prev => prev ? { ...prev, status: 'failed' } : null);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [refetchQaPages, refetchTracking, refetchStuckJobs]);

  // Start generation
  const startGeneration = useCallback(async () => {
    if (selectedArticles.length === 0) return;
    
    const langs = selectedLanguages.includes('all') ? ['all'] : selectedLanguages;
    
    try {
      // Create initial job
      const response = await supabase.functions.invoke('generate-qa-pages', {
        body: {
          articleIds: selectedArticles,
          languages: langs,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start generation');
      }

      const data = response.data;
      
      const newJobState: JobState = {
        jobId: data.jobId,
        articleIds: selectedArticles,
        languages: langs,
        processedArticles: data.processedArticles || 0,
        totalArticles: selectedArticles.length,
        generatedPages: data.generatedPages || 0,
        status: data.status === 'completed' ? 'completed' : 'running',
        lastArticle: data.lastArticle,
      };

      setJobState(newJobState);
      setActiveTab('progress');
      toast.info('Q&A generation started...');

      if (data.continueProcessing) {
        setTimeout(() => {
          isProcessingRef.current = false;
          processNextArticle(newJobState);
        }, 500);
      }
    } catch (error) {
      console.error('[Frontend] Error starting generation:', error);
      toast.error(`Failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedArticles, selectedLanguages, processNextArticle]);

  // Resume a stuck job
  const resumeJob = useCallback(async (job: any) => {
    const jobState: JobState = {
      jobId: job.id,
      articleIds: job.article_ids || [],
      languages: job.languages || ['all'],
      processedArticles: job.processed_articles || 0,
      totalArticles: job.total_articles || 0,
      generatedPages: job.generated_faq_pages || 0,
      status: 'running',
    };

    setJobState(jobState);
    setActiveTab('progress');
    toast.info('Resuming Q&A generation...');

    setTimeout(() => {
      isProcessingRef.current = false;
      processNextArticle(jobState);
    }, 500);
  }, [processNextArticle]);

  // Poll city job status
  useEffect(() => {
    if (!cityJobId) return;
    
    const interval = setInterval(async () => {
      const response = await supabase.functions.invoke('check-qa-job-status', {
        body: { jobId: cityJobId },
      });
      
      if (response.data?.status === 'completed') {
        clearInterval(interval);
        toast.success(`Generated ${response.data.generatedQaPages} city Q&A pages!`);
        setCityJobId(null);
        setActiveTab('results');
        refetchQaPages();
      } else if (response.data?.status === 'failed') {
        clearInterval(interval);
        toast.error(response.data.error || 'City Q&A generation failed');
        setCityJobId(null);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [cityJobId, refetchQaPages]);

  // Generate City Q&A pages mutation
  const generateCityQaMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('generate-city-qa-pages', {
        body: {
          citySlugs: selectedCities,
          languages: cityLanguages.includes('all') ? ['all'] : cityLanguages,
        },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      setCityJobId(data.jobId);
      setActiveTab('progress');
      toast.info('City Q&A generation started...');
    },
    onError: (error) => {
      toast.error(`Failed to start city Q&A generation: ${error.message}`);
    },
  });

  // Add missing languages mutation
  const addLanguagesMutation = useMutation({
    mutationFn: async ({ articleId, languages }: { articleId: string; languages: string[] }) => {
      const response = await supabase.functions.invoke('generate-qa-pages', {
        body: {
          articleIds: [articleId],
          mode: 'single',
          languages,
        },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      const newJobState: JobState = {
        jobId: data.jobId,
        articleIds: [data.lastArticle?.id].filter(Boolean) as string[],
        languages: data.languages || ['all'],
        processedArticles: data.processedArticles || 0,
        totalArticles: 1,
        generatedPages: data.generatedPages || 0,
        status: data.status === 'completed' ? 'completed' : 'running',
      };
      setJobState(newJobState);
      setActiveTab('progress');
      toast.info('Adding missing languages...');

      if (data.continueProcessing) {
        setTimeout(() => {
          isProcessingRef.current = false;
          processNextArticle(newJobState);
        }, 500);
      }
    },
    onError: (error) => {
      toast.error(`Failed to add languages: ${error.message}`);
    },
  });

  // Update QA page mutation
  const updateQaMutation = useMutation({
    mutationFn: async (qa: any) => {
      const { error } = await supabase
        .from('qa_pages')
        .update({
          title: qa.title,
          question_main: qa.question_main,
          answer_main: qa.answer_main,
          speakable_answer: qa.speakable_answer,
          meta_title: qa.meta_title,
          meta_description: qa.meta_description,
          status: qa.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', qa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('QA page updated');
      setEditingFaq(null);
      refetchQaPages();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Delete QA page mutation
  const deleteQaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('qa_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('QA page deleted');
      refetchQaPages();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Bulk publish mutation
  const bulkPublishMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('qa_pages')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('status', 'draft')
        .select('id');
      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: (count) => {
      toast.success(`Published ${count} QA pages`);
      refetchQaPages();
    },
    onError: (error) => {
      toast.error(`Failed to publish: ${error.message}`);
    },
  });

  const draftCount = qaPages.filter((qa: any) => qa.status === 'draft').length;
  const publishedCount = qaPages.filter((qa: any) => qa.status === 'published').length;

  // Regenerate section mutation
  const regenerateSectionMutation = useMutation({
    mutationFn: async ({ qaPageId, section }: { qaPageId: string; section: string }) => {
      const response = await supabase.functions.invoke('regenerate-qa-section', {
        body: { qaPageId, section },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Section regenerated');
      if (editingFaq && data.qaPage) {
        setEditingFaq(data.qaPage);
      }
      refetchQaPages();
    },
    onError: (error) => {
      toast.error(`Failed to regenerate: ${error.message}`);
    },
  });

  // Filter available articles
  const filteredArticles = availableArticles.filter((article) => {
    const matchesSearch = article.headline.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredArticles.length);
  const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, languageFilter, categoryFilter]);

  const toggleArticle = (id: string) => {
    setSelectedArticles((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleAllOnPage = () => {
    const pageArticleIds = paginatedArticles.map((a) => a.id);
    const allPageSelected = pageArticleIds.every((id) => selectedArticles.includes(id));
    
    if (allPageSelected) {
      setSelectedArticles((prev) => prev.filter((id) => !pageArticleIds.includes(id)));
    } else {
      setSelectedArticles((prev) => [...new Set([...prev, ...pageArticleIds])]);
    }
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredArticles.map((a) => a.id);
    setSelectedArticles(allFilteredIds);
  };

  const toggleLanguage = (code: string) => {
    if (code === 'all') {
      setSelectedLanguages(['all']);
    } else {
      setSelectedLanguages((prev) => {
        const without = prev.filter((l) => l !== 'all' && l !== code);
        if (prev.includes(code)) {
          return without.length === 0 ? ['all'] : without;
        }
        return [...without, code];
      });
    }
  };

  const toggleCity = (slug: string) => {
    setSelectedCities((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    );
  };

  const selectAllCities = () => {
    setSelectedCities(CITY_OPTIONS.map((c) => c.slug));
  };

  const toggleCityLanguage = (code: string) => {
    if (code === 'all') {
      setCityLanguages(['all']);
    } else {
      setCityLanguages((prev) => {
        const without = prev.filter((l) => l !== 'all' && l !== code);
        if (prev.includes(code)) {
          return without.length === 0 ? ['en'] : without;
        }
        return [...without, code];
      });
    }
  };

  const handleAddMissingLanguages = (tracking: TrackingRecord) => {
    const missingLangs = LANGUAGES.map(l => l.code).filter(
      l => !tracking.languages_generated.includes(l)
    );
    if (missingLangs.length === 0) {
      toast.info('All languages already generated');
      return;
    }
    addLanguagesMutation.mutate({
      articleId: tracking.source_article_id,
      languages: missingLangs,
    });
  };

  const progressPercent = jobState 
    ? Math.round((jobState.processedArticles / jobState.totalArticles) * 100) 
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">QA Page Generator</h1>
            <p className="text-muted-foreground">
              Generate standalone QA pages from published blog articles
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin/qa-dashboard">
              <Languages className="mr-2 h-4 w-4" />
              View Dashboard
            </Link>
          </Button>
        </div>

        {/* Stuck Jobs Alert */}
        {stuckJobs.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                {stuckJobs.length} job(s) can be resumed
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="space-y-2">
                {stuckJobs.slice(0, 3).map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between bg-white p-2 rounded border">
                    <div className="text-sm">
                      <span className="font-medium">{job.processed_articles}/{job.total_articles} articles</span>
                      <span className="text-muted-foreground ml-2">
                        Started {format(new Date(job.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => resumeJob(job)}>
                      <Play className="mr-1 h-3 w-3" />
                      Resume
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="available">
              Available Articles ({availableArticles.length})
            </TabsTrigger>
            <TabsTrigger value="generated">
              Already Generated ({trackingData.length})
            </TabsTrigger>
            <TabsTrigger value="city-qa">
              <MapPin className="mr-1 h-4 w-4" />
              City Q&A
            </TabsTrigger>
            <TabsTrigger value="progress" disabled={!jobState && !cityJobId}>
              Progress {(jobState?.status === 'running' || cityJobId) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </TabsTrigger>
            <TabsTrigger value="results">Generated QAs ({qaPages.length})</TabsTrigger>
          </TabsList>

          {/* Available Articles Tab */}
          <TabsContent value="available" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Select Articles for Q&A Generation</CardTitle>
                <CardDescription>
                  These English articles don't have Q&A pages yet. Select and generate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search articles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language Selection */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Generate Q&A pages for languages:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={selectedLanguages.includes('all') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleLanguage('all')}
                    >
                      All 10 Languages ✓
                    </Badge>
                    {LANGUAGES.map((lang) => (
                      <Badge
                        key={lang.code}
                        variant={selectedLanguages.includes(lang.code) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleLanguage(lang.code)}
                      >
                        {LANGUAGE_FLAGS[lang.code]} {lang.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Results count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {filteredArticles.length > 0 ? startIndex + 1 : 0}-{endIndex} of {filteredArticles.length} articles
                    {searchTerm && ` matching "${searchTerm}"`}
                  </span>
                  {filteredArticles.length > ITEMS_PER_PAGE && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllFiltered}
                      disabled={selectedArticles.length === filteredArticles.length}
                    >
                      Select all {filteredArticles.length} matching articles
                    </Button>
                  )}
                </div>

                {/* Articles Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={paginatedArticles.length > 0 && paginatedArticles.every((a) => selectedArticles.includes(a.id))}
                            onCheckedChange={toggleAllOnPage}
                          />
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Funnel</TableHead>
                        <TableHead>Published</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articlesLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredArticles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {availableArticles.length === 0 
                              ? 'All English articles already have Q&A pages generated!'
                              : 'No articles found matching your filters'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedArticles.map((article) => (
                          <TableRow key={article.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedArticles.includes(article.id)}
                                onCheckedChange={() => toggleArticle(article.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium max-w-[300px] truncate">
                              {article.headline}
                            </TableCell>
                            <TableCell>{article.category}</TableCell>
                            <TableCell>
                              <Badge variant={article.funnel_stage === 'BOFU' ? 'default' : 'secondary'}>
                                {article.funnel_stage}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {article.date_published
                                ? format(new Date(article.date_published), 'MMM d, yyyy')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Generate Button */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedArticles.length} article(s) selected
                    {selectedArticles.length > 0 && (
                      <> • Will generate {selectedArticles.length * 2 * (selectedLanguages.includes('all') ? 10 : selectedLanguages.length)} Q&A pages</>
                    )}
                  </p>
                  <div className="flex gap-2">
                    {selectedArticles.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedArticles([])}
                      >
                        Clear Selection
                      </Button>
                    )}
                    <Button
                      onClick={startGeneration}
                      disabled={selectedArticles.length === 0 || jobState?.status === 'running'}
                    >
                      {jobState?.status === 'running' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileQuestion className="mr-2 h-4 w-4" />
                      )}
                      Generate Q&A Pages
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Already Generated Tab */}
          <TabsContent value="generated" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Articles with Existing Q&As</CardTitle>
                <CardDescription>
                  These articles already have Q&A pages. You can add missing languages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead>Languages Generated</TableHead>
                        <TableHead>Missing Languages</TableHead>
                        <TableHead>Q&A Pages</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackingData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No Q&A pages generated yet. Go to "Available Articles" to start.
                          </TableCell>
                        </TableRow>
                      ) : (
                        trackingData.map((item) => {
                          const missingLangs = LANGUAGES.map(l => l.code).filter(
                            l => !item.languages_generated.includes(l)
                          );
                          
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium line-clamp-1">{item.source_article_headline}</p>
                                  <a 
                                    href={`/blog/${item.source_article_slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                  >
                                    View article <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {item.languages_generated.map((lang: string) => (
                                    <Badge key={lang} variant="secondary" className="text-xs">
                                      {LANGUAGE_FLAGS[lang]} {lang.toUpperCase()}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {missingLangs.length === 0 ? (
                                    <span className="text-green-600 text-sm flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      All complete
                                    </span>
                                  ) : (
                                    missingLangs.map((lang) => (
                                      <Badge key={lang} variant="outline" className="text-xs text-amber-600">
                                        {LANGUAGE_FLAGS[lang]} {lang.toUpperCase()}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {item.total_qa_pages} pages
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {missingLangs.length > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddMissingLanguages(item)}
                                      disabled={addLanguagesMutation.isPending}
                                    >
                                      <Plus className="mr-1 h-3 w-3" />
                                      Add {missingLangs.length} Languages
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* City Q&A Tab */}
          <TabsContent value="city-qa" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Generate Hyper-Specific City Q&A Pages
                </CardTitle>
                <CardDescription>
                  Create AI-ready Q&A pages for each Costa del Sol city.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* City Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Select Cities</label>
                    <Button variant="outline" size="sm" onClick={selectAllCities}>
                      Select All 10 Cities
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {CITY_OPTIONS.map((city) => (
                      <div
                        key={city.slug}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedCities.includes(city.slug)
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleCity(city.slug)}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedCities.includes(city.slug)}
                            onCheckedChange={() => toggleCity(city.slug)}
                          />
                          <span className="text-sm font-medium">{city.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Language Selection */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-3">Generate Q&A pages for languages:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={cityLanguages.includes('all') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCityLanguage('all')}
                    >
                      All 10 Languages ✓
                    </Badge>
                    {LANGUAGES.map((lang) => (
                      <Badge
                        key={lang.code}
                        variant={cityLanguages.includes(lang.code) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleCityLanguage(lang.code)}
                      >
                        {LANGUAGE_FLAGS[lang.code]} {lang.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Expected Output */}
                {selectedCities.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Expected output:</strong>{' '}
                      {selectedCities.length} cities × 10 questions × {
                        cityLanguages.includes('all') ? 10 : cityLanguages.length
                      } language(s) = ~{
                        selectedCities.length * 10 * (cityLanguages.includes('all') ? 10 : cityLanguages.length)
                      } Q&A pages
                    </p>
                  </div>
                )}

                {/* Generate Button */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedCities.length} city/cities selected
                  </p>
                  <div className="flex gap-2">
                    {selectedCities.length > 0 && (
                      <Button variant="outline" onClick={() => setSelectedCities([])}>
                        Clear Selection
                      </Button>
                    )}
                    <Button
                      onClick={() => generateCityQaMutation.mutate()}
                      disabled={selectedCities.length === 0 || generateCityQaMutation.isPending}
                    >
                      {generateCityQaMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="mr-2 h-4 w-4" />
                      )}
                      Generate City Q&A Pages
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Generation Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {jobState ? (
                  <>
                    <div className="flex items-center gap-4">
                      {jobState.status === 'running' ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : jobState.status === 'completed' ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      ) : (
                        <XCircle className="h-8 w-8 text-red-600" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">
                          {jobState.status === 'running' 
                            ? `Processing article ${jobState.processedArticles + 1} of ${jobState.totalArticles}...`
                            : jobState.status === 'completed'
                            ? 'Generation complete!'
                            : 'Generation failed'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {jobState.generatedPages} Q&A pages generated so far
                        </p>
                        {jobState.lastArticle && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last: {jobState.lastArticle.headline} (+{jobState.lastArticle.pagesGenerated} pages)
                          </p>
                        )}
                      </div>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <p className="text-center text-sm text-muted-foreground">
                      {progressPercent}% complete ({jobState.processedArticles}/{jobState.totalArticles} articles)
                    </p>
                    {jobState.status === 'completed' && (
                      <div className="flex justify-center pt-4">
                        <Button onClick={() => {
                          setJobState(null);
                          setActiveTab('results');
                        }}>
                          View Generated Q&A Pages
                        </Button>
                      </div>
                    )}
                  </>
                ) : cityJobId ? (
                  <>
                    <div className="flex items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Generating City Q&A pages...</p>
                        <p className="text-sm text-muted-foreground">
                          This may take a few minutes depending on the number of cities and languages
                        </p>
                      </div>
                    </div>
                    <Progress value={50} className="h-2" />
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No generation in progress. Go to "Available Articles" to start.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Generated Q&A Pages</CardTitle>
                  <CardDescription>
                    Review, edit, and publish generated Q&A pages
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRefreshing}
                    onClick={async () => {
                      setIsRefreshing(true);
                      await refetchQaPages();
                      setIsRefreshing(false);
                      toast.success('Q&A list refreshed');
                    }}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {draftCount} Draft
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {publishedCount} Published
                    </Badge>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={draftCount === 0 || bulkPublishMutation.isPending}
                      >
                        {bulkPublishMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Publish All Drafts
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Publish All Draft Q&A Pages?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will publish {draftCount} draft Q&A page{draftCount !== 1 ? 's' : ''}. 
                          They will become publicly accessible on your website.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => bulkPublishMutation.mutate()}
                        >
                          Publish All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qaPages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No Q&A pages generated yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        qaPages.slice(0, 50).map((qa: any) => (
                          <TableRow key={qa.id}>
                            <TableCell className="font-medium max-w-[250px] truncate">
                              {qa.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant={qa.qa_type === 'core' ? 'default' : 'secondary'}>
                                {qa.qa_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {LANGUAGE_FLAGS[qa.language]} {qa.language?.toUpperCase()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={qa.status === 'published' ? 'default' : 'outline'}>
                                {qa.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {qa.created_at ? format(new Date(qa.created_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(`/${qa.language}/qa/${qa.slug}`, '_blank')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingFaq(qa)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Q&A Page?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete this Q&A page.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteQaMutation.mutate(qa.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {qaPages.length > 50 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Showing first 50 of {qaPages.length} Q&A pages
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingFaq} onOpenChange={() => setEditingFaq(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Q&A Page</DialogTitle>
          </DialogHeader>
          {editingFaq && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editingFaq.title || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Main Question</label>
                <Input
                  value={editingFaq.question_main || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question_main: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Main Answer</label>
                <Textarea
                  value={editingFaq.answer_main || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer_main: e.target.value })}
                  rows={6}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Speakable Answer</label>
                <Textarea
                  value={editingFaq.speakable_answer || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, speakable_answer: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Meta Title</label>
                  <Input
                    value={editingFaq.meta_title || ''}
                    onChange={(e) => setEditingFaq({ ...editingFaq, meta_title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={editingFaq.status || 'draft'}
                    onValueChange={(v) => setEditingFaq({ ...editingFaq, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Meta Description</label>
                <Textarea
                  value={editingFaq.meta_description || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq, meta_description: e.target.value })}
                  rows={2}
                />
              </div>
              
              {/* Regenerate buttons */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Regenerate Sections</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateSectionMutation.mutate({ qaPageId: editingFaq.id, section: 'answer' })}
                    disabled={regenerateSectionMutation.isPending}
                  >
                    <RefreshCw className={`mr-1 h-3 w-3 ${regenerateSectionMutation.isPending ? 'animate-spin' : ''}`} />
                    Answer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateSectionMutation.mutate({ qaPageId: editingFaq.id, section: 'speakable' })}
                    disabled={regenerateSectionMutation.isPending}
                  >
                    <RefreshCw className={`mr-1 h-3 w-3 ${regenerateSectionMutation.isPending ? 'animate-spin' : ''}`} />
                    Speakable
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateSectionMutation.mutate({ qaPageId: editingFaq.id, section: 'seo' })}
                    disabled={regenerateSectionMutation.isPending}
                  >
                    <RefreshCw className={`mr-1 h-3 w-3 ${regenerateSectionMutation.isPending ? 'animate-spin' : ''}`} />
                    SEO
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFaq(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateQaMutation.mutate(editingFaq)}
              disabled={updateQaMutation.isPending}
            >
              {updateQaMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
