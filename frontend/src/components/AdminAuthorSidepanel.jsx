import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { 
  X, 
  MessageSquare, 
  Send, 
  BookOpen, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Tag, 
  Shield, 
  Plus, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Check,
  CheckCheck
} from 'lucide-react';

export const AdminAuthorSidepanel = ({ author, onClose, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'books' | 'royalties'
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [loadingTickets, setLoadingTickets] = useState(false);
  
  // Chat reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [adminAlias, setAdminAlias] = useState('BookLeaf Support Specialist');
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef(null);

  // New ticket modal inside sidepanel
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Royalty & Payouts');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newInitialMsg, setNewInitialMsg] = useState('');

  // Fetch tickets for this author
  const loadAuthorTickets = async () => {
    if (!author?.author_id) return;
    try {
      setLoadingTickets(true);
      const data = await api.getTickets(author.author_id);
      setTickets(data);
      if (data.length > 0 && !selectedTicketId) {
        setSelectedTicketId(data[0].ticket_id);
      }
    } catch (err) {
      console.error('Failed to load tickets for author:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadAuthorTickets();
  }, [author?.author_id]);

  const selectedTicket = tickets.find(t => t.ticket_id === selectedTicketId) || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages?.length]);

  // When admin views selected ticket, mark unread author messages as read
  useEffect(() => {
    if (!selectedTicketId || !selectedTicket) return;
    const hasUnreadAuthorMsg = selectedTicket.messages?.some(m => m.sender_role === 'author' && !m.is_read);
    if (hasUnreadAuthorMsg) {
      api.markMessagesRead(selectedTicketId).then(() => {
        setTickets(prev => prev.map(t => {
          if (t.ticket_id === selectedTicketId) {
            return {
              ...t,
              messages: t.messages?.map(m => m.sender_role === 'author' ? { ...m, is_read: true } : m)
            };
          }
          return t;
        }));
      }).catch(err => console.warn('Silent read mark error:', err.message));
    }
  }, [selectedTicketId, selectedTicket?.messages]);

  // Send admin chat message
  const handleSendAdminReply = async (e) => {
    e?.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId || sendingReply) return;

    try {
      setSendingReply(true);
      const res = await api.sendTicketMessage(selectedTicketId, replyMessage.trim(), adminAlias);

      setTickets(prev => prev.map(t => {
        if (t.ticket_id === selectedTicketId) {
          return {
            ...t,
            updated_at: new Date().toISOString(),
            messages: [...t.messages, res.message]
          };
        }
        return t;
      }));
      setReplyMessage('');
    } catch (err) {
      alert('Failed to send reply: ' + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // Change ticket status
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTicketId) return;
    try {
      await api.updateTicketStatus(selectedTicketId, newStatus);
      setTickets(prev => prev.map(t => t.ticket_id === selectedTicketId ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Admin initiates ticket for author
  const handleCreateAdminTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    try {
      const created = await api.createTicket({
        author_id: author.author_id,
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
        initial_message: newInitialMsg.trim()
      });
      setTickets(prev => [created, ...prev]);
      setSelectedTicketId(created.ticket_id);
      setShowNewTicketModal(false);
      setNewSubject('');
      setNewInitialMsg('');
    } catch (err) {
      alert('Failed to create ticket: ' + err.message);
    }
  };

  if (!author) return null;

  const books = author.books || [];
  const metrics = author.metrics || {
    totalBooks: books.length,
    totalCopiesSold: books.reduce((s, b) => s + (Number(b.total_copies_sold) || 0), 0),
    totalRoyaltyEarned: books.reduce((s, b) => s + (Number(b.total_royalty_earned) || 0), 0),
    totalRoyaltyPaid: books.reduce((s, b) => s + (Number(b.royalty_paid) || 0), 0),
    totalRoyaltyPending: books.reduce((s, b) => s + (Number(b.royalty_pending) || 0), 0)
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
      />

      {/* Sidepanel */}
      <aside className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl border-l border-slate-200 flex flex-col animate-fade-in">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/30 border border-emerald-400/30 text-emerald-300 flex items-center justify-center font-serif text-lg font-bold">
              {author.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-bold text-lg text-white">
                  {author.name}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {author.author_id}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center space-x-2 mt-0.5">
                <span>{author.email}</span>
                <span>•</span>
                <span>{author.city}</span>
                <span>•</span>
                <span>{author.phone}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close sidepanel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'tickets'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Support Tickets & Chat ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('books')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'books'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Author's Books ({books.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('royalties')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'royalties'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Royalty Financials</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/30">
          
          {/* TAB 1: Support Tickets & Chat Interface */}
          {activeTab === 'tickets' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Ticket sub-header with "Open New Thread" */}
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-1 overflow-x-auto">
                  {tickets.map(t => (
                    <button
                      key={t.ticket_id}
                      onClick={() => setSelectedTicketId(t.ticket_id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                        t.ticket_id === selectedTicketId
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span className="font-mono text-[10px]">{t.ticket_id}</span>
                      <span className="truncate max-w-[120px]">{t.subject}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowNewTicketModal(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 shrink-0 ml-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Query</span>
                </button>
              </div>

              {selectedTicket ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                  
                  {/* Selected Ticket Control Bar */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-700">{selectedTicket.ticket_id}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-600">{selectedTicket.category}</span>
                        <span>•</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                          Priority: {selectedTicket.priority}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 mt-0.5">{selectedTicket.subject}</p>
                    </div>

                    {/* Status updater for Admin */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        className="text-xs font-bold px-2 py-1 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Messages Thread */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                    {selectedTicket.messages?.map((msg, idx) => {
                      const isAdminMsg = msg.sender_role === 'admin';
                      return (
                        <div
                          key={msg.message_id || idx}
                          className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center space-x-1.5 mb-1 px-1">
                            <span className="text-[11px] font-semibold text-slate-600">
                              {isAdminMsg ? (msg.sender_name || 'Admin Desk') : author.name}
                            </span>
                            {isAdminMsg && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded font-medium">
                                Admin Desk
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                              isAdminMsg
                                ? 'bg-indigo-700 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                            
                            {/* Timestamp & Delivery/Read Status Ticks */}
                            <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] select-none ${
                              isAdminMsg ? 'text-indigo-200/80' : 'text-slate-400'
                            }`}>
                              <span>
                                {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isAdminMsg && (
                                msg.is_read ? (
                                  <span title="Viewed by Author" className="flex items-center text-sky-300 ml-0.5">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span title="Delivered to Author" className="flex items-center text-indigo-200/80 ml-0.5">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Admin Quick Response Bar */}
                  <form onSubmit={handleSendAdminReply} className="p-3 border-t border-slate-200 bg-white">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-[11px] text-slate-400">Reply as:</span>
                      <input
                        type="text"
                        value={adminAlias}
                        onChange={(e) => setAdminAlias(e.target.value)}
                        className="text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 w-48"
                        placeholder="Admin Desk Name"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder={`Reply to ${author.name}...`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      />
                      <button
                        type="submit"
                        disabled={!replyMessage.trim() || sendingReply}
                        className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  </form>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No tickets raised by {author.name} yet.</p>
                  <button
                    onClick={() => setShowNewTicketModal(true)}
                    className="mt-3 bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    + Open Support Thread
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Author's Books */}
          {activeTab === 'books' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Published & In-Production Titles ({books.length})
              </h4>
              {books.map(b => (
                <div key={b.book_id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-800">{b.book_id}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border">
                      {b.status}
                    </span>
                  </div>
                  <h5 className="font-serif font-bold text-sm text-slate-900">{b.title}</h5>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>ISBN: {b.isbn || 'Pending'}</span>
                    <span>•</span>
                    <span>{b.genre}</span>
                    <span>•</span>
                    <span>Print: {b.print_partner || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg text-xs text-center border">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sold</span>
                      <span className="font-bold">{b.total_copies_sold || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Royalty</span>
                      <span className="font-bold text-emerald-800">₹{(b.total_royalty_earned || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pending</span>
                      <span className="font-bold text-amber-700">₹{(b.royalty_pending || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px] text-slate-400 pt-1">
                    <span>Channels:</span>
                    {b.available_on?.map((ch, idx) => (
                      <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{ch}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Royalties */}
          {activeTab === 'royalties' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lifetime Earned</span>
                  <span className="text-xl font-bold text-emerald-800">
                    ₹{metrics.totalRoyaltyEarned.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Disbursed</span>
                  <span className="text-xl font-bold text-slate-800">
                    ₹{metrics.totalRoyaltyPaid.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/50 col-span-2">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Pending Disbursement</span>
                  <span className="text-2xl font-bold text-amber-800">
                    ₹{metrics.totalRoyaltyPending.toLocaleString('en-IN')}
                  </span>
                  <p className="text-xs text-amber-700 mt-1">
                    {metrics.totalRoyaltyPending > 0 ? 'Scheduled in next payout batch.' : 'No pending balance.'}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <h5 className="text-xs font-bold text-slate-700">Author Direct Contact Information</h5>
                <p className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {author.email}
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {author.phone}
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {author.city}
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Joined {author.joined_date}
                </p>
              </div>
            </div>
          )}

        </div>

      </aside>

      {/* New Admin Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-3">
            <h4 className="font-bold text-sm text-slate-900">Initiate Publisher Query for {author.name}</h4>
            <form onSubmit={handleCreateAdminTicket} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Subject..."
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="w-full text-xs p-2 border rounded"
              />
              <textarea
                rows={3}
                required
                placeholder="Message for author..."
                value={newInitialMsg}
                onChange={e => setNewInitialMsg(e.target.value)}
                className="w-full text-xs p-2 border rounded"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-3 py-1.5 text-xs border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-emerald-700 text-white rounded font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
