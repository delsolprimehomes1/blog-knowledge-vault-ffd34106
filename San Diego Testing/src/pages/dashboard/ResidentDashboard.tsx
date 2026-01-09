import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Activity, MessageSquare, AlertCircle } from "lucide-react"

export default function ResidentDashboard() {
    const { user } = useAuth()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}</h2>
                    <p className="text-muted-foreground">Here is your daily health overview.</p>
                </div>
                <Button size="lg" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Get Immediate Help
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Next Appointment</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Today, 2:00 PM</div>
                        <p className="text-xs text-muted-foreground">Dr. Smith (Telehealth)</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Test Results</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1 Pending</div>
                        <p className="text-xs text-muted-foreground">Respiratory Viral Panel</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Messages</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0 New</div>
                        <p className="text-xs text-muted-foreground">Last message sent yesterday</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vitals</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Stable</div>
                        <p className="text-xs text-muted-foreground">Last checked 4 hours ago</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
