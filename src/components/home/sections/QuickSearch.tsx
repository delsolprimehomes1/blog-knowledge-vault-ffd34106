import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { LOCATIONS } from '../../../constants/home';
import { Button } from '../ui/Button';

export const QuickSearch: React.FC = () => {
  const [formData, setFormData] = useState({
    budget: '',
    location: '',
    purpose: 'buy'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search submitted:', formData);
  };

  return (
    <div className="relative -mt-32 px-4 md:px-8 max-w-6xl mx-auto">
      <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-2xl">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-prime-950 mb-6 text-center">
          Quick Property Search
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Budget</label>
            <input
              type="text"
              placeholder="e.g., 300,000€"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-prime-gold focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
            <select
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-prime-gold focus:border-transparent"
            >
              <option value="">Select location</option>
              {LOCATIONS.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Purpose</label>
            <select
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-prime-gold focus:border-transparent"
            >
              <option value="buy">Buy</option>
              <option value="invest">Invest</option>
              <option value="retire">Retire</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button type="submit" variant="secondary" className="w-full h-[50px] flex items-center justify-center gap-2">
              <Search className="w-5 h-5" />
              Search
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};