import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, Eye, MessageCircle, Upload, ImageIcon, ExternalLink } from "lucide-react";

const LANGUAGES = ["en", "nl", "fr", "de", "fi", "pl", "da", "hu", "sv", "no"];

interface Property {
  id: string;
  language: string;
  title: string;
  slug: string;
  location: string;
  price: number;
  bedrooms: number;
  bedrooms_max: number | null;
  bathrooms: number;
  sqm: number;
  property_type: string;
  status: string;
  description: string;
  short_description: string;
  featured_image_url: string;
  featured_image_alt: string;
  display_order: number;
  visible: boolean;
  featured: boolean;
  views: number;
  inquiries: number;
}

const emptyProperty = (lang: string): Omit<Property, "id" | "views" | "inquiries"> => ({
  language: lang,
  title: "",
  slug: "",
  location: "",
  price: 0,
  bedrooms: 1,
  bedrooms_max: null,
  bathrooms: 1,
  sqm: 50,
  property_type: "villa",
  status: "available",
  description: "",
  short_description: "",
  featured_image_url: "",
  featured_image_alt: "",
  display_order: 0,
  visible: true,
  featured: false,
});

export const VillasPropertiesInner = () => {
  const [lang, setLang] = useState("en");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Property, "id" | "views" | "inquiries">>(emptyProperty("en"));
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("villas_properties")
      .select("*")
      .eq("language", lang)
      .order("display_order");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProperties((data || []) as Property[]);
    }
    setLoading(false);
  }, [lang]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const totalViews = properties.reduce((s, p) => s + (p.views || 0), 0);
  const totalInquiries = properties.reduce((s, p) => s + (p.inquiries || 0), 0);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyProperty(lang));
    setDialogOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditingId(p.id);
    setForm({
      language: p.language,
      title: p.title,
      slug: p.slug,
      location: p.location,
      price: p.price,
      bedrooms: p.bedrooms,
      bedrooms_max: p.bedrooms_max ?? null,
      bathrooms: p.bathrooms,
      sqm: p.sqm,
      property_type: p.property_type || "villa",
      status: p.status || "available",
      description: p.description || "",
      short_description: p.short_description || "",
      featured_image_url: p.featured_image_url || "",
      featured_image_alt: p.featured_image_alt || "",
      display_order: p.display_order || 0,
      visible: p.visible ?? true,
      featured: p.featured ?? false,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `villas/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(path, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("property-images")
      .getPublicUrl(path);

    updateForm("featured_image_url", urlData.publicUrl);
    toast({ title: "Image uploaded" });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.title || !form.location) {
      toast({ title: "Title and Location are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };

    const { error } = editingId
      ? await supabase.from("villas_properties").update(payload).eq("id", editingId)
      : await supabase.from("villas_properties").insert(payload);

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Property updated" : "Property added" });
      setDialogOpen(false);
      fetchProperties();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("villas_properties").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Property deleted" });
      fetchProperties();
    }
    setDeleteId(null);
  };

  const toggleVisible = async (id: string, current: boolean) => {
    await supabase.from("villas_properties").update({ visible: !current }).eq("id", id);
    fetchProperties();
  };

  const updateForm = (field: string, value: string | number | boolean | null) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const fmt = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const formatBeds = (p: Property) => {
    if (p.bedrooms_max && p.bedrooms_max > p.bedrooms) {
      return `${p.bedrooms} - ${p.bedrooms_max}`;
    }
    return String(p.bedrooms);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Villas Properties</h1>
          <a
            href={`https://www.delsolprimehomes.com/${lang}/villas/properties`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium border border-primary/30 rounded-md px-2.5 py-1 hover:bg-primary/5 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Live
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Property</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-sm text-muted-foreground">Properties</p><p className="text-2xl font-bold">{properties.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-sm text-muted-foreground">Total Views</p><p className="text-2xl font-bold flex items-center justify-center gap-1"><Eye className="h-4 w-4" />{totalViews}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-sm text-muted-foreground">Total Inquiries</p><p className="text-2xl font-bold flex items-center justify-center gap-1"><MessageCircle className="h-4 w-4" />{totalInquiries}</p></CardContent></Card>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Beds</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Inquiries</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No properties for {lang.toUpperCase()}</TableCell></TableRow>
              ) : properties.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.location}</TableCell>
                  <TableCell>{fmt(p.price)}</TableCell>
                  <TableCell>{formatBeds(p)}</TableCell>
                  <TableCell>{p.property_type}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">{p.short_description || "—"}</TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell><Switch checked={p.visible} onCheckedChange={() => toggleVisible(p.id, p.visible)} /></TableCell>
                  <TableCell>{p.views || 0}</TableCell>
                  <TableCell>{p.inquiries || 0}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Property" : "Add Property"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => updateForm("title", e.target.value)} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={e => updateForm("slug", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Location *</Label><Input value={form.location} onChange={e => updateForm("location", e.target.value)} /></div>
              <div><Label>Price (€)</Label><Input type="number" value={form.price} onChange={e => updateForm("price", Number(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div><Label>Bedrooms Min</Label><Input type="number" value={form.bedrooms} onChange={e => updateForm("bedrooms", Number(e.target.value))} /></div>
              <div><Label>Bedrooms Max</Label><Input type="number" value={form.bedrooms_max ?? ""} placeholder="Optional" onChange={e => updateForm("bedrooms_max", e.target.value ? Number(e.target.value) : null)} /></div>
              <div><Label>Bathrooms</Label><Input type="number" value={form.bathrooms} onChange={e => updateForm("bathrooms", Number(e.target.value))} /></div>
              <div><Label>SQM</Label><Input type="number" value={form.sqm} onChange={e => updateForm("sqm", Number(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Property Type</Label>
                <Select value={form.property_type} onValueChange={v => updateForm("property_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="detached">Detached</SelectItem>
                    <SelectItem value="semi-detached">Semi-Detached</SelectItem>
                    <SelectItem value="finca">Finca</SelectItem>
                    <SelectItem value="country-house">Country House</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => updateForm("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Short Description */}
            <div>
              <Label>Short Description</Label>
              <Input value={form.short_description} onChange={e => updateForm("short_description", e.target.value)} placeholder="Brief summary for property cards" />
              <p className="text-xs text-muted-foreground mt-1">Shown on property cards and in the table</p>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => updateForm("description", e.target.value)} rows={6} placeholder="Full property description..." />
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <Label>Featured Image</Label>
              <div className="flex items-start gap-4">
                {form.featured_image_url ? (
                  <img
                    src={form.featured_image_url}
                    alt={form.featured_image_alt || "Preview"}
                    className="w-24 h-24 object-cover rounded-lg border"
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/96x96?text=Error'; }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-dashed flex items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  <Input
                    value={form.featured_image_url}
                    onChange={e => updateForm("featured_image_url", e.target.value)}
                    placeholder="Or paste image URL"
                    className="text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Image Alt Text</Label>
                <Input value={form.featured_image_alt} onChange={e => updateForm("featured_image_alt", e.target.value)} placeholder="Describe the image" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Display Order</Label><Input type="number" value={form.display_order} onChange={e => updateForm("display_order", Number(e.target.value))} /></div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.visible} onCheckedChange={v => updateForm("visible", v)} /><Label>Visible</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.featured} onCheckedChange={v => updateForm("featured", v)} /><Label>Featured</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const VillasProperties = () => {
  return (
    <AdminLayout>
      <VillasPropertiesInner />
    </AdminLayout>
  );
};

export default VillasProperties;
