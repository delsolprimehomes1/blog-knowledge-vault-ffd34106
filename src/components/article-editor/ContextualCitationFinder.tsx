import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Target, X, ChevronDown, ChevronUp, MousePointerClick } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLinkFinder } from "@/components/ExternalLinkFinder";
import { BetterCitationFinder } from "@/components/admin/BetterCitationFinder";
import type { ExternalCitation } from "@/types/blog";

interface ContextualCitationFinderProps {
  articleContent: string;
  headline: string;
  currentCitations: ExternalCitation[];
  onCitationsChange: (citations: ExternalCitation[]) => void;
  language?: string;
  targetContext?: string;
  onTargetContextChange?: (context: string) => void;
  onRequestTextSelection: () => void;
}

const MAX_CONTEXT_LENGTH = 150;

export function ContextualCitationFinder({
  articleContent,
  headline,
  currentCitations,
  onCitationsChange,
  language = "es",
  targetContext: externalTargetContext = "",
  onTargetContextChange,
  onRequestTextSelection,
}: ContextualCitationFinderProps) {
  const targetContext = externalTargetContext;
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddCitation = (citation: ExternalCitation) => {
    onCitationsChange([...currentCitations, citation]);
  };

  const handleClearContext = () => {
    onTargetContextChange?.("");
  };

  const handleContextChange = (value: string) => {
    if (value.length <= MAX_CONTEXT_LENGTH) {
      onTargetContextChange?.(value);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Citation Finder
            </CardTitle>
            <CardDescription>
              Find authoritative sources for your article or specific claims
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Target Specific Claim (Optional)
                  {targetContext && (
                    <Badge variant="secondary" className="ml-2">
                      🎯 Active
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="space-y-3">
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  Specify a sentence or claim to find citations that <strong>directly support that specific statement</strong>, not just general article topics.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Specific Claim to Cite
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {targetContext.length}/{MAX_CONTEXT_LENGTH}
                  </span>
                </div>
                <Textarea
                  placeholder='e.g. "Costa del Sol receives 320+ days of sunshine annually"'
                  value={targetContext}
                  onChange={(e) => handleContextChange(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={MAX_CONTEXT_LENGTH}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRequestTextSelection}
                    className="gap-2"
                  >
                    <MousePointerClick className="h-4 w-4" />
                    Select from Article
                  </Button>
                  {targetContext && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearContext}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {targetContext && (
                <Alert className="bg-primary/5 border-primary/20">
                  <Target className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <strong>Targeting mode active:</strong> Search will find sources specifically for this claim.
                  </AlertDescription>
                </Alert>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>

        <div className="flex flex-wrap gap-2">
          <ExternalLinkFinder
            articleContent={articleContent}
            headline={headline}
            currentCitations={currentCitations}
            onCitationsChange={onCitationsChange}
            language={language}
            targetContext={targetContext || undefined}
          />
          <BetterCitationFinder
            articleTopic={headline}
            articleLanguage={language}
            articleContent={articleContent}
            currentCitations={currentCitations.map(c => c.url)}
            targetContext={targetContext || undefined}
            onAddCitation={(citation) => {
              const newCitation: ExternalCitation = {
                text: citation.anchorText,
                url: citation.url,
                source: citation.sourceName,
              };
              handleAddCitation(newCitation);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
