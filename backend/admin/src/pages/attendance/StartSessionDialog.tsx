import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

interface StartSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionStarted: (sessionId: number) => void;
}

export default function StartSessionDialog({ isOpen, onClose, onSessionStarted }: StartSessionDialogProps) {
  const queryClient = useQueryClient();
  const [facultyId, setFacultyId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [divisionId, setDivisionId] = useState('');

  const { data: faculties } = useQuery({
    queryKey: ['facultyList'],
    queryFn: async () => {
      const { data } = await apiClient.get('/faculty/');
      return data;
    },
    enabled: isOpen
  });

  const { data: activeSessions } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/attendance-sessions/active');
      return data;
    },
    enabled: isOpen
  });

  const activeFacultyIds = new Set(activeSessions?.map((s: any) => s.faculty_id) || []);
  const availableFaculties = faculties?.filter((f: any) => !activeFacultyIds.has(f.user_id));

  const { data: subjects } = useQuery({
    queryKey: ['subjectList'],
    queryFn: async () => {
      const { data } = await apiClient.get('/academic/subjects');
      return data;
    },
    enabled: isOpen
  });

  const { data: divisions } = useQuery({
    queryKey: ['divisionList'],
    queryFn: async () => {
      const { data } = await apiClient.get('/academic/divisions');
      return data;
    },
    enabled: isOpen
  });

  const createSession = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/admin/attendance-sessions', {
        faculty_id: parseInt(facultyId),
        subject_id: parseInt(subjectId),
        division_id: parseInt(divisionId)
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success('Attendance session started');
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      onSessionStarted(data.id);
      onClose();
    },
    onError: () => {
      toast.error('Failed to start session');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyId || !subjectId || !divisionId) {
      toast.error('Please select all fields');
      return;
    }
    createSession.mutate();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Start Attendance Session">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Faculty
          </label>
          <select 
            value={facultyId} 
            onChange={(e) => setFacultyId(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          >
            <option value="">Select Faculty...</option>
            {availableFaculties?.map((f: any) => (
              <option key={f.user_id} value={f.user_id}>{f.first_name} {f.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Subject
          </label>
          <select 
            value={subjectId} 
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          >
            <option value="">Select Subject...</option>
            {subjects?.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Division / Class
          </label>
          <select 
            value={divisionId} 
            onChange={(e) => setDivisionId(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          >
            <option value="">Select Division...</option>
            {divisions?.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end pt-4 space-x-3">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" isLoading={createSession.isPending}>Start Session</Button>
        </div>
      </form>
    </Dialog>
  );
}
