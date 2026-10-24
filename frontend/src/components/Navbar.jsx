import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Shield, 
  User, 
  ChevronDown, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Layers,
  Inbox,
  ArrowLeft
} from 'lucide-react';

export const Navbar = ({ 
  rightMenuOpen, 
  setRightMenuOpen, 
  activeTab, 
  setActiveTab,
  adminViewMode,
  setAdminViewMode,
  allAuthors = [],
  selectedAuthorId,
  setSelectedAuthorId
}) => {
  const { user, isAdmin, isAuthor, switchAccount, demoAccounts, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-lg text-slate-900 tracking-tight">BookLeaf</span>
                <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold ${
                  isAdmin ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isAdmin ? 'ADMIN' : 'AUTHOR'}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {isAdmin ? 'Publisher Executive Management Console' : 'Author Royalties & Creative Studio'}
              </p>
            </div>
          </div>

          {/* Center Navigation: Role-Dependent Navigation */}
          {/* 1. ADMIN NAVIGATION */}
          {isAdmin && (
            <div className="hidden md:flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setAdminViewMode('queue')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                  adminViewMode === 'queue'
                    ? 'bg-white text-indigo-950 shadow-sm font-bold border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 text-indigo-600" />
                <span>Inbound Ticket Queue</span>
              </button>

              <button
                onClick={() => setAdminViewMode('author_preview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                  adminViewMode === 'author_preview'
                    ? 'bg-white text-emerald-900 shadow-sm font-bold border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Inspect Author Pages</span>
              </button>
            </div>
          )}

          {/* 2. AUTHOR NAVIGATION (Zero Admin Options Visible) */}
          {isAuthor && (
            <div className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'details'
                    ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Author & Books Details
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'chat'
                    ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Tickets & Chat Desk
              </button>
            </div>
          )}

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            
            {/* Quick Switch User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium transition-colors"
                title="Account menu"
              >
                <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-indigo-600' : 'bg-emerald-600'}`}></span>
                <span className="font-semibold text-slate-900 truncate max-w-[120px]">
                  {isAdmin ? 'Admin Desk' : user?.name?.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Active Session: {isAdmin ? 'Publisher Admin' : 'Author'}
                  </div>
                  
                  <div className="px-3 py-2 text-xs border-b border-slate-100 bg-slate-50/50">
                    <p className="font-bold text-slate-900">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>

                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Drawer Toggle (For authors or author preview mode) */}
            {(isAuthor || (isAdmin && adminViewMode === 'author_preview')) && (
              <button
                onClick={() => setRightMenuOpen(!rightMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
              >
                {rightMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
