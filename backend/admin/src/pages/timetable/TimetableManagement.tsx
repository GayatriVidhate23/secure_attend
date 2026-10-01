import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Trash2, Clock, MapPin, Users, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    subject_id: '',
    faculty_id: '',
    division_id: '',
    day_of_week: 0,
    start_time: '',
    end_time: '',
    room: ''
  });

  const { data: timetable = [], isLoading: isTimetableLoading } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => {
      const { data } = await apiClient.get('/timetable/');
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

  const { data: faculty = [] } = useQuery({
    queryKey: ['faculty'],
    queryFn: async () => {
      const { data } = await apiClient.get('/faculty/');
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

  const createMutation = useMutation({
    mutationFn: async (newEntry: any) => {
      const { data } = await apiClient.post('/timetable/', newEntry);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      toast.success('Timetable entry added successfully');
      setIsCreateOpen(false);
      setFormData({
        subject_id: '', faculty_id: '', division_id: '',
        day_of_week: 0, start_time: '', end_time: '', room: ''
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to add timetable entry');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/timetable/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      toast.success('Entry deleted');
    },
    onError: () => toast.error('Failed to delete entry')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      subject_id: parseInt(formData.subject_id),
      faculty_id: parseInt(formData.faculty_id),
      division_id: parseInt(formData.division_id),
      day_of_week: parseInt(formData.day_of_week.toString()),
      start_time: formData.start_time,
      end_time: formData.end_time,
      room: formData.room || null
    });
  };

  const filteredTimetable = selectedDay !== null 
    ? timetable.filter((t: any) => t.day_of_week === selectedDay)
    : timetable;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Timetable Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage class schedules and room assignments</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center">
          <Plus size={18} className="mr-2" /> Add Entry
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button 
          variant={selectedDay === null ? "primary" : "outline"} 
          onClick={() => setSelectedDay(null)}
          size="sm"
        >
          All Days
        </Button>
        {DAYS.map((day, idx) => (
          <Button 
            key={idx}
            variant={selectedDay === idx ? "primary" : "outline"}
            onClick={() => setSelectedDay(idx)}
            size="sm"
          >
            {day}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day & Time</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTimetableLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredTimetable.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No classes scheduled.</TableCell></TableRow>
              ) : (
                filteredTimetable.sort((a: any, b: any) => {
                  if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
                  return a.start_time.localeCompare(b.start_time);
                }).map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">{DAYS[entry.day_of_week]}</div>
                      <div className="text-sm text-slate-500 flex items-center mt-1">
                        <Clock size={14} className="mr-1" /> {entry.start_time} - {entry.end_time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <BookOpen size={16} className="mr-2 text-blue-500" />
                        <span className="font-medium">{entry.subject_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users size={16} className="mr-2 text-indigo-500" />
                        {entry.faculty_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                        {entry.division_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-slate-600 dark:text-slate-300">
                        <MapPin size={16} className="mr-1 text-slate-400" />
                        {entry.room || 'TBD'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                        if (window.confirm('Are you sure you want to delete this entry?')) {
                          deleteMutation.mutate(entry.id);
                        }
                      }}>
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Timetable Entry">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Day of Week *</label>
              <select
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                value={formData.day_of_week}
                onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
              >
                {DAYS.map((day, idx) => (
                  <option key={idx} value={idx}>{day}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Room (Optional)</label>
              <Input
                placeholder="e.g. Room 101"
                value={formData.room}
                onChange={(e) => setFormData({...formData, room: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Start Time *</label>
              <Input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">End Time *</label>
              <Input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Subject *</label>
            <select
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              value={formData.subject_id}
              onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
            >
              <option value="">Select Subject</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Faculty *</label>
            <select
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              value={formData.faculty_id}
              onChange={(e) => setFormData({...formData, faculty_id: e.target.value})}
            >
              <option value="">Select Faculty</option>
              {faculty.map((f: any) => (
                <option key={f.user_id} value={f.user_id}>{f.first_name} {f.last_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Division/Class *</label>
            <select
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              value={formData.division_id}
              onChange={(e) => setFormData({...formData, division_id: e.target.value})}
            >
              <option value="">Select Division</option>
              {divisions.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Save Entry</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
