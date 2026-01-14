import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Menu,
  Bot,
  Download,
  Activity,
  MapPin,
  Scale,
  Map,
  Globe2,
  HeartPulse,
  Database,
  FolderKanban,
  Shield,
  BookOpen,
  Link2,
  Image,
  Home,
  MessageCircle,
  Ban,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

// Streamlined navigation - Cluster Manager is the single source of truth for clusters
const navigation = [
  // Core
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Properties", href: "/admin/properties", icon: Home },
  { name: "Emma Conversations", href: "/admin/emma", icon: MessageCircle },
  { name: "Cluster Manager", href: "/admin/clusters", icon: FolderKanban },
  { name: "Articles", href: "/admin/articles", icon: FileText },
  { name: "Authors", href: "/admin/authors", icon: Users },

  // Content Generators (non-cluster)
  { name: "Comparison Generator", href: "/admin/comparison-generator", icon: Scale },
  { name: "Location Pages", href: "/admin/location-pages", icon: MapPin },
  { name: "Brochures", href: "/admin/brochures", icon: Map },

  // Health & Monitoring
  { name: "SEO Monitor", href: "/admin/seo-monitor", icon: Globe2 },
  { name: "Citation Health", href: "/admin/citation-health", icon: Activity },
  { name: "System Health", href: "/admin/system-health", icon: HeartPulse },
  { name: "Image Health", href: "/admin/image-health", icon: Image },
  { name: "Schema Health", href: "/admin/schema-health", icon: Database },
  { name: "410 Manager", href: "/admin/gone-urls", icon: Ban },
  { name: "Redirect Checker", href: "/admin/redirect-checker", icon: ArrowRightLeft },
  { name: "Production Audit", href: "/admin/production-audit", icon: Shield },

  // Tools
  { name: "Approved Domains", href: "/admin/approved-domains", icon: Shield },
  { name: "AI Tools", href: "/admin/ai-tools", icon: Bot },
  { name: "Bulk Internal Links", href: "/admin/bulk-internal-links", icon: Link2 },
  { name: "Batch Images", href: "/admin/tools/batch-image-generation", icon: Image },
  { name: "AEO Guide", href: "/admin/docs/aeo-sge-guide", icon: BookOpen },

  // Settings
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
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
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
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
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
              <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
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
