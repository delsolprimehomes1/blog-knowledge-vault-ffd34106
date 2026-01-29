import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Link2,
  FileWarning,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  count?: number;
  details?: string[];
}

interface SitemapValidationPanelProps {
  goneUrlCount?: number;
  redirectCount?: number;
  onValidateAll?: () => Promise<ValidationResult[]>;
}

export function SitemapValidationPanel({ 
  goneUrlCount = 0, 
  redirectCount = 0,
  onValidateAll 
}: SitemapValidationPanelProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validationProgress, setValidationProgress] = useState(0);
  
  const runValidation = async () => {
    setIsValidating(true);
    setValidationProgress(0);
    setValidationResults([]);
    
    const results: ValidationResult[] = [];
    
    try {
      // Step 1: Check for URLs exceeding 50,000 limit
      setValidationProgress(10);
      
      // Get counts per language for each content type
      const { data: blogCounts } = await supabase
        .from('blog_articles')
        .select('language', { count: 'exact', head: false })
        .eq('status', 'published');
      
      const { data: qaCounts } = await supabase
        .from('qa_pages')
        .select('language', { count: 'exact', head: false })
        .eq('status', 'published');
      
      setValidationProgress(30);
      
      // Check if any language exceeds 50k URLs
      const langCounts: Record<string, number> = {};
      (blogCounts || []).forEach((item: any) => {
        langCounts[item.language] = (langCounts[item.language] || 0) + 1;
      });
      (qaCounts || []).forEach((item: any) => {
        langCounts[item.language] = (langCounts[item.language] || 0) + 1;
      });
      
      Object.entries(langCounts).forEach(([lang, count]) => {
        if (count > 45000) {
          results.push({
            type: count > 50000 ? 'error' : 'warning',
            category: 'URL Limit',
            message: `${lang.toUpperCase()} sitemap approaching limit`,
            count,
            details: [`${count.toLocaleString()} URLs (max 50,000 per sitemap)`]
          });
        }
      });
      
      setValidationProgress(50);
      
      // Step 2: Check for 410 Gone URLs that shouldn't be in sitemap
      if (goneUrlCount > 0) {
        results.push({
          type: 'info',
          category: '410 Gone URLs',
          message: 'URLs excluded from sitemap',
          count: goneUrlCount,
          details: [`${goneUrlCount} URLs marked as 410 Gone are being excluded`]
        });
      }
      
      // Step 3: Check for redirects
      if (redirectCount > 0) {
        results.push({
          type: 'info',
          category: 'Redirects',
          message: 'Redirect URLs excluded',
          count: redirectCount,
          details: [`${redirectCount} redirect URLs are being excluded`]
        });
      }
      
      setValidationProgress(70);
      
      // Step 4: Check for missing hreflang groups
      const { count: orphanedArticles } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .is('hreflang_group_id', null);
      
      if (orphanedArticles && orphanedArticles > 0) {
        results.push({
          type: 'warning',
          category: 'Hreflang',
          message: 'Articles missing hreflang group',
          count: orphanedArticles,
          details: [`${orphanedArticles} articles don't have hreflang linking`]
        });
      }
      
      setValidationProgress(90);
      
      // Step 5: Check for articles without images (affects SEO)
      const { count: noImageArticles } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .is('featured_image_url', null);
      
      if (noImageArticles && noImageArticles > 0) {
        results.push({
          type: 'warning',
          category: 'Images',
          message: 'Articles without featured images',
          count: noImageArticles,
          details: [`${noImageArticles} published articles have no featured image`]
        });
      }
      
      setValidationProgress(100);
      
      // Add success message if no issues
      if (results.length === 0 || results.every(r => r.type === 'info')) {
        results.unshift({
          type: 'info',
          category: 'Validation',
          message: 'All sitemaps pass validation checks',
          details: ['No critical issues detected']
        });
      }
      
      setValidationResults(results);
      
      const errorCount = results.filter(r => r.type === 'error').length;
      const warningCount = results.filter(r => r.type === 'warning').length;
      
      if (errorCount > 0) {
        toast.error(`Validation found ${errorCount} errors`);
      } else if (warningCount > 0) {
        toast.warning(`Validation found ${warningCount} warnings`);
      } else {
        toast.success('All sitemaps validated successfully');
      }
      
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Validation failed');
      results.push({
        type: 'error',
        category: 'System',
        message: 'Validation process failed',
        details: [error instanceof Error ? error.message : 'Unknown error']
      });
      setValidationResults(results);
    } finally {
      setIsValidating(false);
    }
  };
  
  const getIcon = (type: ValidationResult['type']) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const getBgColor = (type: ValidationResult['type']) => {
    switch (type) {
      case 'error': return 'bg-red-500/10 border-red-500/30';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30';
      case 'info': return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  const errorCount = validationResults.filter(r => r.type === 'error').length;
  const warningCount = validationResults.filter(r => r.type === 'warning').length;
  const infoCount = validationResults.filter(r => r.type === 'info').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5" />
              Sitemap Validation
            </CardTitle>
            <CardDescription>
              Check for SEO issues and sitemap compliance
            </CardDescription>
          </div>
          <Button onClick={runValidation} disabled={isValidating}>
            {isValidating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Validate All
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isValidating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Validating sitemaps...</span>
              <span>{validationProgress}%</span>
            </div>
            <Progress value={validationProgress} />
          </div>
        )}
        
        {validationResults.length > 0 && (
          <>
            <div className="flex gap-2">
              {errorCount > 0 && (
                <Badge variant="destructive">{errorCount} Errors</Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="bg-amber-500">{warningCount} Warnings</Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="outline">{infoCount} Info</Badge>
              )}
            </div>
            
            <div className="space-y-3">
              {validationResults.map((result, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border ${getBgColor(result.type)}`}
                >
                  <div className="flex items-start gap-2">
                    {getIcon(result.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{result.category}</span>
                        {result.count !== undefined && (
                          <Badge variant="outline" className="text-xs">{result.count.toLocaleString()}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.details && result.details.length > 0 && (
                        <ul className="text-xs text-muted-foreground mt-1">
                          {result.details.map((detail, i) => (
                            <li key={i}>• {detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        
        {validationResults.length === 0 && !isValidating && (
          <div className="text-center py-8 text-muted-foreground">
            <FileWarning className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Click "Validate All" to check sitemap compliance</p>
            <p className="text-sm">Checks URL limits, hreflang, redirects, and more</p>
          </div>
        )}
        
        {/* Quick Links */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Google Search Console
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://www.bing.com/webmasters/sitemaps" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Bing Webmaster Tools
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://www.xml-sitemaps.com/validate-xml-sitemap.html" target="_blank" rel="noopener noreferrer">
                <Link2 className="h-3 w-3 mr-1" />
                XML Validator
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
