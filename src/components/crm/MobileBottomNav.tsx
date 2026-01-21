import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Users, Calendar, User } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/crm/agent/dashboard",
    icon: Home,
  },
  {
    label: "My Leads",
    href: "/crm/agent/leads",
    icon: Users,
  },
  {
    label: "Calendar",
    href: "/crm/agent/calendar",
    icon: Calendar,
  },
  {
    label: "Profile",
    href: "/crm/agent/profile",
    icon: User,
  },
];

interface MobileBottomNavProps {
  pendingRemindersCount?: number;
  newLeadsCount?: number;
}

export function MobileBottomNav({
  pendingRemindersCount = 0,
  newLeadsCount = 0,
}: MobileBottomNavProps) {
  const location = useLocation();

  // Check if current path matches or starts with the nav item href
  const isActive = (href: string) => {
    if (href === "/crm/agent/dashboard") {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  // Get badge count for specific nav items
  const getBadge = (href: string): number | undefined => {
    if (href === "/crm/agent/leads" && newLeadsCount > 0) {
      return newLeadsCount;
    }
    if (href === "/crm/agent/calendar" && pendingRemindersCount > 0) {
      return pendingRemindersCount;
    }
    return undefined;
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-md border-t",
        "md:hidden", // Only show on mobile
        "pb-[env(safe-area-inset-bottom)]" // iOS safe area
      )}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const badge = getBadge(item.href);
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center",
                "w-full h-full",
                "transition-colors duration-200",
                "relative",
                "touch-manipulation", // Optimize for touch
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
              )}

              {/* Icon with optional badge */}
              <div className="relative">
                <Icon
                  className={cn(
                    "w-6 h-6 transition-transform",
                    active && "scale-110"
                  )}
                />
                {badge !== undefined && badge > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-2",
                      "min-w-[18px] h-[18px]",
                      "flex items-center justify-center",
                      "bg-destructive text-destructive-foreground",
                      "text-[10px] font-bold rounded-full",
                      "px-1"
                    )}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
