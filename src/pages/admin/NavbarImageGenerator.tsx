import React, { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageIcon, RefreshCw, Check, Loader2, Download } from 'lucide-react';

interface CityImage {
  city: string;
  slug: string;
  prompt: string;
  status: 'pending' | 'generating' | 'uploading' | 'done' | 'error';
  imageUrl?: string;
  error?: string;
}

const CITY_PROMPTS: CityImage[] = [
  {
    city: 'Marbella',
    slug: 'marbella',
    prompt: 'Puerto Banús marina with luxury yachts at golden hour, Marbella Golden Mile white Mediterranean buildings, turquoise sea, Costa del Sol Spain, 8k ultra-realistic photography, warm lighting, no text no watermarks',
    status: 'pending'
  },
  {
    city: 'Estepona',
    slug: 'estepona',
    prompt: 'Charming old town street in Estepona Spain, colorful flower pots on whitewashed walls, traditional Andalusian architecture, cobblestone pedestrian street, sunny Mediterranean day, Costa del Sol, 8k photography, no text no watermarks',
    status: 'pending'
  },
  {
    city: 'Málaga',
    slug: 'malaga',
    prompt: 'Panoramic aerial view of Málaga city center Spain, cathedral and Alcazaba Moorish fortress, port with Mediterranean sea, palm trees, blue sky, Costa del Sol coastline, 8k photography, no text no watermarks',
    status: 'pending'
  },
  {
    city: 'Sotogrande',
    slug: 'sotogrande',
    prompt: 'Sotogrande marina at sunset with luxury sailboats and yachts, exclusive waterfront Mediterranean villas, elegant coastal lifestyle, golden hour reflections on calm water, Costa del Sol Spain, 8k photography, no text no watermarks',
    status: 'pending'
  }
];

const NavbarImageGenerator = () => {
  const [cityImages, setCityImages] = useState<CityImage[]>(CITY_PROMPTS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const updateCityStatus = (index: number, updates: Partial<CityImage>) => {
    setCityImages(prev => prev.map((city, i) => 
      i === index ? { ...city, ...updates } : city
    ));
  };

  const generateSingleImage = async (index: number): Promise<string | null> => {
    const city = cityImages[index];
    
    try {
      // Update status to generating
      updateCityStatus(index, { status: 'generating' });
      
      // Call the generate-image edge function
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: city.prompt
        }
      });

      if (error) throw error;
      
      if (!data?.images?.[0]?.url) {
        throw new Error('No image returned from generation');
      }

      const generatedImageUrl = data.images[0].url;
      
      // Update status to uploading
      updateCityStatus(index, { status: 'uploading' });
      
      // Fetch the generated image
      const imageResponse = await fetch(generatedImageUrl);
      if (!imageResponse.ok) throw new Error('Failed to fetch generated image');
      
      const imageBlob = await imageResponse.blob();
      
      // Upload to Supabase Storage
      const fileName = `${city.slug}-navbar.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('navbar-images')
        .upload(fileName, imageBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('navbar-images')
        .getPublicUrl(fileName);

      updateCityStatus(index, { status: 'done', imageUrl: publicUrl });
      return publicUrl;

    } catch (error) {
      console.error(`Error generating image for ${city.city}:`, error);
      updateCityStatus(index, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  };

  const generateAllImages = async () => {
    setIsGenerating(true);
    
    // Reset all statuses
    setCityImages(CITY_PROMPTS);
    
    let successCount = 0;
    
    for (let i = 0; i < CITY_PROMPTS.length; i++) {
      setCurrentIndex(i);
      const result = await generateSingleImage(i);
      if (result) successCount++;
      
      // Small delay between generations to avoid rate limiting
      if (i < CITY_PROMPTS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    setCurrentIndex(-1);
    setIsGenerating(false);
    
    if (successCount === CITY_PROMPTS.length) {
      toast.success('All navbar images generated successfully!');
    } else {
      toast.warning(`Generated ${successCount}/${CITY_PROMPTS.length} images. Some failed.`);
    }
  };

  const regenerateSingle = async (index: number) => {
    setIsGenerating(true);
    setCurrentIndex(index);
    await generateSingleImage(index);
    setCurrentIndex(-1);
    setIsGenerating(false);
  };

  const progress = cityImages.filter(c => c.status === 'done').length / cityImages.length * 100;

  const getStatusBadge = (status: CityImage['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'generating':
        return <Badge className="bg-blue-500">Generating...</Badge>;
      case 'uploading':
        return <Badge className="bg-yellow-500">Uploading...</Badge>;
      case 'done':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" /> Done</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Navbar Image Generator</h1>
            <p className="text-muted-foreground">
              Generate city-specific images for the navigation mega-menu using Flux AI
            </p>
          </div>
          <Button 
            onClick={generateAllImages} 
            disabled={isGenerating}
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-2" />
                Generate All Images
              </>
            )}
          </Button>
        </div>

        {isGenerating && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cityImages.map((city, index) => (
            <Card key={city.slug} className={currentIndex === index ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{city.city}</CardTitle>
                  {getStatusBadge(city.status)}
                </div>
                <CardDescription className="text-xs line-clamp-2">
                  {city.prompt}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {city.imageUrl ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={city.imageUrl} 
                      alt={city.city}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                    {city.status === 'generating' || city.status === 'uploading' ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                )}

                {city.error && (
                  <p className="text-sm text-destructive">{city.error}</p>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => regenerateSingle(index)}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                  {city.imageUrl && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                    >
                      <a href={city.imageUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" />
                        View
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usage Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm dark:prose-invert">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Click "Generate All Images" to create city-specific images for the navbar</li>
                <li>Images are generated using Flux AI with Costa del Sol-specific prompts</li>
                <li>Generated images are automatically uploaded to Supabase Storage</li>
                <li>The Header component will automatically use these images once generated</li>
                <li>You can regenerate individual images if needed</li>
              </ol>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Storage URLs:</p>
              <code className="text-xs text-muted-foreground">
                {`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/navbar-images/{city}-navbar.jpg`}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default NavbarImageGenerator;
