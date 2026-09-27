import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function MySubjects() {
  const { user } = useAuth();
  
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['faculty-subjects', user?.id],
    queryFn: async () => (await apiClient.get(`/faculty/${user?.id}/subjects`)).data,
    enabled: !!user?.id
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading subjects...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Subjects & Divisions</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Subjects and divisions assigned to you for the current academic session.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.length > 0 ? assignments.map((a: any) => (
          <Card key={a.assignment_id} className="hover:shadow-lg transition-shadow border-t-4 border-t-indigo-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <BookOpen className="text-indigo-600 dark:text-indigo-400" size={24} />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                  {a.subject_code}
                </span>
              </div>
              <CardTitle className="mt-4">{a.subject_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="pt-4 border-t dark:border-slate-800/50 flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Division</span>
                <span className="font-semibold text-slate-900 dark:text-white">{a.division_name}</span>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Subjects Assigned</h3>
            <p className="text-slate-500 mt-2">You have not been assigned any subjects for the current semester.</p>
          </div>
        )}
      </div>
    </div>
  );
}
