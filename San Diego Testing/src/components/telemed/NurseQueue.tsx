import React, { useEffect, useState } from 'react';
import { telemedService, supabase } from '../../services/telemed';
import { TelemedSession } from '../../types/telemed';
import { useTelemed } from '../../context/TelemedContext';

export const NurseQueue: React.FC<{ nurseId: string }> = ({ nurseId }) => {
    const [queue, setQueue] = useState<TelemedSession[]>([]);
    const { joinSession } = useTelemed();

    const fetchQueue = async () => {
        const { data } = await supabase
            .from('sessions')
            .select('*')
            .eq('status', 'queued');

        if (data) {
            // map data manually or use service helper if exposed
            // simpler here to just cast for now as service helper is private
            // Ideally service should expose mappers or return types directly
            const mapped = data.map((d: any) => ({
                id: d.id,
                patientId: d.patient_id,
                status: d.status,
                createdAt: d.created_at,
                metadata: d.metadata
            } as TelemedSession));
            setQueue(mapped);
        }
    };

    useEffect(() => {
        fetchQueue();

        const channel = supabase.channel('global-queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
                fetchQueue();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleAccept = async (sessionId: string) => {
        try {
            await telemedService.acceptSession(sessionId, nurseId);
            await joinSession(sessionId);
            // Navigate to room (handled by parent or router)
        } catch (e) {
            console.error('Failed to accept session', e);
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Patient Queue</h2>
            {queue.length === 0 ? (
                <p className="text-gray-500">No patients waiting.</p>
            ) : (
                <ul className="space-y-2">
                    {queue.map(session => (
                        <li key={session.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                            <div>
                                <span className="font-semibold">Patient {session.patientId.slice(0, 8)}</span>
                                <div className="text-sm text-gray-500">Waiting since {new Date(session.createdAt).toLocaleTimeString()}</div>
                            </div>
                            <button
                                onClick={() => handleAccept(session.id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Accept
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
