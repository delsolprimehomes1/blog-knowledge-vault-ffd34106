import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogOut, Mail, Phone, Globe, Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { ConnectGmail } from "@/components/crm/ConnectGmail";

const languageFlags: Record<string, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  fr: "🇫🇷",
  nl: "🇳🇱",
  sv: "🇸🇪",
  no: "🇳🇴",
  da: "🇩🇰",
  fi: "🇫🇮",
  pl: "🇵🇱",
  hu: "🇭🇺",
};

const languageNames: Record<string, string> = {
  en: "English",
  es: "Spanish",
  de: "German",
  fr: "French",
  nl: "Dutch",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  pl: "Polish",
  hu: "Hungarian",
};

export default function AgentProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get session
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Get agent profile
  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ["agent-profile-full", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from("crm_agents")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // Get lead statistics
  const { data: stats } = useQuery({
    queryKey: ["agent-stats", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("lead_status, archived")
        .eq("assigned_agent_id", session.user.id);

      if (!leads) return { total: 0, new: 0, contacted: 0, qualified: 0, won: 0 };

      const activeLeads = leads.filter(l => !l.archived);
      return {
        total: activeLeads.length,
        new: activeLeads.filter(l => l.lead_status === "new").length,
        contacted: activeLeads.filter(l => l.lead_status === "contacted").length,
        qualified: activeLeads.filter(l => l.lead_status === "qualified").length,
        won: activeLeads.filter(l => l.lead_status === "closed_won").length,
      };
    },
    enabled: !!session?.user?.id,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/crm/login");
  };

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Profile not found</p>
        <Button onClick={() => navigate("/crm/agent/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const initials = `${agent.first_name?.[0] || ""}${agent.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">View your account information</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left space-y-1">
              <h2 className="text-xl font-semibold">
                {agent.first_name} {agent.last_name}
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                {agent.email && (
                  <span className="flex items-center justify-center sm:justify-start gap-1">
                    <Mail className="w-4 h-4" />
                    {agent.email}
                  </span>
                )}
                {agent.phone && (
                  <span className="flex items-center justify-center sm:justify-start gap-1">
                    <Phone className="w-4 h-4" />
                    {agent.phone}
                  </span>
                )}
              </div>

              <Badge variant={agent.is_active ? "default" : "secondary"} className="mt-2">
                {agent.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Integration Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Integration
          </CardTitle>
          <CardDescription>
            Connect your @delsolprimehomes.com Gmail to sync emails with leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectGmail
            agentId={agent.id}
            agentEmail={agent.email}
            isConnected={!!agent.gmail_access_token}
            onConnected={() => queryClient.invalidateQueries({ queryKey: ["agent-profile-full"] })}
          />
        </CardContent>
      </Card>

      {/* Languages Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Languages
          </CardTitle>
          <CardDescription>Languages you handle for lead assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {agent.languages && agent.languages.length > 0 ? (
              agent.languages.map((lang: string) => (
                <Badge key={lang} variant="outline" className="text-sm py-1 px-3">
                  <span className="mr-1">{languageFlags[lang] || "🌐"}</span>
                  {languageNames[lang] || lang.toUpperCase()}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No languages assigned</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            My Performance
          </CardTitle>
          <CardDescription>Your current lead statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
            
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats?.new || 0}</p>
              <p className="text-xs text-muted-foreground">New</p>
            </div>
            
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                <Phone className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats?.contacted || 0}</p>
              <p className="text-xs text-muted-foreground">Contacted</p>
            </div>
            
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <CheckCircle className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats?.won || 0}</p>
              <p className="text-xs text-muted-foreground">Closed Won</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Logout */}
      <Button 
        variant="outline" 
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Log Out
      </Button>
    </div>
  );
}
