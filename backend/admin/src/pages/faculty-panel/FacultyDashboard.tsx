import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [confirmSession, setConfirmSession] = useState<any>(null);
  
  // Fetch subjects to count unique subjects and divisions
  const { data: assignments, isPending, isLoading, isError, refetch } = useQuery({
    queryKey: ['faculty-subjects', user?.id],
    queryFn: async () => (await apiClient.get(`/faculty/${user?.id}/subjects`)).data,
    enabled: !!user?.id
  });

  const { data: activeSessions } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => (await apiClient.get('/admin/attendance-sessions/active')).data,
    refetchInterval: 5000
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createSession = useMutation({
    mutationFn: async ({ subjectId, divisionId }: { subjectId: number, divisionId: number }) => {
      const { data } = await apiClient.post('/admin/attendance-sessions', {
        faculty_id: user?.id,
        subject_id: subjectId,
        division_id: divisionId
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success('Attendance session started');
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      setConfirmSession(null);
      navigate('/faculty-panel/live-session', { state: { sessionId: data.id } });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to start session');
    }
  });

  if (isPending || isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900">
        <p className="mb-4 font-semibold">Unable to load your teaching assignments.</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (!assignments) {
    return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  const uniqueSubjects = new Set(assignments.map((a: any) => a.subject_id)).size;
  const uniqueDivisions = new Set(assignments.map((a: any) => a.division_id)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome back, Prof. {user?.last_name || 'Faculty'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Here is your teaching overview for the current semester.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard 
          title="My Subjects" 
          value={uniqueSubjects} 
          icon={<BookOpen className="text-indigo-600 dark:text-indigo-400" size={24} />} 
          color="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <DashboardCard 
          title="My Divisions" 
          value={uniqueDivisions} 
          icon={<Users className="text-purple-600 dark:text-purple-400" size={24} />} 
          color="bg-purple-50 dark:bg-purple-900/20"
        />
        <DashboardCard 
          title="Active Sessions" 
          value={activeSessions?.length || 0} 
          icon={<Clock className="text-emerald-600 dark:text-emerald-400" size={24} />} 
          color="bg-emerald-50 dark:bg-emerald-900/20"
        />
      </div>
      
      {/* Quick Access or Assignment List */}
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">Your Assignments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.length > 0 ? assignments.map((a: any) => {
          const activeSession = activeSessions?.find((s: any) => s.subject_id === a.subject_id && s.division_id === a.division_id);
          return (
          <Card key={a.assignment_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">{a.subject_name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{a.subject_code} • {a.division_name}</p>
                {activeSession && (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    ACTIVE
                  </span>
                )}
              </div>
              {activeSession ? (
                <button
                  onClick={() => navigate('/faculty-panel/live-session', { state: { sessionId: activeSession.id } })}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Open Live Session
                </button>
              ) : (
                <button
                  onClick={() => setConfirmSession(a)}
                  disabled={activeSessions?.length > 0}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeSessions?.length > 0 ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'}`}
                >
                  Start Attendance
                </button>
              )}
            </CardContent>
          </Card>
        )}) : (
          <div className="col-span-full p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            No active assignments found.
          </div>
        )}
      </div>

      <Dialog 
        isOpen={!!confirmSession} 
        onClose={() => !createSession.isPending && setConfirmSession(null)} 
        title="Start Attendance?"
      >
        {confirmSession && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subject</p>
                <p className="font-medium text-slate-900 dark:text-white">{confirmSession.subject_name}</p>
                <p className="text-sm text-slate-500">{confirmSession.subject_code}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Division</p>
                  <p className="font-medium text-slate-900 dark:text-white">{confirmSession.division_name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p>The attendance session will generate a dynamic QR for students.</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button 
                variant="ghost" 
                onClick={() => setConfirmSession(null)}
                disabled={createSession.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => createSession.mutate({ subjectId: confirmSession.subject_id, divisionId: confirmSession.division_id })}
                isLoading={createSession.isPending}
              >
                Start Session
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function DashboardCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
