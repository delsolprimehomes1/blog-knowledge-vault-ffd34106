import React, { useState } from 'react';
import { useTelemed } from '../../context/TelemedContext';
import { Mic, MicOff, Video, VideoOff, Send, PhoneOff } from 'lucide-react';

export const VideoRoom: React.FC = () => {
    const { session, messages, sendMessage, endSession } = useTelemed();
    const [input, setInput] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    if (!session) return <div className="p-10 text-center">No active session</div>;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        await sendMessage(input);
        setInput('');
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Video Area */}
            <div className="flex-1 flex flex-col p-4 gap-4">
                {/* Remote Video (Placeholder) */}
                <div className="flex-1 bg-gray-800 rounded-xl relative overflow-hidden flex items-center justify-center">
                    <div className="text-2xl text-gray-400">Remote User Video (Connecting...)</div>
                    <div className="absolute top-4 left-4 bg-black/50 px-2 py-1 rounded text-sm">
                        {session.status === 'in_progress' ? 'Live' : session.status}
                    </div>
                </div>

                {/* Controls */}
                <div className="h-20 bg-gray-800 rounded-xl flex items-center justify-center gap-6">
                    <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
                        {isMuted ? <MicOff /> : <Mic />}
                    </button>
                    <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
                        {isVideoOff ? <VideoOff /> : <Video />}
                    </button>
                    <button onClick={endSession} className="p-4 rounded-full bg-red-600 hover:bg-red-700">
                        <PhoneOff />
                    </button>
                </div>
            </div>

            {/* Chat Sidebar */}
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700 font-bold">Session Chat</div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.type === 'system' ? 'items-center' : 'items-start'}`}>
                            {msg.type === 'system' ? (
                                <span className="text-xs text-gray-500">{msg.content}</span>
                            ) : (
                                <div className="bg-gray-700 p-2 rounded-lg max-w-[90%]">
                                    <div className="text-sm">{msg.content}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-gray-700 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                    <button type="submit" className="bg-blue-600 p-2 rounded hover:bg-blue-700">
                        <Send size={20} />
                    </button>
                </form>
            </div>

            {/* Local Self-View (Floating) */}
            <div className="absolute bottom-24 right-86 w-48 h-32 bg-black border-2 border-gray-700 rounded-lg overflow-hidden flex items-center justify-center z-10">
                <span className="text-sm text-gray-500">You {isVideoOff && '(Off)'}</span>
            </div>
        </div>
    );
};
