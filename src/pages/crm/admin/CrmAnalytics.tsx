import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { BarChart3, Clock, Globe, Target, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { useCrmAnalytics, DateRange, LANGUAGE_LABELS } from "@/hooks/useCrmAnalytics";

export default function CrmAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const { data: analytics, isLoading } = useCrmAnalytics(dateRange);

  const languageChartConfig = {
    en: { label: "🇬🇧 English", color: "hsl(221, 83%, 53%)" },
    fr: { label: "🇫🇷 French", color: "hsl(173, 80%, 40%)" },
    nl: { label: "🇳🇱 Dutch", color: "hsl(25, 95%, 53%)" },
    de: { label: "🇩🇪 German", color: "hsl(280, 65%, 60%)" },
    es: { label: "🇪🇸 Spanish", color: "hsl(142, 71%, 45%)" },
    fi: { label: "🇫🇮 Finnish", color: "hsl(340, 75%, 55%)" },
  };

  const sourceChartConfig = {
    count: { label: "Leads", color: "hsl(221, 83%, 53%)" },
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Lead flow and agent performance metrics</p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 1: Key Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={analytics?.totalLeads}
          icon={BarChart3}
          isLoading={isLoading}
        />
        <MetricCard
          title="Conversion Rate"
          value={analytics?.conversionRate}
          suffix="%"
          icon={TrendingUp}
          isLoading={isLoading}
          valueClassName="text-green-600"
        />
        <MetricCard
          title="Avg Response Time"
          value={analytics?.avgResponseTimeHours}
          suffix=" hrs"
          icon={Clock}
          isLoading={isLoading}
        />
        <MetricCard
          title="SLA Breach Rate"
          value={analytics?.slaBreachRate}
          suffix="%"
          icon={AlertTriangle}
          isLoading={isLoading}
          valueClassName={analytics?.slaBreachRate && analytics.slaBreachRate > 5 ? "text-destructive" : "text-green-600"}
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Language Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Leads by Language
            </CardTitle>
            <CardDescription>Distribution of leads across languages</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : analytics?.leadsByLanguage && analytics.leadsByLanguage.length > 0 ? (
              <ChartContainer config={languageChartConfig} className="h-[300px] w-full">
                <PieChart>
                  <Pie
                    data={analytics.leadsByLanguage}
                    dataKey="count"
                    nameKey="language"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ language, percent }) => 
                      `${LANGUAGE_LABELS[language] || language} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {analytics.leadsByLanguage.map((entry) => (
                      <Cell key={entry.language} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent />} 
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Lead Source Breakdown
            </CardTitle>
            <CardDescription>Where your leads are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : analytics?.leadsBySource && analytics.leadsBySource.length > 0 ? (
              <ChartContainer config={sourceChartConfig} className="h-[300px] w-full">
                <BarChart data={analytics.leadsBySource} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="source" 
                    type="category" 
                    width={120} 
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(221, 83%, 53%)" 
                    radius={[0, 4, 4, 0]} 
                    name="Leads"
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Agent Performance
          </CardTitle>
          <CardDescription>Leads claimed, closed, and SLA metrics by agent</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : analytics?.agentPerformance && analytics.agentPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-center">Leads Claimed</TableHead>
                    <TableHead className="text-center">Closed Won</TableHead>
                    <TableHead className="text-center">SLA Breaches</TableHead>
                    <TableHead className="text-center">Response Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.agentPerformance.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="text-center">{agent.leadsClaimed}</TableCell>
                      <TableCell className="text-center">
                        {agent.closedWon}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({agent.leadsClaimed > 0
                            ? ((agent.closedWon / agent.leadsClaimed) * 100).toFixed(0)
                            : 0}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={agent.slaBreaches > 0 ? "destructive" : "secondary"}>
                          {agent.slaBreaches}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={agent.responseRate >= 80 ? "text-green-600 font-medium" : "text-orange-500"}>
                          {agent.responseRate.toFixed(0)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No agent performance data available for this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | undefined;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading: boolean;
  valueClassName?: string;
}

function MetricCard({ title, value, suffix = "", icon: Icon, isLoading, valueClassName }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className={`text-2xl font-bold ${valueClassName || ""}`}>
            {value !== undefined ? `${value.toFixed(value % 1 === 0 ? 0 : 1)}${suffix}` : "—"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
