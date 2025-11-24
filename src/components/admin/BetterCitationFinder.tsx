/**
 * BetterCitationFinder - Advanced AI-powered citation discovery and validation
 * 
 * This component replaces the legacy ExternalLinkFinder component (deprecated 2025)
 * and provides comprehensive citation finding with:
 * - AI-powered relevance scoring and authority analysis
 * - Content validation against specific claims
 * - Regional prioritization and language matching
 * - Domain diversity tracking and usage analytics
 * - Automatic placement suggestions with confidence scoring
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Sparkles, ExternalLink, CheckCircle2, Copy, RefreshCw, AlertCircle, Shield, XCircle, Loader2, ChevronDown, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackCitationSuggested, trackCitationUsed } from "@/lib/domainUsageTracking";
import { analyzeCitationPlacement, getPlacementDescription, getPlacementConfidenceColor } from "@/lib/citationPlacement";

interface CitationValidation {
  isValid: boolean;
  validationScore: number;
  explanation: string;
  keyFactsExtracted: string[];
  relevanceAnalysis: string;
  recommendations?: string;
}

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
  validation?: CitationValidation;
  validationStatus?: 'pending' | 'validating' | 'validated' | 'failed';
  suggestedParagraph?: number;
  suggestedSentence?: number;
  placementConfidence?: number;
  placementReasoning?: string;
}

interface BetterCitationFinderProps {
  articleTopic: string;
  articleLanguage: string;
  articleContent: string;
  currentCitations: string[];
  targetContext?: string;
  onAddCitation?: (citation: { url: string; sourceName: string; anchorText: string }) => void;
}

export const BetterCitationFinder = ({
  articleTopic,
  articleLanguage,
  articleContent,
  currentCitations,
  targetContext,
  onAddCitation,
}: BetterCitationFinderProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [citations, setCitations] = useState<BetterCitation[]>([]);
  const [validatingUrls, setValidatingUrls] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const validateCitation = async (citation: BetterCitation) => {
    if (!targetContext) {
      toast({
        title: "No Target Claim",
        description: "Please specify a target claim to validate citations",
        variant: "destructive",
      });
      return;
    }

    setValidatingUrls(prev => new Set(prev).add(citation.url));
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-citation-content', {
        body: {
          citationUrl: citation.url,
          targetClaim: targetContext,
          articleLanguage,
          sourceName: citation.sourceName,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Validation failed');

      // Update citation with validation result
      setCitations(prev => prev.map(c => 
        c.url === citation.url 
          ? { 
              ...c, 
              validation: data.validation,
              validationStatus: 'validated' as const
            }
          : c
      ));

      const validation = data.validation;
      toast({
        title: validation.isValid ? "Citation Validated ✓" : "Citation Invalid ✗",
        description: `Score: ${validation.validationScore}/100 - ${validation.explanation.substring(0, 100)}`,
        variant: validation.isValid ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error('Validation error:', error);
      setCitations(prev => prev.map(c => 
        c.url === citation.url 
          ? { ...c, validationStatus: 'failed' as const }
          : c
      ));
      toast({
        title: "Validation Failed",
        description: error.message || "Could not validate citation",
        variant: "destructive",
      });
    } finally {
      setValidatingUrls(prev => {
        const next = new Set(prev);
        next.delete(citation.url);
        return next;
      });
    }
  };

  const handleFindCitations = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-citations-gemini', {
        body: {
          articleTopic,
          articleLanguage,
          articleContent: articleContent,
          currentCitations,
          targetContext,
        }
      });

      if (error) {
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

      // PHASE 2: Track citation suggestions
      data.citations.forEach((citation: BetterCitation) => {
        trackCitationSuggested(citation.url);
      });

      // PHASE 3: Analyze placement for each citation
      const citationsWithPlacement = data.citations.map((citation: BetterCitation) => {
        let citationWithStatus = {
          ...citation,
          validationStatus: targetContext ? 'pending' as const : undefined
        };

        // Add placement analysis if target context exists
        if (targetContext && articleContent) {
          const placement = analyzeCitationPlacement(articleContent, targetContext);
          if (placement) {
            citationWithStatus = {
              ...citationWithStatus,
              suggestedParagraph: placement.paragraphIndex,
              suggestedSentence: placement.sentenceIndex,
              placementConfidence: placement.placementConfidence,
              placementReasoning: placement.reasoning
            };
          }
        }

        return citationWithStatus;
      });
      
      setCitations(citationsWithPlacement);
      
      toast({
        title: "Citations Found!",
        description: `Found ${data.totalFound} authoritative sources ${targetContext ? '- Click "Validate" to verify' : ''}`,
      });

      // Auto-validate if target context is provided
      if (targetContext && citationsWithPlacement.length > 0) {
        toast({
          title: "Auto-validating...",
          description: "Checking if citations support your claim",
        });
        
        // Validate all citations sequentially
        for (const citation of citationsWithPlacement) {
          await validateCitation(citation);
          // Small delay between validations
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
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

  const handleAddCitation = async (citation: BetterCitation) => {
    // PHASE 2: Track citation usage
    await trackCitationUsed(citation.url);
    
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
            {targetContext && (
              <span className="block mt-1 text-primary">
                🎯 <strong>Validation Mode:</strong> Citations will be verified against your target claim
              </span>
            )}
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
              {citations.map((citation, index) => {
                const isValidating = validatingUrls.has(citation.url);
                const validation = citation.validation;
                const validationScore = validation?.validationScore;

                return (
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

                    {/* Validation Status Badge */}
                    {(validation || isValidating || citation.validationStatus) && (
                      <div className="flex items-center gap-2">
                        {isValidating ? (
                          <Badge variant="outline" className="gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Validating...
                          </Badge>
                        ) : validation ? (
                          <>
                            <Badge 
                              variant={validation.isValid ? "default" : "destructive"}
                              className={validation.isValid ? "bg-green-600 gap-1" : "gap-1"}
                            >
                              {validation.isValid ? (
                                <><CheckCircle2 className="h-3 w-3" /> Validated</>
                              ) : (
                                <><XCircle className="h-3 w-3" /> Invalid</>
                              )}
                            </Badge>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Score:</span>
                                <Progress value={validationScore} className="h-2 w-24" />
                                <span className="font-medium">{validationScore}/100</span>
                              </div>
                            </div>
                          </>
                        ) : citation.validationStatus === 'failed' ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Validation Failed
                          </Badge>
                        ) : citation.validationStatus === 'pending' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Pending Validation
                          </Badge>
                        ) : null}
                      </div>
                    )}

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

                    {/* PHASE 3: Placement suggestion */}
                    {citation.suggestedParagraph && citation.placementConfidence && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
                        <div className="flex items-start gap-2">
                          <MapPin className={`h-4 w-4 mt-0.5 ${getPlacementConfidenceColor(citation.placementConfidence)}`} />
                          <div className="flex-1 text-sm">
                            <div className="font-medium text-blue-900 dark:text-blue-100">
                              📍 Suggested Location: Paragraph {citation.suggestedParagraph}, Sentence {citation.suggestedSentence}
                            </div>
                            <div className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                              {citation.placementReasoning} • {citation.placementConfidence}% confidence
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Validation Details (Collapsible) */}
                    {validation && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full gap-2 text-xs">
                            <Shield className="h-3 w-3" />
                            View Validation Details
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                          <Alert className={validation.isValid ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
                            <AlertDescription className="text-xs space-y-2">
                              <div>
                                <strong>Explanation:</strong>
                                <p className="mt-1">{validation.explanation}</p>
                              </div>
                              
                              {validation.keyFactsExtracted.length > 0 && (
                                <div>
                                  <strong>Key Facts Found:</strong>
                                  <ul className="mt-1 list-disc list-inside">
                                    {validation.keyFactsExtracted.map((fact, i) => (
                                      <li key={i}>{fact}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div>
                                <strong>Relevance Analysis:</strong>
                                <p className="mt-1">{validation.relevanceAnalysis}</p>
                              </div>

                              {validation.recommendations && (
                                <div className="pt-2 border-t">
                                  <strong>💡 Recommendations:</strong>
                                  <p className="mt-1">{validation.recommendations}</p>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {onAddCitation && citation.verified !== false && (
                        <Button
                          size="sm"
                          onClick={() => handleAddCitation(citation)}
                          disabled={validation && !validation.isValid}
                        >
                          Add to Article
                        </Button>
                      )}
                      {targetContext && !validation && !isValidating && citation.validationStatus !== 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => validateCitation(citation)}
                          className="gap-1"
                        >
                          <Shield className="h-3 w-3" />
                          Validate
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
                );
              })}
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
