import { useState, useEffect, useCallback } from "react";
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
import { Loader2, Plus, Pencil, Trash2, Eye, MessageCircle, Building2 } from "lucide-react";

const LANGUAGES = ["en", "nl", "fr", "de", "fi", "pl", "da", "hu", "sv", "no"];

interface Property {
  id: string;
  language: string;
  title: string;
  slug: string;
  location: string;
  price: number;
  bedrooms: number;
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
  bathrooms: 1,
  sqm: 50,
  property_type: "apartment",
  status: "available",
  description: "",
  short_description: "",
  featured_image_url: "",
  featured_image_alt: "",
  display_order: 0,
  visible: true,
  featured: false,
});

const ApartmentsProperties = () => {
  const [lang, setLang] = useState("en");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Property, "id" | "views" | "inquiries">>(emptyProperty("en"));

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("apartments_properties")
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
      bathrooms: p.bathrooms,
      sqm: p.sqm,
      property_type: p.property_type || "apartment",
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

  const handleSave = async () => {
    if (!form.title || !form.location) {
      toast({ title: "Title and Location are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };

    const { error } = editingId
      ? await supabase.from("apartments_properties").update(payload).eq("id", editingId)
      : await supabase.from("apartments_properties").insert(payload);

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
    const { error } = await supabase.from("apartments_properties").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Property deleted" });
      fetchProperties();
    }
    setDeleteId(null);
  };

  const toggleVisible = async (id: string, current: boolean) => {
    await supabase.from("apartments_properties").update({ visible: !current }).eq("id", id);
    fetchProperties();
  };

  const updateForm = (field: string, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const fmt = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Apartments Properties</h1>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Inquiries</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No properties for {lang.toUpperCase()}</TableCell></TableRow>
                ) : properties.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>{p.location}</TableCell>
                    <TableCell>{fmt(p.price)}</TableCell>
                    <TableCell>{p.bedrooms}</TableCell>
                    <TableCell>{p.property_type}</TableCell>
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
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Bedrooms</Label><Input type="number" value={form.bedrooms} onChange={e => updateForm("bedrooms", Number(e.target.value))} /></div>
                <div><Label>Bathrooms</Label><Input type="number" value={form.bathrooms} onChange={e => updateForm("bathrooms", Number(e.target.value))} /></div>
                <div><Label>SQM</Label><Input type="number" value={form.sqm} onChange={e => updateForm("sqm", Number(e.target.value))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Property Type</Label>
                  <Select value={form.property_type} onValueChange={v => updateForm("property_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="penthouse">Penthouse</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="duplex">Duplex</SelectItem>
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
              <div><Label>Short Description</Label><Input value={form.short_description} onChange={e => updateForm("short_description", e.target.value)} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => updateForm("description", e.target.value)} rows={4} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Featured Image URL</Label><Input value={form.featured_image_url} onChange={e => updateForm("featured_image_url", e.target.value)} /></div>
                <div><Label>Image Alt</Label><Input value={form.featured_image_alt} onChange={e => updateForm("featured_image_alt", e.target.value)} /></div>
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
    </AdminLayout>
  );
};

export default ApartmentsProperties;
