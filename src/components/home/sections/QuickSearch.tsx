import React, { useState } from 'react';
import { Search, ChevronDown, MapPin, Wallet, Home } from 'lucide-react';
import { LOCATIONS } from '../../../constants/home';
import { Button } from '../ui/Button';

export const QuickSearch: React.FC = () => {
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');

  return (
    <div className="relative z-30 -mt-32 md:-mt-24 container mx-auto px-4 reveal-on-scroll stagger-2">
      <div className="glass-panel rounded-2xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] p-6 md:p-10 max-w-6xl mx-auto bg-white/95">
        
        <div className="mb-8 text-center md:text-left border-b border-slate-100/80 pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h3 className="text-2xl font-serif font-bold text-prime-900">Start With the Right Properties — Not Endless Scrolling</h3>
            <p className="text-slate-500 mt-2 font-light">We focus exclusively on carefully selected new-build and off-plan developments, matching your lifestyle, your timing, and your long-term goals.</p>
          </div>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end" onSubmit={(e) => e.preventDefault()}>
          
          {/* Location */}
          <div className="space-y-2 group">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-prime-gold transition-colors flex items-center gap-1">
              <MapPin size={12} /> Location
            </label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 hover:border-prime-gold/50 rounded-xl px-5 py-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-prime-gold/20 focus:border-prime-gold transition-all duration-300 cursor-pointer shadow-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Any Location</option>
                {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-prime-gold transition-colors" size={18} />
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-2 group">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-prime-gold transition-colors flex items-center gap-1">
              <Home size={12} /> Purpose
            </label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 hover:border-prime-gold/50 rounded-xl px-5 py-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-prime-gold/20 focus:border-prime-gold transition-all duration-300 cursor-pointer shadow-sm"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="">Investment & Personal</option>
                <option value="holiday">Holiday Home</option>
                <option value="winter">Winter Stay</option>
                <option value="combination">Combination</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-prime-gold transition-colors" size={18} />
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2 group">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-prime-gold transition-colors flex items-center gap-1">
              <Wallet size={12} /> Max Budget
            </label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 hover:border-prime-gold/50 rounded-xl px-5 py-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-prime-gold/20 focus:border-prime-gold transition-all duration-300 cursor-pointer shadow-sm"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              >
                <option value="">Select Range</option>
                <option value="300-500">€300k - €500k</option>
                <option value="500-800">€500k - €800k</option>
                <option value="800-1500">€800k - €1.5M</option>
                <option value="1500+">€1.5M+</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-prime-gold transition-colors" size={18} />
            </div>
          </div>

          {/* Submit */}
          <Button fullWidth className="h-[58px] shadow-xl shadow-prime-900/10 text-lg" variant="primary">
            Open the Full Property Finder
          </Button>

        </form>
      </div>
    </div>
  );
};