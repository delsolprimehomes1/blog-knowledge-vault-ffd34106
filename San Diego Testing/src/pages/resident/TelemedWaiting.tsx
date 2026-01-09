import { useState, useEffect } from 'react';
import { Camera, Mic, Settings, Video } from 'lucide-react';
import { Button } from '../../components/atoms/Button';
import { Card, CardContent } from '../../components/molecules/Card';

export function TelemedWaiting() {
    const [queuePosition, setQueuePosition] = useState(3);
    const [estimatedTime, setEstimatedTime] = useState(15);

    // Simulate queue movement
    useEffect(() => {
        const timer = setInterval(() => {
            setQueuePosition((prev) => Math.max(1, prev - 1));
            setEstimatedTime((prev) => Math.max(5, prev - 5));
        }, 5000); // Fast simulation for demo
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column: Status */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-slate-900">Waiting Room</h1>
                        <p className="text-slate-500">Dr. Smith will be with you shortly.</p>
                    </div>

                    <Card className="border-blue-100 bg-blue-50/50">
                        <CardContent className="p-8 text-center">
                            <div className="relative mx-auto mb-6 h-32 w-32">
                                <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
                                <div className="absolute inset-0 rounded-full border-t-4 border-blue-600 animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-3xl text-blue-700">
                                    #{queuePosition}
                                </div>
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">You are next in line</h2>
                            <p className="text-slate-600 mt-1">Estimated wait time: <span className="font-semibold text-slate-900">{estimatedTime} mins</span></p>
                        </CardContent>
                    </Card>

                    <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800 border border-amber-100">
                        Please ensure you are in a quiet room with good lighting.
                    </div>
                </div>

                {/* Right Column: Pre-check */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-0 overflow-hidden bg-slate-900 aspect-video relative flex items-center justify-center">
                            {/* Fake Camera Feed */}
                            <div className="text-slate-400 flex flex-col items-center">
                                <Video className="h-12 w-12 mb-2 opacity-50" />
                                <span>Camera Preview</span>
                            </div>

                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 bg-slate-800 text-white hover:bg-slate-700 hover:text-white border-0">
                                    <Mic className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 bg-slate-800 text-white hover:bg-slate-700 hover:text-white border-0">
                                    <Camera className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 bg-slate-800 text-white hover:bg-slate-700 hover:text-white border-0">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <h3 className="font-semibold text-slate-900">Connection Check</h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center text-green-600">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                                Camera Access Granted
                            </li>
                            <li className="flex items-center text-green-600">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                                Microphone Working
                            </li>
                            <li className="flex items-center text-green-600">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                                Internet Connection Strong
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
