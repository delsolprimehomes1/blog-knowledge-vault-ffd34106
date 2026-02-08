import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ConnectGmailProps {
  agentId: string;
  agentEmail: string | null;
  isConnected: boolean;
  onConnected?: () => void;
}

export function ConnectGmail({
  agentId,
  agentEmail,
  isConnected,
  onConnected,
}: ConnectGmailProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/gmail/callback`;

      // Get auth URL from edge function
      const { data, error } = await supabase.functions.invoke("gmail-auth-url", {
        body: { agentId, redirectUrl },
      });

      if (error) throw error;

      if (!data?.authUrl) {
        throw new Error("Failed to generate OAuth URL");
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      toast({
        title: "Connection Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not connect to Gmail. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-4 py-3 rounded-lg">
        <CheckCircle2 className="w-5 h-5" />
        <span>Gmail Connected: {agentEmail}</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleConnect}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Mail className="w-4 h-4" />
          Connect Gmail
        </>
      )}
    </Button>
  );
}
