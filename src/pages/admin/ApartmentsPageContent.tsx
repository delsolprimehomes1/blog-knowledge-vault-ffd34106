import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

const LANGUAGES = ["en", "nl", "fr", "de", "fi", "pl", "da", "hu", "sv", "no"];

interface PageContent {
  id?: string;
  language: string;
  headline: string;
  subheadline: string;
  cta_text: string;
  hero_image_url: string;
  hero_image_alt: string;
  video_enabled: boolean;
  video_url: string;
  video_thumbnail_url: string;
  reviews_enabled: boolean;
  elfsight_embed_code: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
}

const emptyContent = (lang: string): PageContent => ({
  language: lang,
  headline: "",
  subheadline: "",
  cta_text: "",
  hero_image_url: "",
  hero_image_alt: "",
  video_enabled: false,
  video_url: "",
  video_thumbnail_url: "",
  reviews_enabled: false,
  elfsight_embed_code: "",
  meta_title: "",
  meta_description: "",
  is_published: false,
});

export const ApartmentsPageContentInner = () => {
  const [selectedLang, setSelectedLang] = useState("en");
  const [content, setContent] = useState<PageContent>(emptyContent("en"));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent(selectedLang);
  }, [selectedLang]);

  const fetchContent = async (lang: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("apartments_page_content")
      .select("*")
      .eq("language", lang)
      .maybeSingle();

    if (error) {
      toast({ title: "Error loading content", description: error.message, variant: "destructive" });
    }
    setContent(data ? {
      id: data.id,
      language: data.language,
      headline: data.headline || "",
      subheadline: data.subheadline || "",
      cta_text: data.cta_text || "",
      hero_image_url: data.hero_image_url || "",
      hero_image_alt: data.hero_image_alt || "",
      video_enabled: data.video_enabled ?? false,
      video_url: data.video_url || "",
      video_thumbnail_url: data.video_thumbnail_url || "",
      reviews_enabled: data.reviews_enabled ?? false,
      elfsight_embed_code: data.elfsight_embed_code || "",
      meta_title: data.meta_title || "",
      meta_description: data.meta_description || "",
      is_published: data.is_published ?? false,
    } : emptyContent(lang));
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      language: content.language,
      headline: content.headline,
      subheadline: content.subheadline,
      cta_text: content.cta_text,
      hero_image_url: content.hero_image_url,
      hero_image_alt: content.hero_image_alt,
      video_enabled: content.video_enabled,
      video_url: content.video_url,
      video_thumbnail_url: content.video_thumbnail_url,
      reviews_enabled: content.reviews_enabled,
      elfsight_embed_code: content.elfsight_embed_code,
      meta_title: content.meta_title,
      meta_description: content.meta_description,
      is_published: content.is_published,
      updated_at: new Date().toISOString(),
    };

    const { error } = content.id
      ? await supabase.from("apartments_page_content").update(payload).eq("id", content.id)
      : await supabase.from("apartments_page_content").insert(payload);

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved successfully" });
      fetchContent(selectedLang);
    }
    setSaving(false);
  };

  const update = (field: keyof PageContent, value: string | boolean) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Apartments Page Content</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>

      <Tabs value={selectedLang} onValueChange={setSelectedLang}>
        <TabsList className="flex-wrap">
          {LANGUAGES.map(lang => (
            <TabsTrigger key={lang} value={lang}>{lang.toUpperCase()}</TabsTrigger>
          ))}
        </TabsList>

        {LANGUAGES.map(lang => (
          <TabsContent key={lang} value={lang}>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid gap-6">
                <Card>
                  <CardHeader><CardTitle>Hero Section</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div><Label>Headline</Label><Input value={content.headline} onChange={e => update("headline", e.target.value)} /></div>
                    <div><Label>Subheadline</Label><Textarea value={content.subheadline} onChange={e => update("subheadline", e.target.value)} /></div>
                    <div><Label>CTA Text</Label><Input value={content.cta_text} onChange={e => update("cta_text", e.target.value)} /></div>
                    <div><Label>Hero Image URL</Label><Input value={content.hero_image_url} onChange={e => update("hero_image_url", e.target.value)} /></div>
                    {content.hero_image_url && (
                      <img src={content.hero_image_url} alt="Preview" className="h-32 rounded-lg object-cover" />
                    )}
                    <div><Label>Hero Image Alt</Label><Input value={content.hero_image_alt} onChange={e => update("hero_image_alt", e.target.value)} /></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Video Section</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={content.video_enabled} onCheckedChange={v => update("video_enabled", v)} />
                      <Label>Video Enabled</Label>
                    </div>
                    <div><Label>Video URL</Label><Input value={content.video_url} onChange={e => update("video_url", e.target.value)} /></div>
                    <div><Label>Video Thumbnail URL</Label><Input value={content.video_thumbnail_url} onChange={e => update("video_thumbnail_url", e.target.value)} /></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Reviews Section</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={content.reviews_enabled} onCheckedChange={v => update("reviews_enabled", v)} />
                      <Label>Reviews Enabled</Label>
                    </div>
                    <div>
                      <Label>Elfsight Embed Code</Label>
                      <Textarea rows={4} value={content.elfsight_embed_code} onChange={e => update("elfsight_embed_code", e.target.value)} placeholder="Paste the full Elfsight embed code here..." />
                      <p className="text-sm text-muted-foreground mt-1">Paste the full Elfsight embed code (HTML comment + script + div)</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div><Label>Meta Title</Label><Input value={content.meta_title} onChange={e => update("meta_title", e.target.value)} /></div>
                    <div><Label>Meta Description</Label><Textarea value={content.meta_description} onChange={e => update("meta_description", e.target.value)} /></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={content.is_published} onCheckedChange={v => update("is_published", v)} />
                      <Label>Published</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const ApartmentsPageContent = () => {
  return (
    <AdminLayout>
      <ApartmentsPageContentInner />
    </AdminLayout>
  );
};

export default ApartmentsPageContent;
