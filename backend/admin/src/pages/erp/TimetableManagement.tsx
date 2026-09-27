import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Calendar, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export default function TimetableManagement() {
  const [formData, setFormData] = useState({
    subject_id: '',
    faculty_id: '',
    division_id: '',
    day_of_week: '1',
    start_time: '',
    end_time: '',
    room: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.post('/erp/timetable', {
        ...data,
        subject_id: parseInt(data.subject_id),
        faculty_id: parseInt(data.faculty_id),
        division_id: parseInt(data.division_id),
        day_of_week: parseInt(data.day_of_week)
      });
    },
    onSuccess: () => {
      toast.success('Timetable entry created');
      setFormData({ ...formData, start_time: '', end_time: '', room: '' });
    },
    onError: () => toast.error('Failed to create timetable entry')
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Timetable Setup</h1>
        <p className="text-slate-500 dark:text-slate-400">Allocate subjects to faculty and time slots</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus size={20} /> Add Timetable Slot</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); createMutation.mutate(formData); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Subject ID" required type="number"
              value={formData.subject_id} onChange={(e: any) => setFormData({...formData, subject_id: e.target.value})}
            />
            <Input 
              label="Faculty ID" required type="number"
              value={formData.faculty_id} onChange={(e: any) => setFormData({...formData, faculty_id: e.target.value})}
            />
            <Input 
              label="Division ID" required type="number"
              value={formData.division_id} onChange={(e: any) => setFormData({...formData, division_id: e.target.value})}
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Day of Week</label>
              <select
                required value={formData.day_of_week}
                onChange={(e: any) => setFormData({...formData, day_of_week: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:border-slate-700"
              >
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="7">Sunday</option>
              </select>
            </div>
            <Input 
              label="Start Time" type="time" required 
              value={formData.start_time} onChange={(e: any) => setFormData({...formData, start_time: e.target.value})}
            />
            <Input 
              label="End Time" type="time" required 
              value={formData.end_time} onChange={(e: any) => setFormData({...formData, end_time: e.target.value})}
            />
            <Input 
              label="Room (Optional)" 
              value={formData.room} onChange={(e: any) => setFormData({...formData, room: e.target.value})}
            />
            <div className="md:col-span-2 pt-2 flex justify-end">
              <Button type="submit" isLoading={createMutation.isPending}>Add Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar size={20} /> View Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">Backend API unavailable for global timetable retrieval. Only students can view their specific timetable via mobile app.</p>
        </CardContent>
      </Card>
    </div>
  );
}
