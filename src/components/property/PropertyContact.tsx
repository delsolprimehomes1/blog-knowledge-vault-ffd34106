import { motion } from "framer-motion";
import { Mail, Phone, Calendar, MessageCircle, Star, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyContactProps {
  reference: string;
  price: string;
  propertyType: string;
}

export const PropertyContact = ({ reference, price, propertyType }: PropertyContactProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="sticky top-28"
    >
      <div className="card-3d glass-luxury rounded-3xl p-8 overflow-hidden relative">
        {/* Premium Badge */}
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-bl-2xl">
            Featured
          </div>
        </div>

        {/* Top Shimmer Effect */}
        <div className="absolute top-0 left-0 right-0 h-1 animate-shimmer" />

        {/* Header */}
        <div className="mb-6">
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">
            Interested in this property?
          </h3>
          <p className="text-muted-foreground">
            Our luxury real estate experts are ready to assist you
          </p>
        </div>

        {/* Trust Signals */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Star className="w-3.5 h-3.5 fill-primary" />
            Premium Service
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            Verified Listing
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            Quick Response
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 mb-8">
          <Button 
            className="w-full h-14 text-base font-semibold rounded-xl animate-glow-pulse hover:scale-[1.02] transition-transform"
            size="lg"
          >
            <Mail className="w-5 h-5 mr-3" />
            Send Inquiry
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-14 text-base font-semibold rounded-xl border-2 hover:bg-primary/5 hover:border-primary hover:scale-[1.02] transition-all"
            size="lg"
          >
            <Phone className="w-5 h-5 mr-3" />
            Call Now
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-12 font-medium rounded-xl border-2 hover:bg-primary/5 hover:border-primary transition-all"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
            <Button 
              variant="outline" 
              className="h-12 font-medium rounded-xl border-2 hover:bg-primary/5 hover:border-primary transition-all"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="divider-luxury my-6" />

        {/* Property Quick Info */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Property Type</span>
            <span className="font-semibold text-foreground capitalize">{propertyType}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="font-bold text-primary text-lg">{price}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Reference</span>
            <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{reference}</span>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            🏆 Del Sol Prime Homes — Your trusted partner in luxury Costa del Sol real estate
          </p>
        </div>
      </div>

      {/* Floating Action for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 glass-luxury border-t border-border z-40">
        <div className="flex gap-3">
          <Button className="flex-1 h-12 font-semibold rounded-xl">
            <Mail className="w-4 h-4 mr-2" />
            Inquire
          </Button>
          <Button variant="outline" className="flex-1 h-12 font-semibold rounded-xl border-2">
            <Phone className="w-4 h-4 mr-2" />
            Call
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
