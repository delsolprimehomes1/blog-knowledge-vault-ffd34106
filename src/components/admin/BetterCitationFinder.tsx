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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ExternalLink, CheckCircle2, Copy, RefreshCw, AlertCircle, Shield, XCircle, Loader2, ChevronDown, MapPin, BarChart3, TrendingUp, Clock, Database } from "lucide-react";
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

interface SearchHistoryItem {
  timestamp: number;
  articleTopic: string;
  targetContext?: string;
  resultCount: number;
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
  const [suggestedUrls, setSuggestedUrls] = useState<Set<string>>(new Set());
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [citationsAdded, setCitationsAdded] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { toast } = useToast();

  // Enhancement 5: Auto-sync every 10 citations
  useEffect(() => {
    if (citationsAdded > 0 && citationsAdded % 10 === 0) {
      handleAutoSync();
    }
  }, [citationsAdded]);

  // Enhancement 1: Parallel batch validation
  const validateCitations = async (citationsToValidate: BetterCitation[]) => {
    if (!targetContext) return;

    const validationPromises = citationsToValidate.map(async (citation) => {
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

        return {
          url: citation.url,
          validation: data.validation,
          validationStatus: 'validated' as const,
        };
      } catch (error: any) {
        console.error('Validation error:', error);
        return {
          url: citation.url,
          validationStatus: 'failed' as const,
        };
      } finally {
        setValidatingUrls(prev => {
          const next = new Set(prev);
          next.delete(citation.url);
          return next;
        });
      }
    });

    const results = await Promise.all(validationPromises);
    
    // Update all citations with validation results
    setCitations(prev => prev.map(c => {
      const result = results.find(r => r.url === c.url);
      if (!result) return c;
      return { ...c, ...result };
    }));

