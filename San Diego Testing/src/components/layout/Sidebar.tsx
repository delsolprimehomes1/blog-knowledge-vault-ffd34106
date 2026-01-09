import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Stethoscope, MessageSquare, ClipboardList, LogOut } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"

const sidebarItems = [
    { icon: LayoutDashboard, label: "Home", href: "/portal" }, // Updated to point to portal
    { icon: ClipboardList, label: "Services", href: "/services" },
    { icon: Stethoscope, label: "My Care", href: "/care" },
    { icon: MessageSquare, label: "Messages", href: "/messages" },
]

export function Sidebar({ className }: { className?: string }) {
    const location = useLocation()
    const { signOut } = useAuth()

    return (
        <div className={cn("flex flex-col h-full border-r bg-card", className)}>
            <div className="p-6">
                <h1 className="text-xl font-bold text-primary tracking-tight">MedConnect</h1>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                {sidebarItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t">
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>
            </div>
        </div>
    )
}
