import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Floating particles component for background ambiance
const FloatingParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
    duration: `${15 + Math.random() * 10}s`,
    size: `${2 + Math.random() * 2}px`,
    opacity: 0.1 + Math.random() * 0.2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-prime-gold animate-float"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
};

export default function CrmLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || null;
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkExistingSession = async () => {
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
            if (from && role !== "admin") {
              navigate(from, { replace: true });
            } else if (role === "admin") {
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

      const { data: agent, error: agentError } = await supabase
        .from("crm_agents")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (agentError || !agent) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "You are not authorized to access the CRM.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!agent.is_active) {
        await supabase.auth.signOut();
        toast({
          title: "Account Inactive",
          description: "Your account has been deactivated. Contact an administrator.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({ title: "Welcome back!", description: "Login successful" });

      const role = (agent as unknown as { role: string }).role;
      if (from && role !== "admin") {
        navigate(from, { replace: true });
      } else if (role === "admin") {
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
      <div className="min-h-screen flex items-center justify-center bg-prime-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-prime-gold" />
          <p className="text-white/60 font-nav">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-prime-950 via-prime-900 to-prime-950" />
      
      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-prime-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-prime-gold/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-prime-gold/3 rounded-full blur-3xl" />
      
      {/* Floating particles */}
      <FloatingParticles />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(197, 160, 89, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(197, 160, 89, 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        {/* Glass panel */}
        <div className="backdrop-blur-xl bg-prime-900/40 border border-prime-gold/20 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* Gold accent line at top */}
          <div className="h-1 bg-gradient-to-r from-transparent via-prime-gold to-transparent" />
          
          <div className="p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              {/* Logo */}
              <div className="mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <img 
                  src="https://storage.googleapis.com/msgsndr/9m2UBN29nuaCWceOgW2Z/media/6926151522d3b65c0becbaf4.png"
                  alt="Del Sol Prime Homes"
                  className="h-16 md:h-20 w-auto mx-auto object-contain"
                />
              </div>
              
              {/* Title */}
              <h1 
                className="font-serif text-2xl md:text-3xl text-white mb-2 animate-fade-in"
                style={{ animationDelay: '200ms' }}
              >
                Welcome Back
              </h1>
              
              {/* Subtitle with gold gradient */}
              <p 
                className="text-transparent bg-clip-text bg-gradient-to-r from-prime-goldLight via-prime-gold to-prime-goldLight font-nav text-sm tracking-wide animate-fade-in"
                style={{ animationDelay: '300ms' }}
              >
                Agent Portal
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div 
                className="space-y-2 animate-fade-in"
                style={{ animationDelay: '350ms' }}
              >
                <Label htmlFor="email" className="text-white/80 font-nav text-sm">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@delsolprimehomes.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-prime-800/50 border-prime-gold/20 text-white placeholder:text-white/40 focus:border-prime-gold/50 focus:ring-prime-gold/20 h-12 font-nav"
                />
              </div>

              {/* Password Field */}
              <div 
                className="space-y-2 animate-fade-in"
                style={{ animationDelay: '400ms' }}
              >
                <Label htmlFor="password" className="text-white/80 font-nav text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="bg-prime-800/50 border-prime-gold/20 text-white placeholder:text-white/40 focus:border-prime-gold/50 focus:ring-prime-gold/20 h-12 pr-12 font-nav"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div 
                className="flex items-center justify-between animate-fade-in"
                style={{ animationDelay: '450ms' }}
              >
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-prime-gold/30 data-[state=checked]:bg-prime-gold data-[state=checked]:border-prime-gold"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-white/60 cursor-pointer font-nav"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-prime-gold hover:text-prime-goldLight transition-colors font-nav"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <div 
                className="pt-2 animate-fade-in"
                style={{ animationDelay: '500ms' }}
              >
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-prime-gold hover:bg-prime-goldLight text-prime-950 font-semibold font-nav text-base transition-all duration-300 shadow-lg shadow-prime-gold/20 hover:shadow-xl hover:shadow-prime-gold/30 group"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Footer */}
            <div 
              className="mt-8 text-center animate-fade-in"
              style={{ animationDelay: '550ms' }}
            >
              <p className="text-white/40 text-sm font-nav">
                Need access?{' '}
                <span className="text-prime-gold/80">
                  Contact your administrator
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Decorative bottom text */}
        <p 
          className="text-center mt-6 text-white/30 text-xs font-nav tracking-wider animate-fade-in"
          style={{ animationDelay: '600ms' }}
        >
          COSTA DEL SOL LUXURY REAL ESTATE
        </p>
      </div>
    </div>
  );
}
