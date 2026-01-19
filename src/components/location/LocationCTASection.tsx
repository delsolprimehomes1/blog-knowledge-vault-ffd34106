import { MessageCircle, Calendar, ArrowRight, Phone, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LocationCTASectionProps {
  cityName: string;
  topicName?: string;
}

export function LocationCTASection({ cityName, topicName }: LocationCTASectionProps) {
  const openChat = () => {
    const event = new CustomEvent('openChatbot');
    window.dispatchEvent(event);
  };

  return (
    <section className="py-12 md:py-16 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      {/* Decorative elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
      
      <div className="relative container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* CTA Card */}
          <div className="relative group">
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-secondary rounded-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-500 blur-sm" />
            
            <div className="relative bg-card rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden">
              {/* Inner decorative blur */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 blur-2xl" />
              
              <div className="relative text-center space-y-6">
                {/* Badge */}
                <Badge 
                  variant="secondary" 
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Expert Guidance Available
                </Badge>
                
                {/* Heading */}
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
                  Ready to Explore {cityName}?
                </h2>
                
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Connect with our local experts who can help you find your perfect property 
                  {topicName ? ` and answer all your questions about ${topicName.toLowerCase()}` : ''} in {cityName}.
                </p>
                
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Button 
                    size="lg" 
                    className="group/btn bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 w-full sm:w-auto"
                    onClick={openChat}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Chat with EMMA
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-primary/30 hover:bg-primary/5 hover:border-primary/50 w-full sm:w-auto"
                    asChild
                  >
                    <a href="tel:+34630039090">
                      <Phone className="w-5 h-5 mr-2" />
                      Call Us Now
                    </a>
                  </Button>
                </div>
                
                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Quick Response</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Licensed Agents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    <span>10+ Languages</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
