import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function GmailCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const error = params.get("error");

        // Handle OAuth errors (e.g., user denied access)
        if (error) {
          throw new Error(
            error === "access_denied"
              ? "Access was denied. Please try again and grant access."
              : `OAuth error: ${error}`
          );
        }

        if (!code || !state) {
          throw new Error("Missing authorization code or state");
        }

        const redirectUri = `${window.location.origin}/auth/gmail/callback`;

        // Exchange code for tokens via edge function
        const { data, error: invokeError } = await supabase.functions.invoke(
          "gmail-auth-callback",
          {
            body: { code, state, redirectUri },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message || "Failed to process callback");
        }

        if (!data?.success) {
          throw new Error(data?.error || "Unknown error occurred");
        }

        setStatus("success");

        // Redirect back to agent profile after 2 seconds
        setTimeout(() => {
          navigate("/crm/agent/profile");
        }, 2000);
      } catch (error) {
        console.error("OAuth callback error:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "An unexpected error occurred"
        );
        setStatus("error");

        // Redirect back after 4 seconds on error
        setTimeout(() => {
          navigate("/crm/agent/profile");
        }, 4000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        {status === "processing" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">
              Connecting your Gmail...
            </h1>
            <p className="text-muted-foreground">
              Please wait while we complete the setup.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2 text-green-600 dark:text-green-400">
              Gmail Connected!
            </h1>
            <p className="text-muted-foreground">
              Redirecting you back to your profile...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">
              Connection Failed
            </h1>
            <p className="text-muted-foreground mb-2">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">
              Redirecting you back to try again...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
