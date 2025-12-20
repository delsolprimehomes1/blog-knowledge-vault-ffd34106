import { Volume2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SpeakableBoxProps {
  content: string;
  className?: string;
}

export function SpeakableBox({ content, className = "" }: SpeakableBoxProps) {
  return (
    <div 
      className={`speakable-answer relative overflow-hidden rounded-2xl p-6 md:p-8 animate-fade-in ${className}`}
      role="region"
      aria-label="AI-ready summary"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10" />
      
      {/* Glass effect overlay */}
      <div className="absolute inset-0 backdrop-blur-[1px] bg-white/40 dark:bg-black/20" />
      
      {/* Decorative blurs */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-accent/10 blur-2xl" />
      
      {/* Border */}
      <div className="absolute inset-0 rounded-2xl border border-primary/10" />
      
      <div className="relative flex items-start gap-4 md:gap-6">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
            <Volume2 className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          </div>
        </div>
        
        <div className="flex-1 space-y-3">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Quick Answer
            </Badge>
            <span className="text-xs text-muted-foreground">AI-Optimized</span>
          </div>
          
          {/* Content */}
          <p className="text-base md:text-lg text-foreground leading-relaxed font-medium">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