    const validCount = results.filter(r => r.validation?.isValid).length;
    toast({
      title: "Batch Validation Complete",
      description: `${validCount}/${results.length} citations validated successfully`,
    });
  };

  const validateCitation = async (citation: BetterCitation) => {
    await validateCitations([citation]);
  };

  const handleFindCitations = async (retrySearch?: SearchHistoryItem) => {
    setIsSearching(true);
    try {
      const searchTopic = retrySearch?.articleTopic || articleTopic;
      const searchContext = retrySearch?.targetContext || targetContext;

      const { data, error } = await supabase.functions.invoke('find-citations-gemini', {
        body: {
          articleTopic: searchTopic,
          articleLanguage,
          articleContent: articleContent,
          currentCitations,
          targetContext: searchContext,
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

      // PHASE 2: Track citation suggestions + Enhancement 2: Deduplication
      const newCitations: BetterCitation[] = [];
      const duplicateCount = data.citations.filter((citation: BetterCitation) => {
        const isDuplicate = suggestedUrls.has(citation.url);
        if (!isDuplicate) {
          trackCitationSuggested(citation.url);
          setSuggestedUrls(prev => new Set(prev).add(citation.url));
          newCitations.push(citation);
        }
        return isDuplicate;
      }).length;

      if (duplicateCount > 0) {
        toast({
          title: "Duplicates Filtered",
          description: `${duplicateCount} previously suggested citation(s) removed`,
        });
      }

      // PHASE 3: Analyze placement for each citation
      const citationsWithPlacement = newCitations.map((citation: BetterCitation) => {
        let citationWithStatus = {
          ...citation,
          validationStatus: targetContext ? 'pending' as const : undefined
        };

        // Add placement analysis if target context exists
        if (searchContext && articleContent) {
          const placement = analyzeCitationPlacement(articleContent, searchContext);
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
      
      // Enhancement 3: Add to search history
      setSearchHistory(prev => [{
        timestamp: Date.now(),
        articleTopic: searchTopic,
        targetContext: searchContext,
        resultCount: citationsWithPlacement.length,
      }, ...prev.slice(0, 4)]); // Keep last 5 searches
      
      toast({
        title: "Citations Found!",
        description: `Found ${citationsWithPlacement.length} new authoritative sources ${targetContext ? '- Starting auto-validation' : ''}`,
      });

      // Enhancement 1: Parallel validation if target context is provided
      if (searchContext && citationsWithPlacement.length > 0) {
        toast({
          title: "Auto-validating in parallel...",
          description: "Checking all citations simultaneously",
        });
        
        await validateCitations(citationsWithPlacement);
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
    // PHASE 2: Track citation usage + Enhancement 5: Track for auto-sync
    await trackCitationUsed(citation.url);
    setCitationsAdded(prev => prev + 1);
    
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

  // Enhancement 5: Auto-sync domain approvals
  const handleAutoSync = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-domain-usage', {
        body: { minUsageThreshold: 10 }
      });

      if (error) throw error;
      if (data.success && data.synced > 0) {
        toast({
          title: "🎯 Domains Auto-Approved",
          description: `${data.synced} heavily-used domain(s) approved automatically`,
        });
      }
    } catch (error: any) {
      console.error('Auto-sync error:', error);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-domain-usage', {
        body: { minUsageThreshold: 5 }
      });

      if (error) throw error;
      
      toast({
        title: data.success ? "✅ Sync Complete" : "❌ Sync Failed",
        description: data.success 
          ? `${data.synced} domain(s) added to approved list`
          : data.error || "Failed to sync domains",
        variant: data.success ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error('Manual sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Could not sync domains",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Enhancement 4: Coverage analytics
  const calculateAnalytics = () => {
    const wordCount = articleContent.split(/\s+/).length;
    const recommendedCitations = Math.ceil(wordCount / 300);
    const currentTotal = citations.length + currentCitations.length;
    const coverage = Math.min((currentTotal / recommendedCitations) * 100, 100);
    
    const paragraphs = articleContent.split(/\n\n+/).filter(p => p.trim());
    const citationsPerParagraph = paragraphs.map(() => 0);
    citations.forEach(c => {
      if (c.suggestedParagraph !== undefined) {
        citationsPerParagraph[c.suggestedParagraph] = (citationsPerParagraph[c.suggestedParagraph] || 0) + 1;
      }
    });

    const avgAuthority = citations.length > 0
      ? citations.reduce((sum, c) => sum + c.authorityScore, 0) / citations.length
      : 0;

    return {
      wordCount,
      recommendedCitations,
      currentTotal,
      coverage,
      avgAuthority,
      citationsPerParagraph,
      paragraphCount: paragraphs.length,
    };
  };

  const analytics = calculateAnalytics();

  const getAuthorityBadgeColor = (score: number) => {
    if (score >= 8) return "default";
    if (score >= 6) return "secondary";
    return "outline";
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
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
        {/* Enhancement 4: Analytics Dashboard */}
        <Collapsible open={showAnalytics} onOpenChange={setShowAnalytics}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <BarChart3 className="h-4 w-4" />
              {showAnalytics ? 'Hide' : 'Show'} Coverage Analytics
              <ChevronDown className={`h-4 w-4 transition-transform ${showAnalytics ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-lg border p-3">
                <div className="text-xs text-muted-foreground mb-1">Coverage</div>
                <div className="flex items-center gap-2">
                  <Progress value={analytics.coverage} className="h-2 flex-1" />
                  <span className="text-sm font-semibold">{Math.round(analytics.coverage)}%</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {analytics.currentTotal}/{analytics.recommendedCitations} citations
                </div>
              </div>
              <div className="bg-card rounded-lg border p-3">
                <div className="text-xs text-muted-foreground mb-1">Avg Authority</div>
                <div className="text-2xl font-bold text-primary">
                  {analytics.avgAuthority.toFixed(1)}/10
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {citations.length} sources
                </div>
              </div>
              <div className="bg-card rounded-lg border p-3">
                <div className="text-xs text-muted-foreground mb-1">Word Count</div>
                <div className="text-2xl font-bold">{analytics.wordCount}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {analytics.paragraphCount} paragraphs
                </div>
              </div>
            </div>
            {analytics.citationsPerParagraph.length > 0 && (
              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Coverage Heatmap:</strong> {analytics.citationsPerParagraph.map((count, i) => 
                    count === 0 ? '⚪' : count === 1 ? '🟡' : '🟢'
                  ).join(' ')}
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Main action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleFindCitations()}
            disabled={isSearching || !articleTopic || !articleContent}
            className="gap-2 flex-1"
          >
            {isSearching ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Find Better Citations
              </>
            )}
          </Button>

          {/* Enhancement 5: Manual sync button */}
          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Auto-Approve Domains
          </Button>
        </div>

        {/* Enhancement 3: Search history */}
        {searchHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Recent Searches
            </div>
            <Select onValueChange={(value) => {
              const item = searchHistory[parseInt(value)];
              if (item) handleFindCitations(item);
            }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Retry previous search..." />
              </SelectTrigger>
              <SelectContent>
                {searchHistory.map((item, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {item.articleTopic.substring(0, 40)}... ({item.resultCount} results)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Enhancement 5: Citation counter */}
        {citationsAdded > 0 && (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>{citationsAdded} citation(s)</strong> added this session
              {citationsAdded >= 10 && citationsAdded % 10 === 0 && ' • Auto-sync triggered!'}
            </AlertDescription>
          </Alert>
        )}

        {citations.length > 0 && (
          <>
            <Alert>
              <AlertDescription>
                Found <strong>{citations.filter(c => c.verified !== false).length}</strong> verified,
                high-authority sources in <strong>{articleLanguage}</strong>
                {/* Enhancement 2: Deduplication info */}
                {suggestedUrls.size > citations.length && (
                  <span className="block mt-1 text-xs text-muted-foreground">
                    ({suggestedUrls.size - citations.length} duplicate(s) filtered)
                  </span>
                )}
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
