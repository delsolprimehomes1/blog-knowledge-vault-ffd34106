import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Calendar,
  User,
  LogOut,
  Search,
  Command,
  Zap,
  Phone,
  FileText,
  Clock,
  Building2,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { ClaimNotificationBanner } from "./ClaimNotificationBanner";
import { CrmCommandPalette } from "./CrmCommandPalette";
import { MobileBottomNav } from "./MobileBottomNav";
import { useClaimableLeads } from "@/hooks/useClaimableLeads";
import { useIsMobile } from "@/hooks/useMediaQuery";

const navItems = [
  { label: "Dashboard", href: "/crm/agent/dashboard", icon: LayoutDashboard },
  { label: "My Leads", href: "/crm/agent/leads", icon: Users },
  { label: "Calendar", href: "/crm/agent/calendar", icon: Calendar },
];

export function CrmAgentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: agent } = useQuery({
    queryKey: ["crm-agent-profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from("crm_agents")
        .select("*")
        .eq("id", session.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // Get pending reminders count for bottom nav badge
  const { data: pendingRemindersCount = 0 } = useQuery({
    queryKey: ["pending-reminders-count", agent?.id],
    queryFn: async () => {
      if (!agent?.id) return 0;
      const { count } = await supabase
        .from("crm_reminders")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agent.id)
        .eq("is_completed", false)
        .lte("reminder_datetime", new Date().toISOString());
      return count || 0;
    },
    enabled: !!agent?.id,
  });

  // Get new leads count for bottom nav badge
  const { data: newLeadsCount = 0 } = useQuery({
    queryKey: ["new-leads-count", agent?.id],
    queryFn: async (): Promise<number> => {
      if (!agent?.id) return 0;
      const { count } = await (supabase
        .from("crm_leads") as any)
        .select("id", { count: "exact", head: true })
        .eq("assigned_agent_id", agent.id)
        .eq("lead_status", "new")
        .eq("archived", false);
      return count || 0;
    },
    enabled: !!agent?.id,
  });

  const { claimableLeads, dismissLead } = useClaimableLeads(
    agent?.id || null,
    agent?.languages || []
  );

  // Keyboard shortcut for command palette (desktop only)
  useEffect(() => {
    if (isMobile) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile]);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/crm/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Claim Notification Banner */}
      <ClaimNotificationBanner
        leads={claimableLeads}
        agentId={agent?.id || ""}
        onDismiss={dismissLead}
      />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-14 md:h-16 items-center justify-between">
            {/* Left: Logo & Nav */}
            <div className="flex items-center gap-4 md:gap-6">
              <Link to="/crm/agent/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-serif font-bold hidden sm:inline">Del Sol CRM</span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link key={item.href} to={item.href}>
                    <Button
                      variant={location.pathname === item.href ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
                
                {/* Admin Dashboard Button - Only for admins */}
                {agent?.role === "admin" && (
                  <Link to="/crm/admin/dashboard">
                    <Button variant="outline" size="sm" className="gap-2 ml-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950">
                      <Shield className="w-4 h-4" />
                      Admin Dashboard
                    </Button>
                  </Link>
                )}
              </nav>
            </div>

            {/* Center: Search (Desktop only) */}
            <div className="hidden lg:flex flex-1 max-w-md mx-4">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setCommandOpen(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                Search leads, actions...
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Mobile Search Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-10 w-10"
                onClick={() => setCommandOpen(true)}
              >
                <Search className="w-5 h-5" />
              </Button>

              {/* Quick Actions - Desktop */}
              <div className="hidden md:flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Zap className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Phone className="w-4 h-4 mr-2" />
                      Log Call
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="w-4 h-4 mr-2" />
                      Add Note
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Clock className="w-4 h-4 mr-2" />
                      Set Reminder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Notifications */}
              <NotificationBell agentId={agent?.id || null} />

              {/* Profile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {agent?.first_name?.[0]}
                        {agent?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">
                        {agent?.first_name} {agent?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agent?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {agent?.role === "admin" && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/crm/admin/dashboard")}>
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/crm/agent/profile")}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCommandOpen(true)}>
                    <Command className="w-4 h-4 mr-2" />
                    Keyboard shortcuts
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Toggle - Only show on tablet, hidden on mobile (using bottom nav) */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex md:hidden h-10 w-10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Tablet Nav (slide down menu) */}
        {mobileMenuOpen && (
          <nav className="hidden sm:block md:hidden border-t p-4 space-y-2 bg-background">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 h-12"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Button>
              </Link>
            ))}
            
            {/* Admin Dashboard Button - Only for admins */}
            {agent?.role === "admin" && (
              <Link to="/crm/admin/dashboard">
                <Button variant="outline" className="w-full justify-start gap-2 h-12 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950">
                  <Shield className="w-5 h-5" />
                  Admin Dashboard
                </Button>
              </Link>
            )}
          </nav>
        )}
      </header>

      {/* Main Content - Add bottom padding on mobile for bottom nav */}
      <main className={cn(
        "container mx-auto px-4 py-4 md:py-6",
        isMobile && "pb-24" // Extra padding for bottom nav
      )}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        pendingRemindersCount={pendingRemindersCount}
        newLeadsCount={newLeadsCount}
      />

      {/* Command Palette */}
      <CrmCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
