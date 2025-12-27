import { AdminLayout } from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCards } from "@/components/admin/schema-health/SummaryCards";
import { ArticleQATable } from "@/components/admin/schema-health/ArticleQATable";
import { QASourceTable } from "@/components/admin/schema-health/QASourceTable";
import { SchemaValidator } from "@/components/admin/schema-health/SchemaValidator";
import { FileText, HelpCircle, Code } from "lucide-react";

export default function SchemaHealth() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Schema Health Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor bidirectional blog ↔ QA page linking and JSON-LD schema completeness
          </p>
        </div>

        <SummaryCards />

        <Tabs defaultValue="articles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="articles" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Article-QA Links
            </TabsTrigger>
            <TabsTrigger value="qa-sources" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              QA Source Verification
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Schema Validation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <ArticleQATable />
          </TabsContent>

          <TabsContent value="qa-sources">
            <QASourceTable />
          </TabsContent>

          <TabsContent value="validation">
            <SchemaValidator />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
