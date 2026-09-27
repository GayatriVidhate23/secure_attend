import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import StudentsList from './pages/students/StudentsList';
import StudentDetails from './pages/students/StudentDetails';
import FacultyList from './pages/faculty/FacultyList';
import FacultyDetails from './pages/faculty/FacultyDetails';
import Subjects from './pages/academic/Subjects';
import Divisions from './pages/academic/Divisions';
import AttendanceSessions from './pages/attendance/AttendanceSessions';
import LiveSessionPage from './pages/attendance/LiveSessionPage';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

import FacultyLayout from './components/layout/FacultyLayout';
import FacultyDashboard from './pages/faculty-panel/FacultyDashboard';
import MySubjects from './pages/faculty-panel/MySubjects';
import MyStudents from './pages/faculty-panel/MyStudents';
import FacultyStudentDetails from './pages/faculty-panel/FacultyStudentDetails';
import MyProfile from './pages/faculty-panel/MyProfile';
import FacultyLiveSessionPage from './pages/faculty-panel/FacultyLiveSessionPage';
import FacultyReports from './pages/faculty-panel/FacultyReports';

import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const queryClient = new QueryClient();

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) return <div className="flex h-screen items-center justify-center dark:bg-slate-900 dark:text-white">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (user?.role === 'FACULTY') return <Navigate to="/faculty-panel" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/login?error=unauthorized" replace />;
  
  return <>{children}</>;
};

const FacultyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) return <div className="flex h-screen items-center justify-center dark:bg-slate-900 dark:text-white">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (user?.role === 'ADMIN') return <Navigate to="/" replace />;
  if (user?.role !== 'FACULTY') return <Navigate to="/login?error=unauthorized" replace />;
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <Router>
            <Routes>
            <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<AdminRoute><DashboardLayout /></AdminRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route path="students" element={<StudentsList />} />
            <Route path="students/:id" element={<StudentDetails />} />
            
            <Route path="faculty" element={<FacultyList />} />
            <Route path="faculty/:id" element={<FacultyDetails />} />
            
            <Route path="subjects" element={<Subjects />} />
            <Route path="divisions" element={<Divisions />} />
            <Route path="attendance" element={<AttendanceSessions />} />
            <Route path="live-session" element={<LiveSessionPage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="/faculty-panel" element={<FacultyRoute><FacultyLayout /></FacultyRoute>}>
            <Route index element={<Navigate to="/faculty-panel/dashboard" replace />} />
            <Route path="dashboard" element={<FacultyDashboard />} />
            <Route path="subjects" element={<MySubjects />} />
            <Route path="students" element={<MyStudents />} />
            <Route path="students/:id" element={<FacultyStudentDetails />} />
            <Route path="reports" element={<FacultyReports />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="live-session" element={<FacultyLiveSessionPage />} />
          </Route>
          
          <Route path="*" element={<div className="flex h-screen items-center justify-center dark:bg-slate-900 dark:text-white">404 - Not Found</div>} />
        </Routes>
      </Router>
      </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
