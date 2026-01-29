import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, ExternalLink, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UnifiedDashboardStats } from "@/hooks/useUnifiedDashboardStats";

interface PropertiesSectionProps {
  stats: UnifiedDashboardStats;
}

export function PropertiesSection({ stats }: PropertiesSectionProps) {
  const navigate = useNavigate();

  const locationData = Object.entries(stats.propertiesByLocation)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Properties
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/properties/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/properties")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.propertiesByStatus.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.propertiesByStatus.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.propertiesByStatus.sold}</p>
            <p className="text-xs text-muted-foreground">Sold/Inactive</p>
          </div>
        </div>

        {/* Location distribution */}
        {locationData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              By Location
            </h4>
            <div className="flex flex-wrap gap-2">
              {locationData.map(([location, count]) => (
                <Badge key={location} variant="secondary" className="text-sm">
                  {location}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {stats.totalProperties === 0 && (
          <div className="text-center py-6">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No properties yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => navigate("/admin/properties/new")}
            >
              Add First Property
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
