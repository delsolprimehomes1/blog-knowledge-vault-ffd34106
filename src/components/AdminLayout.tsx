import { ReactNode, useState } from "react";
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
  Link2Off,
  Webhook,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

const navGroups = [
  {
    label: "Dashboard",
    items: [
      { name: "Overview", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Leads & CRM",
    items: [
      { name: "Emma Conversations", href: "/admin/emma", icon: MessageCircle },
      { name: "CRM Dashboard", href: "/crm/admin/dashboard", icon: Users },
    ],
  },
  {
    label: "Properties",
    items: [
      { name: "Properties", href: "/admin/properties", icon: Home },
    ],
  },
  {
    label: "Apartments",
    items: [
      { name: "Page Content", href: "/admin/apartments-content", icon: FileText },
      { name: "Properties", href: "/admin/apartments-properties", icon: Building2 },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Cluster Manager", href: "/admin/clusters", icon: FolderKanban },
      { name: "Articles", href: "/admin/articles", icon: FileText },
      { name: "Authors", href: "/admin/authors", icon: Users },
      { name: "Location Pages", href: "/admin/location-pages", icon: MapPin },
      { name: "Brochures", href: "/admin/brochures", icon: Map },
      { name: "Comparison Generator", href: "/admin/comparison-generator", icon: Scale },
    ],
  },
  {
    label: "SEO & Health",
    items: [
      { name: "SEO Monitor", href: "/admin/seo-monitor", icon: Globe2 },
      { name: "SEO Status", href: "/admin/seo-status", icon: Search },
      { name: "Citation Health", href: "/admin/citation-health", icon: Activity },
      { name: "System Health", href: "/admin/system-health", icon: HeartPulse },
      { name: "Image Health", href: "/admin/image-health", icon: Image },
      { name: "Schema Health", href: "/admin/schema-health", icon: Database },
      { name: "Duplicate Detector", href: "/admin/duplicate-detector", icon: Copy },
      { name: "Canonical Backfill", href: "/admin/canonical-backfill", icon: Link2 },
      { name: "404 Resolver", href: "/admin/404-resolver", icon: AlertTriangle },
      { name: "410 Manager", href: "/admin/gone-urls", icon: Ban },
      { name: "Redirect Checker", href: "/admin/redirect-checker", icon: ArrowRightLeft },
      { name: "Broken Links", href: "/admin/broken-links", icon: Link2Off },
      { name: "Link Audit", href: "/admin/link-audit", icon: Link2 },
      { name: "Crawlability Test", href: "/admin/crawlability-test", icon: Search },
      { name: "Production Audit", href: "/admin/production-audit", icon: Shield },
    ],
  },
  {
    label: "Tools",
    items: [
      { name: "Approved Domains", href: "/admin/approved-domains", icon: Shield },
      { name: "AI Tools", href: "/admin/ai-tools", icon: Bot },
      { name: "Bulk Internal Links", href: "/admin/bulk-internal-links", icon: Link2 },
      { name: "Batch Images", href: "/admin/tools/batch-image-generation", icon: Image },
      { name: "AEO Guide", href: "/admin/docs/aeo-sge-guide", icon: BookOpen },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Webhook Testing", href: "/admin/webhook-testing", icon: Webhook },
      { name: "Export", href: "/admin/export", icon: Download },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Dashboard": true,
    "Content": true,
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const NavLinks = () => (
    <div className="space-y-2">
      {navGroups.map((group) => (
        <Collapsible
          key={group.label}
          open={openGroups[group.label]}
          onOpenChange={() => toggleGroup(group.label)}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
            {group.label}
            {openGroups[group.label] ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {group.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-card">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <img src={logo} alt="Del Sol Prime Homes" className="h-14 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
          <ThemeToggle />
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <NavLinks />
        </nav>
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 lg:hidden">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center px-6 border-b justify-center">
                  <img src={logo} alt="Del Sol Prime Homes" className="h-14 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
                </div>
                <nav className="flex-1 p-4 overflow-y-auto">
                  <NavLinks />
                </nav>
              </SheetContent>
            </Sheet>
            <img src={logo} alt="Del Sol Prime Homes" className="h-14 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
          </div>
          <ThemeToggle />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
