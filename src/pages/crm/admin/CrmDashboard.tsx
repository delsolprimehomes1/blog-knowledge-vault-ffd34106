import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrmAgentStats } from "@/hooks/useCrmAgents";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, ClipboardList, AlertCircle } from "lucide-react";

export default function CrmDashboard() {
  const { data: stats, isLoading } = useCrmAgentStats();

  const statCards = [
    {
      title: "Total Agents",
      value: stats?.totalAgents ?? 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Active Agents",
      value: stats?.activeAgents ?? 0,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Leads",
      value: stats?.totalLeads ?? 0,
      icon: ClipboardList,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Unclaimed Leads",
      value: stats?.unclaimedLeads ?? 0,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your CRM system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Activity feed will be displayed here
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Quick actions will be available here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
