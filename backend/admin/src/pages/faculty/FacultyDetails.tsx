import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, BookOpen } from 'lucide-react';
import apiClient from '../../api/client';

import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import toast from 'react-hot-toast';

export default function FacultyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [formData, setFormData] = useState({ subject_id: '', division_id: '' });

  const { data: faculty, isLoading } = useQuery({
    queryKey: ['faculty', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/faculty/${id}`);
      return data;
    }
  });

  const { data: assignedSubjects = [] } = useQuery({
    queryKey: ['facultySubjects', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/faculty/${id}/subjects`);
      return data;
    }
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await apiClient.get('/academic/subjects');
      return data;
    }
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/academic/divisions');
      return data;
    }
  });

  const assignMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.post(`/faculty/${id}/subjects`, {
        subject_id: parseInt(data.subject_id),
        division_id: parseInt(data.division_id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facultySubjects', id] });
      toast.success('Subject assigned successfully');
      setIsAssignOpen(false);
      setFormData({ subject_id: '', division_id: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to assign subject');
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading faculty details...</div>;
  }

  if (!faculty) {
    return <div className="p-8 text-center text-red-500">Faculty not found</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/faculty')} className="px-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Faculty Details</h1>
            <p className="text-slate-500 dark:text-slate-400">{faculty.first_name} {faculty.last_name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Edit size={16} />
            <span>Edit</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Full Name</p>
                <p className="mt-1 text-base font-medium text-slate-900 dark:text-white">
                  {faculty.first_name} {faculty.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Employee ID</p>
                <p className="mt-1 text-base font-medium text-slate-900 dark:text-white">{faculty.employee_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</p>
                <p className="mt-1 text-base font-medium text-slate-900 dark:text-white">{faculty.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</p>
                <div className="mt-1">
                  <Badge variant={faculty.is_active ? 'success' : 'error'}>
                    {faculty.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="text-blue-500" size={20} />
              <span>Assigned Subjects</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedSubjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  No subjects assigned yet.
                </p>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setIsAssignOpen(true)}>Assign Subject</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIsAssignOpen(true)}>Assign Subject</Button>
                </div>
                <div className="space-y-3">
                  {assignedSubjects.map((sub: any) => (
                    <div key={sub.assignment_id} className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{sub.subject_name}</p>
                        <p className="text-sm text-slate-500">{sub.subject_code} • Div: {sub.division_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title="Assign Subject">
        <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); assignMutation.mutate(formData); }} className="space-y-4">
          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Subject
            </label>
            <select
              required
              value={formData.subject_id}
              onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:border-slate-700"
            >
              <option value="" disabled>Select Subject</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Division
            </label>
            <select
              required
              value={formData.division_id}
              onChange={(e) => setFormData({...formData, division_id: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:border-slate-700"
            >
              <option value="" disabled>Select Division</option>
              {divisions.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={assignMutation.isPending}>Assign</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
