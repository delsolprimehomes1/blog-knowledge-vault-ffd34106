import { Users, Video, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/molecules/Card';

export function ProviderHome() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Provider Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg">Waiting Queue</CardTitle>
                        <CardDescription>3 Patients waiting</CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">3</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center mb-2">
                            <Video className="h-5 w-5 text-green-600" />
                        </div>
                        <CardTitle className="text-lg">Active Visits</CardTitle>
                        <CardDescription>Currently in session</CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">1</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mb-2">
                            <Calendar className="h-5 w-5 text-purple-600" />
                        </div>
                        <CardTitle className="text-lg">Appointments</CardTitle>
                        <CardDescription>Scheduled for today</CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">12</CardContent>
                </Card>
            </div>
        </div>
    );
}
