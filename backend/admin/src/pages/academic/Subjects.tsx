import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';

export default function Subjects() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', department_id: '' });
  const queryClient = useQueryClient();

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await apiClient.get('/academic/subjects');
      return data;
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await apiClient.get('/academic/departments');
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.post('/academic/subjects', {
        ...data,
        department_id: parseInt(data.department_id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject added successfully');
      setIsOpen(false);
      setFormData({ code: '', name: '', department_id: '' });
    },
    onError: () => toast.error('Failed to add subject')
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subjects Management</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage academic subjects and assignments</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Subjects</CardTitle>
          <Button onClick={() => setIsOpen(true)} size="sm" className="flex items-center gap-1">
            <Plus size={16} /> Add Subject
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Department ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.length > 0 ? subjects.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.department_id}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-slate-500">No subjects found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>

        <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Subject">
          <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <Input 
              label="Subject Code" 
              placeholder="e.g. CS101"
              required 
              value={formData.code}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData({...formData, code: e.target.value})}
            />
            <Input 
              label="Subject Name" 
              placeholder="e.g. Intro to Programming"
              required 
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData({...formData, name: e.target.value})}
            />
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Department
              </label>
              <select
                required
                value={formData.department_id}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData({...formData, department_id: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:border-slate-700"
              >
                <option value="" disabled>Select Department</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={createMutation.isPending}>Save</Button>
            </div>
          </form>
        </Dialog>
      </Card>
    </div>
  );
}
