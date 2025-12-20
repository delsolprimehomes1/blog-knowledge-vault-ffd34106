import { MessageSquare, Volume2 } from "lucide-react";

interface SpeakableBoxProps {
  answer: string;
  optionA: string;
  optionB: string;
}

export function SpeakableBox({ answer, optionA, optionB }: SpeakableBoxProps) {
  return (
    <div className="speakable-answer comparison-summary relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 rounded-2xl p-6 md:p-8 mb-8 shadow-lg">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-xl">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                Quick Answer
              </h2>
              <span className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                <Volume2 className="h-3 w-3" />
                Speakable
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {optionA} vs {optionB}
            </p>
          </div>
        </div>
        
        {/* Answer */}
        <p className="text-foreground text-lg leading-relaxed font-medium">
          {answer}
        </p>
      </div>
    </div>
  );
}
