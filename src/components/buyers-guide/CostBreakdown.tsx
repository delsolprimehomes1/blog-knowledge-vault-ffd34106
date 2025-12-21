import React, { useState } from 'react';
import { Calculator, Percent, Euro, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { defaultCosts } from '@/lib/buyersGuideSchemaGenerator';

export const CostBreakdown: React.FC = () => {
  const [propertyPrice, setPropertyPrice] = useState(500000);
  const [isNewBuild, setIsNewBuild] = useState(false);
  const [expandedCost, setExpandedCost] = useState<number | null>(null);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <section id="costs" className="py-20 md:py-28 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 reveal-on-scroll">
          <span className="text-prime-gold font-bold uppercase tracking-widest text-xs mb-3 block">
            Transparent Pricing
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-6">
            All Costs Explained
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. Calculate exactly what you'll pay when buying property in Spain.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Interactive Calculator */}
          <div className="reveal-on-scroll">
            <div className="glass-luxury rounded-3xl p-8 border border-prime-gold/20">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-prime-gold/10 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-prime-gold" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Cost Calculator</h3>
              </div>

              {/* Property Price Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Property Price
                </label>
                <div className="relative">
                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="range"
                    min="100000"
                    max="5000000"
                    step="50000"
                    value={propertyPrice}
                    onChange={(e) => setPropertyPrice(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-prime-gold mt-2"
                  />
                  <div className="text-2xl font-bold text-prime-gold mt-2">
                    {formatCurrency(propertyPrice)}
                  </div>
                </div>
              </div>

              {/* Property Type Toggle */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Property Type
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsNewBuild(false)}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                      !isNewBuild
                        ? 'bg-prime-gold text-white shadow-lg'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Resale Property
                  </button>
                  <button
                    onClick={() => setIsNewBuild(true)}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                      isNewBuild
                        ? 'bg-prime-gold text-white shadow-lg'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    New Build
                  </button>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3 mb-6">
                {!isNewBuild && (
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Transfer Tax (ITP) 7%</span>
                    <span className="font-medium text-foreground">{formatCurrency(transferTax)}</span>
                  </div>
                )}
                {isNewBuild && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground">VAT (IVA) 10%</span>
                      <span className="font-medium text-foreground">{formatCurrency(vat)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Stamp Duty (AJD) 1.2%</span>
                      <span className="font-medium text-foreground">{formatCurrency(stampDuty)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Notary Fees ~0.75%</span>
                  <span className="font-medium text-foreground">{formatCurrency(notaryFees)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Registry Fees ~0.75%</span>
                  <span className="font-medium text-foreground">{formatCurrency(registryFees)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Legal Fees ~1.25%</span>
                  <span className="font-medium text-foreground">{formatCurrency(legalFees)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Bank Charges</span>
                  <span className="font-medium text-foreground">{formatCurrency(bankCharges)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="bg-prime-900 rounded-2xl p-6 text-center">
                <p className="text-slate-400 text-sm mb-2">Total Additional Costs</p>
                <p className="text-3xl font-bold text-prime-gold mb-1">{formatCurrency(totalCosts)}</p>
                <p className="text-slate-400 text-sm">≈ {totalPercentage}% of purchase price</p>
              </div>
            </div>
          </div>

          {/* Cost Explanations */}
          <div className="reveal-on-scroll stagger-2">
            <h3 className="text-2xl font-serif font-bold text-foreground mb-6">
              Understanding Each Cost
            </h3>
            <div className="space-y-3">
              {defaultCosts.map((cost, index) => (
                <div
                  key={index}
                  className="bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-md"
                >
                  <button
                    onClick={() => setExpandedCost(expandedCost === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-prime-gold/10 flex items-center justify-center">
                        <Percent className="w-5 h-5 text-prime-gold" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{cost.name}</h4>
                        <span className="text-sm text-prime-gold font-medium">
                          {cost.percentage || cost.amount}
                        </span>
                      </div>
                    </div>
                    {expandedCost === index ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  {expandedCost === index && (
                    <div className="px-4 pb-4">
                      <div className="pl-13 ml-13 border-l-2 border-prime-gold/20 pl-4">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {cost.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
