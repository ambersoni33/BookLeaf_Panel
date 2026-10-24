import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  User, 
  ShieldCheck, 
  Tag, 
  ChevronRight, 
  RefreshCw,
  X,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Paperclip,
  UploadCloud,
  FileText,
  BookOpen,
  Check,
  CheckCheck
} from 'lucide-react';

export const AuthorTicketsChatPage = ({ 
  authorId, 
  books = [],
  prefillBook = null, 
  onClearPrefill = () => {} 
}) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Chat message input
  const [inputMessage, setInputMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  // Author books list for query dropdown
  const [authorBooks, setAuthorBooks] = useState(books);
  useEffect(() => {
    if (books && books.length > 0) {
      setAuthorBooks(books);
    } else if (authorId) {
      api.getAuthorDetails(authorId).then(data => {
        if (data?.books) setAuthorBooks(data.books);
      }).catch(() => {});
    }
  }, [books, authorId]);

  // New ticket modal fields (as per updated requirements: book dropdown, subject, description, attachment)
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('general');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Auto-fill from prefillBook if user clicked "Book Query" on Page 1
  useEffect(() => {
    if (prefillBook) {
      setSelectedBookId(prefillBook.book_id);
      setNewSubject(`Query regarding "${prefillBook.title}"`);
      setNewDescription(`Hello BookLeaf Support Team,\nI have an inquiry regarding my title "${prefillBook.title}" (ISBN: ${prefillBook.isbn || 'N/A'}). `);
      setShowNewModal(true);
    }
  }, [prefillBook]);

  // Load/sync tickets for this author (supports silent background polling)
  const syncTickets = async (isInitial = false) => {
    if (!authorId) return;
    try {
      if (isInitial) setLoading(true);
      const data = await api.getTickets(authorId);
      
      setTickets(prev => {
        // Deep compare stringified to avoid unnecessary re-renders if nothing changed
        if (JSON.stringify(prev) !== JSON.stringify(data)) {
          return data;
        }
        return prev;
      });

      if (data.length > 0 && !selectedTicketId) {
        setSelectedTicketId(data[0].ticket_id);
      }
    } catch (err) {
      if (isInitial) console.error('Failed to load tickets:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const loadTickets = () => syncTickets(true);

  // Initial load + Real-time background polling every 3 seconds
  useEffect(() => {
    if (!authorId) return;

    // Load initial tickets
    syncTickets(true);

    // Start live polling every 3 seconds so replies from admin reflect immediately
    const pollTimer = setInterval(() => {
      syncTickets(false);
    }, 3000);

    return () => clearInterval(pollTimer);
  }, [authorId]);

  // Scroll to bottom of chat when messages change
  const selectedTicket = tickets.find(t => t.ticket_id === selectedTicketId) || null;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages?.length]);

  // Automatically mark incoming admin messages as read when author views this ticket
  useEffect(() => {
    if (!selectedTicketId || !selectedTicket) return;
    const hasUnreadAdminMsg = selectedTicket.messages?.some(m => m.sender_role === 'admin' && !m.is_read);
    if (hasUnreadAdminMsg) {
      api.markMessagesRead(selectedTicketId).then(() => {
        setTickets(prev => prev.map(t => {
          if (t.ticket_id === selectedTicketId) {
            return {
              ...t,
              messages: t.messages?.map(m => m.sender_role === 'admin' ? { ...m, is_read: true } : m)
            };
          }
          return t;
        }));
      }).catch(err => console.warn('Silent read mark error:', err.message));
    }
  }, [selectedTicketId, selectedTicket?.messages]);

  // Send a new chat message in the thread
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !selectedTicketId || sendingMessage) return;

    try {
      setSendingMessage(true);
      const res = await api.sendTicketMessage(selectedTicketId, inputMessage.trim());
      
      // Update local ticket messages immediately
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
      setInputMessage('');

      // Immediately trigger rapid background sync to catch admin responses
      setTimeout(() => syncTickets(false), 1200);
      setTimeout(() => syncTickets(false), 3000);
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  // Submit new ticket with validation
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) {
      alert('Please provide a subject line (minimum 5 characters).');
      return;
    }
    if (newSubject.trim().length < 5) {
      alert('Subject line must be at least 5 characters long.');
      return;
    }
    if (!newDescription.trim()) {
      alert('Please provide a detailed description of your query.');
      return;
    }
    if (newDescription.trim().length < 10) {
      alert('Detailed description must be at least 10 characters long to provide sufficient context for support.');
      return;
    }

    try {
      setCreatingTicket(true);
      const created = await api.createTicket({
        author_id: authorId,
        book_id: selectedBookId !== 'general' ? selectedBookId : null,
        subject: newSubject.trim(),
        description: newDescription.trim(),
        file_attachment_name: attachedFile ? attachedFile.name : null,
        initial_message: newDescription.trim()
      });

      setTickets(prev => [created, ...prev]);
      setSelectedTicketId(created.ticket_id);
      setShowNewModal(false);
      setNewSubject('');
      setNewDescription('');
      setSelectedBookId('general');
      setAttachedFile(null);
      onClearPrefill();

      // Start rapid polling immediately after ticket creation
      setTimeout(() => syncTickets(false), 1000);
      setTimeout(() => syncTickets(false), 2500);
      setTimeout(() => syncTickets(false), 4500);
    } catch (err) {
      const msg = err.response?.data?.errors 
        ? err.response.data.errors.map(e => e.message).join('\n')
        : (err.response?.data?.message || err.message);
      alert('Failed to create ticket:\n' + msg);
    } finally {
      setCreatingTicket(false);
    }
  };

  // Update status (e.g. author marking as Closed or reopening)
  const handleStatusChange = async (newStatus) => {
    if (!selectedTicketId) return;
    try {
      const updated = await api.updateTicketStatus(selectedTicketId, newStatus);
      setTickets(prev => prev.map(t => t.ticket_id === selectedTicketId ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter !== 'ALL') {
      return matchesSearch && t.status.toLowerCase() === statusFilter.toLowerCase();
    }
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Closed': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent': return <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold border border-rose-200">Urgent</span>;
      case 'High': return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-semibold border border-orange-200">High</span>;
      case 'Medium': return <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-medium border border-sky-200">Medium</span>;
      default: return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Low</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Author Support & Ticket Chat Desk
              </h2>
              <p className="text-xs text-slate-500">
                Raise queries, view past tickets, and live-chat directly with BookLeaf editorial, distribution & finance teams.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live Sync Active Indicator */}
          <span className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync Active</span>
          </span>

          <button
            onClick={loadTickets}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh tickets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-1.5 shadow-sm transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Raise New Ticket</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Interface: Left Tickets List / Right Chat Pane */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] max-h-[800px]">
        
        {/* Left Column: Tickets List (4 cols) */}
        <div className="lg:col-span-5 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
          
          {/* Search & Filters */}
          <div className="p-3 border-b border-slate-200 bg-white space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket subject or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
              {['ALL', 'Open', 'In Progress', 'Resolved', 'Closed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    statusFilter === st 
                      ? 'bg-emerald-700 text-white shadow-2xs' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Items Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No tickets found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "Raise New Ticket" to create one.</p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.ticket_id === selectedTicketId;
                const lastMsg = t.messages?.[t.messages.length - 1];
                return (
                  <button
                    key={t.ticket_id}
                    onClick={() => {
                      setSelectedTicketId(t.ticket_id);
                      api.markMessagesRead(t.ticket_id).catch(() => {});
                    }}
                    className={`w-full text-left p-3.5 transition-all flex flex-col space-y-1.5 ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600 shadow-2xs'
                        : 'hover:bg-white border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-600">
                        {t.ticket_id}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {getPriorityBadge(t.priority)}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getStatusColor(t.status)}`}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <h4 className={`text-xs font-semibold line-clamp-1 ${
                      isSelected ? 'text-emerald-950 font-bold' : 'text-slate-800'
                    }`}>
                      {t.subject}
                    </h4>

                    {lastMsg && (
                      <div className="flex items-center text-[11px] text-slate-500 italic">
                        {lastMsg.sender_role === 'author' && (
                          lastMsg.is_read ? (
                            <span title="Viewed by BookLeaf Support" className="text-sky-500 mr-1 not-italic inline-flex shrink-0">
                              <CheckCheck className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span title="Delivered to BookLeaf" className="text-slate-400 mr-1 not-italic inline-flex shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )
                        )}
                        <span className="font-medium not-italic text-slate-700 mr-1 shrink-0">
                          {lastMsg.sender_role === 'author' ? 'You' : 'Support'}:
                        </span>
                        <span className="truncate">{lastMsg.message}</span>
                        {lastMsg.sender_role === 'admin' && !lastMsg.is_read && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="New unread message from Support" />
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {t.category}
                      </span>
                      <span>
                        {new Date(t.updated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>

        {/* Right Column: Chat Interface & Thread (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white">
          {selectedTicket ? (
            <>
              {/* Ticket Header & Status Selector */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {selectedTicket.ticket_id}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs font-medium text-slate-600">
                      {selectedTicket.category}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <h3 className="font-serif font-bold text-sm sm:text-base text-slate-900 mt-1">
                    {selectedTicket.subject}
                  </h3>
                </div>

                {/* Status Switcher for Author */}
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none ${getStatusColor(selectedTicket.status)}`}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Chat Messages Conversation Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/30">
                {selectedTicket.messages?.map((msg, index) => {
                  const isAuthorMsg = msg.sender_role === 'author';
                  return (
                    <div
                      key={msg.message_id || index}
                      className={`flex flex-col ${isAuthorMsg ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 px-1">
                        {!isAuthorMsg && (
                          <div className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[9px] font-bold">
                            BL
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-slate-600">
                          {isAuthorMsg ? (msg.sender_name || 'You') : msg.sender_name}
                        </span>
                        {!isAuthorMsg && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-medium flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" /> Staff
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                          isAuthorMsg
                            ? 'bg-emerald-700 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        
                        {/* Timestamp & Delivery/Read Status Ticks */}
                        <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] select-none ${
                          isAuthorMsg ? 'text-emerald-100/80' : 'text-slate-400'
                        }`}>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isAuthorMsg && (
                            msg.is_read ? (
                              <span title="Viewed by BookLeaf Support" className="flex items-center text-sky-300 ml-0.5">
                                <CheckCheck className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span title="Delivered to BookLeaf" className="flex items-center text-emerald-200/80 ml-0.5">
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

              {/* Quick Canned Reply Chips */}
              <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center space-x-2 overflow-x-auto text-[11px]">
                <span className="text-slate-400 text-[10px] whitespace-nowrap">Suggested:</span>
                {[
                  'When will this reflect in my account?',
                  'Can I order 50 author copies?',
                  'Thank you for the quick assistance!'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputMessage(chip)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 rounded-full whitespace-nowrap transition-colors border border-slate-200"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your reply to BookLeaf support..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || sendingMessage}
                    className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">No ticket selected</p>
              <p className="text-xs text-slate-400 mt-1">Select an existing ticket from the left or raise a new one.</p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-4 bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-medium"
              >
                + Raise New Ticket
              </button>
            </div>
          )}
        </div>

      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fade-in relative">
            
            <button
              onClick={() => {
                setShowNewModal(false);
                onClearPrefill();
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-slate-900">
                  Raise Support / Help Desk Ticket
                </h3>
                <p className="text-xs text-slate-500">
                  Direct message to BookLeaf editorial, distribution and royalty desk
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              
              {/* 1. Book Selection Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Query Regarding (Book or General Account) *
                </label>
                <div className="relative">
                  <select
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all appearance-none pr-8 font-medium"
                  >
                    <option value="general">
                      🏢 General / Account Level (Not Book Specific)
                    </option>
                    {authorBooks && authorBooks.length > 0 && (
                      <optgroup label="Your Published & In-Production Titles">
                        {authorBooks.map((b) => (
                          <option key={b.book_id} value={b.book_id}>
                            📖 {b.title} ({b.book_id} • {b.status})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select your title if this query relates to royalties, printing, or distribution for a specific book.
                </p>
              </div>

              {/* 2. Subject Line */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October Royalty calculation breakdown clarification"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* 3. Detailed Description Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide all relevant details, questions, copy counts, platform names, or dates..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* 4. Optional File Attachment Support (UI Only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attachments (Optional)
                </label>
                
                {attachedFile ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-emerald-950 truncate">{attachedFile.name}</span>
                      <span className="text-[10px] text-emerald-700 shrink-0">
                        ({(attachedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl bg-slate-50 hover:bg-emerald-50/30 cursor-pointer transition-all group">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAttachedFile(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="flex items-center space-x-2 text-xs text-slate-500 group-hover:text-emerald-700">
                      <UploadCloud className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      <span className="font-medium">Attach supporting screenshots, invoices, or proofs</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      PDF, PNG, JPG, DOCX up to 10MB (UI attachment preview)
                    </span>
                  </label>
                )}
              </div>

              {/* AI Auto-Triage Notice Badge */}
              <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-100/90 text-[11px] text-indigo-900 leading-relaxed">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>AI Auto-Classification & Auto-Priority:</strong> Your ticket will be automatically classified into BookLeaf departments and assigned an urgency priority score by AI upon submission.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    onClearPrefill();
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {creatingTicket ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting Ticket...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
