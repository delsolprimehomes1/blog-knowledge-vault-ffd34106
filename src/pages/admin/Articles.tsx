import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogArticle, ArticleStatus, FunnelStage, Language } from "@/types/blog";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Search, Edit, Eye, Trash2, Plus, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Articles = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [funnelFilter, setFunnelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      if (!data) return [];

      return data as unknown as BlogArticle[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const queryClient = useQueryClient();

  // Single article deletion
  const deleteMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase
        .from("blog_articles")
        .delete()
        .eq("id", articleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Article deleted successfully");
      setArticleToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete article: ${error.message}`);
    },
  });

  // Bulk article deletion
  const bulkDeleteMutation = useMutation({
    mutationFn: async (articleIds: string[]) => {
      const { error } = await supabase
        .from("blog_articles")
        .delete()
        .in("id", articleIds);
      
      if (error) throw error;
      return articleIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success(`Successfully deleted ${count} article${count > 1 ? 's' : ''}`);
      setSelectedArticles([]);
      setShowBulkDeleteDialog(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete articles: ${error.message}`);
    },
  });

  if (error) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
                <h2 className="text-2xl font-bold">Unable to Load Articles</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {error instanceof Error 
                    ? error.message 
                    : "There was a problem loading your articles. Please try again."}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Filter articles
  const filteredArticles = articles?.filter(article => {
    const matchesSearch = searchQuery === "" || 
      article.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    const matchesLanguage = languageFilter === "all" || article.language === languageFilter;
    const matchesFunnel = funnelFilter === "all" || article.funnel_stage === funnelFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesLanguage && matchesFunnel;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedArticles(paginatedArticles.map(a => a.id));
    } else {
      setSelectedArticles([]);
    }
  };

  const handleSelectArticle = (articleId: string, checked: boolean) => {
    if (checked) {
      setSelectedArticles([...selectedArticles, articleId]);
    } else {
      setSelectedArticles(selectedArticles.filter(id => id !== articleId));
    }
  };

  const isAllSelected = paginatedArticles.length > 0 && 
    paginatedArticles.every(a => selectedArticles.includes(a.id));
  const isSomeSelected = selectedArticles.length > 0 && !isAllSelected;

  const getStatusColor = (status: ArticleStatus) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
  };

  const getFunnelColor = (stage: FunnelStage) => {
    switch (stage) {
      case 'TOFU': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'MOFU': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'BOFU': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
            <p className="text-muted-foreground">
              Manage your blog content ({filteredArticles.length} total)
            </p>
          </div>
          <Button onClick={() => navigate('/admin/articles/new')} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Article
          </Button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedArticles.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium">
                    {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''} selected
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedArticles([])}
                  >
                    Clear Selection
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by headline or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="grid gap-4 md:grid-cols-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="pl">Polish</SelectItem>
                  <SelectItem value="sv">Swedish</SelectItem>
                  <SelectItem value="da">Danish</SelectItem>
                  <SelectItem value="hu">Hungarian</SelectItem>
                </SelectContent>
              </Select>

              <Select value={funnelFilter} onValueChange={setFunnelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Funnel Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="TOFU">TOFU</SelectItem>
                  <SelectItem value="MOFU">MOFU</SelectItem>
                  <SelectItem value="BOFU">BOFU</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Article List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all articles"
                        className={isSomeSelected ? "data-[state=checked]:bg-amber-500" : ""}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Headline</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Lang</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Funnel</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Loading articles...
                      </td>
                    </tr>
                  ) : paginatedArticles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No articles found
                      </td>
                    </tr>
                  ) : (
                    paginatedArticles.map((article) => (
                      <tr key={article.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedArticles.includes(article.id)}
                            onCheckedChange={(checked) => 
                              handleSelectArticle(article.id, checked as boolean)
                            }
                            aria-label={`Select ${article.headline}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`capitalize ${getStatusColor(article.status)}`}>
                            {article.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <p className="font-medium truncate">{article.headline}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {article.slug}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{article.category}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{article.language.toUpperCase()}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getFunnelColor(article.funnel_stage)}>
                            {article.funnel_stage}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(article.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => navigate(`/admin/articles/${article.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => navigate(`/blog/${article.language}/${article.slug}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setArticleToDelete(article.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Single Delete Confirmation Dialog */}
        <AlertDialog open={!!articleToDelete} onOpenChange={() => setArticleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Article?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the article
                and all its associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => articleToDelete && deleteMutation.mutate(articleToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedArticles.length} Articles?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete{" "}
                {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''}{" "}
                and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bulkDeleteMutation.mutate(selectedArticles)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {bulkDeleteMutation.isPending ? "Deleting..." : "Delete All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Articles;
