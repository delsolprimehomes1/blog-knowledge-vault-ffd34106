import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, UserCheck, ListTodo, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UnifiedDashboardStats } from "@/hooks/useUnifiedDashboardStats";

interface DashboardOverviewCardsProps {
  stats: UnifiedDashboardStats;
}

export function DashboardOverviewCards({ stats }: DashboardOverviewCardsProps) {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Total Properties",
      value: stats.totalProperties,
      icon: Building2,
      trend: null,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      onClick: () => navigate("/admin/properties"),
    },
    {
      title: "Total Leads",
      value: stats.totalLeads,
      icon: Users,
      trend: stats.leadsTrend,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      onClick: () => navigate("/crm/admin/leads"),
    },
    {
      title: "Blog Articles",
      value: stats.totalArticles,
      icon: FileText,
      trend: null,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      onClick: () => navigate("/admin/articles"),
    },
    {
      title: "Active Agents",
      value: stats.activeAgents,
      icon: UserCheck,
      trend: null,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      onClick: () => navigate("/crm/admin/agents"),
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: ListTodo,
      trend: null,
      color: stats.pendingTasks > 10 ? "text-red-600" : "text-muted-foreground",
      bgColor: stats.pendingTasks > 10 ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/50",
      onClick: () => navigate("/crm/agent/calendar"),
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`cursor-pointer transition-all hover:shadow-md ${card.bgColor} border-0`}
          onClick={card.onClick}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${card.color}`}>
                {card.value.toLocaleString()}
              </span>
              {card.trend !== null && (
                <span
                  className={`flex items-center text-xs font-medium ${
                    card.trend >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {card.trend >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {Math.abs(card.trend)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
