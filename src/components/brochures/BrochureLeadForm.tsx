import React, { useState } from 'react';
import { Send, CheckCircle, Shield, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CityBrochureData } from '@/constants/brochures';
import { useTranslation } from '@/i18n';
import { toast } from 'sonner';

interface BrochureLeadFormProps {
  city: CityBrochureData;
}

export const BrochureLeadForm: React.FC<BrochureLeadFormProps> = ({ city }) => {
  const { t } = useTranslation();
  const brochureT = t.brochures?.[city.slug as keyof typeof t.brochures] || t.brochures?.marbella;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Thank you! We\'ll be in touch within 24 hours.');
  };

  const trustSignals = [
    { icon: Shield, text: 'API-Accredited' },
    { icon: Star, text: '35+ Years Experience' },
    { icon: Users, text: 'Multilingual Team' },
  ];

  if (isSubmitted) {
    return (
      <section className="py-24 md:py-32 bg-prime-950 text-white relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Thank You for Your Interest
            </h2>
            <p className="text-white/70 text-lg mb-8">
              One of our {city.name} specialists will contact you within 24 hours to discuss your property search.
            </p>
            <Button
              onClick={() => setIsSubmitted(false)}
              variant="outline"
              className="border-white/30 text-white hover:bg-white hover:text-prime-950"
            >
              Submit Another Inquiry
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 md:py-32 bg-prime-950 text-white relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-prime-gold rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-prime-gold rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
          {/* Left Side - CTA Content */}
          <div className="reveal-on-scroll">
            <span className="inline-block text-prime-gold font-nav text-sm tracking-wider uppercase mb-4">
              {brochureT?.leadForm?.eyebrow || 'Start Your Journey'}
            </span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              {brochureT?.leadForm?.headline || `Receive Curated Properties in ${city.name}`}
            </h2>
            <p className="text-white/70 text-lg mb-8 leading-relaxed">
              {brochureT?.leadForm?.description || 
                `Tell us about your vision. Our ${city.name} specialists will prepare a personalized selection of properties that match your lifestyle and investment goals.`
              }
            </p>

            {/* Trust Signals */}
            <div className="flex flex-wrap gap-6">
              {trustSignals.map((signal, index) => (
                <div key={index} className="flex items-center gap-2 text-white/60">
                  <signal.icon className="w-5 h-5 text-prime-gold" />
                  <span className="text-sm">{signal.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="reveal-on-scroll stagger-2">
            <form 
              onSubmit={handleSubmit}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
            >
              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2 text-white/80">
                    Full Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-prime-gold"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-white/80">
                    Email Address *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-prime-gold"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2 text-white/80">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-prime-gold"
                    placeholder="+31 6 12345678"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2 text-white/80">
                    What are you looking for?
                  </label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-prime-gold min-h-[100px]"
                    placeholder={`Tell us about your ideal property in ${city.name}...`}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-prime-gold hover:bg-prime-goldDark text-white font-nav font-semibold py-6 text-base shadow-xl shadow-prime-gold/30"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Request Curated Selection
                      <Send size={18} />
                    </span>
                  )}
                </Button>

                <p className="text-center text-white/40 text-xs">
                  We respect your privacy. Your information is never shared.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
