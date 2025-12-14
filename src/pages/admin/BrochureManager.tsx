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
import { useToast } from '@/hooks/use-toast';
import { Save, ExternalLink, Plus, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface GalleryItem {
  title: string;
  image: string;
}

interface CityBrochure {
  id: string;
  slug: string;
  name: string;
  hero_image: string | null;
  hero_headline: string | null;
  hero_subtitle: string | null;
  description: string | null;
  gallery_images: GalleryItem[];
  features: string[];
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
}

// Parse gallery_images from database (handles both old string[] and new GalleryItem[] format)
const parseGalleryImages = (data: unknown): GalleryItem[] => {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map((item, index) => {
    if (typeof item === 'string') {
      // Legacy format: convert string URL to GalleryItem
      return { title: '', image: item };
    }
    if (typeof item === 'object' && item !== null) {
      return {
        title: (item as GalleryItem).title || '',
        image: (item as GalleryItem).image || '',
      };
    }
    return { title: '', image: '' };
  });
};

const BrochureManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CityBrochure>>({});
  const [newFeature, setNewFeature] = useState('');

  // Initialize 3 empty gallery slots
  const emptyGallerySlots: GalleryItem[] = [
    { title: '', image: '' },
    { title: '', image: '' },
    { title: '', image: '' },
  ];

  // Fetch all brochures
  const { data: brochures, isLoading } = useQuery({
    queryKey: ['city-brochures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('city_brochures')
        .select('*')
        .order('name');
      if (error) throw error;
      
      // Parse gallery_images for each brochure
      return data.map(brochure => ({
        ...brochure,
        gallery_images: parseGalleryImages(brochure.gallery_images),
        features: Array.isArray(brochure.features) ? brochure.features : [],
      })) as CityBrochure[];
    },
  });

  // Update brochure mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CityBrochure> & { id: string }) => {
      const { error } = await supabase
        .from('city_brochures')
        .update({
          hero_image: data.hero_image,
          hero_headline: data.hero_headline,
          hero_subtitle: data.hero_subtitle,
          description: data.description,
          gallery_images: JSON.parse(JSON.stringify(data.gallery_images || [])),
          features: data.features,
          meta_title: data.meta_title,
          meta_description: data.meta_description,
          is_published: data.is_published,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['city-brochures'] });
      toast({ title: 'Saved', description: 'Brochure updated successfully.' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save changes.',
        variant: 'destructive',
      });
      console.error(error);
    },
  });

  // Set edit data when city changes
  useEffect(() => {
    if (selectedCity && brochures) {
      const city = brochures.find((b) => b.slug === selectedCity);
      if (city) {
        // Ensure we always have 3 gallery slots
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

  const handleSave = () => {
    if (!editData.id) return;
    // Filter out empty gallery items before saving
    const cleanedGallery = (editData.gallery_images || []).map(item => ({
      title: item.title || '',
      image: item.image || '',
    }));
    updateMutation.mutate({
      ...editData,
      gallery_images: cleanedGallery,
    } as CityBrochure);
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const galleryItems = editData.gallery_images || emptyGallerySlots;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Brochure Manager</h1>
            <p className="text-muted-foreground">
              Manage city brochure pages content and SEO
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* City List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Cities</CardTitle>
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
                  <div className="font-medium">{city.name}</div>
                  <div className="text-xs opacity-70">
                    {city.is_published ? 'Published' : 'Draft'}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Editor */}
          <div className="lg:col-span-3">
            {selectedCity && editData.id ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{editData.name}</CardTitle>
                  <div className="flex items-center gap-4">
                    <a
                      href={`/brochure/${editData.slug}`}
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
                      Save Changes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="content">
                    <TabsList className="mb-6">
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="gallery">Gallery Cards</TabsTrigger>
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

                      <div className="space-y-2">
                        <Label>Hero Image URL</Label>
                        <Input
                          value={editData.hero_image || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, hero_image: e.target.value })
                          }
                          placeholder="https://..."
                        />
                        {editData.hero_image && (
                          <img
                            src={editData.hero_image}
                            alt="Hero preview"
                            className="w-full h-48 object-cover rounded-lg mt-2"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Hero Headline</Label>
                        <Input
                          value={editData.hero_headline || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, hero_headline: e.target.value })
                          }
                          placeholder="Luxury Living in..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Hero Subtitle</Label>
                        <Input
                          value={editData.hero_subtitle || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, hero_subtitle: e.target.value })
                          }
                          placeholder="The jewel of the Costa del Sol"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={editData.description || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, description: e.target.value })
                          }
                          rows={6}
                          placeholder="Write a compelling description..."
                        />
                      </div>
                    </TabsContent>

                    {/* Gallery Cards Tab */}
                    <TabsContent value="gallery" className="space-y-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        Add 3 image cards that will display below the description section. Each card has a title and image.
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

                    {/* Features Tab */}
                    <TabsContent value="features" className="space-y-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        Features appear in the 4th slot of the gallery grid, next to the 3 image cards.
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
                          <Plus className="w-4 h-4 mr-2" /> Add
                        </Button>
                      </div>
                    </TabsContent>

                    {/* SEO Tab */}
                    <TabsContent value="seo" className="space-y-6">
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
                          {editData.meta_title?.length || 0}/60 characters
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
                          placeholder="Description for search engines"
                        />
                        <p className="text-xs text-muted-foreground">
                          {editData.meta_description?.length || 0}/160 characters
                        </p>
                      </div>

                      {/* Google Preview */}
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">
                          Google Preview
                        </p>
                        <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                          {editData.meta_title || `Luxury Properties in ${editData.name}`}
                        </div>
                        <div className="text-green-700 text-sm">
                          www.delsolprimehomes.com/brochure/{editData.slug}
                        </div>
                        <div className="text-sm text-gray-600">
                          {editData.meta_description ||
                            `Discover exceptional properties in ${editData.name} on the Costa del Sol.`}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                  Select a city to edit its brochure
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BrochureManager;
