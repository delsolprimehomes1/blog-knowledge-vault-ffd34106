import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Percent, Euro, ChevronDown, ChevronUp, Home, Building2 } from 'lucide-react';
import { defaultCosts } from '@/lib/buyersGuideSchemaGenerator';
import propertyInterior from '@/assets/buyers-guide/property-interior.jpg';

export const CostBreakdown: React.FC = () => {
  const [propertyPrice, setPropertyPrice] = useState(500000);
  const [isNewBuild, setIsNewBuild] = useState(false);
  const [expandedCost, setExpandedCost] = useState<number | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const totalRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Calculate costs
  const transferTax = isNewBuild ? 0 : propertyPrice * 0.07;
  const vat = isNewBuild ? propertyPrice * 0.10 : 0;
  const stampDuty = isNewBuild ? propertyPrice * 0.012 : 0;
  const notaryFees = propertyPrice * 0.0075;
  const registryFees = propertyPrice * 0.0075;
  const legalFees = propertyPrice * 0.0125;
  const bankCharges = 350;

  const totalCosts = transferTax + vat + stampDuty + notaryFees + registryFees + legalFees + bankCharges;
  const totalPercentage = ((totalCosts / propertyPrice) * 100).toFixed(1);

  // Animate total on change
  useEffect(() => {
    const duration = 500;
    const steps = 30;
    const stepDuration = duration / steps;
    const startValue = animatedTotal;
    const endValue = totalCosts;
    let currentStep = 0;

    const animate = () => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setAnimatedTotal(currentValue);

      if (currentStep < steps) {
        setTimeout(animate, stepDuration);
      } else {
        setAnimatedTotal(endValue);
      }
    };

    animate();
  }, [totalCosts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  };

  const costBreakdownItems = [
    { label: 'Transfer Tax (ITP) 7%', value: transferTax, show: !isNewBuild },
    { label: 'VAT (IVA) 10%', value: vat, show: isNewBuild },
    { label: 'Stamp Duty (AJD) 1.2%', value: stampDuty, show: isNewBuild },
    { label: 'Notary Fees ~0.75%', value: notaryFees, show: true },
    { label: 'Registry Fees ~0.75%', value: registryFees, show: true },
    { label: 'Legal Fees ~1.25%', value: legalFees, show: true },
    { label: 'Bank Charges', value: bankCharges, show: true },
  ];

  return (
    <section id="costs" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-5">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${propertyInterior})` }}
        />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-20 reveal-on-scroll">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-prime-gold/10 border border-prime-gold/20 rounded-full mb-6">
            <Euro className="w-4 h-4 text-prime-gold" />
            <span className="text-prime-gold text-sm font-semibold tracking-wide uppercase">Transparent Pricing</span>
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6">
            All Costs Explained
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. Calculate exactly what you'll pay when buying property in Spain.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Interactive Calculator */}
          <div className="reveal-on-scroll">
            <div className="relative overflow-hidden rounded-3xl">
              {/* Background image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${propertyInterior})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-prime-900/95 via-prime-900/90 to-prime-900/95" />
              
              <div className="relative p-8 md:p-10">
                {/* Calculator Header */}
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 rounded-2xl bg-prime-gold/20 border border-prime-gold/30 flex items-center justify-center">
                    <Calculator className="w-7 h-7 text-prime-gold" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-white">Cost Calculator</h3>
                    <p className="text-white/60 text-sm">Adjust values to see your costs</p>
                  </div>
                </div>

                {/* Property Price Slider */}
                <div className="mb-8">
                  <label className="flex justify-between text-sm font-medium text-white/80 mb-3">
                    <span>Property Price</span>
                    <span className="text-prime-gold">{formatCurrency(propertyPrice)}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="100000"
                      max="5000000"
                      step="50000"
                      value={propertyPrice}
                      onChange={(e) => setPropertyPrice(Number(e.target.value))}
                      className="w-full h-3 rounded-full appearance-none cursor-pointer bg-white/10
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-prime-gold [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-prime-gold/30
                        [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                    <div 
                      className="absolute top-0 left-0 h-3 bg-gradient-to-r from-prime-gold to-prime-goldLight rounded-full pointer-events-none"
                      style={{ width: `${((propertyPrice - 100000) / (5000000 - 100000)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-white/40 mt-2">
                    <span>€100K</span>
                    <span>€5M</span>
                  </div>
                </div>

                {/* Property Type Toggle */}
                <div className="mb-10">
                  <label className="block text-sm font-medium text-white/80 mb-3">
                    Property Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsNewBuild(false)}
                      className={`flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-medium transition-all duration-300 ${
                        !isNewBuild
                          ? 'bg-prime-gold text-white shadow-lg shadow-prime-gold/30'
                          : 'bg-white/10 text-white/60 hover:bg-white/15 border border-white/10'
                      }`}
                    >
                      <Home className="w-5 h-5" />
                      <span>Resale</span>
                    </button>
                    <button
                      onClick={() => setIsNewBuild(true)}
                      className={`flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-medium transition-all duration-300 ${
                        isNewBuild
                          ? 'bg-prime-gold text-white shadow-lg shadow-prime-gold/30'
                          : 'bg-white/10 text-white/60 hover:bg-white/15 border border-white/10'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                      <span>New Build</span>
                    </button>
                  </div>
                </div>

                {/* Cost Breakdown List */}
                <div className="space-y-3 mb-8">
                  {costBreakdownItems.filter(item => item.show).map((item, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center py-3 px-4 bg-white/5 rounded-xl border border-white/10"
                    >
                      <span className="text-white/70">{item.label}</span>
                      <span className="font-semibold text-white">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>

                {/* Total Card */}
                <div 
                  ref={totalRef}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-prime-gold/20 to-prime-gold/10 border border-prime-gold/30 p-8"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-prime-gold/10 rounded-full blur-3xl" />
                  <div className="relative text-center">
                    <p className="text-white/60 text-sm mb-2 uppercase tracking-wide">Total Additional Costs</p>
                    <p className="text-4xl md:text-5xl font-bold text-prime-gold mb-2 font-serif">
                      {formatCurrency(animatedTotal)}
                    </p>
                    <p className="text-white/50 text-sm">≈ {totalPercentage}% of purchase price</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Explanations */}
          <div className="reveal-on-scroll stagger-2">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-8">
              Understanding Each Cost
            </h3>
            <div className="space-y-4">
              {defaultCosts.map((cost, index) => (
                <div
                  key={index}
                  className={`group rounded-2xl border overflow-hidden transition-all duration-300 ${
                    expandedCost === index 
                      ? 'bg-card shadow-xl border-prime-gold/30' 
                      : 'bg-card/50 hover:bg-card hover:shadow-lg border-transparent hover:border-border'
                  }`}
                >
                  <button
                    onClick={() => setExpandedCost(expandedCost === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        expandedCost === index 
                          ? 'bg-prime-gold text-white' 
                          : 'bg-prime-gold/10 text-prime-gold group-hover:bg-prime-gold/20'
                      }`}>
                        <Percent className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-lg">{cost.name}</h4>
                        <span className="text-prime-gold font-semibold text-sm">
                          {cost.percentage || cost.amount}
                        </span>
                      </div>
                    </div>
                    <div className={`transition-transform duration-300 ${expandedCost === index ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-300 ${
                    expandedCost === index ? 'max-h-48' : 'max-h-0'
                  }`}>
                    <div className="px-5 pb-5">
                      <div className="pl-16 border-l-2 border-prime-gold/20">
                        <p className="text-muted-foreground leading-relaxed">
                          {cost.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
