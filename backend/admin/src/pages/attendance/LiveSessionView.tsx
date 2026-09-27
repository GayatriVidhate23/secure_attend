import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Users, Clock, ShieldCheck, Maximize, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import { Button } from '../../components/ui/Button';

interface LiveSessionViewProps {
  sessionId: number;
  onClose: () => void;
}

export default function LiveSessionView({ sessionId, onClose }: LiveSessionViewProps) {
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(10);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch QR Token every 59 seconds, or handle internally.
  // We'll use React Query's refetchInterval to poll securely.
  const { data: qrData, isError } = useQuery({
    queryKey: ['qrToken', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/admin/attendance-sessions/${sessionId}/qr`);
      return data;
    }
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['liveAttendance', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/admin/attendance-sessions/${sessionId}/attendance`);
      return data;
    },
    refetchInterval: 5000, // Poll every 5s for live attendance
  });

  // Handle countdown animation
  useEffect(() => {
    if (qrData) {
      setCountdown(qrData.expires_in);
    }
  }, [qrData]);

  useEffect(() => {
    if (countdown <= 0) {
      queryClient.invalidateQueries({ queryKey: ['qrToken', sessionId] });
      return;
    }
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown, queryClient, sessionId]);

  const endSession = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/admin/attendance-sessions/${sessionId}/end`);
    },
    onSuccess: () => {
      toast.success("Session ended successfully");
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      onClose();
    }
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl">
        <p className="mb-4">Session has ended or is unavailable.</p>
        <Button onClick={onClose}>Return to Dashboard</Button>
      </div>
    );
  }

  const containerClasses = isFullscreen 
    ? "fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col"
    : "relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row gap-8";

  return (
    <div className={containerClasses}>
      {isFullscreen && (
        <button onClick={() => setIsFullscreen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <X size={24} />
        </button>
      )}

      {/* QR Code Section */}
      <div className={`flex flex-col items-center justify-center flex-1 ${isFullscreen ? 'pt-16' : ''}`}>
        <div className="relative mb-6">
          <div className="p-4 bg-white rounded-2xl shadow-sm border-2 border-slate-100 dark:border-slate-800">
            {qrData?.qr_token ? (
              <QRCodeCanvas 
                value={qrData.qr_token} 
                size={isFullscreen ? 400 : 250} 
                level={"H"}
                includeMargin={false}
              />
            ) : (
              <div 
                className="bg-slate-100 flex items-center justify-center text-slate-400 animate-pulse"
                style={{ width: isFullscreen ? 400 : 250, height: isFullscreen ? 400 : 250 }}
              >
                Generating Secure Token...
              </div>
            )}
          </div>
          
          {/* Progress ring visualization around the QR code could go here, for now a simple bar below */}
        </div>

        <div className="w-full max-w-sm mb-2 px-4">
          <div className="flex justify-between text-sm font-medium mb-1">
            <span className="text-slate-500 dark:text-slate-400">Token expires in</span>
            <span className={`${countdown <= 3 ? 'text-red-500 font-bold' : 'text-blue-600 dark:text-blue-400'}`}>
              {countdown}s
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${countdown <= 3 ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${(countdown / (qrData?.valid_for || 10)) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-slate-400 flex items-center gap-1 mt-2">
          <ShieldCheck size={14} /> Dynamically securing attendance
        </p>

        {!isFullscreen && (
          <Button variant="ghost" className="mt-4" onClick={() => setIsFullscreen(true)}>
            <Maximize size={16} className="mr-2" />
            Go Fullscreen
          </Button>
        )}
      </div>

      {/* Stats Section */}
      <div className={`flex flex-col justify-center ${isFullscreen ? 'w-full max-w-2xl mx-auto px-8 pb-12' : 'w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-6 md:pt-0 md:pl-8'}`}>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center md:text-left">Live Session</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center">
            <Users className="mx-auto mb-2 text-blue-500" size={24} />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{attendanceData?.total_present || 0}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Present</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center">
            <Clock className="mx-auto mb-2 text-amber-500" size={24} />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">Active</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</div>
          </div>
        </div>

        {/* Live Student List */}
        <div className="flex-1 overflow-y-auto mb-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-2 min-h-[150px]">
          {attendanceData?.records && attendanceData.records.length > 0 ? (
            <ul className="space-y-2">
              {attendanceData.records.map((r: any) => (
                <li key={r.student_id} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                  <div>
                    <p className="text-sm font-bold">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-slate-500">{r.roll_number}</p>
                  </div>
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                    PRESENT
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Waiting for students...
            </div>
          )}
        </div>

        <Button 
          variant="danger" 
          size="lg" 
          className="w-full font-bold" 
          onClick={() => {
            if (confirm("Are you sure you want to end this attendance session?")) {
              endSession.mutate();
            }
          }}
          isLoading={endSession.isPending}
        >
          End Session
        </Button>
      </div>
    </div>
  );
}
