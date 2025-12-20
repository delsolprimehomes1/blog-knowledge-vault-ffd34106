import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Search, Eye, Trash2, Plus, AlertCircle, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LocationPage {
  id: string;
  city_slug: string;
  city_name: string;
  topic_slug: string;
  headline: string;
  meta_title: string;
  meta_description: string;
  speakable_answer: string;
  status: string;
  language: string;
  created_at: string;
  updated_at: string;
}

const LocationPages = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const { data: locationPages, isLoading, error } = useQuery({
    queryKey: ["location-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_pages")
        .select("*")
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as LocationPage[];
    },
  });

  // Get unique cities for filter
  const uniqueCities = [...new Set(locationPages?.map(p => p.city_slug) || [])].sort();

  // Single page deletion
  const deleteMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase
        .from("location_pages")
        .delete()
        .eq("id", pageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-pages"] });
      toast.success("Location page deleted successfully");
      setPageToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Bulk deletion
  const bulkDeleteMutation = useMutation({
    mutationFn: async (pageIds: string[]) => {
      const { error } = await supabase
        .from("location_pages")
        .delete()
        .in("id", pageIds);
      
      if (error) throw error;
      return pageIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["location-pages"] });
      toast.success(`Successfully deleted ${count} page${count > 1 ? 's' : ''}`);
      setSelectedPages([]);
      setShowBulkDeleteDialog(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
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
                <h2 className="text-2xl font-bold">Unable to Load Location Pages</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {error instanceof Error ? error.message : "Please try again."}
                </p>
                <Button onClick={() => window.location.reload()}>Reload Page</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Filter pages
  const filteredPages = locationPages?.filter(page => {
    const matchesSearch = searchQuery === "" || 
      page.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.city_slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.topic_slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || page.status === statusFilter;
    const matchesCity = cityFilter === "all" || page.city_slug === cityFilter;
    const matchesLanguage = languageFilter === "all" || page.language === languageFilter;

    return matchesSearch && matchesStatus && matchesCity && matchesLanguage;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPages = filteredPages.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPages(paginatedPages.map(p => p.id));
    } else {
      setSelectedPages([]);
    }
  };

  const handleSelectPage = (pageId: string, checked: boolean) => {
    if (checked) {
      setSelectedPages([...selectedPages, pageId]);
    } else {
      setSelectedPages(selectedPages.filter(id => id !== pageId));
    }
  };

  const isAllSelected = paginatedPages.length > 0 && 
    paginatedPages.every(p => selectedPages.includes(p.id));
  const isSomeSelected = selectedPages.length > 0 && !isAllSelected;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCityName = (slug: string) => {
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatIntentType = (topicSlug: string) => {
    // Extract intent from topic slug (e.g., "buying-property-marbella-spain-guide" -> "buying-property")
    const parts = topicSlug.split('-');
    if (parts.length >= 2) {
      return parts.slice(0, 2).join('-');
    }
    return topicSlug;
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <MapPin className="h-8 w-8" />
              Location Pages
            </h1>
            <p className="text-muted-foreground">
              Manage location intelligence pages ({filteredPages.length} total)
            </p>
          </div>
          <Button onClick={() => navigate('/admin/location-generator')} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Generate New
          </Button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedPages.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium">
                    {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} selected
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPages([])}>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by headline, city, or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
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

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{formatCityName(city)}</SelectItem>
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pages List */}
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
                        aria-label="Select all pages"
                        className={isSomeSelected ? "data-[state=checked]:bg-amber-500" : ""}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Headline</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">City</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Intent</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Lang</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Loading location pages...
                      </td>
                    </tr>
                  ) : paginatedPages.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No location pages found
                      </td>
                    </tr>
                  ) : (
                    paginatedPages.map((page) => (
                      <tr key={page.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedPages.includes(page.id)}
                            onCheckedChange={(checked) => handleSelectPage(page.id, checked as boolean)}
                            aria-label={`Select ${page.headline}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`capitalize ${getStatusColor(page.status)}`}>
                            {page.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <p className="font-medium truncate">{page.headline}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              /locations/{page.city_slug}/{page.topic_slug}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{formatCityName(page.city_slug)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {formatIntentType(page.topic_slug)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{page.language.toUpperCase()}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(page.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => window.open(`/locations/${page.city_slug}/${page.topic_slug}`, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setPageToDelete(page.id)}
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
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Single Delete Dialog */}
      <AlertDialog open={!!pageToDelete} onOpenChange={() => setPageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this location page? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pageToDelete && deleteMutation.mutate(pageToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPages.length} Location Pages</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPages.length} selected location page{selectedPages.length > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedPages)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default LocationPages;
