import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QrCode, Play, Users, Clock } from 'lucide-react';
import apiClient from '../../api/client';

import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

import StartSessionDialog from './StartSessionDialog';
import LiveSessionView from './LiveSessionView';

export default function AttendanceSessions() {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const { data: activeSessions, isLoading } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/attendance-sessions/active');
      return data;
    },
    // Poll every 10 seconds just to keep list somewhat fresh
    refetchInterval: 10000 
  });

  if (activeSessionId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            Active Attendance Session
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Scan dynamic QR code to mark attendance securely</p>
        </div>
        <LiveSessionView sessionId={activeSessionId} onClose={() => setActiveSessionId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Sessions</h1>
        <p className="text-slate-500 dark:text-slate-400">Monitor active attendance and dynamic QR sessions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 h-full">
          <CardHeader>
            <CardTitle>Start New Session</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 h-[calc(100%-4rem)]">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6">
              <QrCode size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Dynamic QR Attendance</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Start a new session to display a rotating QR code that prevents proxy attendance.
            </p>
            <Button onClick={() => setIsStartOpen(true)} className="flex items-center gap-2 px-8">
              <Play size={18} fill="currentColor" />
              <span>Start Session</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Active Sessions ({activeSessions?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-16 text-slate-500">Loading...</div>
            ) : activeSessions && activeSessions.length > 0 ? (
              <div className="space-y-4">
                {activeSessions.map((session: any) => (
                  <div 
                    key={session.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-lg">
                        {session.subject_name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1"><Users size={14} /> {session.division_name}</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {new Date(session.start_time).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                        Faculty: {session.faculty_name}
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setActiveSessionId(session.id); }}>
                        View Session
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 dark:text-slate-400 h-[calc(100%-4rem)]">
                <QrCode size={48} className="mb-4 opacity-20" />
                <p>No active attendance sessions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <StartSessionDialog 
        isOpen={isStartOpen} 
        onClose={() => setIsStartOpen(false)} 
        onSessionStarted={(id) => setActiveSessionId(id)}
      />
    </div>
  );
}
