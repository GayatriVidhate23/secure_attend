import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, ShieldCheck, Camera, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';

import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import FaceEnrollmentDialog from './FaceEnrollmentDialog';

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/students/${id}`);
      return data;
    }
  });

  const { data: faceStatus, isLoading: isFaceLoading } = useQuery({
    queryKey: ['faceStatus', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/students/${id}/face-enrollment/status`);
      return data;
    }
  });

  const removeEnrollment = async () => {
    if (!confirm('Are you sure you want to remove this face enrollment?')) return;
    try {
      await apiClient.delete(`/students/${id}/face-enrollment`);
      queryClient.invalidateQueries({ queryKey: ['faceStatus', id] });
      toast.success('Face enrollment removed');
    } catch (e) {
      toast.error('Failed to remove enrollment');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading student details...</div>;
  }

  if (!student) {
    return <div className="p-8 text-center text-red-500">Student not found</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/students')} className="px-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Details</h1>
            <p className="text-slate-500 dark:text-slate-400">{student.first_name} {student.last_name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Edit size={16} />
            <span>Edit</span>
          </Button>
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

        {/* Face Enrollment Status */}
        <Card className="border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="text-blue-500" size={20} />
              <span>Face Enrollment</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            {isFaceLoading ? (
              <div className="py-8 text-slate-500">Loading status...</div>
            ) : faceStatus?.face_enrolled ? (
              <>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Face Enrolled</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Ready for AI Attendance. Model: {faceStatus.model_name}
                </p>
                <p className="text-xs text-slate-400 mb-6">
                  Enrolled: {new Date(faceStatus.enrolled_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" onClick={() => setIsEnrollOpen(true)} className="flex-1">Re-Enroll</Button>
                  <Button variant="danger" onClick={removeEnrollment} className="px-3" title="Remove Enrollment">
                    <Trash2 size={18} />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert size={32} />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Not Enrolled</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Face biometrics are required for attendance tracking.
                </p>
                <Button onClick={() => setIsEnrollOpen(true)} className="w-full flex items-center justify-center space-x-2">
                  <Camera size={18} />
                  <span>Enroll Face</span>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <FaceEnrollmentDialog 
        isOpen={isEnrollOpen} 
        onClose={() => setIsEnrollOpen(false)} 
        studentId={id}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['faceStatus', id] })}
      />
    </div>
  );
}
