import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, ShieldCheck, Camera } from 'lucide-react';
import apiClient from '../../api/client';

import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function FacultyStudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/students/${id}`);
      return data;
    },
    retry: false
  });

  const { data: faceStatus, isLoading: isFaceLoading } = useQuery({
    queryKey: ['faceStatus', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/students/${id}/face-enrollment/status`);
      return data;
    },
    retry: false,
    enabled: !!student // Only try fetching face status if student is fetched successfully
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading student details...</div>;
  }

  if (error || !student) {
    return (
      <div className="p-12 max-w-lg mx-auto mt-10 bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/30 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          The requested student was not found or is not currently enrolled in any of your assigned divisions.
        </p>
        <Button onClick={() => navigate('/faculty-panel/students')}>Return to My Students</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/faculty-panel/students')} className="px-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Details</h1>
            <p className="text-slate-500 dark:text-slate-400">{student.first_name} {student.last_name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Full Name</p>
                <p className="mt-1 text-base font-medium text-slate-900 dark:text-white">
                  {student.first_name} {student.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Roll Number</p>
                <p className="mt-1 text-base font-medium text-slate-900 dark:text-white">{student.roll_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</p>
                <p className="mt-1 text-base font-medium text-slate-900 dark:text-white">{student.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</p>
                <div className="mt-1">
                  <Badge variant={student.is_active ? 'success' : 'error'}>
                    {student.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Face Enrollment Status (Read-Only) */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="text-slate-500" size={20} />
              <span>Face Biometrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            {isFaceLoading ? (
              <div className="py-8 text-slate-500">Checking status...</div>
            ) : faceStatus?.face_enrolled ? (
              <>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Face Enrolled</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Ready for AI Attendance.
                </p>
                <p className="text-xs text-slate-400">
                  Enrolled: {new Date(faceStatus.enrolled_at).toLocaleDateString()}
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert size={32} />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Not Enrolled</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This student has not yet enrolled their face for AI Attendance.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
