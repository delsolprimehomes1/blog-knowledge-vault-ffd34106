import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import type { UserRole } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Stethoscope, User, ShieldCheck } from "lucide-react"

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleLogin = (role: UserRole) => {
        login(role)
        navigate("/dashboard")
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
            <Card className="w-full max-w-md shadow-lg border-2">
                <CardHeader className="text-center pb-8">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                            <Stethoscope className="h-6 w-6 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Welcome to MedConnect</CardTitle>
                    <p className="text-muted-foreground mt-2">Select your portal to continue</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        className="w-full h-20 text-lg justify-start gap-4 hover:border-primary border-2 transition-all"
                        variant="outline"
                        onClick={() => handleLogin("resident")}
                    >
                        <div className="bg-primary/10 p-3 rounded-full">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="font-bold">Resident Portal</span>
                            <span className="text-xs text-muted-foreground font-normal">Access your care plan</span>
                        </div>
                    </Button>

                    <Button
                        className="w-full h-20 text-lg justify-start gap-4 hover:border-primary border-2 transition-all"
                        variant="outline"
                        onClick={() => handleLogin("provider")}
                    >
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Stethoscope className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="font-bold">Provider Access</span>
                            <span className="text-xs text-muted-foreground font-normal">Manage consultations</span>
                        </div>
                    </Button>

                    <Button
                        className="w-full h-20 text-lg justify-start gap-4 hover:border-primary border-2 transition-all"
                        variant="outline"
                        onClick={() => handleLogin("admin")}
                    >
                        <div className="bg-primary/10 p-3 rounded-full">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="font-bold">Administrator</span>
                            <span className="text-xs text-muted-foreground font-normal">Facility management</span>
                        </div>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
