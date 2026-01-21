import { useParams, useNavigate } from "react-router-dom";
import { useCrmAgent } from "@/hooks/useCrmAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getLanguageFlag, getLanguageName } from "@/lib/crm-validations";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Phone,
  Clock,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function AgentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agent, isLoading } = useCrmAgent(id || "");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Agent not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Agent Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-primary">
                  {agent.first_name[0]}
                  {agent.last_name[0]}
                </span>
              </div>
              <h2 className="text-xl font-semibold">
                {agent.first_name} {agent.last_name}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant={agent.role === "admin" ? "default" : "secondary"}>
                  {agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}
                </Badge>
                <Badge variant={agent.is_active ? "default" : "destructive"}>
                  {agent.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{agent.email}</span>
              </div>
              {agent.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{agent.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{agent.timezone}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Languages</p>
              <div className="flex flex-wrap gap-2">
                {agent.languages.map((lang) => (
                  <Badge key={lang} variant="outline" className="gap-1">
                    <span>{getLanguageFlag(lang)}</span>
                    <span>{getLanguageName(lang)}</span>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Notifications</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {agent.email_notifications ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Email notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  {agent.slack_channel_id ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Slack notifications</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Leads</p>
                    <p className="text-2xl font-bold">
                      {agent.current_lead_count}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Max Capacity</p>
                    <p className="text-2xl font-bold">{agent.max_active_leads}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Accepting Leads</p>
                  <p className="text-lg font-semibold">
                    {agent.accepts_new_leads ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-destructive">No</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="text-sm font-medium">
                    {agent.last_login
                      ? formatDistanceToNow(new Date(agent.last_login), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="text-sm font-medium">
                    {format(new Date(agent.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table Placeholder */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Assigned Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm text-center py-8">
              Lead list will be displayed here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
