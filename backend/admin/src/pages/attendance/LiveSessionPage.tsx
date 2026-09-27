
import { useQuery } from '@tanstack/react-query';
import { QrCode, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import LiveSessionView from './LiveSessionView';
import { Button } from '../../components/ui/Button';

export default function LiveSessionPage() {
  const navigate = useNavigate();
  
  const { data: activeSessions, isLoading } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/attendance-sessions/active');
      return data;
    },
    refetchInterval: 10000 
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-slate-500">
        Loading active sessions...
      </div>
    );
  }

  // If there's an active session, display the first one.
  const activeSessionId = activeSessions && activeSessions.length > 0 ? activeSessions[0].id : null;

  if (activeSessionId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            Live Attendance QR
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Display this QR for students to scan during the session</p>
        </div>
        
        {/* We reuse the exact same LiveSessionView already tested and working */}
        <LiveSessionView 
          sessionId={activeSessionId} 
          onClose={() => navigate('/attendance')} 
        />
      </div>
    );
  }

  // Empty state
  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col justify-center items-center">
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-sm">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-400">
          <QrCode size={40} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No active attendance session</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
          There are no active attendance sessions currently running. You need to start a session first to view the live QR.
        </p>
        <Button onClick={() => navigate('/attendance')} className="flex items-center gap-2">
          Go to Attendance Sessions <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
