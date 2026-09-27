import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserSquare2, LogOut, Bell, ShieldCheck, Sun, Moon, BookOpen, FileText } from 'lucide-react';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

export default function FacultyLayout() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Phase 5/6 requirement: Enforce 403 blocks for Web access attempts by Students/Parents.
    if (user && user.role !== 'FACULTY') {
      logout();
      navigate('/login?error=unauthorized');
    }
  }, [user, logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-r dark:border-slate-800/50 flex flex-col hidden md:flex shadow-sm z-10">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b dark:border-slate-800/50 font-bold text-xl gap-2">
          <div className="p-1.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg shadow-sm">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">SecureAttend</span>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
          <NavItem to="/faculty-panel/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem to="/faculty-panel/subjects" icon={<BookOpen size={20} />} label="My Subjects" />
          <NavItem to="/faculty-panel/students" icon={<Users size={20} />} label="My Students" />
          <NavItem to="/faculty-panel/reports" icon={<FileText size={20} />} label="Reports" />
          <NavItem to="/faculty-panel/profile" icon={<UserSquare2 size={20} />} label="My Profile" />
        </div>
        
        <div className="p-4 border-t dark:border-slate-800/50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b dark:border-slate-800/50 flex items-center justify-between px-6 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 hidden sm:block">
              Faculty Portal
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-semibold text-sm shadow-sm ring-2 ring-white dark:ring-slate-900 cursor-pointer">
              FC
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/50">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
      <Toaster position="top-right" toastOptions={{
        className: 'dark:bg-slate-800 dark:text-slate-100 dark:border dark:border-slate-700 shadow-xl',
      }}/>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => 
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
