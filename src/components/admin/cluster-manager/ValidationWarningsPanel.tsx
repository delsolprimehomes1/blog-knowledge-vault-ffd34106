import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, Link2, HelpCircle, Eye } from "lucide-react";
import { ClusterManagerStats } from "@/hooks/useClusterManagerStats";

interface ValidationWarningsPanelProps {
  stats: ClusterManagerStats | undefined;
  onViewArticles?: (filter: string) => void;
}

export function ValidationWarningsPanel({ stats, onViewArticles }: ValidationWarningsPanelProps) {
  if (!stats) return null;

  const warnings = [
    {
      id: 'word_count_short',
      icon: FileText,
      label: 'Word count < 1500',
      count: stats.wordCountTooShort,
      severity: 'warning' as const,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      id: 'word_count_long',
      icon: FileText,
      label: 'Word count > 2500',
      count: stats.wordCountTooLong,
      severity: 'info' as const,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      id: 'missing_faq',
      icon: HelpCircle,
      label: 'Missing FAQ schema',
      count: stats.missingFaqSchema,
      severity: 'warning' as const,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
  ];

  const activeWarnings = warnings.filter(w => w.count > 0);
  const totalIssues = activeWarnings.reduce((sum, w) => sum + w.count, 0);

  if (totalIssues === 0) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-medium">All validation checks passed</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Validation Warnings
          <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
            {totalIssues} issues
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activeWarnings.map((warning) => (
            <div
              key={warning.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${warning.color}`}
            >
              <div className="flex items-center gap-3">
                <warning.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{warning.label}</span>
                <Badge 
                  variant="outline" 
                  className={warning.severity === 'warning' 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                  }
                >
                  {warning.count}
                </Badge>
              </div>
              {onViewArticles && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewArticles(warning.id)}
                  className="h-7 px-2"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
