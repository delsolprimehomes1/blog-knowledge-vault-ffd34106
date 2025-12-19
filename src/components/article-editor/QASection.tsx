import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, Plus, Trash2, ChevronUp, ChevronDown, Code } from "lucide-react";
import { QAEntity } from "@/types/blog";

interface QASectionProps {
  qaEntities: QAEntity[];
  onQaEntitiesChange: (entities: QAEntity[]) => void;
}

export const QASection = ({
  qaEntities,
  onQaEntitiesChange,
}: QASectionProps) => {
  const [isEnabled, setIsEnabled] = useState(qaEntities.length > 0);
  const [showSchema, setShowSchema] = useState(false);

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      onQaEntitiesChange([]);
    } else if (qaEntities.length === 0) {
      onQaEntitiesChange([{ question: "", answer: "" }]);
    }
  };

  const addQuestion = () => {
    if (qaEntities.length < 6) {
      onQaEntitiesChange([...qaEntities, { question: "", answer: "" }]);
    }
  };

  const updateQuestion = (index: number, field: keyof QAEntity, value: string) => {
    const updated = [...qaEntities];
    updated[index] = { ...updated[index], [field]: value };
    onQaEntitiesChange(updated);
  };

  const removeQuestion = (index: number) => {
    onQaEntitiesChange(qaEntities.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= qaEntities.length) return;

    const updated = [...qaEntities];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onQaEntitiesChange(updated);
  };

  const generateSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": qaEntities
        .filter(faq => faq.question && faq.answer)
        .map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>FAQ Entities (Optional)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Enable for QA articles to add FAQPage schema markup
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="faq-toggle">Enable FAQ Schema</Label>
            <Switch
              id="faq-toggle"
              checked={isEnabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </div>
      </CardHeader>

      {isEnabled && (
        <CardContent className="space-y-4">
          {qaEntities.map((faq, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Question {index + 1}</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveQuestion(index, "up")}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveQuestion(index, "down")}
                    disabled={index === qaEntities.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Question *</Label>
                <Input
                  value={faq.question}
                  onChange={(e) => updateQuestion(index, "question", e.target.value)}
                  placeholder="What is the property buying process in Costa del Sol?"
                />
              </div>

              <div>
                <Label>Answer * (100-200 words)</Label>
                <Textarea
                  value={faq.answer}
                  onChange={(e) => updateQuestion(index, "answer", e.target.value)}
                  placeholder="Provide a detailed answer..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {faq.answer.split(/\s+/).filter(w => w).length} words
                </p>
              </div>
            </div>
          ))}

          {qaEntities.length < 6 && (
            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}

          {qaEntities.length > 0 && qaEntities.length < 3 && (
            <p className="text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Minimum 3 Q&A pairs recommended for FAQ schema
            </p>
          )}

          {qaEntities.length >= 3 && (
            <Collapsible open={showSchema} onOpenChange={setShowSchema}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full">
                  <Code className="h-4 w-4 mr-2" />
                  {showSchema ? "Hide" : "Preview"} FAQPage Schema
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(generateSchema(), null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}

          <p className="text-sm text-muted-foreground">
            {qaEntities.length} of 3-6 Q&A pairs added
          </p>
        </CardContent>
      )}
    </Card>
  );
};
