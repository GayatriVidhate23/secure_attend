import { useEffect, useState } from 'react';
import { PieChart, BookOpen, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import apiClient from '../../api/client';
import { formatDivisionLabel } from '../../utils/formatters';

export default function FacultyReports() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/faculty/my-classes');
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await apiClient.get('/reports/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'my_classes_attendance.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-slate-500">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Reports</h1>
          <p className="text-slate-500 dark:text-slate-400">Attendance analytics for your assigned classes</p>
        </div>
        <Button onClick={handleExportCSV} className="flex items-center gap-2">
          <Download size={18} />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportSummaryCard 
          title="Overall Attendance Percentage" 
          value={`${summary?.overall_percentage || 0}%`}
          description="Across all your subjects and divisions"
          icon={PieChart}
        />
        <ReportSummaryCard 
          title="Total Sessions Conducted" 
          value={summary?.total_sessions_conducted || 0}
          description="Total lectures you have taken"
          icon={BookOpen}
        />
      </div>

      <Card className="mt-8 bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Class-wise Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {!summary?.classes || summary.classes.length === 0 ? (
            <p className="text-slate-500">No classes found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 uppercase border-b dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Division</th>
                    <th className="px-4 py-3">Sessions</th>
                    <th className="px-4 py-3">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.classes.map((cls: any, idx: number) => {
                    const semMatch = cls.semester.match(/\d+/);
                    const semNum = semMatch ? parseInt(semMatch[0]) : 0;
                    return (
                      <tr key={idx} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium">{cls.subject_name}</td>
                        <td className="px-4 py-3">{formatDivisionLabel(semNum, cls.division)}</td>
                        <td className="px-4 py-3">{cls.sessions_conducted}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${cls.percentage < 75 ? 'text-red-500' : 'text-green-500'}`}>
                            {cls.percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportSummaryCard({ title, value, description, icon: Icon }: any) {
  return (
    <Card className="hover:border-blue-300 transition-colors bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <Icon className="text-blue-500" size={20} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{value}</div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </CardContent>
    </Card>
  );
}
