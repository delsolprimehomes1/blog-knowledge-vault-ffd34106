import { Activity, Clock, User, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/molecules/Card';
import { Badge } from '../../components/atoms/Badge';

const MOCK_ACTIVITIES = [
    { id: 1, type: 'test_request', user: 'Alice Johnson', detail: 'Respiratory Panel', time: '2 mins ago', status: 'pending' },
    { id: 2, type: 'telemed_join', user: 'Bob Smith', detail: 'Waiting Room', time: '5 mins ago', status: 'waiting' },
    { id: 3, type: 'test_result', user: 'Charlie Brown', detail: 'STI Screen Negative', time: '12 mins ago', status: 'completed' },
    { id: 4, type: 'login', user: 'Dr. Sarah', detail: 'Provider Portal', time: '15 mins ago', status: 'success' },
];

export function AdminLiveMonitor() {
    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <CardTitle>Live Activity Feed</CardTitle>
                    </div>
                    <Badge variant="success" className="animate-pulse">Live</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {MOCK_ACTIVITIES.map((activity) => (
                        <div key={activity.id} className="flex gap-4">
                            <div className="relative mt-1">
                                <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center relative z-10">
                                    {activity.type === 'test_request' && <FileText className="h-5 w-5 text-blue-500" />}
                                    {activity.type === 'telemed_join' && <User className="h-5 w-5 text-amber-500" />}
                                    {activity.type === 'test_result' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                    {activity.type === 'login' && <Clock className="h-5 w-5 text-slate-400" />}
                                </div>
                                {/* Connector Line */}
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-full bg-slate-200 -z-0 last:hidden" />
                            </div>

                            <div className="flex-1 pb-8 border-b border-slate-100 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-semibold text-slate-900">{activity.user}</p>
                                    <span className="text-xs text-slate-500">{activity.time}</span>
                                </div>
                                <p className="text-sm text-slate-600 mb-2">
                                    {activity.type === 'test_request' && 'Requested a new test: '}
                                    {activity.type === 'telemed_join' && 'Joined the queue: '}
                                    {activity.type === 'test_result' && 'Results posted: '}
                                    {activity.type === 'login' && 'System access: '}
                                    <span className="font-medium text-slate-900">{activity.detail}</span>
                                </p>
                                <div>
                                    {activity.status === 'pending' && <Badge variant="warning">Action Required</Badge>}
                                    {activity.status === 'waiting' && <Badge variant="secondary">In Queue</Badge>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
