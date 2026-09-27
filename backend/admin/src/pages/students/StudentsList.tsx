import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Eye, ShieldAlert, ShieldCheck, Download, ChevronRight, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import BulkImportDialog from './BulkImportDialog';

type YearKey = 'SE' | 'TE' | 'BE';

const YEAR_SEMESTER_MAP: Record<YearKey, number> = {
  SE: 1, // Semester 3
  TE: 3, // Semester 5
  BE: 5  // Semester 7
};

export default function StudentsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  
  const [selectedYear, setSelectedYear] = useState<YearKey | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<any | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch admin stats for accurate counts
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => (await apiClient.get('/admin/stats/')).data
  });

  // Fetch all divisions to dynamically get division_id when one is selected
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => (await apiClient.get('/academic/divisions')).data
  });

  // Fetch students ONLY for selected semester and division
  const semesterId = selectedYear ? YEAR_SEMESTER_MAP[selectedYear] : null;
  const divisionId = selectedDivision?.id || null;

  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students', semesterId, divisionId, searchTerm],
    queryFn: async () => {
      let url = `/students/?limit=1000`;
      if (semesterId) url += `&semester_id=${semesterId}`;
      if (divisionId) url += `&division_id=${divisionId}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const { data } = await apiClient.get(url);
      return data;
    },
    enabled: !!(semesterId && divisionId) // Only fetch when both are selected
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.post(`/students/${userId}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student status updated successfully');
    },
    onError: () => toast.error('Failed to update status')
  });

  // Available divisions for selected year
  const availableDivisions = useMemo(() => {
    if (!semesterId) return [];
    return divisions.filter((d: any) => d.semester_id === semesterId);
  }, [divisions, semesterId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Students</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage student accounts and enrollment</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsBulkImportOpen(true)} variant="outline" className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Download size={18} />
            <span>Bulk Import</span>
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
            <UserPlus size={18} />
            <span>Add Student</span>
          </Button>
        </div>
      </div>

      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
        <button 
          onClick={() => { setSelectedYear(null); setSelectedDivision(null); }}
          className={`hover:text-blue-600 transition-colors ${!selectedYear ? 'text-blue-600 font-bold' : ''}`}
        >
          All Years
        </button>
        {selectedYear && (
          <>
            <ChevronRight size={16} />
            <button 
              onClick={() => setSelectedDivision(null)}
              className={`hover:text-blue-600 transition-colors ${!selectedDivision ? 'text-blue-600 font-bold' : ''}`}
            >
              {selectedYear}
            </button>
          </>
        )}
        {selectedDivision && (
          <>
            <ChevronRight size={16} />
            <span className="text-blue-600 font-bold">{selectedDivision.name}</span>
          </>
        )}
      </div>

      {/* LEVEL 1: YEAR SELECTION */}
      {!selectedYear && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['SE', 'TE', 'BE'] as YearKey[]).map((year) => (
            <Card 
              key={year} 
              className="cursor-pointer hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-700 group"
              onClick={() => setSelectedYear(year)}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="text-blue-600 dark:text-blue-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{year}</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {stats?.grouped_students?.[year]?.total || 0} Students
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* LEVEL 2: DIVISION SELECTION */}
      {selectedYear && !selectedDivision && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableDivisions.map((div: any) => (
            <Card 
              key={div.id} 
              className="cursor-pointer hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-700 group"
              onClick={() => setSelectedDivision(div)}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="text-indigo-600 dark:text-indigo-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{div.name}</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {stats?.grouped_students?.[selectedYear]?.[div.name] || 0} Students
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* LEVEL 3: STUDENTS TABLE */}
      {selectedYear && selectedDivision && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>{selectedYear} - {selectedDivision.name} Students</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder={`Search in ${selectedDivision.name}...`} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingStudents ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading students...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length > 0 ? students.map((student: any) => (
                    <TableRow key={student.user_id}>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {student.roll_number}
                      </TableCell>
                      <TableCell>{student.first_name} {student.last_name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.department_id || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={student.is_active ? 'success' : 'error'}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/students/${student.user_id}`)}
                            title="View Details"
                          >
                            <Eye size={18} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate(student.user_id)}
                            title={student.is_active ? "Deactivate" : "Activate"}
                            className={student.is_active ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}
                          >
                            {student.is_active ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                        No students found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <CreateStudentDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} divisions={divisions} />
      <BulkImportDialog isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} />
    </div>
  );
}

function CreateStudentDialog({ isOpen, onClose, divisions }: { isOpen: boolean, onClose: () => void, divisions: any[] }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    roll_number: '',
    semester_id: 1, // Default to SE
    division_id: 0
  });

  // Filter divisions based on selected semester
  const availableDivs = useMemo(() => {
    return divisions.filter(d => d.semester_id === formData.semester_id);
  }, [divisions, formData.semester_id]);

  // Set default division when semester changes
  useMemo(() => {
    if (availableDivs.length > 0 && formData.division_id === 0) {
      setFormData(prev => ({ ...prev, division_id: availableDivs[0].id }));
    } else if (availableDivs.length > 0 && !availableDivs.find(d => d.id === formData.division_id)) {
      setFormData(prev => ({ ...prev, division_id: availableDivs[0].id }));
    }
  }, [availableDivs, formData.division_id]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiClient.post('/students/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast.success('Student created successfully');
      onClose();
      setFormData({ first_name: '', last_name: '', email: '', password: '', roll_number: '', semester_id: 1, division_id: 0 });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to create student');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add New Student">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
            <select 
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              value={formData.semester_id}
              onChange={(e) => setFormData({...formData, semester_id: parseInt(e.target.value)})}
            >
              <option value={1}>Second Year (SE)</option>
              <option value={3}>Third Year (TE)</option>
              <option value={5}>Final Year (BE)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Division</label>
            <select 
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              value={formData.division_id}
              onChange={(e) => setFormData({...formData, division_id: parseInt(e.target.value)})}
              required
            >
              <option value={0} disabled>Select Division</option>
              {availableDivs.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <Input 
          label="Roll Number" 
          required 
          value={formData.roll_number}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, roll_number: e.target.value})}
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
          <Button type="submit" isLoading={createMutation.isPending}>Create Student</Button>
        </div>
      </form>
    </Dialog>
  );
}
