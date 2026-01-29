import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Phone, Mail, MessageSquare, Calendar, FileText, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  note: FileText,
  appointment: Calendar,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  email: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  whatsapp: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  note: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  appointment: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

interface ActivityData {
  id: string;
  activity_type: string;
  notes: string;
  created_at: string;
  lead_id: string;
  crm_leads: {
    first_name: string;
    last_name: string;
  } | null;
  crm_agents: {
    first_name: string;
    last_name: string;
  } | null;
}

export function ActivityLogSection() {
  const navigate = useNavigate();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_activities')
        .select(`
          id,
          activity_type,
          notes,
          created_at,
          lead_id,
          crm_leads (
            first_name,
            last_name
          ),
          crm_agents (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as unknown as ActivityData[];
    },
    staleTime: 30 * 1000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate("/crm/admin/dashboard")}>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = ACTIVITY_ICONS[activity.activity_type] || FileText;
                const colorClass = ACTIVITY_COLORS[activity.activity_type] || "bg-muted text-muted-foreground";
                const leadName = activity.crm_leads 
                  ? `${activity.crm_leads.first_name} ${activity.crm_leads.last_name}`
                  : "Unknown Lead";
                const agentName = activity.crm_agents
                  ? `${activity.crm_agents.first_name} ${activity.crm_agents.last_name}`
                  : "System";

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/crm/admin/leads/${activity.lead_id}`)}
                  >
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {leadName}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.activity_type}
                        </Badge>
                      </div>
                      {activity.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {activity.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{agentName}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
