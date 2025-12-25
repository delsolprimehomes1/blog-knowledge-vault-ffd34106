import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileText, Users, Settings, Menu, Bot, Download, CheckCircle, Sparkles, Image, Activity, Languages, Link2, MapPin, HelpCircle, Scale, Map, Globe2, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Articles", href: "/admin/articles", icon: FileText },
  { name: "Authors", href: "/admin/authors", icon: Users },
  { name: "AI Tools", href: "/admin/ai-tools", icon: Bot },
  { name: "Cluster Generator", href: "/admin/cluster-generator", icon: Sparkles },
  { name: "Q&A Generator", href: "/admin/qa-generator", icon: HelpCircle },
  { name: "Comparison Generator", href: "/admin/comparison-generator", icon: Scale },
  { name: "Location Generator", href: "/admin/location-generator", icon: Map },
  { name: "Location Pages", href: "/admin/location-pages", icon: MapPin },
  { name: "Bulk Article Linker", href: "/admin/tools/bulk-article-linker", icon: Link2 },
  { name: "Batch Image Generation", href: "/admin/tools/batch-image-generation", icon: Image },
  { name: "Speakable Fixes", href: "/admin/tools/bulk-speakable-regeneration", icon: Languages },
  { name: "Citation Health", href: "/admin/citation-health", icon: Activity },
  { name: "SEO Monitor", href: "/admin/seo-monitor", icon: Globe2 },
  { name: "Brochures", href: "/admin/brochures", icon: Map },
  { name: "System Check", href: "/admin/system-check", icon: CheckCircle },
  { name: "System Health", href: "/admin/system-health", icon: HeartPulse },
  { name: "Export", href: "/admin/export", icon: Download },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const NavLinks = () => (
    <>
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          end={item.href === "/admin"}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
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
        <div className="flex h-16 items-center border-b px-6 justify-center">
          <img src={logo} alt="Del Sol Prime Homes" className="h-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavLinks />
        </nav>
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center px-6 border-b justify-center">
                <img src={logo} alt="Del Sol Prime Homes" className="h-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
              </div>
              <nav className="flex-1 space-y-1 p-4">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
          <img src={logo} alt="Del Sol Prime Homes" className="h-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
