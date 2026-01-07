import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Home, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from "@/components/AdminLayout";

const AdminProperties: React.FC = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        setLoading(true);
        // @ts-ignore - properties table not yet in types
        const { data, error } = await (supabase as any)
            .from('properties')
            .select('*')
            .order('display_order', { ascending: true });

        if (data) setProperties(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this property?')) return;

        // @ts-ignore - properties table not yet in types
        const { error } = await (supabase as any)
            .from('properties')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchProperties();
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">

                    {/* Header */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
                                <p className="text-gray-600 mt-1">
                                    Manage properties across all 10 languages · Auto-translation enabled
                                </p>
                            </div>
                            <Button
                                className="bg-primary hover:bg-primary/90"
                                onClick={() => {
                                    console.log('Navigating to /admin/properties/new');
                                    navigate('/admin/properties/new');
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add New Property
                            </Button>
                        </div>
                    </div>

                    {/* Properties Grid */}
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600">Loading properties...</p>
                        </div>
                    ) : properties.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No properties yet</h3>
                            <p className="text-gray-600 mb-6">
                                Start by adding your first property. It will automatically appear on all 10 language landing pages.
                            </p>
                            <Button
                                className="bg-primary"
                                onClick={() => {
                                    console.log('Navigating to /admin/properties/new');
                                    navigate('/admin/properties/new');
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Property
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {properties.map((property) => (
                                <div key={property.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Category Icon */}
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${property.category === 'apartment' ? 'bg-blue-100' : 'bg-green-100'
                                                }`}>
                                                {property.category === 'apartment' ? (
                                                    <Building2 className="w-6 h-6 text-blue-600" />
                                                ) : (
                                                    <Home className="w-6 h-6 text-green-600" />
                                                )}
                                            </div>

                                            {/* Image Preview */}
                                            {property.images && property.images.length > 0 && (
                                                <img
                                                    src={property.images[0]}
                                                    alt={property.internal_name}
                                                    className="w-24 h-24 object-cover rounded-lg"
                                                />
                                            )}

                                            {/* Property Info */}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-gray-900">{property.internal_name}</h3>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${property.category === 'apartment'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {property.category}
                                                    </span>
                                                    {!property.is_active && (
                                                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {property.location} · Ref: {property.internal_ref}
                                                </p>
                                                <p className="text-sm font-semibold text-primary mt-1">
                                                    From €{property.price_eur.toLocaleString()}
                                                </p>
                                                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                                    <span>{property.beds_min}{property.beds_max && property.beds_max !== property.beds_min ? `-${property.beds_max}` : ''} beds</span>
                                                    <span>{property.baths} baths</span>
                                                    <span>{property.size_sqm}m²</span>
                                                    <span>{property.images?.length || 0} images</span>
                                                    <span>🌍 10 languages</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate(`/admin/properties/edit/${property.id}`)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(property.id)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminProperties;
