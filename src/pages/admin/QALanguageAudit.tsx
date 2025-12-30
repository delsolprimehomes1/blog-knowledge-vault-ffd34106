import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Trash2, CheckCircle2, AlertTriangle, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuditIssue {
  qa_id: string;
  qa_language: string;
  qa_question: string;
  qa_answer_preview: string;
  qa_slug: string;
  qa_type: string;
  source_article_id: string | null;
  issue_type: string;
}

interface AuditResult {
  total_qas_scanned: number;
  issues_found: number;
  issues_by_language: Record<string, number>;
  issues_by_type: Record<string, number>;
  detailed_issues: AuditIssue[];
  scan_timestamp: string;
}

interface FixResult {
  dryRun: boolean;
  message: string;
  issues_found: number;
  issues_fixed?: number;
  issues_by_language?: Record<string, number>;
  actions_preview?: Array<{
    action: string;
    qa_id: string;
    language: string;
    question_preview: string;
  }>;
  errors?: string[];
}

const LANGUAGE_FLAGS: Record<string, string> = {
  de: '🇩🇪',
  fr: '🇫🇷',
  nl: '🇳🇱',
  pl: '🇵🇱',
  sv: '🇸🇪',
  da: '🇩🇰',
  hu: '🇭🇺',
  fi: '🇫🇮',
  no: '🇳🇴',
};

export default function QALanguageAudit() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);

  const runAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    setFixResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('audit-qa-languages', {
        method: 'POST'
      });

      if (error) throw error;
      
      setAuditResult(data);
      
      if (data.issues_found === 0) {
        toast.success('All Q&As have correct language content!');
      } else {
        toast.warning(`Found ${data.issues_found} Q&As with wrong language content`);
      }
    } catch (error: any) {
      console.error('Audit error:', error);
      toast.error('Failed to run audit: ' + error.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const runFix = async (dryRun: boolean) => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fix-qa-language-mismatches', {
        method: 'POST',
        body: { dryRun }
      });

      if (error) throw error;
      
      setFixResult(data);
      
      if (dryRun) {
        toast.info(`Preview: Would delete ${data.issues_found} Q&As`);
      } else {
        toast.success(`Deleted ${data.issues_fixed} Q&As with wrong language`);
        // Re-run audit to update the display
        runAudit();
      }
    } catch (error: any) {
      console.error('Fix error:', error);
      toast.error('Failed to fix issues: ' + error.message);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <Languages className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Q&A Language Audit</h1>
            <p className="text-muted-foreground">
              Detect and fix Q&A pages with mismatched language content
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={runAudit} 
                disabled={isAuditing || isFixing}
                size="lg"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Scan All Q&As for Language Mismatches
                  </>
                )}
              </Button>

              {auditResult && auditResult.issues_found > 0 && (
                <>
                  <Button 
                    onClick={() => runFix(true)} 
                    disabled={isFixing}
                    variant="outline"
                  >
                    {isFixing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Preview Fix (Dry Run)
                  </Button>
                  
                  <Button 
                    onClick={() => runFix(false)} 
                    disabled={isFixing}
                    variant="destructive"
                  >
                    {isFixing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete All Mismatched Q&As
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fix Result Preview */}
        {fixResult && fixResult.dryRun && (
          <Alert className="mb-6 border-amber-500 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Dry Run Preview</AlertTitle>
            <AlertDescription className="text-amber-700">
              {fixResult.message}
              {fixResult.actions_preview && fixResult.actions_preview.length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="font-medium">Sample actions:</p>
                  <ul className="list-disc list-inside mt-1">
                    {fixResult.actions_preview.slice(0, 5).map((action, i) => (
                      <li key={i} className="truncate">
                        Delete {action.language.toUpperCase()}: "{action.question_preview}..."
                      </li>
                    ))}
                    {fixResult.actions_preview.length > 5 && (
                      <li>...and {fixResult.actions_preview.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Audit Results */}
        {auditResult && (
          <Card>
            <CardHeader>
              <CardTitle>Audit Results</CardTitle>
              <CardDescription>
                Scanned at {new Date(auditResult.scan_timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Q&As Scanned</div>
                  <div className="text-3xl font-bold text-blue-800">
                    {auditResult.total_qas_scanned.toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-500">Non-English only</div>
                </div>
                
                <div className={`p-4 rounded-lg border ${
                  auditResult.issues_found > 0 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className={`text-sm font-medium ${
                    auditResult.issues_found > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    Issues Found
                  </div>
                  <div className={`text-3xl font-bold ${
                    auditResult.issues_found > 0 ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {auditResult.issues_found}
                  </div>
                  <div className={`text-xs ${
                    auditResult.issues_found > 0 ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {auditResult.issues_found > 0 ? 'Content in wrong language' : 'All content correct'}
                  </div>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium">Languages Affected</div>
                  <div className="text-3xl font-bold text-purple-800">
                    {Object.keys(auditResult.issues_by_language).length}
                  </div>
                  <div className="text-xs text-purple-500">
                    {Object.keys(auditResult.issues_by_language).join(', ').toUpperCase() || 'None'}
                  </div>
                </div>
              </div>

              {/* Success State */}
              {auditResult.issues_found === 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">All Clear!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    No language mismatches found. All Q&A pages display content in the correct language.
                  </AlertDescription>
                </Alert>
              )}

              {/* Issues by Language */}
              {auditResult.issues_found > 0 && (
                <>
                  <h3 className="font-semibold mb-3">Issues by Language</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
                    {Object.entries(auditResult.issues_by_language)
                      .sort((a, b) => b[1] - a[1])
                      .map(([lang, count]) => (
                        <div 
                          key={lang} 
                          className="p-3 bg-red-100 rounded-lg text-center border border-red-200"
                        >
                          <div className="text-2xl mb-1">{LANGUAGE_FLAGS[lang] || '🌐'}</div>
                          <div className="text-sm font-semibold text-red-800">{lang.toUpperCase()}</div>
                          <div className="text-xl font-bold text-red-700">{count}</div>
                        </div>
                      ))}
                  </div>

                  {/* Detailed Issues Table */}
                  <h3 className="font-semibold mb-3">
                    Detailed Issues ({auditResult.detailed_issues.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-3 text-left font-medium">Language</th>
                            <th className="p-3 text-left font-medium">Type</th>
                            <th className="p-3 text-left font-medium">Question (English - Wrong)</th>
                            <th className="p-3 text-left font-medium">Slug</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {auditResult.detailed_issues.map((issue, i) => (
                            <tr key={i} className="hover:bg-muted/50">
                              <td className="p-3">
                                <Badge variant="outline" className="font-mono">
                                  {LANGUAGE_FLAGS[issue.qa_language]} {issue.qa_language.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <Badge variant="secondary">{issue.qa_type}</Badge>
                              </td>
                              <td className="p-3 text-xs max-w-md truncate" title={issue.qa_question}>
                                {issue.qa_question}
                              </td>
                              <td className="p-3 text-xs text-muted-foreground max-w-xs truncate" title={issue.qa_slug}>
                                {issue.qa_slug}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Initial State */}
        {!auditResult && !isAuditing && (
          <Card>
            <CardContent className="py-12 text-center">
              <Languages className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Ready to Audit</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Click "Scan All Q&As" to check for language mismatches across all non-English Q&A pages.
                This will detect Q&As that have English content but are marked as French, German, Dutch, etc.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
