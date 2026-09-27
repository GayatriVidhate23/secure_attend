import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';

export default function NoticesManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', target_audience: 'ALL' });
  const queryClient = useQueryClient();

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data } = await apiClient.get('/erp/notices');
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiClient.post('/erp/notices', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice published successfully');
      setIsOpen(false);
      setFormData({ title: '', content: '', target_audience: 'ALL' });
    },
    onError: () => toast.error('Failed to publish notice')
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notices & Announcements</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage institution-wide announcements</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2"><Megaphone size={20} /> Broadcasts</CardTitle>
          <Button onClick={() => setIsOpen(true)} size="sm" className="flex items-center gap-1">
            <Plus size={16} /> New Notice
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading notices...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.length > 0 ? notices.map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell>{n.target_audience}</TableCell>
                    <TableCell>{new Date(n.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-slate-500">No notices broadcasted yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Publish New Notice">
        <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
          <Input 
            label="Title" 
            placeholder="e.g. Exam Schedule Released"
            required 
            value={formData.title}
            onChange={(e: any) => setFormData({...formData, title: e.target.value})}
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Content
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e: any) => setFormData({...formData, content: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:border-slate-700 min-h-[100px]"
            />
          </div>
          <Input 
            label="Target Audience" 
            placeholder="e.g. ALL, CS_STUDENTS"
            required 
            value={formData.target_audience}
            onChange={(e: any) => setFormData({...formData, target_audience: e.target.value})}
          />
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Broadcast</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
