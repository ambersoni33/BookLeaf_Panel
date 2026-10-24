import React, { useState } from 'react';
import { 
  BookOpen, 
  DollarSign, 
  ShoppingBag, 
  CreditCard, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Printer, 
  Tag, 
  Layers, 
  Search,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';

export const AuthorDetailsPage = ({ author, onRaiseTicketForBook, onOpenChat }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  if (!author) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const books = author.books || [];
  const metrics = author.metrics || {
    totalBooks: books.length,
    totalCopiesSold: books.reduce((sum, b) => sum + (Number(b.total_copies_sold) || 0), 0),
    totalRoyaltyEarned: books.reduce((sum, b) => sum + (Number(b.total_royalty_earned) || 0), 0),
    totalRoyaltyPaid: books.reduce((sum, b) => sum + (Number(b.royalty_paid) || 0), 0),
    totalRoyaltyPending: books.reduce((sum, b) => sum + (Number(b.royalty_pending) || 0), 0),
    latestPayoutDate: books.find(b => b.last_royalty_payout_date)?.last_royalty_payout_date || 'N/A'
  };

  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.genre && b.genre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.isbn && b.isbn.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === 'PUBLISHED') {
      return matchesSearch && b.status.toLowerCase().includes('published');
    }
    if (statusFilter === 'PRODUCTION') {
      return matchesSearch && !b.status.toLowerCase().includes('published');
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Author Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-serif text-2xl font-bold shadow-inner">
              {author.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {author.name}
                </h1>
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {author.author_id}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/15 text-white flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verified BookLeaf Author
                </span>
              </div>

              {/* Author Meta Info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  {author.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  {author.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {author.city}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Joined {new Date(author.joined_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Support shortcut */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenChat}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-950/30 transition-all hover:-translate-y-0.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Publisher Help Desk</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Titles */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Authored Books</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.totalBooks}</div>
          <p className="text-[11px] text-slate-500 mt-1">Titles in publication</p>
        </div>

        {/* Copies Sold */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Copies Sold</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.totalCopiesSold.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all retail channels</p>
        </div>

        {/* Total Royalty Earned */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lifetime Royalty</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800">
            ₹{metrics.totalRoyaltyEarned.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> Cumulative earnings
          </p>
        </div>

        {/* Royalty Paid */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Royalty Disbursed</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{metrics.totalRoyaltyPaid.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Last payout: {metrics.latestPayoutDate ? new Date(metrics.latestPayoutDate).toLocaleDateString('en-IN') : 'None'}
          </p>
        </div>

        {/* Royalty Pending */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow col-span-2 lg:col-span-1 bg-gradient-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending Payout</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-800">
            ₹{metrics.totalRoyaltyPending.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            {metrics.totalRoyaltyPending > 0 ? 'Queued for monthly batch' : 'All cleared'}
          </p>
        </div>

      </div>

      {/* Books Section Header & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-700" />
              Books & Royalty Statements
            </h2>
            <p className="text-xs text-slate-500">
              Detailed breakdown of titles, print partners, distribution channels, and individual royalty performance.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Status Segmented Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({books.length})
              </button>
              <button
                onClick={() => setStatusFilter('PUBLISHED')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'PUBLISHED' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Published
              </button>
              <button
                onClick={() => setStatusFilter('PRODUCTION')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'PRODUCTION' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In Production
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search books by title, genre, or ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Books List Grid / Cards */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No books found</p>
            <p className="text-xs text-slate-400">Try adjusting your search or status filter</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBooks.map((book) => {
              const isPublished = book.status && book.status.toLowerCase().includes('published');
              return (
                <div 
                  key={book.book_id}
                  className="p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all hover:shadow-md group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Book Meta & Title */}
                    <div className="flex items-start space-x-4">
                      {/* Book Cover simulation */}
                      <div className={`w-14 h-20 rounded-md shrink-0 flex flex-col justify-between p-1.5 shadow-md border ${
                        isPublished 
                          ? 'bg-gradient-to-b from-emerald-800 to-teal-950 text-white border-emerald-700' 
                          : 'bg-gradient-to-b from-slate-700 to-slate-900 text-slate-200 border-slate-600'
                      }`}>
                        <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-300">
                          {book.book_id}
                        </span>
                        <span className="text-[10px] font-serif font-bold line-clamp-2 leading-tight">
                          {book.title}
                        </span>
                        <div className="w-full h-0.5 bg-white/20"></div>
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif font-bold text-base text-slate-900 group-hover:text-emerald-800 transition-colors">
                            {book.title}
                          </h3>
                          
                          {/* Status Badge */}
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isPublished 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}>
                            {isPublished ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                            {book.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                          <span className="font-mono text-slate-600 font-medium">
                            ISBN: {book.isbn || 'Pending Assignment'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {book.genre}
                          </span>
                          {book.publication_date && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Published {new Date(book.publication_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </>
                          )}
                          {book.print_partner && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Printer className="w-3 h-3 text-slate-400" />
                                Print: {book.print_partner}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Retail Platform Availability */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          <span className="text-[11px] text-slate-400 mr-1">Available On:</span>
                          {book.available_on && book.available_on.length > 0 ? (
                            book.available_on.map((platform, idx) => (
                              <span 
                                key={idx} 
                                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200"
                              >
                                {platform}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Pending publication release
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Royalty Statistics Matrix & Ticket Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      
                      {/* Financials Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-right">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">MRP / Royalty</span>
                          <span className="text-xs font-bold text-slate-800">
                            {book.mrp ? `₹${book.mrp}` : '—'} 
                            {book.author_royalty_per_copy ? ` (₹${book.author_royalty_per_copy}/copy)` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Sold</span>
                          <span className="text-xs font-bold text-slate-800">
                            {book.total_copies_sold || 0} copies
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Royalty Earned</span>
                          <span className="text-xs font-bold text-emerald-800">
                            ₹{(book.total_royalty_earned || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Pending</span>
                          <span className={`text-xs font-bold ${
                            book.royalty_pending > 0 ? 'text-amber-700' : 'text-slate-500'
                          }`}>
                            ₹{(book.royalty_pending || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Action Button: Raise Ticket about this book */}
                      <button
                        onClick={() => onRaiseTicketForBook(book)}
                        className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-emerald-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors shrink-0 shadow-2xs"
                        title="Raise Support Query about this title"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Book Query</span>
                      </button>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
