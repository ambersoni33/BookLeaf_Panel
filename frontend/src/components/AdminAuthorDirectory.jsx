import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Users, 
  BookOpen, 
  DollarSign, 
  ShoppingBag, 
  Clock, 
  Search, 
  Filter, 
  MapPin, 
  MessageSquare, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { AdminAuthorSidepanel } from './AdminAuthorSidepanel';

export const AdminAuthorDirectory = () => {
  const [authors, setAuthors] = useState([]);
  const [companyStats, setCompanyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [pendingOnly, setPendingOnly] = useState(false);

  // Selected author for sidepanel
  const [selectedAuthor, setSelectedAuthor] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [authorsData, statsData] = await Promise.all([
        api.getAllAuthors(),
        api.getCompanyStats()
      ]);
      setAuthors(authorsData);
      setCompanyStats(statsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered authors list
  const filteredAuthors = authors.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.author_id.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      (a.books && a.books.some(b => b.title.toLowerCase().includes(q) || (b.genre && b.genre.toLowerCase().includes(q))));

    const matchesCity = cityFilter === 'ALL' || a.city.toLowerCase() === cityFilter.toLowerCase();
    const matchesPending = !pendingOnly || (a.metrics?.totalRoyaltyPending > 0);

    return matchesSearch && matchesCity && matchesPending;
  });

  const cities = Array.from(new Set(authors.map(a => a.city).filter(Boolean))).sort();

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Admin Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Shield className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">
                Publisher Administration
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Author Management & Operations Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Monitor signed authors, catalog distribution, royalties disbursement, and interact via live support sidepanel.
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Database Connected
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      {companyStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Authors
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-center justify-between">
              <span>{companyStats.totalAuthors}</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[11px] text-slate-500">Active roster</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Titles Catalog
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-center justify-between">
              <span>{companyStats.totalBooks}</span>
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-[11px] text-slate-500">{companyStats.publishedBooksCount} Live • {companyStats.inProductionCount} In Prod</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Total Sold
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-center justify-between">
              <span>{companyStats.totalCopiesSold.toLocaleString('en-IN')}</span>
              <ShoppingBag className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-[11px] text-slate-500">Retail & direct</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Total Royalties
            </span>
            <div className="text-xl font-bold text-emerald-800 mt-1 flex items-center justify-between">
              <span>₹{companyStats.totalRoyaltyEarned.toLocaleString('en-IN')}</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[11px] text-slate-500">Total generated</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Disbursed
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-center justify-between">
              <span>₹{companyStats.totalRoyaltyPaid.toLocaleString('en-IN')}</span>
              <DollarSign className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-[11px] text-slate-500">Settled payouts</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-amber-800 block tracking-wider">
              Pending Royalty
            </span>
            <div className="text-xl font-bold text-amber-800 mt-1 flex items-center justify-between">
              <span>₹{companyStats.totalRoyaltyPending.toLocaleString('en-IN')}</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-[11px] text-amber-700 font-medium">To be disbursed</span>
          </div>

        </div>
      )}

      {/* Main Author Directory Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-700" />
                All Signed Authors Directory ({filteredAuthors.length})
              </h2>
              <p className="text-xs text-slate-500">
                Click any author row to open the sliding sidepanel with chat, tickets, and book details.
              </p>
            </div>

            {/* Pending filter toggle */}
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(e) => setPendingOnly(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Only show authors with pending royalties</span>
            </label>
          </div>

          {/* Search & City Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search authors by name, email, author ID, city, or book title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 whitespace-nowrap">City:</span>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Cities ({cities.length})</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Authors Table */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading authors list...</div>
        ) : filteredAuthors.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No authors found</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Author Profile</th>
                  <th className="py-3 px-4">Location & Contact</th>
                  <th className="py-3 px-4">Books & Titles</th>
                  <th className="py-3 px-4 text-right">Copies Sold</th>
                  <th className="py-3 px-4 text-right">Lifetime Royalty</th>
                  <th className="py-3 px-4 text-right">Pending Payout</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuthors.map((author) => {
                  const books = author.books || [];
                  const pending = author.metrics?.totalRoyaltyPending || 0;
                  const isSelected = selectedAuthor?.author_id === author.author_id;

                  return (
                    <tr
                      key={author.author_id}
                      onClick={() => setSelectedAuthor(author)}
                      className={`hover:bg-indigo-50/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/70 font-medium' : ''
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-serif font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                            {author.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm hover:text-indigo-700">
                              {author.name}
                            </div>
                            <span className="font-mono text-[11px] text-slate-500">
                              {author.author_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact & City */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{author.city}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[160px]">
                          {author.email}
                        </div>
                      </td>

                      {/* Books titles summary */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {books.length} {books.length === 1 ? 'Title' : 'Titles'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-[200px]" title={books.map(b => b.title).join(', ')}>
                          {books.map(b => b.title).join(', ')}
                        </p>
                      </td>

                      {/* Copies sold */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                        {(author.metrics?.totalCopiesSold || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Total Royalty */}
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-800">
                        ₹{(author.metrics?.totalRoyaltyEarned || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Pending Royalty */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-block font-bold px-2 py-0.5 rounded text-xs ${
                          pending > 0 ? 'bg-amber-100 text-amber-800' : 'text-slate-400'
                        }`}>
                          ₹{pending.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAuthor(author);
                          }}
                          className="bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg font-medium text-xs flex items-center space-x-1 shadow-2xs mx-auto transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Sidepanel</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Admin Author Sidepanel (opens on click) */}
      {selectedAuthor && (
        <AdminAuthorSidepanel
          author={selectedAuthor}
          onClose={() => setSelectedAuthor(null)}
          onRefreshData={fetchData}
        />
      )}

    </div>
  );
};
