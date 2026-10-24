import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { RightSlidingNav } from './components/RightSlidingNav';
import { AuthorDetailsPage } from './components/AuthorDetailsPage';
import { AuthorTicketsChatPage } from './components/AuthorTicketsChatPage';
import { AdminTicketQueue } from './components/AdminTicketQueue';
import { LoginModal } from './components/LoginModal';
import { User, ArrowLeft, Eye, ShieldCheck, ChevronRight } from 'lucide-react';

export const App = () => {
  const { user, loading, isAdmin, isAuthor } = useAuth();
  
  // Author Dashboard active page tab: 'details' (Page 1) or 'chat' (Page 2)
  const [activeTab, setActiveTab] = useState('details');
  
  // Right side sliding menu state (open/close)
  const [rightMenuOpen, setRightMenuOpen] = useState(false);

  // Author details fetched from API (for logged in author or admin preview)
  const [authorProfile, setAuthorProfile] = useState(null);
  const [loadingAuthor, setLoadingAuthor] = useState(false);

  // Book selected for support query
  const [prefillBook, setPrefillBook] = useState(null);

  // ADMIN-SPECIFIC STATE: Allows admin to inspect author pages without logging out!
  const [adminViewMode, setAdminViewMode] = useState('queue'); // 'queue' | 'author_preview'
  const [adminSelectedAuthorId, setAdminSelectedAuthorId] = useState('AUTH001');
  const [allAuthorsList, setAllAuthorsList] = useState([]);

  // Load all authors list if admin
  useEffect(() => {
    if (isAdmin) {
      api.getAllAuthors()
        .then(authors => {
          setAllAuthorsList(authors);
          if (authors.length > 0 && !adminSelectedAuthorId) {
            setAdminSelectedAuthorId(authors[0].author_id);
          }
        })
        .catch(err => console.warn('Could not load authors for admin inspection:', err.message));
    }
  }, [isAdmin]);

  // Load target author profile (either current logged-in author, or admin-selected author in preview mode)
  useEffect(() => {
    const targetId = isAuthor ? user?.author_id : (isAdmin && adminViewMode === 'author_preview' ? adminSelectedAuthorId : null);
    
    if (targetId) {
      setLoadingAuthor(true);
      api.getAuthorDetails(targetId)
        .then(data => setAuthorProfile(data))
        .catch(err => console.error('Failed to load author profile:', err))
        .finally(() => setLoadingAuthor(false));
    }
  }, [isAuthor, user?.author_id, isAdmin, adminViewMode, adminSelectedAuthorId]);

  // Handle switching to chat tab with prefilled book
  const handleRaiseTicketForBook = (book) => {
    setPrefillBook(book);
    setActiveTab('chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
        <p className="font-serif text-lg tracking-wide text-emerald-200">Loading BookLeaf Platform...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        rightMenuOpen={rightMenuOpen}
        setRightMenuOpen={setRightMenuOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminViewMode={adminViewMode}
        setAdminViewMode={setAdminViewMode}
        allAuthors={allAuthorsList}
        selectedAuthorId={adminSelectedAuthorId}
        setSelectedAuthorId={setAdminSelectedAuthorId}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* 1. ADMIN - INBOUND TICKET QUEUE */}
        {isAdmin && adminViewMode === 'queue' && (
          <AdminTicketQueue />
        )}

        {/* 2. ADMIN - INSPECTING AUTHOR PAGES (WITHOUT LOGGING OUT) */}
        {isAdmin && adminViewMode === 'author_preview' && (
          <div className="space-y-4">
            
            {/* Admin Inspection Header Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-4 rounded-xl shadow-md border border-indigo-700 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <ShieldCheck className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm tracking-wide text-indigo-100 uppercase">
                      Admin Inspection Mode
                    </span>
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                      Live Author View
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200">
                    Viewing platform pages as author without logging out. Select any author below:
                  </p>
                </div>
              </div>

              {/* Author Selector Dropdown & Switcher */}
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <div className="flex items-center space-x-2 bg-indigo-950/80 px-3 py-1.5 rounded-lg border border-indigo-600/60 w-full sm:w-auto">
                  <User className="w-4 h-4 text-indigo-300 shrink-0" />
                  <select
                    value={adminSelectedAuthorId}
                    onChange={(e) => setAdminSelectedAuthorId(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer w-full"
                  >
                    {allAuthorsList.map((a) => (
                      <option key={a.author_id} value={a.author_id} className="bg-slate-900 text-white">
                        {a.name} ({a.author_id} - {a.books?.length || 0} books)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setAdminViewMode('queue')}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors border border-white/20 shrink-0 flex items-center space-x-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Queue</span>
                </button>
              </div>
            </div>

            {/* Author Page Tabs Selector for Admin */}
            <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'details'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>1. Author Details & Royalty Reports</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'chat'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>2. Tickets & Chat Desk</span>
              </button>
            </div>

            {/* Rendered Author Page Component */}
            {activeTab === 'details' && (
              <AuthorDetailsPage
                author={authorProfile}
                onRaiseTicketForBook={handleRaiseTicketForBook}
                onOpenChat={() => setActiveTab('chat')}
              />
            )}

            {activeTab === 'chat' && (
              <AuthorTicketsChatPage
                authorId={adminSelectedAuthorId}
                books={authorProfile?.books || []}
                prefillBook={prefillBook}
                onClearPrefill={() => setPrefillBook(null)}
              />
            )}
          </div>
        )}

        {/* 3. AUTHOR VIEW (STRICTLY AUTHOR ONLY - ZERO ADMIN ACCESS) */}
        {isAuthor && (
          <div>
            {/* Sliding navigation drawer on the right edge */}
            <RightSlidingNav
              isOpen={rightMenuOpen}
              setIsOpen={setRightMenuOpen}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              authorData={authorProfile}
            />

            {/* Page 1: Author Details, Sales & Books */}
            {activeTab === 'details' && (
              <AuthorDetailsPage
                author={authorProfile}
                onRaiseTicketForBook={handleRaiseTicketForBook}
                onOpenChat={() => setActiveTab('chat')}
              />
            )}

            {/* Page 2: Chat Interface & Support Tickets */}
            {activeTab === 'chat' && (
              <AuthorTicketsChatPage
                authorId={user.author_id}
                books={authorProfile?.books || []}
                prefillBook={prefillBook}
                onClearPrefill={() => setPrefillBook(null)}
              />
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 BookLeaf Publishing House. Role-Based Access Control Active.</span>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Author Royalty Desk</span>
            <span>•</span>
            <span>Publisher Management</span>
            <span>•</span>
            <span>PostgreSQL RBAC</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
