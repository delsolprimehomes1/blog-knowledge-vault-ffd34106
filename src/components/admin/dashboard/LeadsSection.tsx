import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Users, Calendar, CalendarDays, CalendarRange, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UnifiedDashboardStats } from "@/hooks/useUnifiedDashboardStats";

interface LeadsSectionProps {
  stats: UnifiedDashboardStats;
}

const SOURCE_COLORS: Record<string, string> = {
  emma: "#8B5CF6",
  organic: "#10B981",
  paid: "#F59E0B",
  referral: "#3B82F6",
  direct: "#6366F1",
  Unknown: "#94A3B8",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#3B82F6",
  contacted: "#F59E0B",
  qualified: "#8B5CF6",
  converted: "#10B981",
  lost: "#EF4444",
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  nl: "🇳🇱",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  pl: "🇵🇱",
  sv: "🇸🇪",
  da: "🇩🇰",
  hu: "🇭🇺",
  fi: "🇫🇮",
  no: "🇳🇴",
};

export function LeadsSection({ stats }: LeadsSectionProps) {
  const navigate = useNavigate();

  const sourceData = stats.leadsBySource.map(item => ({
    name: item.source,
    value: item.count,
    color: SOURCE_COLORS[item.source] || "#94A3B8",
  }));

  const languageData = stats.leadsByLanguage.map(item => ({
    name: item.language.toUpperCase(),
    value: item.count,
    flag: LANGUAGE_FLAGS[item.language] || "🌍",
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Leads Overview
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate("/crm/admin/leads")}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View All
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Time-based metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.leadsToday}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <CalendarDays className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{stats.leadsThisWeek}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <CalendarRange className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{stats.leadsThisMonth}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Source Distribution */}
          <div>
            <h4 className="text-sm font-medium mb-3">By Source</h4>
            <div className="flex items-center gap-4">
              <div className="h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {sourceData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="capitalize">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Language Distribution */}
          <div>
            <h4 className="text-sm font-medium mb-3">By Language</h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={languageData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={40}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [value, "Leads"]}
                    labelFormatter={(name) => languageData.find(d => d.name === name)?.flag + " " + name}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-3">By Status</h4>
          <div className="flex flex-wrap gap-2">
            {stats.leadsByStatus.map((item) => (
              <Badge
                key={item.status}
                variant="secondary"
                className="text-sm px-3 py-1"
                style={{
                  backgroundColor: STATUS_COLORS[item.status] + "20",
                  color: STATUS_COLORS[item.status],
                  borderColor: STATUS_COLORS[item.status],
                }}
              >
                <span className="capitalize">{item.status}</span>: {item.count}
              </Badge>
            ))}
          </div>
        </div>

        {/* Agent assignments */}
        {stats.leadAssignmentsByAgent.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Agent Assignments</h4>
            <div className="space-y-2">
              {stats.leadAssignmentsByAgent
                .filter(a => a.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((agent) => (
                  <div
                    key={agent.agentId}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <span className="font-medium">{agent.name}</span>
                    <Badge variant="outline">{agent.count} leads</Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
