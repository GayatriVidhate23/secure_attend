import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Check, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface FaceEnrollmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | undefined;
  onSuccess: () => void;
}

export default function FaceEnrollmentDialog({ isOpen, onClose, studentId, onSuccess }: FaceEnrollmentDialogProps) {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
    }
  }, [webcamRef, setImgSrc]);

  const retake = () => {
    setImgSrc(null);
  };

  const submitEnrollment = async () => {
    if (!imgSrc || !studentId) return;

    setIsProcessing(true);
    try {
      // Convert base64 to Blob
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');

      await apiClient.post(`/students/${studentId}/face-enrollment`, formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      
      toast.success('Face enrolled successfully!');
      onSuccess();
      onClose();
      setImgSrc(null);
    } catch (error: any) {
      console.error("Enrollment error", error);
      const msg = error.response?.data?.detail?.message || error.response?.data?.detail || 'Failed to enroll face';
      toast.error(msg, { duration: 5000 });
      setImgSrc(null); // Force retake on error
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Face Enrollment" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Instructions:</h4>
          <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>Look directly at the camera.</li>
            <li>Ensure good lighting and avoid shadows on the face.</li>
            <li>Keep only one person visible in the frame.</li>
            <li>Remove heavy face obstructions (e.g., masks, dark sunglasses).</li>
          </ul>
        </div>

        <Card className="overflow-hidden border-2 border-slate-200 dark:border-slate-800 relative bg-black aspect-video flex items-center justify-center">
          {cameraError ? (
            <div className="text-center text-slate-400 p-6">
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <p>Camera permission denied or device not found.</p>
              <p className="text-sm mt-2">Please check your browser settings.</p>
            </div>
          ) : (
            <>
              {!imgSrc ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    onUserMediaError={() => setCameraError(true)}
                    className="w-full h-full object-cover"
                  />
                  {/* Face Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-64 border-4 border-dashed border-white/50 rounded-[4rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                  </div>
                </div>
              ) : (
                <img src={imgSrc} alt="Captured" className="w-full h-full object-cover" />
              )}
            </>
          )}
        </Card>

        <div className="flex justify-between items-center pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          
          <div className="flex space-x-3">
            {!imgSrc ? (
              <Button onClick={capture} disabled={cameraError || isProcessing} className="flex items-center gap-2 px-6">
                <Camera size={18} />
                <span>Capture</span>
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={retake} disabled={isProcessing} className="flex items-center gap-2">
                  <RefreshCw size={18} />
                  <span>Retake</span>
                </Button>
                <Button onClick={submitEnrollment} isLoading={isProcessing} className="flex items-center gap-2 px-6">
                  <Check size={18} />
                  <span>Submit Enrollment</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
