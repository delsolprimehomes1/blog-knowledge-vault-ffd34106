import { Users, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/molecules/Card';
import { AdminLiveMonitor } from '../../components/organisms/AdminLiveMonitor';

export function AdminHome() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center mb-2">
                            <Users className="h-5 w-5 text-orange-600" />
                        </div>
                        <CardTitle className="text-lg">Total Residents</CardTitle>
                        <CardDescription>Registered in system</CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">142</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                            <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg">Tests Today</CardTitle>
                        <CardDescription>Processed across all sites</CardDescription>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">28</CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                    <AdminLiveMonitor />
                </div>
                <div>
                    <Card className="h-full min-h-[300px] flex items-center justify-center bg-slate-50 border-dashed">
                        <span className="text-slate-400">System Status Widget</span>
                    </Card>
                </div>
            </div>
        </div>
    );
}
