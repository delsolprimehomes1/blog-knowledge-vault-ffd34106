import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, ExternalLink, Plus, Eye } from "lucide-react";
import { ExternalCitation } from "@/types/blog";

interface ExternalLinkFinderProps {
  articleContent: string;
  headline: string;
  currentCitations: ExternalCitation[];
  onCitationsChange: (citations: ExternalCitation[]) => void;
  language?: string;
  targetContext?: string; // Optional: specific sentence/paragraph to cite
}

interface FoundCitation {
  sourceName: string;
  url: string;
  anchorText: string;
  relevance: string;
  verified?: boolean;
}

export const ExternalLinkFinder = ({ 
  articleContent, 
  headline,
  currentCitations,
  onCitationsChange,
  language = 'es',
  targetContext
}: ExternalLinkFinderProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [foundLinks, setFoundLinks] = useState<FoundCitation[]>([]);
  const [requireGovSource, setRequireGovSource] = useState(false);
  const [hasGovernmentSource, setHasGovernmentSource] = useState(false);

  const findAuthoritativeSources = async () => {
    if (!articleContent || !headline) {
      toast.error("Please add headline and content before searching for sources");
      return;
    }

    setIsSearching(true);

    try {
      console.log('Searching for authoritative sources...');
      
      const { data, error } = await supabase.functions.invoke('find-better-citations', {
        body: {
          articleTopic: headline,
          articleLanguage: language,
          articleContent: articleContent,
          currentCitations: currentCitations.map(c => c.url),
          targetContext: targetContext,
          verifyUrls: true
        }
      });

      if (error) {
        // Handle rate limit errors specifically
        if (error.message?.includes('429') || data?.error === 'QUOTA_EXHAUSTED') {
          toast.error(data?.userMessage || "API quota exhausted. Please wait a few minutes or check your API key quota.");
          setFoundLinks([]);
          return;
        }
        throw error;
      }

      if (data?.citations && data.citations.length > 0) {
        // Map Perplexity format to component format
        const mappedCitations = data.citations.map(c => ({
          sourceName: c.sourceName,
          url: c.url,
          anchorText: c.suggestedContext || c.description,
          relevance: c.relevance,
          verified: c.verified !== false
        }));
        
        setFoundLinks(mappedCitations);
        
        // Check if any citations are from government sources
        const hasGov = mappedCitations.some(c => 
          c.url.includes('.gov') || 
          c.url.includes('.gob.es') || 
          c.url.includes('.overheid.nl')
        );
        setHasGovernmentSource(hasGov);
        
        toast.success(`Found ${mappedCitations.length} authoritative sources!`);
        
        // Show warning if government source was required but not found
        if (requireGovSource && !hasGov) {
          toast.warning("No government sources found. Consider adding one manually for better authority.");
        }
      } else {
        toast.info("No authoritative sources found. Try adding more content or search manually.");
        setFoundLinks([]);
        setHasGovernmentSource(false);
      }
    } catch (error) {
      console.error('Perplexity API error:', error);
      toast.error("Failed to find sources with Perplexity. Please try again.");
      setFoundLinks([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addCitation = (link: FoundCitation) => {
    // Check if citation already exists
    const exists = currentCitations.some(c => c.url === link.url);
    if (exists) {
      toast.info("This citation is already added");
      return;
    }

    const newCitation: ExternalCitation = {
      source: link.sourceName,
      url: link.url,
      text: link.anchorText
    };

    onCitationsChange([...currentCitations, newCitation]);
    toast.success("Citation added!");
  };

  const isOfficialGovernment = (url: string) => {
    return url.includes('.gov') || url.includes('.gob.es') || url.includes('.overheid.nl');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">AI-Powered Source Finder</h4>
            <p className="text-sm text-muted-foreground">
              Automatically discover authoritative sources for your article
            </p>
          </div>
          <Button 
            onClick={findAuthoritativeSources}
            disabled={isSearching || !articleContent}
            variant="secondary"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Find Sources
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="require-gov"
            checked={requireGovSource}
            onCheckedChange={(checked) => setRequireGovSource(checked as boolean)}
          />
          <Label 
            htmlFor="require-gov" 
            className="text-sm cursor-pointer"
          >
            Require at least one .gov or .gob.es source
          </Label>
        </div>
      </div>

      {foundLinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {foundLinks.length} sources found
            </Badge>
            {hasGovernmentSource ? (
              <Badge variant="default">
                ✓ Includes official government sources
              </Badge>
            ) : requireGovSource ? (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                ⚠️ No government sources found
              </Badge>
            ) : null}
          </div>

          <div className="space-y-3">
            {foundLinks.map((link, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm">{link.sourceName}</strong>
                        {isOfficialGovernment(link.url) && (
                          <Badge variant="default" className="text-xs">
                            🔒 Official Government
                          </Badge>
                        )}
                        {link.verified && (
                          <Badge variant="outline" className="text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                      
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {link.url.length > 60 ? link.url.substring(0, 60) + '...' : link.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Suggested anchor:</span> "{link.anchorText}"
                      </p>
                      
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Relevance:</span> {link.relevance}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => addCitation(link)}
                      disabled={currentCitations.some(c => c.url === link.url)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {currentCitations.some(c => c.url === link.url) ? 'Added' : 'Add Citation'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
