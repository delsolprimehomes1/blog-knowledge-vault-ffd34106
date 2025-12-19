import { useState, useEffect } from 'react';
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
import { Search, FileQuestion, Loader2, CheckCircle, XCircle, RefreshCw, Eye, Edit, Trash2, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

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

const ITEMS_PER_PAGE = 50;

export default function FAQGenerator() {
  const queryClient = useQueryClient();
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['all']);
  const [activeTab, setActiveTab] = useState('select');
  const [jobId, setJobId] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch published articles
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ['published-articles-for-faq'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, language, category, funnel_stage, date_published, slug')
        .eq('status', 'published')
        .order('date_published', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

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
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Poll job status
  useEffect(() => {
    if (!jobId) return;
    
    const interval = setInterval(async () => {
      const response = await supabase.functions.invoke('check-qa-job-status', {
        body: { jobId },
      });
      
      if (response.data?.status === 'completed') {
        clearInterval(interval);
        toast.success(`Generated ${response.data.generatedQaPages} QA pages!`);
        setJobId(null);
        setActiveTab('results');
        refetchQaPages();
      } else if (response.data?.status === 'failed') {
        clearInterval(interval);
        toast.error(response.data.error || 'Generation failed');
        setJobId(null);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, refetchQaPages]);

  // Generate QA pages mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('generate-qa-pages', {
        body: {
          articleIds: selectedArticles,
          mode: selectedArticles.length > 1 ? 'bulk' : 'single',
          languages: selectedLanguages.includes('all') ? ['all'] : selectedLanguages,
        },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      setJobId(data.jobId);
      setActiveTab('progress');
      toast.info('QA page generation started...');
    },
    onError: (error) => {
      toast.error(`Failed to start generation: ${error.message}`);
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

  // Count drafts and published
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

  // Filter articles
  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.headline.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = languageFilter === 'all' || article.language === languageFilter;
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    return matchesSearch && matchesLanguage && matchesCategory;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredArticles.length);
  const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, languageFilter, categoryFilter]);

  const toggleArticle = (id: string) => {
    setSelectedArticles((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  // Toggle all on current page
  const toggleAllOnPage = () => {
    const pageArticleIds = paginatedArticles.map((a) => a.id);
    const allPageSelected = pageArticleIds.every((id) => selectedArticles.includes(id));
    
    if (allPageSelected) {
      setSelectedArticles((prev) => prev.filter((id) => !pageArticleIds.includes(id)));
    } else {
      setSelectedArticles((prev) => [...new Set([...prev, ...pageArticleIds])]);
    }
  };

  // Select all filtered articles
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="select">Select Articles</TabsTrigger>
            <TabsTrigger value="progress" disabled={!jobId}>
              Progress {jobId && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </TabsTrigger>
            <TabsTrigger value="results">Generated QAs ({qaPages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filter & Select Articles</CardTitle>
                <CardDescription>
                  Choose published articles to generate FAQ pages from
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
                  <Select value={languageFilter} onValueChange={setLanguageFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                {/* Language Selection for Generation */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Generate FAQ pages for languages:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={selectedLanguages.includes('all') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleLanguage('all')}
                    >
                      All Languages
                    </Badge>
                    {LANGUAGES.map((lang) => (
                      <Badge
                        key={lang.code}
                        variant={selectedLanguages.includes(lang.code) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleLanguage(lang.code)}
                      >
                        {lang.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Results count and bulk select */}
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
                        <TableHead>Language</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Funnel</TableHead>
                        <TableHead>Published</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articlesLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredArticles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No published articles found
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
                            <TableCell>
                              <Badge variant="outline">{article.language.toUpperCase()}</Badge>
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

                {/* Pagination Controls */}
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
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="w-9"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="px-2">...</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-9"
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
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
                      <> • Will generate {selectedArticles.length * 2} FAQ pages per language</>
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
                      onClick={() => generateMutation.mutate()}
                      disabled={selectedArticles.length === 0 || generateMutation.isPending}
                    >
                      {generateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileQuestion className="mr-2 h-4 w-4" />
                      )}
                      Generate 2 FAQ Pages
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Generation Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Generating FAQ pages...</p>
                    <p className="text-sm text-muted-foreground">
                      This may take a few minutes depending on the number of articles
                    </p>
                  </div>
                </div>
                <Progress value={50} className="h-2" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Generated FAQ Pages</CardTitle>
                  <CardDescription>
                    Review, edit, and publish generated FAQ pages
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
                      toast.success('QA list refreshed');
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
                        className="bg-prime-gold hover:bg-prime-gold/90 text-prime-950"
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
                        <AlertDialogTitle>Publish All Draft FAQ Pages?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will publish {draftCount} draft FAQ page{draftCount !== 1 ? 's' : ''}. 
                          They will become publicly accessible on your website.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => bulkPublishMutation.mutate()}
                          className="bg-prime-gold hover:bg-prime-gold/90 text-prime-950"
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qaPages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No QA pages generated yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        qaPages.map((faq: any) => (
                          <TableRow key={faq.id}>
                            <TableCell className="font-medium max-w-[250px] truncate">
                              {faq.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant={faq.faq_type === 'core' ? 'default' : 'secondary'}>
                                {faq.faq_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{faq.language.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={faq.status === 'published' ? 'default' : 'outline'}>
                                {faq.status === 'published' ? (
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                ) : null}
                                {faq.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(faq.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(`/faq/${faq.slug}`, '_blank')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingFaq(faq)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm('Delete this QA page?')) {
                                      deleteQaMutation.mutate(faq.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editingFaq} onOpenChange={() => setEditingFaq(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit FAQ Page</DialogTitle>
            </DialogHeader>
            {editingFaq && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editingFaq.title}
                    onChange={(e) => setEditingFaq({ ...editingFaq, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Main Question</label>
                  <Input
                    value={editingFaq.question_main}
                    onChange={(e) => setEditingFaq({ ...editingFaq, question_main: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Answer</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => regenerateSectionMutation.mutate({ qaPageId: editingFaq.id, section: 'answer' })}
                      disabled={regenerateSectionMutation.isPending}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Regenerate
                    </Button>
                  </div>
                  <Textarea
                    value={editingFaq.answer_main}
                    onChange={(e) => setEditingFaq({ ...editingFaq, answer_main: e.target.value })}
                    rows={6}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Speakable Answer</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => regenerateSectionMutation.mutate({ qaPageId: editingFaq.id, section: 'speakable' })}
                      disabled={regenerateSectionMutation.isPending}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Regenerate
                    </Button>
                  </div>
                  <Textarea
                    value={editingFaq.speakable_answer}
                    onChange={(e) => setEditingFaq({ ...editingFaq, speakable_answer: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Meta Title ({editingFaq.meta_title?.length || 0}/60)</label>
                    <Input
                      value={editingFaq.meta_title}
                      onChange={(e) => setEditingFaq({ ...editingFaq, meta_title: e.target.value })}
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={editingFaq.status}
                      onValueChange={(value) => setEditingFaq({ ...editingFaq, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Meta Description ({editingFaq.meta_description?.length || 0}/160)</label>
                  <Textarea
                    value={editingFaq.meta_description}
                    onChange={(e) => setEditingFaq({ ...editingFaq, meta_description: e.target.value })}
                    maxLength={160}
                    rows={2}
                  />
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
                {updateQaMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
