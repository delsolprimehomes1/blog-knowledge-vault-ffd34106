import { AdminLayout } from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClusterHealthDashboard } from "@/components/admin/ClusterHealthDashboard";
import { SitemapRegenerator } from "@/components/admin/SitemapRegenerator";
import { Activity, FileText } from "lucide-react";

export default function SystemHealth() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground mt-1">
            Monitor cluster health, language coverage, and sitemap generation
          </p>
        </div>

        <Tabs defaultValue="health" className="space-y-6">
          <TabsList>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Cluster Health
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Sitemap Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <ClusterHealthDashboard />
          </TabsContent>

          <TabsContent value="sitemap">
            <SitemapRegenerator />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
