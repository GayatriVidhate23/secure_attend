import { useQuery } from '@tanstack/react-query';
import { UserSquare2, Mail, Hash, ShieldCheck, Building2 } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function MyProfile() {
  const { user } = useAuth();
  
  const { data: faculty, isLoading, error } = useQuery({
    queryKey: ['faculty-profile', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/faculty/${user?.id}`);
      return data;
    },
    enabled: !!user?.id,
    retry: false
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading your profile...</div>;
  }

  if (error || !faculty) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl">
        Could not load your profile information.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400">View your personal and academic information.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-t-4 border-t-purple-500 flex flex-col items-center p-6 text-center">
          <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
            <UserSquare2 size={48} className="text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {faculty.first_name} {faculty.last_name}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Faculty Member</p>
          <div className="mt-4">
            <Badge variant={faculty.is_active ? 'success' : 'error'}>
              {faculty.is_active ? 'Active Account' : 'Inactive Account'}
            </Badge>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                  <Hash className="text-slate-600 dark:text-slate-400" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Employee ID</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{faculty.employee_id}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                  <Mail className="text-slate-600 dark:text-slate-400" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{faculty.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                  <Building2 className="text-slate-600 dark:text-slate-400" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Department</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {faculty.department_id ? `Dept ID: ${faculty.department_id}` : 'Not Assigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                  <ShieldCheck className="text-slate-600 dark:text-slate-400" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Role Authority</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white capitalize">
                    {user?.role.toLowerCase()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
