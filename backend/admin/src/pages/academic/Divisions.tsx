
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export default function Divisions() {
  const { data: divisions = [], isLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/academic/divisions');
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Divisions Management</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage student divisions and classes</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Divisions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Division Name</TableHead>
                  <TableHead>Semester ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisions.length > 0 ? divisions.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.semester_id}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-6 text-slate-500">No divisions found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
