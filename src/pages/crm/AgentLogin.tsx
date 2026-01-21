import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Eye, EyeOff, Check, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [emailValid, setEmailValid] = useState(false);

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session check error:", error);
          setCheckingSession(false);
          return;
        }
        
        if (session) {
          const { data: agent } = await supabase
            .from("crm_agents")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (agent?.is_active) {
            const role = (agent as unknown as { role: string }).role;
            if (role === "admin") {
              navigate("/crm/admin/dashboard", { replace: true });
            } else {
              navigate("/crm/agent/dashboard", { replace: true });
            }
            return;
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [navigate]);

  // Email validation
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(emailRegex.test(email));
  }, [email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: agent, error: agentError } = await supabase
        .from("crm_agents")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (agentError || !agent) {
        await supabase.auth.signOut();
        throw new Error("You are not authorized to access the CRM.");
      }

      if (!agent.is_active) {
        await supabase.auth.signOut();
        throw new Error("Your account has been deactivated.");
      }

      toast({ title: "Welcome back!" });
      
      const role = (agent as unknown as { role: string }).role;
      if (role === "admin") {
        navigate("/crm/admin/dashboard", { replace: true });
      } else {
        navigate("/crm/agent/dashboard", { replace: true });
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-700 to-purple-900 animate-gradient-x" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Login card */}
      <Card className="relative z-10 w-full max-w-md mx-4 backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl animate-scale-in">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white">Del Sol Prime Homes</h1>
          <p className="text-blue-200">Agent Portal</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email input with floating label effect */}
            <div className="relative">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-primary focus:ring-2 focus:ring-primary/50"
                placeholder="Email Address"
                required
              />
              {emailValid && email && (
                <Check className="absolute right-4 top-3.5 w-5 h-5 text-green-400 animate-scale-in" />
              )}
            </div>

            {/* Password input */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-primary focus:ring-2 focus:ring-primary/50"
                placeholder="Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-white/50 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                  className="data-[state=checked]:bg-primary"
                />
                <label className="text-sm text-blue-200">Remember me</label>
              </div>
              <button type="button" className="text-sm text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </button>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
                "text-white font-semibold rounded-lg shadow-lg hover:shadow-xl",
                "transition-all duration-300 transform hover:scale-[1.02]"
              )}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </div>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-blue-200/60">
            Contact your administrator if you need access
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
