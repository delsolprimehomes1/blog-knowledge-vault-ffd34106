import { Activity, FileText, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';

export function ResidentHome() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Good Morning, John</h1>
                <p className="text-slate-500">How can we help you today?</p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Request Test Action */}
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardHeader>
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                            <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg">Request Testing</CardTitle>
                        <CardDescription>Order Respiratory, STI, or Drug tests.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" asChild>
                            <Link to="/resident/request-test">Start Request</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Telemed Action */}
                <Card className="border-indigo-100 bg-indigo-50/50">
                    <CardHeader>
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-2">
                            <Video className="h-5 w-5 text-indigo-600" />
                        </div>
                        <CardTitle className="text-lg">See a Provider</CardTitle>
                        <CardDescription>Start a video visit with a nurse.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700" asChild>
                            <Link to="/resident/telemed">Join Waiting Room</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* History Action */}
                <Card>
                    <CardHeader>
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
                            <FileText className="h-5 w-5 text-slate-600" />
                        </div>
                        <CardTitle className="text-lg">My Health Items</CardTitle>
                        <CardDescription>View past results and visit summaries.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" asChild>
                            <Link to="/resident/history">View History</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <Activity className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Respiratory Panel Completed</p>
                                        <p className="text-xs text-slate-500">Yesterday at 2:30 PM</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">View</Button>
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Video className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Telemed Visit</p>
                                        <p className="text-xs text-slate-500">Jan 06 at 10:15 AM</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">View</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
