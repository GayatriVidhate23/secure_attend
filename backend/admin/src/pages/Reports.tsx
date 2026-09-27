import { useEffect, useState, useMemo } from 'react';
import { BarChart3, PieChart, Users, BookOpen, Download, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import apiClient from '../api/client';
// import { useAuth } from '../contexts/AuthContext';
import { formatDivisionLabel } from '../utils/formatters';

export default function Reports() {
  // const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [semesters, setSemesters] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  
  const [selectedSem, setSelectedSem] = useState<string>("");
  const [selectedDiv, setSelectedDiv] = useState<string>("");
  const [selectedSub, setSelectedSub] = useState<string>("");
  const [selectedFac, setSelectedFac] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedSem, selectedDiv, selectedSub, selectedFac, startDate, endDate]);

  const fetchFilters = async () => {
    try {
      const [semRes, divRes, subRes, facRes] = await Promise.all([
        apiClient.get('/academic/semesters'),
        apiClient.get('/academic/divisions'),
        apiClient.get('/academic/subjects'),
        apiClient.get('/faculty/')
      ]);
      setSemesters(semRes.data);
      setDivisions(divRes.data);
      setSubjects(subRes.data);
      setFaculty(facRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedSem) params.append('semester_id', selectedSem);
      if (selectedDiv) params.append('division_id', selectedDiv);
      if (selectedSub) params.append('subject_id', selectedSub);
      if (selectedFac) params.append('faculty_id', selectedFac);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const qs = params.toString() ? `?${params.toString()}` : "";

      const [sumRes, defRes, stuRes, sessRes] = await Promise.all([
        apiClient.get(`/reports/admin/summary${qs}`),
        apiClient.get(`/reports/admin/defaulters${qs}`),
        apiClient.get(`/reports/admin/students${qs}`),
        apiClient.get(`/reports/admin/sessions${qs}`)
      ]);

      setSummary(sumRes.data);
      setDefaulters(defRes.data);
      setStudents(stuRes.data);
      setSessions(sessRes.data);
    } catch (err: any) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSem) params.append('semester_id', selectedSem);
      if (selectedDiv) params.append('division_id', selectedDiv);
      if (selectedSub) params.append('subject_id', selectedSub);
      if (selectedFac) params.append('faculty_id', selectedFac);
      if (selectedSub) params.append('subject_id', selectedSub);
      if (selectedFac) params.append('faculty_id', selectedFac);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiClient.get(`/reports/export/csv${qs}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'attendance_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed", err);
    }
  };
  
  // Calculate division wise trend for visualization
  const divisionTrend = useMemo(() => {
    try {
      if (!students || students.length === 0) return [];
      const grouped: any = {};
      students.forEach(s => {
        const semStr = s.semester || '';
        const match = semStr.match(/\d+/);
        const semNum = parseInt(match?.[0] || '0');
        const divName = formatDivisionLabel(semNum, s.division || '');
        if(!grouped[divName]) grouped[divName] = { present: 0, total: 0 };
        grouped[divName].present += (s.present_classes || 0);
        grouped[divName].total += (s.total_classes || 0);
      });
      return Object.keys(grouped).map(k => ({
        name: k,
        perc: grouped[k].total > 0 ? (grouped[k].present / grouped[k].total * 100) : 0
      }));
    } catch (e) {
      console.error("Trend error:", e);
      return [];
    }
  }, [students]);

  const availableDivisions = useMemo(() => {
    if (!selectedSem) return divisions;
    return divisions.filter((d: any) => d.semester_id?.toString() === selectedSem);
  }, [divisions, selectedSem]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Reports</h1>
          <p className="text-slate-500 dark:text-slate-400">System-wide attendance analytics</p>
        </div>
        <Button onClick={handleExportCSV} className="flex items-center gap-2">
          <Download size={18} />
          Export CSV
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
            <select 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white p-2 border"
              value={selectedSem} onChange={e => { setSelectedSem(e.target.value); setSelectedDiv(""); }}
            >
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Division</label>
            <select 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white p-2 border"
              value={selectedDiv} onChange={e => setSelectedDiv(e.target.value)}
            >
              <option value="">All Divisions</option>
              {availableDivisions.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
            <select 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white p-2 border"
              value={selectedSub} onChange={e => setSelectedSub(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Faculty</label>
            <select 
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white p-2 border"
              value={selectedFac} onChange={e => setSelectedFac(e.target.value)}
            >
              <option value="">All Faculty</option>
              {faculty.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
            <input 
              type="date"
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white p-2 border"
              value={startDate} onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
            <input 
              type="date"
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white p-2 border"
              value={endDate} onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="bg-red-50 text-red-500 p-4 rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle size={20}/>
          {error}
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-64 text-slate-500">Loading reports...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ReportSummaryCard 
              title="Overall Attendance" 
              value={`${summary?.overall_percentage || 0}%`}
              description={`${summary?.total_present} / ${summary?.total_expected_attendance} Expected`}
              icon={PieChart}
            />
            <ReportSummaryCard 
              title="Conducted Sessions" 
              value={summary?.total_sessions || 0}
              description="Total lectures conducted"
              icon={BookOpen}
            />
            <ReportSummaryCard 
              title="Total Absent" 
              value={summary?.total_absent || 0}
              description="Missed expected classes"
              icon={Users}
            />
            <ReportSummaryCard 
              title="Defaulters (<75%)" 
              value={defaulters.length}
              description="Students requiring attention"
              icon={BarChart3}
            />
          </div>

          <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Attendance Trend by Division</CardTitle>
            </CardHeader>
            <CardContent>
              {divisionTrend.length === 0 ? (
                <p className="text-slate-500 text-sm">No data available for trend.</p>
              ) : (
                <div className="space-y-4">
                  {divisionTrend.map(dt => (
                    <div key={dt.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{dt.name}</span>
                        <span className="text-slate-500">{dt.perc.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${dt.perc}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800 h-96 overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle>Students Attendance</CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1">
                {students.length === 0 ? (
                  <p className="text-slate-500">No students found.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 uppercase sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Roll</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Div</th>
                        <th className="px-3 py-2">Expected</th>
                        <th className="px-3 py-2">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => {
                        const semStr = student.semester || '';
                        const match = semStr.match(/\d+/);
                        const semNum = parseInt(match?.[0] || '0');
                        return (
                          <tr key={idx} className="border-b dark:border-slate-800">
                            <td className="px-3 py-2 font-medium">{student.roll_number}</td>
                            <td className="px-3 py-2">{student.student_name}</td>
                            <td className="px-3 py-2">{formatDivisionLabel(semNum, student.division)}</td>
                            <td className="px-3 py-2">{student.present_classes} / {student.total_classes}</td>
                            <td className="px-3 py-2 font-bold">{student.percentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800 h-96 overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle>Session History</CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1">
                {sessions.length === 0 ? (
                  <p className="text-slate-500">No sessions found.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 uppercase sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Date/Time</th>
                        <th className="px-3 py-2">Subject</th>
                        <th className="px-3 py-2">Div</th>
                        <th className="px-3 py-2">Att.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((sess, idx) => {
                        const semStr = sess.semester || '';
                        const match = semStr.match(/\d+/);
                        const semNum = parseInt(match?.[0] || '0');
                        return (
                          <tr key={idx} className="border-b dark:border-slate-800">
                            <td className="px-3 py-2">
                              <div className="font-medium whitespace-nowrap">{sess.date}</div>
                              <div className="text-xs text-slate-500">{sess.time}</div>
                            </td>
                            <td className="px-3 py-2">{sess.subject}</td>
                            <td className="px-3 py-2">{formatDivisionLabel(semNum, sess.division)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="font-bold">{sess.percentage}%</div>
                              <div className="text-xs text-slate-500">{sess.present}/{sess.expected}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle>Defaulters (Below 75%)</CardTitle>
            </CardHeader>
            <CardContent>
              {defaulters.length === 0 ? (
                <p className="text-slate-500">No defaulters found.</p>
              ) : (
                <div className="overflow-x-auto h-64">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 uppercase sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Roll</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Div</th>
                        <th className="px-3 py-2">Expected</th>
                        <th className="px-3 py-2">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defaulters.map((student, idx) => {
                        const semStr = student.semester || '';
                        const match = semStr.match(/\d+/);
                        const semNum = parseInt(match?.[0] || '0');
                        return (
                          <tr key={idx} className="border-b dark:border-slate-800">
                            <td className="px-3 py-2 font-medium">{student.roll_number}</td>
                            <td className="px-3 py-2">{student.student_name}</td>
                            <td className="px-3 py-2">{formatDivisionLabel(semNum, student.division)}</td>
                            <td className="px-3 py-2">{student.present_classes} / {student.total_classes}</td>
                            <td className="px-3 py-2 text-red-500 font-bold">{student.percentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
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
