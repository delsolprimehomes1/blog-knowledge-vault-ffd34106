import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, Calendar, MessageCircle, Star, Shield, Clock, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PropertyContactProps {
  reference: string;
  price: string;
  propertyType: string;
}

export const PropertyContact = ({ reference, price, propertyType }: PropertyContactProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: `I'm interested in property ${reference}. Please contact me with more information.`
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('register-lead', {
        body: {
          ...formData,
          propertyRef: reference,
          source: 'Property Detail Page'
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to submit inquiry');

      setIsSuccess(true);
      toast({
        title: "Inquiry Sent!",
        description: "Our team will contact you shortly.",
      });
      
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          message: `I'm interested in property ${reference}. Please contact me with more information.`
        });
      }, 2000);
    } catch (error) {
      console.error('Lead registration error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send inquiry. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="sticky top-24 md:top-28 hidden lg:block"
    >
      <div className="card-3d glass-luxury rounded-2xl md:rounded-3xl p-5 md:p-8 overflow-hidden relative">
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground px-3 md:px-4 py-1 md:py-1.5 text-xs font-semibold uppercase tracking-wider rounded-bl-xl md:rounded-bl-2xl">
            Featured
          </div>
        </div>
        <div className="absolute top-0 left-0 right-0 h-1 shimmer-overlay rounded-t-xl" />

        <div className="mb-5 md:mb-6">
          <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-2">
            Interested in this property?
          </h3>
          <p className="text-sm md:text-base text-muted-foreground">
            Our luxury real estate experts are ready to assist you
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3 mb-5 md:mb-6">
          <div className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-primary" />
            Premium
          </div>
          <div className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Shield className="w-3 h-3 md:w-3.5 md:h-3.5" />
            Verified
          </div>
          <div className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
            Quick Response
          </div>
        </div>

        <div className="space-y-2 md:space-y-3 mb-6 md:mb-8">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-12 md:h-14 text-sm md:text-base font-semibold rounded-xl animate-glow-pulse hover:scale-[1.02] transition-transform" size="lg">
                <Mail className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                Send Inquiry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Contact Us About This Property</DialogTitle>
              </DialogHeader>
              {isSuccess ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Thank You!</h3>
                  <p className="text-muted-foreground text-center mt-2">We'll be in touch soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" required value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" required value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" required value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" rows={3} value={formData.message} onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : 'Send Inquiry'}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" className="w-full h-12 md:h-14 text-sm md:text-base font-semibold rounded-xl border-2 hover:bg-primary/5 hover:border-primary hover:scale-[1.02] transition-all" size="lg">
            <Phone className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
            Call Now
          </Button>

          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <Button variant="outline" className="h-10 md:h-12 text-sm font-medium rounded-xl border-2 hover:bg-primary/5 hover:border-primary transition-all">
              <Calendar className="w-4 h-4 mr-1.5 md:mr-2" />
              Schedule
            </Button>
            <Button variant="outline" className="h-10 md:h-12 text-sm font-medium rounded-xl border-2 hover:bg-primary/5 hover:border-primary transition-all">
              <MessageCircle className="w-4 h-4 mr-1.5 md:mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>

        <div className="divider-luxury my-4 md:my-6" />

        <div className="space-y-3 md:space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs md:text-sm text-muted-foreground">Property Type</span>
            <span className="font-semibold text-sm md:text-base text-foreground capitalize">{propertyType}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs md:text-sm text-muted-foreground">Price</span>
            <span className="font-bold text-primary text-base md:text-lg">{price}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs md:text-sm text-muted-foreground">Reference</span>
            <span className="font-mono text-xs md:text-sm bg-muted px-2 py-0.5 md:py-1 rounded">{reference}</span>
          </div>
        </div>

        <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            🏆 Del Sol Prime Homes — Your trusted partner in luxury Costa del Sol real estate
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export const PropertyContactMobile = ({ reference, price }: { reference: string; price: string }) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-luxury border-t border-border" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div className="hidden sm:flex flex-col min-w-0">
          <span className="text-xs text-muted-foreground">Price</span>
          <span className="font-bold text-primary truncate">{price}</span>
        </div>
        <div className="flex flex-1 gap-2 sm:gap-3">
          <Button className="flex-1 h-12 sm:h-14 font-semibold rounded-xl text-sm sm:text-base touch-manipulation">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Inquire
          </Button>
          <Button variant="outline" className="flex-1 h-12 sm:h-14 font-semibold rounded-xl border-2 text-sm sm:text-base touch-manipulation">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            Call
          </Button>
        </div>
      </div>
    </div>
  );
};
