import { MessageSquare } from "lucide-react";

interface SpeakableBoxProps {
  answer: string;
  optionA: string;
  optionB: string;
}

export function SpeakableBox({ answer, optionA, optionB }: SpeakableBoxProps) {
  return (
    <div className="speakable-answer comparison-summary bg-primary/5 border-l-4 border-primary rounded-r-lg p-6 mb-8">
      <div className="flex items-start gap-3">
        <MessageSquare className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Quick Answer: {optionA} vs {optionB}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
