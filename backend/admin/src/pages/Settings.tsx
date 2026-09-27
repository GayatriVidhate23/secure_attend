import React, { useState, useEffect } from 'react';
import { ShieldCheck, QrCode, Server, User, Save, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

export default function Settings() {
  const { user } = useAuth();
  
  const [geofence, setGeofence] = useState({ 
    latitude: 0, 
    longitude: 0, 
    radius_meters: 200,
    qr_duration_seconds: 10,
    enforce_liveness: true
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    const fetchGeofence = async () => {
      if (user?.role !== 'ADMIN') {
        setFetching(false);
        return;
      }
      try {
        const response = await apiClient.get('/admin/settings/geofence');
        setGeofence({
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          radius_meters: response.data.radius_meters,
          qr_duration_seconds: response.data.qr_duration_seconds ?? 10,
          enforce_liveness: response.data.enforce_liveness ?? true
        });
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error("Failed to fetch geofence settings");
        }
      } finally {
        setFetching(false);
      }
    };
    fetchGeofence();
  }, [user]);

  const handleSaveGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    
    try {
      await apiClient.post('/admin/settings/geofence', geofence);
      setMessage({ type: 'success', text: 'Geofence configuration saved successfully.' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to save configuration.';
      setMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Validation error.' });
    } finally {
      setLoading(false);
    }
  };

  const [attendanceMessage, setAttendanceMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const handleSaveAttendance = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAttendanceMessage(null);
    setAttendanceLoading(true);
    
    try {
      await apiClient.post('/admin/settings/geofence', geofence);
      setAttendanceMessage({ type: 'success', text: 'Attendance configuration saved successfully.' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to save configuration.';
      setAttendanceMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Validation error.' });
    } finally {
      setAttendanceLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Configure SecureAttend preferences and view system status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {user?.role === 'ADMIN' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin size={18} className="text-red-500" />
                  Global Campus Geofence
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fetching ? (
                  <p className="text-sm text-slate-500">Loading configuration...</p>
                ) : (
                  <form onSubmit={handleSaveGeofence} className="space-y-4">
                    {message && (
                      <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Campus Latitude</label>
                        <input 
                          type="number" 
                          step="any"
                          required
                          value={geofence.latitude}
                          onChange={(e) => setGeofence({...geofence, latitude: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                          placeholder="e.g. 19.0760"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Campus Longitude</label>
                        <input 
                          type="number" 
                          step="any"
                          required
                          value={geofence.longitude}
                          onChange={(e) => setGeofence({...geofence, longitude: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                          placeholder="e.g. 72.8777"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Allowed Radius (Meters)</label>
                      <input 
                        type="number" 
                        step="any"
                        required
                        min="1"
                        max="50000"
                        value={geofence.radius_meters}
                        onChange={(e) => setGeofence({...geofence, radius_meters: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                      />
                      <p className="text-xs text-slate-500 mt-1">Students must be within this distance from the campus center to mark attendance.</p>
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        <Save size={16} />
                        {loading ? 'Saving...' : 'Save Configuration'}
                      </button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode size={18} className="text-blue-500" />
                Attendance Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {attendanceMessage && (
                <div className={`p-3 rounded-lg text-sm ${attendanceMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {attendanceMessage.text}
                </div>
              )}
              <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">Dynamic QR Duration</h3>
                  <p className="text-sm text-slate-500">How long each rotating QR code remains valid</p>
                </div>
                <select 
                  value={geofence.qr_duration_seconds}
                  onChange={(e) => {
                    const newDuration = parseInt(e.target.value);
                    setGeofence({...geofence, qr_duration_seconds: newDuration});
                  }}
                  className="bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                >
                  <option value={10}>10 Seconds</option>
                  <option value={15}>15 Seconds</option>
                  <option value={30}>30 Seconds</option>
                  <option value={60}>60 Seconds</option>
                </select>
              </div>

              <div className="flex justify-between items-center py-3">
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">Enforce Liveness Detection</h3>
                  <p className="text-sm text-slate-500">Require face liveness during scan</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGeofence({...geofence, enforce_liveness: !geofence.enforce_liveness})}
                  className={`w-10 h-5 rounded-full relative transition-colors ${geofence.enforce_liveness ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${geofence.enforce_liveness ? 'right-0.5' : 'left-0.5'}`}></div>
                </button>
              </div>
              <div className="pt-2 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button 
                  type="button" 
                  onClick={handleSaveAttendance}
                  disabled={attendanceLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {attendanceLoading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={18} className="text-indigo-500" />
                Admin Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                    {user?.email || 'admin@secureattend.ai'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Role</label>
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold text-blue-600">
                    {user?.role || 'ADMIN'}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-4 italic">
                Password changes and profile edits are managed securely by the backend administrator.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server size={18} className="text-emerald-500" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Application</span>
                <span className="font-medium text-slate-900 dark:text-white">SecureAttend</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Version</span>
                <span className="font-medium text-slate-900 dark:text-white">v1.1.0 (Phase 8)</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">API Status</span>
                <span className="flex items-center gap-1 font-medium text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">AI Engine</span>
                <span className="flex items-center gap-1 font-medium text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> InsightFace
                </span>
              </div>
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium mb-1">
                  <ShieldCheck size={16} className="text-blue-500" />
                  System Healthy
                </div>
                <p className="text-xs text-slate-500">
                  All microservices and database connections are operating normally.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
