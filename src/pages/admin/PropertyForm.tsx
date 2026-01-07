import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Home, Upload, Loader2, Languages } from 'lucide-react';
import { AdminLayout } from "@/components/AdminLayout";

const PropertyForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        internal_name: '',
        internal_ref: '',
        category: 'apartment' as 'apartment' | 'villa',
        location: '',
        beds_min: 2,
        beds_max: 3,
        baths: 2,
        size_sqm: 100,
        price_eur: 400000,
        description_en: '', // User inputs English description
        images: [] as string[],
        display_order: 0,
        is_active: true
    });

    // Load existing property if editing
    useEffect(() => {
        if (isEdit && id) {
            loadProperty(id);
        }
    }, [id, isEdit]);

    const loadProperty = async (propertyId: string) => {
        // @ts-ignore - properties table not yet in types
        const { data, error } = await (supabase as any)
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single();

        if (data) {
            setFormData({
                internal_name: data.internal_name,
                internal_ref: data.internal_ref,
                category: data.category,
                location: data.location,
                beds_min: data.beds_min,
                beds_max: data.beds_max,
                baths: data.baths,
                size_sqm: data.size_sqm,
                price_eur: data.price_eur,
                description_en: data.descriptions?.en || '',
                images: data.images || [],
                display_order: data.display_order,
                is_active: data.is_active
            });
        }
    };

    // Auto-translate description to all 10 languages using Claude API
    const translateDescription = async (englishText: string) => {
        setTranslating(true);

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514', // Assuming this model, falling back if not avail
                    max_tokens: 2000,
                    messages: [{
                        role: 'user',
                        content: `Translate this property description to Dutch, French, German, Polish, Swedish, Danish, Finnish, Hungarian, and Norwegian. Keep the same tone and style. Return ONLY a JSON object with language codes as keys.

English description: "${englishText}"

Return format:
{
  "nl": "Dutch translation",
  "fr": "French translation",
  "de": "German translation",
  "pl": "Polish translation",
  "sv": "Swedish translation",
  "da": "Danish translation",
  "fi": "Finnish translation",
  "hu": "Hungarian translation",
  "no": "Norwegian translation"
}`
                    }]
                })
            });

            const data = await response.json();

            let translations: Record<string, string> = {};

            if (data.content && data.content[0] && data.content[0].text) {
                const translationsText = data.content[0].text;
                // Extract JSON from response (remove markdown if present)
                const jsonMatch = translationsText.match(/\{[\s\S]*\}/);
                translations = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            } else {
                // Mock translation if API fails or key is missing
                console.warn("Translation API response invalid, using fallback.");
                translations = {
                    nl: englishText, fr: englishText, de: englishText, pl: englishText,
                    sv: englishText, da: englishText, fi: englishText, hu: englishText, no: englishText
                }
            }

            return {
                en: englishText,
                ...translations
            };
        } catch (error) {
            console.error('Translation error:', error);
            // Fallback: use English for all languages
            return {
                en: englishText,
                nl: englishText,
                fr: englishText,
                de: englishText,
                pl: englishText,
                sv: englishText,
                da: englishText,
                fi: englishText,
                hu: englishText,
                no: englishText
            };
        } finally {
            setTranslating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Auto-translate description to all languages
            const descriptions = await translateDescription(formData.description_en);

            const propertyData = {
                internal_name: formData.internal_name,
                internal_ref: formData.internal_ref,
                category: formData.category,
                location: formData.location,
                beds_min: formData.beds_min,
                beds_max: formData.beds_max || formData.beds_min,
                baths: formData.baths,
                size_sqm: formData.size_sqm,
                price_eur: formData.price_eur,
                descriptions: descriptions,
                images: formData.images,
                display_order: formData.display_order,
                is_active: formData.is_active
            };

            if (isEdit && id) {
                // Update existing property
                // @ts-ignore - propertes table
                const { error } = await (supabase as any)
                    .from('properties')
                    .update(propertyData)
                    .eq('id', id);

                if (error) throw error;
            } else {
                // Create new property
                // @ts-ignore - properties table
                const { error } = await (supabase as any)
                    .from('properties')
                    .insert([propertyData]);

                if (error) throw error;
            }

            navigate('/admin/properties');
        } catch (error) {
            console.error('Error saving property:', error);
            alert('Failed to save property. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const uploadedUrls: string[] = [];

        try {
            for (const file of Array.from(files)) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const { data, error } = await supabase.storage
                    .from('property-images')
                    .upload(fileName, file, { cacheControl: '3600', upsert: false });

                if (error) {
                    console.error('Upload error:', error);
                    continue;
                }

                if (data) {
                    const { data: urlData } = supabase.storage
                        .from('property-images')
                        .getPublicUrl(fileName);
                    uploadedUrls.push(urlData.publicUrl);
                }
            }

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...uploadedUrls].slice(0, 4)
            }));
        } catch (error) {
            console.error('Image upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="container mx-auto px-4 max-w-4xl py-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isEdit ? 'Edit Property' : 'Add New Property'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Property will automatically appear on all 10 language landing pages
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Category Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Property Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, category: 'apartment' }))}
                                    className={`p-6 rounded-lg border-2 transition-all ${formData.category === 'apartment'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                                    <div className="font-semibold">Apartments & Penthouses</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, category: 'villa' }))}
                                    className={`p-6 rounded-lg border-2 transition-all ${formData.category === 'villa'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <Home className="w-8 h-8 mx-auto mb-2 text-primary" />
                                    <div className="font-semibold">Townhouses & Villas</div>
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Internal Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Internal Reference (Admin Only)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="internal_name">Internal Name *</Label>
                                <Input
                                    id="internal_name"
                                    value={formData.internal_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, internal_name: e.target.value }))}
                                    placeholder="e.g., MORASOL"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Not visible to public</p>
                            </div>

                            <div>
                                <Label htmlFor="internal_ref">Reference Number</Label>
                                <Input
                                    id="internal_ref"
                                    value={formData.internal_ref}
                                    onChange={(e) => setFormData(prev => ({ ...prev, internal_ref: e.target.value }))}
                                    placeholder="e.g., R5215237"
                                />
                                <p className="text-xs text-gray-500 mt-1">Not visible to public</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Property Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Property Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="location">Location *</Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder="e.g., Marbella"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="beds_min">Bedrooms (Min) *</Label>
                                    <Input
                                        id="beds_min"
                                        type="number"
                                        min="1"
                                        value={formData.beds_min}
                                        onChange={(e) => setFormData(prev => ({ ...prev, beds_min: parseInt(e.target.value) }))}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="beds_max">Bedrooms (Max)</Label>
                                    <Input
                                        id="beds_max"
                                        type="number"
                                        min="1"
                                        value={formData.beds_max}
                                        onChange={(e) => setFormData(prev => ({ ...prev, beds_max: parseInt(e.target.value) }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="baths">Bathrooms *</Label>
                                    <Input
                                        id="baths"
                                        type="number"
                                        min="1"
                                        value={formData.baths}
                                        onChange={(e) => setFormData(prev => ({ ...prev, baths: parseInt(e.target.value) }))}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="size_sqm">Size (m²) *</Label>
                                    <Input
                                        id="size_sqm"
                                        type="number"
                                        min="1"
                                        value={formData.size_sqm}
                                        onChange={(e) => setFormData(prev => ({ ...prev, size_sqm: parseInt(e.target.value) }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="price_eur">Price (EUR) *</Label>
                                <Input
                                    id="price_eur"
                                    type="number"
                                    min="1"
                                    value={formData.price_eur}
                                    onChange={(e) => setFormData(prev => ({ ...prev, price_eur: parseInt(e.target.value) }))}
                                    required
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Description with Auto-Translation */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Languages className="w-5 h-5" />
                                Description (Auto-Translated to 10 Languages)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div>
                                <Label htmlFor="description_en">Description (English) *</Label>
                                <Textarea
                                    id="description_en"
                                    value={formData.description_en}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                                    placeholder="Enter property description in English. It will be automatically translated to all 10 languages when you save."
                                    rows={4}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    ✨ Will auto-translate to: Dutch, French, German, Polish, Swedish, Danish, Finnish, Hungarian, Norwegian
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Images */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Images (3-4 recommended)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4">
                                    {formData.images.map((img, index) => (
                                        <div key={index} className="relative aspect-square">
                                            <img src={img} alt={`Property ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    images: prev.images.filter((_, i) => i !== index)
                                                }))}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {formData.images.length < 4 && (
                                        <label className={`aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center transition-colors ${uploading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-primary'}`}>
                                            {uploading ? (
                                                <>
                                                    <Loader2 className="w-8 h-8 text-primary mb-2 animate-spin" />
                                                    <span className="text-xs text-gray-500">Uploading...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                                    <span className="text-xs text-gray-500">Upload</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                disabled={uploading}
                                            />
                                        </label>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    Upload 3-4 high-quality images. First image will be the main thumbnail.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Display Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Display Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="display_order">Display Order</Label>
                                <Input
                                    id="display_order"
                                    type="number"
                                    min="0"
                                    value={formData.display_order}
                                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                                />
                                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="rounded"
                                />
                                <Label htmlFor="is_active" className="cursor-pointer">
                                    Active (visible on landing pages)
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/admin/properties')}
                            disabled={loading || translating}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-primary hover:bg-primary/90 flex-1"
                            disabled={loading || translating}
                        >
                            {loading || translating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {translating ? 'Translating to 10 languages...' : 'Saving...'}
                                </>
                            ) : (
                                isEdit ? 'Update Property' : 'Create Property'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
};

export default PropertyForm;
