import { useState, useEffect, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton";

interface CrmAdminRouteProps {
  children: ReactNode;
}

export function CrmAdminRoute({ children }: CrmAdminRouteProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdminRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data: agent, error } = await supabase
        .from("crm_agents")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !agent || !agent.is_active) {
        setIsAdmin(false);
      } else {
        setIsAdmin((agent as unknown as { role: string }).role === "admin");
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-screen w-64" />
          <Skeleton className="h-96 flex-1" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/crm/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/crm/login" replace />;
  }

  return <>{children}</>;
}
