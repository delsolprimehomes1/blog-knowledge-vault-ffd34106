import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  Building2,
  Shield,
  Route,
  RefreshCcw,
  BarChart3,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/crm/admin/dashboard", icon: LayoutDashboard },
  { name: "Analytics", href: "/crm/admin/analytics", icon: BarChart3 },
  { name: "Agents", href: "/crm/admin/agents", icon: Users },
  { name: "Leads Overview", href: "/crm/admin/leads", icon: ClipboardList },
  { name: "Routing Rules", href: "/crm/admin/routing-rules", icon: Route },
  { name: "Round Robin", href: "/crm/admin/round-robin", icon: RefreshCcw },
  { name: "Verification", href: "/crm/admin/verification", icon: Shield },
  { name: "Settings", href: "/crm/admin/settings", icon: Settings },
];

export function CrmAdminLayout() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    const fetchAdminInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: agent } = await supabase
          .from("crm_agents")
          .select("first_name, last_name")
          .eq("id", session.user.id)
          .single();

        if (agent) {
          setAdminName(`${agent.first_name} ${agent.last_name}`);
        }
      }
    };
    fetchAdminInfo();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/crm/login");
  };

  const NavLinks = () => (
    <>
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          <span className="font-medium">{item.name}</span>
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-card">
        <div className="flex h-16 items-center border-b px-6 gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <p className="font-serif font-semibold text-sm">Del Sol Prime</p>
            <p className="text-xs text-muted-foreground">Agent CRM</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="border-t p-4 space-y-3">
          <div className="text-sm">
            <p className="text-muted-foreground">Signed in as</p>
            <p className="font-medium truncate">{adminName}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center px-6 border-b gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-serif font-semibold text-sm">Del Sol Prime</p>
                  <p className="text-xs text-muted-foreground">Agent CRM</p>
                </div>
              </div>
              <nav className="flex-1 space-y-1 p-4">
                <NavLinks />
              </nav>
              <div className="border-t p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-serif font-semibold">CRM Admin</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6"><Outlet /></main>
      </div>
    </div>
  );
}
