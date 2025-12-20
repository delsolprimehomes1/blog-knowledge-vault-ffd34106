import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  optionA: string;
  optionB: string;
  onChatClick?: () => void;
}

export function CTASection({ optionA, optionB, onChatClick }: CTASectionProps) {
  return (
    <section className="my-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 rounded-3xl" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10 p-8 md:p-12 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-2xl mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        
        {/* Heading */}
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Still Deciding Between {optionA} and {optionB}?
        </h3>
        
        {/* Description */}
        <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
          Chat with <span className="text-primary font-semibold">EMMA</span>, our AI property expert, 
          for personalized guidance based on your specific situation and goals.
        </p>
        
        {/* CTA Button */}
        <Button 
          size="lg" 
          onClick={onChatClick}
          className="group gap-2 px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
          Chat with EMMA
        </Button>
        
        {/* Trust indicator */}
        <p className="mt-4 text-sm text-muted-foreground">
          💬 Instant answers • 🔒 No personal data required • 🌐 Available 24/7
        </p>
      </div>
    </section>
  );
}
