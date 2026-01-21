import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function LeadsOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads Overview</h1>
        <p className="text-muted-foreground">View and manage all leads across agents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            All Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Lead management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
