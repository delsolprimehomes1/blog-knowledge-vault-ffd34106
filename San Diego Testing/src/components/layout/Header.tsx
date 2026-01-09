import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
    return (
        <header className="h-16 border-b bg-card flex items-center px-4 md:px-6 justify-between lg:justify-end">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
                <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    JD
                </div>
            </div>
        </header>
    )
}
