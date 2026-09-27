import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      login(response.data.access_token, response.data.refresh_token);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Login failed');
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (role: 'admin' | 'faculty') => {
    if (role === 'admin') {
      setEmail('admin@secureattend.ai');
      setPassword('Admin@123!');
    } else {
      setEmail('faculty001@secureattend.demo');
      setPassword('Faculty@123!');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url('/bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm pointer-events-none"></div>

      <div className="animate-scale-in relative z-10 w-full max-w-md px-4">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header gradient strip */}
          <div className="h-1.5 w-full gradient-blue" />

          <div className="p-8 sm:p-10">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <img 
                src="/logo.png" 
                alt="SecureAttend Logo" 
                className="h-24 w-auto mb-4 object-contain drop-shadow-xl" 
              />
              <h1 className="text-2xl font-bold text-white tracking-tight">SecureAttend</h1>
              <p className="text-blue-200/70 mt-1 text-sm">Administration Portal</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-sm text-red-200 text-center animate-fade-in">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-blue-100/80" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/50" size={16} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all"
                    placeholder="admin@secureattend.ai"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-blue-100/80" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/50" size={16} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                id="login-submit-btn"
                className="mt-2 w-full py-3 px-4 gradient-blue hover:opacity-90 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Dev credentials hint */}
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Quick Access</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin')}
                  className="flex-1 text-xs py-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg border border-blue-500/20 transition-all font-medium"
                >
                  Admin Login
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('faculty')}
                  className="flex-1 text-xs py-2 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 rounded-lg border border-indigo-500/20 transition-all font-medium"
                >
                  Faculty Login
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          SecureAttend © 2026 · Face-Verified Attendance System
        </p>
      </div>
    </div>
  );
}
