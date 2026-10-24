import React from 'react';
import { 
  BookOpen, 
  MessageSquare, 
  X, 
  ChevronRight, 
  User, 
  Coins, 
  HelpCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const RightSlidingNav = ({ 
  isOpen, 
  setIsOpen, 
  activeTab, 
  setActiveTab, 
  authorData,
  ticketCount = 0 
}) => {
  return (
    <>
      {/* Floating Edge Tab (visible when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-2 rounded-l-xl shadow-xl flex flex-col items-center space-y-2 group transition-all"
          title="Open Page Tabs Menu"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider [writing-mode:vertical-rl] rotate-180 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
            Page Tabs
          </span>
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </div>
        </button>
      )}

      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
        />
      )}

      {/* Sliding Menu Drawer on the Right */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white z-50 shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              RT
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800">Right Sliding Navigation</h3>
              <p className="text-[11px] text-slate-500">BookLeaf Author Workspace</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Author Quick Status Chip */}
        {authorData && (
          <div className="p-4 mx-4 my-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                {authorData.name}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 font-medium">
                {authorData.author_id}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-200/50">
              <div>
                <span className="text-slate-500 block">Total Books</span>
                <span className="font-semibold text-slate-800">{authorData.books?.length || 0} Titles</span>
              </div>
              <div>
                <span className="text-slate-500 block">Pending Royalty</span>
                <span className="font-semibold text-emerald-800">
                  ₹{authorData.metrics?.totalRoyaltyPending?.toLocaleString('en-IN') || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sliding Navigation Tabs */}
        <div className="p-4 flex-1 space-y-3 overflow-y-auto">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Author Portal Pages
          </p>

          {/* Tab 1: Author Details & Books */}
          <button
            onClick={() => {
              setActiveTab('details');
              setIsOpen(false);
            }}
            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start space-x-3 group ${
              activeTab === 'details'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
              activeTab === 'details' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
            }`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-semibold ${
                  activeTab === 'details' ? 'text-emerald-950' : 'text-slate-800'
                }`}>
                  1. Author & Books Details
                </h4>
                {activeTab === 'details' && (
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-medium">Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                View author profile, lifetime sales, royalty breakdowns, and published & upcoming catalog.
              </p>
            </div>
          </button>

          {/* Tab 2: Chat & Ticket Desk */}
          <button
            onClick={() => {
              setActiveTab('chat');
              setIsOpen(false);
            }}
            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start space-x-3 group ${
              activeTab === 'chat'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
              activeTab === 'chat' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
            }`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-semibold ${
                  activeTab === 'chat' ? 'text-emerald-950' : 'text-slate-800'
                }`}>
                  2. Support & Chat Desk
                </h4>
                {activeTab === 'chat' && (
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-medium">Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Raise queries with BookLeaf editorial & distribution, check old tickets, and chat directly.
              </p>
            </div>
          </button>

          {/* Quick Help box */}
          <div className="mt-8 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-700 mb-1">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold">How right-sliding tabs work:</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Use this sliding menu from the right edge anytime to switch between your Book Details page and the Chat / Support ticketing interface seamlessly.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 text-center">
          <p className="text-[11px] text-slate-400">
            BookLeaf Publishing Platform • v1.0
          </p>
        </div>
      </aside>
    </>
  );
};
