import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Eye, ShieldAlert, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';

export default function FacultyList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: facultyList = [], isLoading } = useQuery({
    queryKey: ['faculty'],
    queryFn: async () => {
      const { data } = await apiClient.get('/faculty/');
      return data;
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.post(`/faculty/${userId}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      toast.success('Faculty status updated successfully');
    },
    onError: () => toast.error('Failed to update status')
  });

  const filteredFaculty = facultyList.filter((f: any) => 
    f.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Faculty</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage faculty accounts</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <UserPlus size={18} />
          <span>Add Faculty</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <CardTitle>All Faculty</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Search by name or employee ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading faculty...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaculty.length > 0 ? filteredFaculty.map((faculty: any) => (
                  <TableRow key={faculty.user_id}>
                    <TableCell className="font-medium text-slate-900 dark:text-white">
                      {faculty.employee_id}
                    </TableCell>
                    <TableCell>{faculty.first_name} {faculty.last_name}</TableCell>
                    <TableCell>{faculty.email}</TableCell>
                    <TableCell>{faculty.department_id || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={faculty.is_active ? 'success' : 'error'}>
                        {faculty.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/faculty/${faculty.user_id}`)}
                          title="View Details"
                        >
                          <Eye size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleStatusMutation.mutate(faculty.user_id)}
                          title={faculty.is_active ? "Deactivate" : "Activate"}
                          className={faculty.is_active ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}
                        >
                          {faculty.is_active ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No faculty found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateFacultyDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}

function CreateFacultyDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    employee_id: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiClient.post('/faculty/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      toast.success('Faculty created successfully');
      onClose();
      setFormData({ first_name: '', last_name: '', email: '', password: '', employee_id: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to create faculty');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add New Faculty">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="First Name" 
            required 
            value={formData.first_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, first_name: e.target.value})}
          />
          <Input 
            label="Last Name" 
            required 
            value={formData.last_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, last_name: e.target.value})}
          />
        </div>
        <Input 
          label="Employee ID" 
          required 
          value={formData.employee_id}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, employee_id: e.target.value})}
        />
        <Input 
          label="Email Address" 
          type="email" 
          required 
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})}
        />
        <Input 
          label="Temporary Password" 
          type="password" 
          required 
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, password: e.target.value})}
        />
        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={createMutation.isPending}>Create Faculty</Button>
        </div>
      </form>
    </Dialog>
  );
}
