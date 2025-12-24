import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, MapPin, Wallet, Home, Loader2 } from 'lucide-react';
import { LOCATIONS } from '../../../constants/home';
import { Button } from '../ui/Button';
import { useTranslation } from '../../../i18n';
import { supabase } from '../../../integrations/supabase/client';

interface Property {
  id: string;
  reference: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  builtArea: number;
  mainImage: string;
  propertyType: string;
}

export const QuickSearch: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  // SALES-ONLY: No more rent option - hardcoded for luxury residential
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch properties when filters change
  useEffect(() => {
    const fetchProperties = async () => {
      if (!location && !budget) return;
      
      setIsLoading(true);
      setHasSearched(true);
      
      try {
        const params: Record<string, string | number> = {
          transactionType: 'sale', // HARD-LOCKED: Sales only
        };
        if (location) params.location = location;
        if (budget) {
          const [min, max] = budget.split('-');
          if (min) params.priceMin = parseInt(min);
          if (max && max !== '+') params.priceMax = parseInt(max);
        }

        const { data, error } = await supabase.functions.invoke('search-properties', {
          body: params
        });

        if (error) throw error;
        
        // Take first 3 properties for preview
        setProperties((data?.properties || []).slice(0, 3));
      } catch (err) {
        console.error('Error fetching properties:', err);
        setProperties([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchProperties, 500);
    return () => clearTimeout(debounce);
  }, [location, budget]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.append("transactionType", "sale"); // HARD-LOCKED: Sales only
    if (location) params.append("location", location);
    if (budget) {
      const [min, max] = budget.split("-");
      if (min) params.append("priceMin", min);
      if (max && max !== "+") params.append("priceMax", max);
    }
    navigate(`/property-finder?${params.toString()}`);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="relative z-50 -mt-32 md:-mt-24 container mx-auto px-4 reveal-on-scroll stagger-2">
      <div className="rounded-2xl p-6 md:p-10 max-w-6xl mx-auto bg-white border border-slate-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_25px_50px_-12px_rgba(0,0,0,0.25),0_50px_100px_-20px_rgba(0,0,0,0.15)] transform -translate-y-2">
        
        <div className="mb-8 text-center md:text-left border-b border-slate-100/80 pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h3 className="text-2xl font-serif font-bold text-prime-900">{t.quickSearch.headline}</h3>
            <p className="text-slate-500 mt-2 font-light">{t.quickSearch.description}</p>
          </div>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end" onSubmit={(e) => e.preventDefault()}>
          
          {/* Location */}
          <div className="space-y-2 group">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-prime-gold transition-colors flex items-center gap-1">
              <MapPin size={12} /> {t.quickSearch.labels.location}
            </label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 hover:border-prime-gold/50 rounded-xl px-5 py-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-prime-gold/20 focus:border-prime-gold transition-all duration-300 cursor-pointer shadow-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">{t.quickSearch.placeholders.location}</option>
                {LOCATIONS.map(loc => <option key={loc.value} value={loc.value}>{loc.label}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-prime-gold transition-colors" size={18} />
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2 group">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-prime-gold transition-colors flex items-center gap-1">
              <Wallet size={12} /> {t.quickSearch.labels.budget}
            </label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 hover:border-prime-gold/50 rounded-xl px-5 py-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-prime-gold/20 focus:border-prime-gold transition-all duration-300 cursor-pointer shadow-sm"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              >
                <option value="">{t.quickSearch.placeholders.budget}</option>
                <option value="400000-600000">€400k - €600k</option>
                <option value="600000-900000">€600k - €900k</option>
                <option value="900000-1500000">€900k - €1.5M</option>
                <option value="1500000-3000000">€1.5M - €3M</option>
                <option value="3000000+">€3M+</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-prime-gold transition-colors" size={18} />
            </div>
          </div>

          {/* Submit */}
          <Button onClick={handleSearch} fullWidth className="h-[58px] shadow-xl shadow-prime-900/10 text-lg" variant="primary">
            {t.quickSearch.submit}
          </Button>

        </form>

        {/* Live Property Preview */}
        {hasSearched && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-prime-gold" />
                <span className="ml-2 text-slate-500">Finding properties...</span>
              </div>
            ) : properties.length > 0 ? (
              <>
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Preview Results
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {properties.map((property) => (
                    <div 
                      key={property.id}
                      onClick={() => navigate(`/property/${property.reference}`)}
                      className="group cursor-pointer bg-slate-50 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={property.mainImage || '/placeholder.svg'} 
                          alt={property.title || `${property.propertyType} in ${property.location}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">{property.location}</p>
                        <h5 className="font-serif font-semibold text-prime-900 mt-1 line-clamp-1">{property.title}</h5>
                        <p className="text-prime-gold font-bold mt-2">{formatPrice(property.price, property.currency)}</p>
                        <div className="flex gap-3 mt-2 text-xs text-slate-500">
                          <span>{property.bedrooms} beds</span>
                          <span>{property.bathrooms} baths</span>
                          <span>{property.builtArea}m²</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-slate-500 py-4">
                No properties found. Try adjusting your filters.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
