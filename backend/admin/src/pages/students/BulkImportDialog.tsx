import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';

export default function BulkImportDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (csvFile: File) => {
      const formData = new FormData();
      formData.append('file', csvFile);
      const { data } = await apiClient.post('/students/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['students'] });
        toast.success(`Successfully imported ${data.success_count} students`);
      } else {
        toast.error('Import failed due to validation errors');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to process import');
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,first_name,last_name,email,password,roll_number\nJohn,Doe,john@example.com,Student123!,CS2023001\nJane,Smith,jane@example.com,Student123!,CS2023002";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog isOpen={isOpen} onClose={() => { handleReset(); onClose(); }} title="Bulk Import Students">
      <div className="space-y-4">
        {!importResult ? (
          <>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <h3 className="font-medium text-slate-900 dark:text-white mb-2">Instructions</h3>
              <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1">
                <li>Upload a CSV file containing student data.</li>
                <li>Required columns: <strong>first_name, last_name, email, password, roll_number</strong></li>
                <li>Email and roll number must be unique.</li>
              </ul>
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="mt-3 text-blue-600">
                <FileText size={16} className="mr-2" /> Download Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {!file ? (
                <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Click to select a CSV file</p>
                  <p className="text-xs text-slate-500 mt-1">.csv files only</p>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-500 mr-3" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-400 hover:text-red-500">
                    <X size={18} />
                  </Button>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={!file} isLoading={importMutation.isPending}>
                Import Students
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg flex items-start ${importResult.success ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
              {importResult.success ? <CheckCircle className="mt-0.5 mr-3 shrink-0" /> : <AlertCircle className="mt-0.5 mr-3 shrink-0" />}
              <div>
                <h3 className="font-semibold">{importResult.message}</h3>
                <p className="text-sm mt-1">
                  Processed: {importResult.total_processed} | 
                  Duplicates skipped: {importResult.duplicate_count}
                </p>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                <div className="bg-red-50 dark:bg-red-900/40 px-4 py-2 font-medium text-red-800 dark:text-red-300 text-sm">
                  Errors ({importResult.errors.length})
                </div>
                <div className="max-h-60 overflow-y-auto bg-white dark:bg-slate-900 p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-medium w-16">Row</th>
                        <th className="px-4 py-2 font-medium">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {importResult.errors.map((err: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{err.row}</td>
                          <td className="px-4 py-2 text-red-600 dark:text-red-400">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <Button onClick={() => { handleReset(); onClose(); }}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
