import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, MapPin, Wallet, Home } from 'lucide-react';
import { LOCATIONS } from '../../../constants/home';
import { Button } from '../ui/Button';
import { useTranslation } from '../../../i18n';

export const QuickSearch: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.append("location", location);
    if (purpose) params.append("propertyType", purpose);
    if (budget) {
      const [min, max] = budget.split("-");
      if (min) params.append("priceMin", min);
      if (max && max !== "+") params.append("priceMax", max);
    }
    navigate(`/property-finder?${params.toString()}`);
  };

  return (
    <div className="relative z-50 -mt-32 md:-mt-24 container mx-auto px-4 reveal-on-scroll stagger-2">
      <div className="rounded-2xl p-6 md:p-10 max-w-6xl mx-auto bg-white border border-slate-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_25px_50px_-12px_rgba(0,0,0,0.25),0_50px_100px_-20px_rgba(0,0,0,0.15)] transform -translate-y-2 hover:-translate-y-3 transition-all duration-300">
        
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

          {/* Purpose */}
          <div className="space-y-2 group">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-prime-gold transition-colors flex items-center gap-1">
              <Home size={12} /> {t.quickSearch.labels.purpose}
            </label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 hover:border-prime-gold/50 rounded-xl px-5 py-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-prime-gold/20 focus:border-prime-gold transition-all duration-300 cursor-pointer shadow-sm"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="">{t.quickSearch.purposes.investmentPersonal}</option>
                <option value="holiday">{t.quickSearch.purposes.holidayHome}</option>
                <option value="winter">{t.quickSearch.purposes.winterStay}</option>
                <option value="combination">{t.quickSearch.purposes.combination}</option>
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
                <option value="300-500">{t.quickSearch.budgetRanges.range1}</option>
                <option value="500-800">{t.quickSearch.budgetRanges.range2}</option>
                <option value="800-1500">{t.quickSearch.budgetRanges.range3}</option>
                <option value="1500+">{t.quickSearch.budgetRanges.range4}</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-prime-gold transition-colors" size={18} />
            </div>
          </div>

          {/* Submit */}
          <Button onClick={handleSearch} fullWidth className="h-[58px] shadow-xl shadow-prime-900/10 text-lg" variant="primary">
            {t.quickSearch.submit}
          </Button>

        </form>
      </div>
    </div>
  );
};
