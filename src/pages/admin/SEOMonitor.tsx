import { AdminLayout } from "@/components/AdminLayout";
import { SEOSummaryCards } from "@/components/admin/seo-monitor/SEOSummaryCards";
import { ContentTypeTable } from "@/components/admin/seo-monitor/ContentTypeTable";
import { LanguageMatrix } from "@/components/admin/seo-monitor/LanguageMatrix";
import { EdgeFunctionHealth } from "@/components/admin/seo-monitor/EdgeFunctionHealth";
import { SEOIssuesPanel } from "@/components/admin/seo-monitor/SEOIssuesPanel";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const SEOMonitor = () => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['seo-monitor'] });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">SEO Monitoring Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track SEO metadata delivery across all languages and content types
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <SEOSummaryCards />

        {/* Content Type Breakdown */}
        <ContentTypeTable />

        {/* Two Column Layout for Matrix and Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LanguageMatrix />
          <EdgeFunctionHealth />
        </div>

        {/* Issues Panel */}
        <SEOIssuesPanel />
      </div>
    </AdminLayout>
  );
};

export default SEOMonitor;
