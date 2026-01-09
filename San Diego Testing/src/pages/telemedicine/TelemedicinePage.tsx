import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare } from "lucide-react"

export default function TelemedicinePage() {
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4">
            {/* Main Video Area */}
            <div className="flex-1 bg-black rounded-xl overflow-hidden relative flex items-center justify-center group">
                {isVideoOff ? (
                    <div className="flex flex-col items-center text-muted-foreground">
                        <div className="h-24 w-24 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                            <VideoOff className="h-10 w-10 text-zinc-500" />
                        </div>
                        <p className="text-zinc-500">Camera is off</p>
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-zinc-900">
                        {/* Mock Remote Video */}
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="text-zinc-500 flex flex-col items-center gap-2">
                                <div className="h-20 w-20 rounded-full bg-zinc-800 animate-pulse" />
                                <p>Connecting to provider...</p>
                            </div>
                        </div>

                        {/* Local Video Placeholder */}
                        <div className="absolute top-4 right-4 h-32 w-48 bg-zinc-800 rounded-lg border border-zinc-700 shadow-xl overflow-hidden z-10">
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-medium">
                                You
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls Bar */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/10 backdrop-blur-md p-3 rounded-full border border-white/10 transition-transform duration-300 translate-y-20 group-hover:translate-y-0">
                    <Button
                        variant={isMuted ? "destructive" : "secondary"}
                        size="icon"
                        className="rounded-full h-12 w-12"
                        onClick={() => setIsMuted(!isMuted)}
                    >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>

                    <Button
                        variant={isVideoOff ? "destructive" : "secondary"}
                        size="icon"
                        className="rounded-full h-12 w-12"
                        onClick={() => setIsVideoOff(!isVideoOff)}
                    >
                        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </Button>

                    <Button
                        variant="destructive"
                        size="icon"
                        className="rounded-full h-12 w-12 ml-4"
                    >
                        <PhoneOff className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Chat / Info Sidebar */}
            <Card className="w-full md:w-80 flex flex-col h-full md:h-auto border-0 md:border shadow-none md:shadow-sm">
                <div className="p-4 border-b font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                </div>
                <div className="flex-1 p-4 bg-secondary/10 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full border">Today</span>
                        </div>
                        <div className="text-sm text-center text-muted-foreground">
                            Waiting for Dr. Smith to join...
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t">
                    <div className="flex gap-2">
                        <input className="flex-1 bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Type a message..." />
                        <Button size="sm">Send</Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
