import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, BarChart3, ShieldCheck, UserSquare2, QrCode, ArrowRight, Play } from 'lucide-react';
import apiClient from '../api/client';
import { Button } from '../components/ui/Button';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch summary stats
  const { data: stats } = useQuery({ queryKey: ['adminStats'], queryFn: async () => (await apiClient.get('/admin/stats/')).data });
  const { data: activeSessions } = useQuery({ queryKey: ['activeSessions'], queryFn: async () => (await apiClient.get('/admin/attendance-sessions/active')).data, refetchInterval: 15000 });

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Welcome to SecureAttend
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
            Smart Attendance Management System
          </p>
        </div>
        <div className="relative z-10 flex gap-3">
          <Button onClick={() => navigate('/attendance')} className="flex items-center gap-2 shadow-md">
            <Play size={16} fill="currentColor" /> Start Session
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard 
          title="Total Students" 
          value={stats?.total_students || 0} 
          icon={Users} 
          colorClass="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
        />
        <DashboardCard 
          title="Total Faculty" 
          value={stats?.total_faculty || 0} 
          icon={UserSquare2} 
          colorClass="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" 
        />
        <DashboardCard 
          title="Total Subjects" 
          value={stats?.total_subjects || 0} 
          icon={BookOpen} 
          colorClass="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Sessions & Recent */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {activeSessions?.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${activeSessions?.length > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </span>
                Active Sessions ({activeSessions?.length || 0})
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/attendance')}>View All <ArrowRight size={14} className="ml-1" /></Button>
            </div>
            
            {activeSessions && activeSessions.length > 0 ? (
              <div className="space-y-4">
                {activeSessions.slice(0, 3).map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-colors cursor-pointer" onClick={() => navigate('/live-session', { state: { sessionId: session.id } })}>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{session.subject_name}</div>
                      <div className="text-sm text-slate-500 flex gap-3 mt-1">
                        <span className="flex items-center gap-1"><UserSquare2 size={14} /> {session.faculty_name}</span>
                        <span className="flex items-center gap-1"><Users size={14} /> {session.division_name}</span>
                      </div>
                    </div>
                    <div>
                      <Button size="sm" variant="outline">Live QR</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <QrCode size={32} className="mb-3 opacity-20" />
                <p>No active attendance sessions</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Today's Attendance Overview</h3>
            <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 text-slate-400">
              <div className="flex flex-col items-center">
                <BarChart3 size={32} className="mb-2" />
                <span>Attendance stats will appear here</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start py-6" onClick={() => navigate('/students')}>
                <Users size={18} className="mr-3 text-slate-400" /> Manage Students
              </Button>
              <Button variant="outline" className="w-full justify-start py-6" onClick={() => navigate('/faculty')}>
                <UserSquare2 size={18} className="mr-3 text-slate-400" /> Manage Faculty
              </Button>
              <Button variant="outline" className="w-full justify-start py-6" onClick={() => navigate('/subjects')}>
                <BookOpen size={18} className="mr-3 text-slate-400" /> Manage Subjects
              </Button>
              <Button variant="outline" className="w-full justify-start py-6" onClick={() => navigate('/live-session')}>
                <QrCode size={18} className="mr-3 text-blue-500" /> View Live QR
              </Button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <ShieldCheck size={24} className="mb-4 text-emerald-400" />
            <h3 className="font-bold text-lg mb-2">SecureAttend Active</h3>
            <p className="text-slate-300 text-sm opacity-90 leading-relaxed">
              Face liveness detection and dynamic QR generation algorithms are currently online and protecting all active sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, icon: Icon, colorClass }: any) {
  return (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</h3>
        <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${colorClass}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}
