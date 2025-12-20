import { Volume2 } from "lucide-react";

interface SpeakableBoxProps {
  content: string;
  className?: string;
}

export function SpeakableBox({ content, className = "" }: SpeakableBoxProps) {
  return (
    <div 
      className={`speakable-answer bg-primary/5 border-l-4 border-primary p-6 rounded-r-lg ${className}`}
      role="region"
      aria-label="AI-ready summary"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Volume2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-primary mb-2">Quick Answer</p>
          <p className="text-foreground leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
}
