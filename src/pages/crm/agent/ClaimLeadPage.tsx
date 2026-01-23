import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Zap,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Home,
  Calendar,
  Target,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useClaimLead } from "@/hooks/useClaimableLeads";
import { 
  getLanguageFlag, 
  SEGMENT_COLORS, 
  TIMEFRAME_STYLES 
} from "@/lib/crm-conditional-styles";

function CountdownTimer({ 
  expiresAt, 
  onExpire 
}: { 
  expiresAt: string | null; 
  onExpire?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("15:00");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("EXPIRED");
        setIsExpired(true);
        onExpire?.();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      setIsUrgent(minutes < 5);

      if (minutes < 5 && !document.title.includes("🔥")) {
        document.title = "🔥 CLAIM NOW! - Del Sol CRM";
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => {
      clearInterval(interval);
      document.title = "Del Sol CRM";
    };
  }, [expiresAt, onExpire]);

  return (
    <div
      className={cn(
        "text-5xl font-mono font-bold",
        isExpired
          ? "text-destructive"
          : isUrgent
          ? "text-destructive animate-pulse"
          : "text-primary"
      )}
    >
      {timeLeft}
    </div>
  );
}

export default function ClaimLeadPage() {
  const { id: leadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claimResult, setClaimResult] = useState<"success" | "failed" | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const claimMutation = useClaimLead();

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: lead, isLoading, error, refetch } = useQuery({
    queryKey: ["claim-lead", leadId],
    queryFn: async () => {
      if (!leadId) throw new Error("No lead ID");

      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("id", leadId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
    refetchInterval: 5000, // Poll for updates
  });

  // Subscribe to lead updates
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "crm_leads",
          filter: `id=eq.${leadId}`,
        },
        (payload) => {
          if (payload.new.lead_claimed && payload.new.assigned_agent_id !== session?.user?.id) {
            setClaimResult("failed");
            toast.error("This lead was just claimed by another agent");
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [leadId, session?.user?.id]);

  const handleClaim = async () => {
    if (!lead || !session?.user?.id) return;

    try {
      await claimMutation.mutateAsync({
        leadId: lead.id,
        agentId: session.user.id,
      });

      setClaimResult("success");
      setCelebrating(true);

      // Redirect to dashboard after showing success message
      setTimeout(() => {
        navigate("/crm/agent/dashboard");
      }, 3000);
    } catch (error) {
      setClaimResult("failed");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-semibold">Lead Not Found</h2>
        <Button onClick={() => navigate("/crm/agent/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (lead.lead_claimed && lead.assigned_agent_id !== session?.user?.id && claimResult !== "success") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-6">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-full p-6">
          <XCircle className="w-16 h-16 text-amber-600" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Lead Already Claimed</h2>
          <p className="text-muted-foreground max-w-md">
            Another agent claimed this lead first. Don't worry — new leads are assigned regularly. 
            Check your dashboard for other opportunities.
          </p>
        </div>
        <Button 
          size="lg"
          onClick={() => navigate("/crm/agent/dashboard")}
          className="mt-4"
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // Determine if this is an escalated lead
  const isEscalated = (lead?.current_round || 1) > 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with Countdown */}
      <Card className={cn(
        "overflow-hidden",
        claimResult === "success" && "border-green-500 bg-green-50",
        claimResult === "failed" && "border-destructive bg-destructive/5",
        isEscalated && !claimResult && "border-orange-400"
      )}>
        <CardContent className="p-6">
          {/* Round Indicator */}
          {isEscalated && !claimResult && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  Round {lead.current_round} - Escalated Lead
                </p>
                <p className="text-sm text-orange-600">
                  This lead was not claimed in previous round(s). Claim now before it escalates again!
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/crm/agent/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Claim Lead</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn(
                    isEscalated ? "bg-orange-100 text-orange-700 border-orange-300" : ""
                  )}>
                    Round {lead?.current_round || 1}
                  </Badge>
                  {lead?.current_round === 1 && (
                    <span className="text-sm text-muted-foreground">First opportunity</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
                <CountdownTimer 
                  expiresAt={lead.claim_window_expires_at}
                  onExpire={() => !claimResult && setClaimResult("failed")}
                />
              </div>

              <AnimatePresence mode="wait">
                {claimResult === "success" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center gap-2 text-green-600"
                  >
                    <CheckCircle2 className="w-10 h-10" />
                    <span className="font-bold text-xl">Lead Claimed!</span>
                    <span className="text-sm text-muted-foreground">Redirecting to dashboard...</span>
                  </motion.div>
                ) : claimResult === "failed" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2 text-destructive"
                  >
                    <XCircle className="w-8 h-8" />
                    <span className="font-bold text-xl">Unavailable</span>
                  </motion.div>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleClaim}
                    disabled={claimMutation.isPending}
                    className={cn(
                      "shadow-lg hover:shadow-xl transition-all transform hover:scale-105",
                      isEscalated 
                        ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    )}
                  >
                    {claimMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Claim This Lead
                      </>
                    )}
                  </Button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Contact Information
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getLanguageFlag(lead.language)}</span>
              <Badge variant="outline">{lead.language?.toUpperCase()}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium text-lg">
                  {lead.first_name} {lead.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lead Segment</p>
                <Badge
                  className={cn(
                    SEGMENT_COLORS[lead.lead_segment?.toLowerCase() as keyof typeof SEGMENT_COLORS] ||
                      SEGMENT_COLORS.cold
                  )}
                >
                  {lead.lead_segment}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${lead.phone_number}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {lead.phone_number}
                  </a>
                </div>
              </div>

              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Property Criteria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Property Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Budget Range
                </dt>
                <dd className="font-medium">{lead.budget_range || "Not specified"}</dd>
              </div>

              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Timeframe
                </dt>
                <dd>
                  <Badge
                    variant="outline"
                    className={cn(
                      TIMEFRAME_STYLES[lead.timeframe as keyof typeof TIMEFRAME_STYLES]
                    )}
                  >
                    {lead.timeframe?.replace(/_/g, " ") || "Not specified"}
                  </Badge>
                </dd>
              </div>

              <div className="flex justify-between items-start">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Locations
                </dt>
                <dd className="flex flex-wrap gap-1 justify-end">
                  {lead.location_preference?.map((loc: string) => (
                    <Badge key={loc} variant="secondary">
                      {loc}
                    </Badge>
                  )) || <span className="text-muted-foreground">Not specified</span>}
                </dd>
              </div>

              <div className="flex justify-between items-start">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Property Types
                </dt>
                <dd className="flex flex-wrap gap-1 justify-end">
                  {lead.property_type?.map((type: string) => (
                    <Badge key={type} variant="outline">
                      {type}
                    </Badge>
                  )) || <span className="text-muted-foreground">Not specified</span>}
                </dd>
              </div>

              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Bedrooms</dt>
                <dd className="font-medium">{lead.bedrooms_desired || "Not specified"}</dd>
              </div>

              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Sea View Importance</dt>
                <dd className="font-medium">{lead.sea_view_importance || "Not specified"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Lead Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Lead Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={352}
                    strokeDashoffset={352 - (352 * (lead.current_lead_score || 0)) / 100}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{lead.current_lead_score || 0}</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Badge
                className={cn(
                  "text-sm",
                  lead.lead_priority === "urgent" && "bg-red-500",
                  lead.lead_priority === "high" && "bg-orange-500",
                  lead.lead_priority === "medium" && "bg-yellow-500",
                  lead.lead_priority === "low" && "bg-gray-500"
                )}
              >
                {lead.lead_priority?.toUpperCase()} PRIORITY
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Source Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Lead Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="font-medium">{lead.lead_source || "Website"}</p>
            </div>
            {lead.page_url && (
              <div>
                <p className="text-sm text-muted-foreground">Page URL</p>
                <a
                  href={lead.page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  {lead.page_url.slice(0, 50)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {lead.questions_answered > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Emma Questions Answered</p>
                <Badge variant="secondary">{lead.questions_answered} questions</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emma Q&A (if available) */}
      {lead.qa_pairs && Array.isArray(lead.qa_pairs) && lead.qa_pairs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Emma Conversation
              <Badge variant="outline">{lead.qa_pairs.length} Q&A</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lead.qa_pairs.map((qa: { question: string; answer: string }, index: number) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Question {index + 1}:</p>
                  <p className="font-medium mb-2">{qa.question}</p>
                  <p className="text-sm text-muted-foreground mb-1">Answer:</p>
                  <p>{qa.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
