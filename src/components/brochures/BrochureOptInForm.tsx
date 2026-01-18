import React, { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, BookOpen, Download, ArrowRight, Star, Quote } from 'lucide-react';
import { sendFormToGHL, getPageMetadata } from '@/lib/webhookHandler';

interface BrochureOptInFormProps {
  cityName: string;
  citySlug: string;
}

const COUNTRY_CODES = [
  { code: '+44', country: 'UK' },
  { code: '+1', country: 'US/CA' },
  { code: '+34', country: 'ES' },
  { code: '+49', country: 'DE' },
  { code: '+33', country: 'FR' },
  { code: '+31', country: 'NL' },
  { code: '+46', country: 'SE' },
  { code: '+47', country: 'NO' },
  { code: '+45', country: 'DK' },
  { code: '+358', country: 'FI' },
  { code: '+48', country: 'PL' },
  { code: '+36', country: 'HU' },
  { code: '+353', country: 'IE' },
  { code: '+41', country: 'CH' },
  { code: '+43', country: 'AT' },
  { code: '+32', country: 'BE' },
];

export const BrochureOptInForm = forwardRef<HTMLElement, BrochureOptInFormProps>(
  ({ cityName, citySlug }, ref) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      countryCode: '+44',
      phone: '',
      message: '',
      privacyConsent: false,
      marketingConsent: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.privacyConsent) {
        toast({
          title: 'Privacy consent required',
          description: 'Please agree to the privacy policy to continue.',
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);

      try {
        await supabase.from('chatbot_conversations').insert({
          user_name: `${formData.firstName} ${formData.lastName}`,
          user_email: formData.email,
          user_phone: `${formData.countryCode}${formData.phone}`,
          area: cityName,
          article_slug: `brochure-${citySlug}`,
          conversation_transcript: [{
            type: 'brochure_request',
            message: formData.message || `Requested ${cityName} brochure`,
            marketing_consent: formData.marketingConsent,
            timestamp: new Date().toISOString(),
          }],
        });

        // NEW: Send to GHL webhook
        const pageMetadata = getPageMetadata();
        await sendFormToGHL({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: `${formData.countryCode}${formData.phone}`,
          message: formData.message || '',
          cityName,
          citySlug,
          leadSource: 'Website Form',
          leadSourceDetail: `brochure_page_${pageMetadata.language}`,
          pageType: 'brochure_page',
          language: pageMetadata.language,
          pageUrl: pageMetadata.pageUrl,
          pageTitle: pageMetadata.pageTitle,
          referrer: pageMetadata.referrer,
          timestamp: pageMetadata.timestamp,
          initialLeadScore: 20
        });
        console.log('[Brochure Form] GHL webhook sent');

        setIsSubmitted(true);
        toast({
          title: 'Thank you!',
          description: 'Your brochure request has been received.',
        });
      } catch (error) {
        console.error('Form submission error:', error);
        toast({
          title: 'Something went wrong',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    if (isSubmitted) {
      return (
        <section ref={ref} id="brochure-form" className="py-20 md:py-28 bg-gradient-to-b from-prime-950 to-prime-950/95 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--prime-gold)) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>
          
          <div className="container mx-auto px-4 md:px-6 max-w-2xl text-center relative z-10">
            <div className="bg-background/95 backdrop-blur-xl rounded-3xl p-10 md:p-14 shadow-2xl border border-prime-gold/20">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                Thank You!
              </h3>
              <p className="font-body text-lg text-muted-foreground leading-relaxed">
                Your {cityName} brochure is on its way! Our property specialists will be in touch within 24 hours.
              </p>
              <div className="mt-8 pt-8 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Meanwhile, explore our latest listings in {cityName}
                </p>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section ref={ref} id="brochure-form" className="py-20 md:py-28 bg-gradient-to-b from-prime-950 via-prime-950 to-prime-950/95 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--prime-gold)) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Glow Effects */}
        <div className="absolute top-1/3 -left-1/4 w-96 h-96 bg-prime-gold/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-1/4 w-96 h-96 bg-prime-gold/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
            
            {/* Left Column - Brochure Preview & Social Proof */}
            <div className="reveal-on-scroll">
              {/* Section Header */}
              <span className="inline-block px-4 py-2 bg-prime-gold/20 border border-prime-gold/30 rounded-full text-prime-goldLight text-sm font-nav tracking-wider uppercase mb-6">
                Exclusive Guide
              </span>
              
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white mb-6 leading-tight">
                Get Your Free<br />
                <span className="text-prime-gold">{cityName} Brochure</span>
              </h2>
              
              <p className="text-lg text-white/70 mb-8 leading-relaxed">
                Discover exclusive property insights, investment opportunities, and lifestyle guides for {cityName}.
              </p>
              
              {/* Brochure Preview Mock */}
              <div className="relative mb-10">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex items-center gap-6">
                  <div className="flex-shrink-0 w-20 h-28 bg-prime-gold/20 rounded-lg flex items-center justify-center border border-prime-gold/30">
                    <BookOpen className="w-10 h-10 text-prime-gold" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">{cityName} Property Guide 2024</h4>
                    <ul className="space-y-1 text-sm text-white/60">
                      <li className="flex items-center gap-2">
                        <Download className="w-3 h-3" /> Instant PDF Download
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" /> 40+ Pages of Insights
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Testimonial */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-prime-gold text-prime-gold" />
                  ))}
                </div>
                <Quote className="w-6 h-6 text-prime-gold/30 mb-2" />
                <p className="text-white/80 italic mb-4">
                  "The brochure gave us incredible insights into {cityName}. Within weeks of our inquiry, we found our dream villa!"
                </p>
                <p className="text-sm text-white/50">— James & Sarah, UK</p>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
              <form onSubmit={handleSubmit} className="bg-background/95 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl border border-prime-gold/10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
                    <Input
                      id="firstName"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      className="h-12 bg-muted/50 border-border/50 focus:border-prime-gold focus:ring-prime-gold/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
                    <Input
                      id="lastName"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Smith"
                      className="h-12 bg-muted/50 border-border/50 focus:border-prime-gold focus:ring-prime-gold/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="h-12 bg-muted/50 border-border/50 focus:border-prime-gold focus:ring-prime-gold/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.countryCode}
                      onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                    >
                      <SelectTrigger className="w-[110px] h-12 bg-muted/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.code} {item.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="7700 123456"
                      className="flex-1 h-12 bg-muted/50 border-border/50 focus:border-prime-gold focus:ring-prime-gold/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium">Tell us about your requirements (Optional)</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Budget, property type, timeline..."
                    rows={3}
                    className="bg-muted/50 border-border/50 focus:border-prime-gold focus:ring-prime-gold/20 resize-none"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="privacy"
                      checked={formData.privacyConsent}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, privacyConsent: checked as boolean })
                      }
                      className="mt-1"
                    />
                    <Label htmlFor="privacy" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the <a href="/privacy" className="text-prime-gold hover:underline">Privacy Policy</a> and consent to Del Sol Prime Homes processing my data. *
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="marketing"
                      checked={formData.marketingConsent}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, marketingConsent: checked as boolean })
                      }
                      className="mt-1"
                    />
                    <Label htmlFor="marketing" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I'd like to receive exclusive property alerts and market insights.
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-prime-gold hover:bg-prime-gold/90 text-prime-950 font-nav font-semibold h-14 text-base shadow-lg shadow-prime-gold/20 hover:shadow-prime-gold/40 transition-all duration-300 hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-prime-950/30 border-t-prime-950 rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Download Free Brochure
                    </span>
                  )}
                </Button>
                
                <p className="text-center text-xs text-muted-foreground">
                  Instant access • No spam • Unsubscribe anytime
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    );
  }
);

BrochureOptInForm.displayName = 'BrochureOptInForm';
