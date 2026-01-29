import { AdminLayout } from "@/components/AdminLayout";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUnifiedDashboardStats } from "@/hooks/useUnifiedDashboardStats";
import {
  DashboardOverviewCards,
  LeadsSection,
  ContentSection,
  PropertiesSection,
  SEOHealthSection,
  ActivityLogSection,
  DashboardFilters,
} from "@/components/admin/dashboard";

const Dashboard = () => {
  const { data: stats, isLoading, error, refetch, isFetching } = useUnifiedDashboardStats();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Loading statistics...</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !stats) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
                <h2 className="text-2xl font-bold">Unable to Load Dashboard</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {error instanceof Error 
                    ? error.message 
                    : "There was a problem loading dashboard statistics. Please try again."}
                </p>
                <Button onClick={() => refetch()}>
                  Reload Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Command center for properties, leads, and content
            </p>
          </div>
          <DashboardFilters onRefresh={() => refetch()} isRefreshing={isFetching} />
        </div>

        {/* Overview Cards */}
        <DashboardOverviewCards stats={stats} />

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leads Section */}
          <LeadsSection stats={stats} />
          
          {/* Content Section */}
          <ContentSection stats={stats} />
        </div>

        {/* Secondary Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Properties */}
          <PropertiesSection stats={stats} />
          
          {/* SEO Health */}
          <SEOHealthSection stats={stats} />
          
          {/* Activity Log */}
          <ActivityLogSection />
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
