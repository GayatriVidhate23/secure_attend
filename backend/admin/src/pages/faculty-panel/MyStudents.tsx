import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, ChevronRight, Users } from 'lucide-react';

import apiClient from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';

type YearKey = 'SE' | 'TE' | 'BE';

const SEMESTER_YEAR_MAP: Record<number, YearKey> = {
  1: 'SE', // Semester 3 (id=1)
  2: 'SE', // Semester 4 (id=2)
  3: 'TE', // Semester 5 (id=3)
  4: 'TE', // Semester 6 (id=4)
  5: 'BE', // Semester 7 (id=5)
  6: 'BE'  // Semester 8 (id=6)
};

const YEAR_SEMESTER_MAP: Record<YearKey, number> = {
  SE: 1, // Semester 3
  TE: 3, // Semester 5
  BE: 5  // Semester 7
};

export default function MyStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<YearKey | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<any | null>(null);

  // Fetch faculty assignments to build authorized scope
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['faculty-subjects', user?.id],
    queryFn: async () => (await apiClient.get(`/faculty/${user?.id}/subjects`)).data,
    enabled: !!user?.id
  });

  // Derive authorized years and divisions
  const { availableYears, divisionsByYear } = useMemo(() => {
    const years = new Set<YearKey>();
    const divMap: Record<YearKey, Map<number, any>> = {
      SE: new Map(),
      TE: new Map(),
      BE: new Map()
    };

    assignments.forEach((a: any) => {
      const year = SEMESTER_YEAR_MAP[a.semester_id];
      if (year) {
        years.add(year);
        if (!divMap[year].has(a.division_id)) {
          divMap[year].set(a.division_id, {
            id: a.division_id,
            name: a.division_name,
            semester_id: a.semester_id
          });
        }
      }
    });

    return {
      availableYears: Array.from(years).sort(), // e.g. BE, SE, TE
      divisionsByYear: {
        SE: Array.from(divMap.SE.values()),
        TE: Array.from(divMap.TE.values()),
        BE: Array.from(divMap.BE.values())
      }
    };
  }, [assignments]);

  // Fetch students ONLY for selected semester and division
  const divisionId = selectedDivision?.id || null;
  const semesterId = selectedDivision?.semester_id || (selectedYear ? YEAR_SEMESTER_MAP[selectedYear] : null);

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

  const availableDivisions = selectedYear ? divisionsByYear[selectedYear] : [];

  if (isLoadingAssignments) {
    return <div className="p-8 text-center text-slate-500">Loading your assignment scope...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Students</h1>
          <p className="text-slate-500 dark:text-slate-400">View students assigned to your divisions.</p>
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
          {availableYears.length > 0 ? availableYears.map((year) => (
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
                  {divisionsByYear[year].length} Division(s)
                </p>
              </CardContent>
            </Card>
          )) : (
            <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
              No students are currently within your assignment scope.
            </div>
          )}
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
                <p className="text-sm text-slate-500 mt-2">View Students</p>
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
                      <TableCell>
                        <Badge variant={student.is_active ? 'success' : 'error'}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/faculty-panel/students/${student.user_id}`)}
                          title="View Details"
                        >
                          <Eye size={18} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">
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
    </div>
  );
}
