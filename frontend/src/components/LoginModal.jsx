import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Shield, 
  User, 
  ArrowRight, 
  Mail, 
  Lock,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export const LoginModal = () => {
  const { login, error } = useAuth();
  
  // Tab state: 'author' (email only) vs 'admin' (email + password)
  const [roleTab, setRoleTab] = useState('author');
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    if (roleTab === 'admin' && !passwordInput.trim()) {
      setLocalError('Administrator login requires both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      setLocalError(null);
      await login(
        emailInput.trim(), 
        roleTab === 'admin' ? passwordInput.trim() : null
      );
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white text-center">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-3 text-white shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-2xl tracking-tight">BookLeaf Publishing</h2>
          <p className="text-xs text-emerald-100 mt-1">
            Author & Publisher Management Portal
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1">
          <button
            type="button"
            onClick={() => {
              setRoleTab('author');
              setLocalError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              roleTab === 'author'
                ? 'bg-white text-emerald-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Author Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleTab('admin');
              setLocalError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              roleTab === 'admin'
                ? 'bg-white text-indigo-950 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Publisher Admin</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {(localError || error) && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {roleTab === 'admin' ? 'Administrator Email' : 'Author Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Password input strictly for Admin */}
            {roleTab === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Administrator Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !emailInput.trim() || (roleTab === 'admin' && !passwordInput.trim())}
              className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1.5 shadow-md transition-all ${
                roleTab === 'admin'
                  ? 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-indigo-900/20'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-800/20'
              } disabled:opacity-50`}
            >
              <span>{submitting ? 'Authenticating...' : roleTab === 'admin' ? 'Sign In as Administrator' : 'Sign In as Author'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>

        <div className="bg-slate-50 p-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
          BookLeaf Publishing Platform • Secure Authentication
        </div>
      </div>
    </div>
  );
};

