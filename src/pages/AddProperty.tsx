import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building2, Home, Upload, Loader2, CheckCircle, Edit, Trash2, ExternalLink } from 'lucide-react';

const AddProperty: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [success, setSuccess] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        category: 'apartment' as 'apartment' | 'villa',
        internal_name: '',
        internal_ref: '',
        location: '',
        beds_min: 2,
        beds_max: 3,
        baths: 2,
        size_sqm: 100,
        price_eur: 400000,
        description_en: '',
        images: [
            'https://placehold.co/1200x800/C9A961/white?text=Property+Image+1',
            'https://placehold.co/1200x800/2C5282/white?text=Property+Image+2',
            'https://placehold.co/1200x800/C9A961/white?text=Property+Image+3'
        ],
        display_order: 0,
        is_active: true
    });

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        try {
            // @ts-ignore - propertes table
            const { data, error } = await (supabase as any)
                .from('properties')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            if (data) setProperties(data);
        } catch (error) {
            console.error('Error fetching properties:', error);
        }
    };

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
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 2000,
                    messages: [{
                        role: 'user',
                        content: `Translate this property description to Dutch, French, German, Polish, Swedish, Danish, Finnish, Hungarian, and Norwegian. Keep the same tone and style. Return ONLY a JSON object.

English: "${englishText}"

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
            let translations = {};

            if (data.content && data.content[0] && data.content[0].text) {
                const content = data.content[0].text;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                translations = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            }

            return {
                en: englishText,
                ...translations
            };
        } catch (error) {
            console.error('Translation error:', error);
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
        setSuccess(false);

        try {
            const descriptions = await translateDescription(formData.description_en);

            const propertyData = {
                internal_name: formData.internal_name,
                internal_ref: formData.internal_ref,
                category: formData.category,
                location: formData.location,
                beds_min: formData.beds_min,
                beds_max: formData.beds_max,
                baths: formData.baths,
                size_sqm: formData.size_sqm,
                price_eur: formData.price_eur,
                descriptions: descriptions,
                images: formData.images,
                display_order: formData.display_order,
                is_active: formData.is_active
            };

            if (editingId) {
                // @ts-ignore
                const { error } = await (supabase as any)
                    .from('properties')
                    .update(propertyData)
                    .eq('id', editingId);

                if (error) throw error;
                setEditingId(null);
            } else {
                // @ts-ignore
                const { error } = await (supabase as any)
                    .from('properties')
                    .insert([propertyData]);

                if (error) throw error;
            }

            setSuccess(true);
            resetForm();
            fetchProperties();

            setTimeout(() => setSuccess(false), 5000);
        } catch (error) {
            console.error('Error saving property:', error);
            alert('Failed to save property. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            category: 'apartment',
            internal_name: '',
            internal_ref: '',
            location: '',
            beds_min: 2,
            beds_max: 3,
            baths: 2,
            size_sqm: 100,
            price_eur: 400000,
            description_en: '',
            images: [
                'https://placehold.co/1200x800/C9A961/white?text=Property+Image+1',
                'https://placehold.co/1200x800/2C5282/white?text=Property+Image+2',
                'https://placehold.co/1200x800/C9A961/white?text=Property+Image+3'
            ],
            display_order: 0,
            is_active: true
        });
    };

    const handleEdit = (property: any) => {
        setEditingId(property.id);
        setFormData({
            category: property.category,
            internal_name: property.internal_name,
            internal_ref: property.internal_ref || '',
            location: property.location,
            beds_min: property.beds_min,
            beds_max: property.beds_max,
            baths: property.baths,
            size_sqm: property.size_sqm,
            price_eur: property.price_eur,
            description_en: property.descriptions?.en || '',
            images: property.images || [],
            display_order: property.display_order,
            is_active: property.is_active
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this property? It will be removed from all 10 language pages.')) return;

        try {
            // @ts-ignore
            const { error } = await (supabase as any)
                .from('properties')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchProperties();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete property');
        }
    };

    const handleImageUrlChange = (index: number, value: string) => {
        const newImages = [...formData.images];
        newImages[index] = value;
        setFormData(prev => ({ ...prev, images: newImages }));
    };

    const addImageField = () => {
        if (formData.images.length < 4) {
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, `https://placehold.co/1200x800/C9A961/white?text=Image+${prev.images.length + 1}`]
            }));
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
            <div className="container mx-auto px-4 max-w-5xl">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        🏠 Add Property to All 10 Languages
                    </h1>
                    <p className="text-lg text-gray-600">
                        Fill in details once in English → Auto-translates to 10 languages → Live on all landing pages
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Bookmark this page: <code className="bg-gray-200 px-2 py-1 rounded">/add-property</code>
                    </p>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-8 animate-pulse">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                            <div>
                                <h3 className="text-lg font-bold text-green-900">Property Published Successfully! 🎉</h3>
                                <p className="text-green-700">
                                    Your property is now live on all 10 language landing pages with auto-translated descriptions.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Step 1: Category */}
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 1: Choose Property Type</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, category: 'apartment' }))}
                                className={`p-8 rounded-xl border-3 transition-all ${formData.category === 'apartment'
                                        ? 'border-primary bg-primary/10 shadow-lg'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Building2 className="w-12 h-12 mx-auto mb-3 text-primary" />
                                <div className="font-bold text-lg">Apartments & Penthouses</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, category: 'villa' }))}
                                className={`p-8 rounded-xl border-3 transition-all ${formData.category === 'villa'
                                        ? 'border-primary bg-primary/10 shadow-lg'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Home className="w-12 h-12 mx-auto mb-3 text-primary" />
                                <div className="font-bold text-lg">Townhouses & Villas</div>
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Details */}
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 2: Property Details</h2>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <Label className="text-base font-semibold">Internal Name (Admin Only) *</Label>
                                <Input
                                    value={formData.internal_name}
                                    onChange={e => setFormData(prev => ({ ...prev, internal_name: e.target.value }))}
                                    placeholder="e.g., Luxury Marbella Apartment"
                                    required
                                    className="mt-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">Not shown to public</p>
                            </div>

                            <div>
                                <Label className="text-base font-semibold">Reference Number</Label>
                                <Input
                                    value={formData.internal_ref}
                                    onChange={e => setFormData(prev => ({ ...prev, internal_ref: e.target.value }))}
                                    placeholder="e.g., MAR001"
                                    className="mt-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">Not shown to public</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <Label className="text-base font-semibold">Location *</Label>
                            <Input
                                value={formData.location}
                                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="e.g., Marbella"
                                required
                                className="mt-2"
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div>
                                <Label className="text-base font-semibold">Beds (Min) *</Label>
                                <Input
                                    type="number"
                                    value={formData.beds_min}
                                    onChange={e => setFormData(prev => ({ ...prev, beds_min: parseInt(e.target.value) }))}
                                    required
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label className="text-base font-semibold">Beds (Max)</Label>
                                <Input
                                    type="number"
                                    value={formData.beds_max}
                                    onChange={e => setFormData(prev => ({ ...prev, beds_max: parseInt(e.target.value) }))}
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label className="text-base font-semibold">Bathrooms *</Label>
                                <Input
                                    type="number"
                                    value={formData.baths}
                                    onChange={e => setFormData(prev => ({ ...prev, baths: parseInt(e.target.value) }))}
                                    required
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label className="text-base font-semibold">Size (m²) *</Label>
                                <Input
                                    type="number"
                                    value={formData.size_sqm}
                                    onChange={e => setFormData(prev => ({ ...prev, size_sqm: parseInt(e.target.value) }))}
                                    required
                                    className="mt-2"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-base font-semibold">Price (EUR) *</Label>
                            <Input
                                type="number"
                                value={formData.price_eur}
                                onChange={e => setFormData(prev => ({ ...prev, price_eur: parseInt(e.target.value) }))}
                                required
                                className="mt-2"
                            />
                        </div>
                    </div>

                    {/* Step 3: Description */}
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                            Step 3: Description (English Only)
                        </h2>
                        <p className="text-gray-600 mb-6">
                            ✨ We'll automatically translate this to 10 languages when you save
                        </p>

                        <Label className="text-base font-semibold">English Description *</Label>
                        <Textarea
                            value={formData.description_en}
                            onChange={e => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                            placeholder="Enter a compelling property description in English. Focus on key features, location benefits, and unique selling points."
                            rows={6}
                            required
                            className="mt-2"
                        />
                        <p className="text-sm text-gray-500 mt-2">
                            This will be translated to: Dutch, French, German, Polish, Swedish, Danish, Finnish, Hungarian, Norwegian
                        </p>
                    </div>

                    {/* Step 4: Images */}
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 4: Image URLs (3-4 recommended)</h2>

                        <div className="space-y-4">
                            {formData.images.map((img, index) => (
                                <div key={index} className="flex gap-3">
                                    <div className="flex-1">
                                        <Input
                                            value={img}
                                            onChange={e => handleImageUrlChange(index, e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>
                                    {formData.images.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => removeImage(index)}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {formData.images.length < 4 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addImageField}
                                className="mt-4"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Add Another Image
                            </Button>
                        )}
                    </div>

                    {/* Display Settings */}
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Display Settings</h2>

                        <div className="mb-4">
                            <Label className="text-base font-semibold">Display Order</Label>
                            <Input
                                type="number"
                                value={formData.display_order}
                                onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                                className="mt-2"
                            />
                            <p className="text-sm text-gray-500 mt-1">Lower numbers appear first</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="w-5 h-5 rounded"
                            />
                            <Label htmlFor="is_active" className="text-base font-semibold cursor-pointer">
                                Active (visible on landing pages)
                            </Label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="bg-gradient-to-r from-primary to-blue-600 rounded-xl shadow-lg p-8">
                        <Button
                            type="submit"
                            disabled={loading || translating}
                            className="w-full bg-white text-primary hover:bg-gray-100 text-lg py-6 font-bold"
                        >
                            {loading || translating ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    {translating ? 'Translating to 10 languages...' : 'Saving...'}
                                </>
                            ) : editingId ? (
                                'Update Property on All 10 Pages'
                            ) : (
                                '🚀 Save & Publish to All 10 Languages'
                            )}
                        </Button>

                        {editingId && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setEditingId(null);
                                    resetForm();
                                }}
                                className="w-full mt-3 bg-white"
                            >
                                Cancel Editing
                            </Button>
                        )}
                    </div>
                </form>

                {/* Properties List */}
                <div className="mt-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Your Properties ({properties.length})</h2>

                    {properties.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                            <p className="text-gray-600">No properties yet. Add your first one above!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {properties.map((property) => (
                                <div key={property.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            {property.images?.[0] && (
                                                <img
                                                    src={property.images[0]}
                                                    alt={property.internal_name}
                                                    className="w-24 h-24 object-cover rounded-lg"
                                                />
                                            )}

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-bold text-gray-900">{property.internal_name}</h3>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${property.category === 'apartment'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {property.category}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 mt-1">
                                                    {property.location} · €{property.price_eur?.toLocaleString()}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {property.beds_min}-{property.beds_max} beds · {property.baths} baths · {property.size_sqm}m²
                                                </p>
                                                <p className="text-sm text-primary font-semibold mt-2">
                                                    🌍 Live on 10 languages
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => handleEdit(property)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => handleDelete(property.id)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* View on Languages */}
                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-sm text-primary font-semibold">
                                            View on all 10 language pages →
                                        </summary>
                                        <div className="mt-3 grid grid-cols-5 gap-2">
                                            {['en', 'nl', 'fr', 'de', 'pl', 'sv', 'da', 'fi', 'hu', 'no'].map(lang => (
                                                <a
                                                    key={lang}
                                                    href={`/${lang}/landing`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded flex items-center justify-between"
                                                >
                                                    <span className="uppercase font-semibold">{lang}</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddProperty;
