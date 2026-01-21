import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2 } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function CrmLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: agent } = await supabase
          .from("crm_agents")
          .select("*")
          .eq("id", session.user.id)
          .single();

        const agentData = agent as { role: string; is_active: boolean } | null;
        if (agentData?.is_active) {
          if (agentData.role === "admin") {
            navigate("/crm/admin/dashboard", { replace: true });
          } else {
            navigate("/crm/agent/dashboard", { replace: true });
          }
        }
      }
      setCheckingSession(false);
    };

    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = loginSchema.safeParse({ email, password });
      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is a CRM agent
      const { data: agent, error: agentError } = await supabase
        .from("crm_agents")
        .select("*")
        .eq("id", data.user.id)
        .single();

      const agentData = agent as { role: string; is_active: boolean } | null;

      if (agentError || !agentData) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "You are not authorized to access the CRM.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!agentData.is_active) {
        await supabase.auth.signOut();
        toast({
          title: "Account Inactive",
          description: "Your account has been deactivated. Contact an administrator.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({ title: "Login successful" });

      if (agentData.role === "admin") {
        navigate("/crm/admin/dashboard", { replace: true });
      } else {
        navigate("/crm/agent/dashboard", { replace: true });
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-serif">Del Sol Prime Homes</CardTitle>
            <CardDescription className="text-base mt-2">Agent CRM Portal</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@delsolprimehomes.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
