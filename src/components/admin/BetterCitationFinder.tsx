import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, ExternalLink, CheckCircle2, Copy, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BetterCitation {
  url: string;
  sourceName: string;
  description: string;
  relevance: string;
  authorityScore: number;
  language: string;
  suggestedContext: string;
  verified?: boolean;
  statusCode?: number;
  diversityScore?: number;
  usageCount?: number;
}

interface BetterCitationFinderProps {
  articleTopic: string;
  articleLanguage: string;
  articleContent: string;
  currentCitations: string[];
  onAddCitation?: (citation: { url: string; sourceName: string; anchorText: string }) => void;
}

export const BetterCitationFinder = ({
  articleTopic,
  articleLanguage,
  articleContent,
  currentCitations,
  onAddCitation,
}: BetterCitationFinderProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [citations, setCitations] = useState<BetterCitation[]>([]);
  const { toast } = useToast();

  const handleFindCitations = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-citations-gemini', {
        body: {
          articleTopic,
          articleLanguage,
          articleContent: articleContent,
          currentCitations,
        }
      });

      if (error) {
        // Handle rate limit errors specifically
        if (error.message?.includes('429') || data?.error === 'QUOTA_EXHAUSTED') {
          toast({
            title: "API Quota Exhausted",
            description: data?.userMessage || "Gemini API quota exhausted. Please wait a few minutes or check your API key quota.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to find citations');
      }

      setCitations(data.citations);
      
      toast({
        title: "Citations Found!",
        description: `Found ${data.totalFound} authoritative sources using Gemini AI`,
      });
    } catch (error: any) {
      console.error('Citation search error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to find citations",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      description: "URL copied to clipboard",
    });
  };

  const handleAddCitation = (citation: BetterCitation) => {
    if (onAddCitation) {
      onAddCitation({
        url: citation.url,
        sourceName: citation.sourceName,
        anchorText: citation.sourceName,
      });
      toast({
        description: "Citation added to article",
      });
    }
  };

  const getAuthorityBadgeColor = (score: number) => {
    if (score >= 8) return "default";
    if (score >= 6) return "secondary";
    return "outline";
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Citation Finder
        </CardTitle>
        <CardDescription>
          Powered by <strong>Gemini AI</strong> to find authoritative sources from approved domains matching your article content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleFindCitations}
          disabled={isSearching || !articleTopic || !articleContent}
          className="gap-2"
        >
          {isSearching ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Searching for authoritative sources...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Find Better Citations
            </>
          )}
        </Button>

        {citations.length > 0 && (
          <>
            <Alert>
              <AlertDescription>
                Found <strong>{citations.filter(c => c.verified !== false).length}</strong> verified,
                high-authority sources in <strong>{articleLanguage}</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {citations.map((citation, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 space-y-2 ${
                    citation.verified === false ? 'opacity-60 bg-gray-50' : 'bg-white'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">{citation.sourceName}</h4>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 break-all"
                      >
                        {citation.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {citation.verified !== false && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      <Badge variant={getAuthorityBadgeColor(citation.authorityScore)}>
                        Authority: {citation.authorityScore}/10
                      </Badge>
                      {citation.diversityScore !== undefined && (
                        <Badge 
                          variant={citation.diversityScore >= 80 ? "default" : citation.diversityScore >= 50 ? "secondary" : "outline"}
                          className={citation.diversityScore >= 80 ? "bg-green-600" : ""}
                        >
                          {citation.usageCount === 0 ? '✨ Unused' : `${citation.usageCount}× used`}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground">{citation.description}</p>

                  {/* Relevance */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-xs text-blue-900">
                      <strong>Why relevant:</strong> {citation.relevance}
                    </p>
                  </div>

                  {/* Suggested Context */}
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <p className="text-xs text-green-900">
                      <strong>💡 Suggested placement:</strong> {citation.suggestedContext}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {onAddCitation && citation.verified !== false && (
                      <Button
                        size="sm"
                        onClick={() => handleAddCitation(citation)}
                      >
                        Add to Article
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyUrl(citation.url)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy URL
                    </Button>
                  </div>

                  {citation.verified === false && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-xs">
                        ⚠️ This URL could not be verified. Please check accessibility before using.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!isSearching && citations.length === 0 && (
          <Alert>
            <AlertDescription>
              Click "Find Better Citations" to discover authoritative {articleLanguage === 'es' ? 'Spanish' : 'English'} 
              {' '}sources for this article using AI.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
