import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { 
  Inbox, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  MessageSquare, 
  Send, 
  X, 
  ChevronRight, 
  AlertCircle, 
  User, 
  Tag, 
  RefreshCw,
  Sparkles,
  Shield,
  Layers,
  BookOpen,
  Paperclip,
  FileText,
  Bot,
  UserCheck,
  StickyNote,
  Copy,
  Check,
  CheckCheck,
  AlertTriangle,
  Zap,
  Edit3
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

export const AdminTicketQueue = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('ALL'); // 'ALL' | 'unviewed' | 'viewed'
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Currently opened ticket in sidepanel
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [adminAlias, setAdminAlias] = useState('BookLeaf Support Specialist');
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef(null);

  // AI & Admin ticket management states
  const [reanalyzingId, setReanalyzingId] = useState(null);
  const [internalNotesDraft, setInternalNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [updatingOverride, setUpdatingOverride] = useState(false);

  const fetchTickets = async (mode = 'initial') => {
    try {
      if (mode === 'manual') setRefreshing(true);
      else if (mode === 'initial') setLoading(true);

      const data = await api.getTickets();
      
      setTickets(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(data)) {
          return data;
        }
        return prev;
      });

      // If a ticket was currently opened, update its reference
      if (selectedTicket) {
        const updated = data.find(t => t.ticket_id === selectedTicket.ticket_id);
        if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTicket)) {
          setSelectedTicket(updated);
        }
      }
    } catch (err) {
      if (mode !== 'silent') console.error('Failed to load tickets queue:', err);
    } finally {
      if (mode === 'initial') setLoading(false);
      if (mode === 'manual') setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets('initial');

    // Poll every 3.5 seconds to instantly catch incoming author messages
    const pollInterval = setInterval(() => {
      fetchTickets('silent');
    }, 3500);

    return () => clearInterval(pollInterval);
  }, [selectedTicket?.ticket_id]);

  // When selected ticket changes, sync internal notes draft
  useEffect(() => {
    if (selectedTicket) {
      setInternalNotesDraft(selectedTicket.internal_notes || '');
      setNotesSavedSuccess(false);
    }
  }, [selectedTicket?.ticket_id]);

  // Scroll to bottom of chat when new message is added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages?.length]);

  // When selected ticket has unread author messages, mark them as read (gives Author double ticks)
  useEffect(() => {
    if (!selectedTicket?.ticket_id) return;
    const hasUnreadAuthorMsg = selectedTicket.messages?.some(m => m.sender_role === 'author' && !m.is_read);
    if (hasUnreadAuthorMsg) {
      api.markMessagesRead(selectedTicket.ticket_id).then(() => {
        setSelectedTicket(prev => prev ? {
          ...prev,
          messages: prev.messages?.map(m => m.sender_role === 'author' ? { ...m, is_read: true } : m)
        } : null);
        setTickets(prev => prev.map(t => {
          if (t.ticket_id === selectedTicket.ticket_id) {
            return {
              ...t,
              messages: t.messages?.map(m => m.sender_role === 'author' ? { ...m, is_read: true } : m)
            };
          }
          return t;
        }));
      }).catch(err => console.warn('Silent read mark error:', err.message));
    }
  }, [selectedTicket?.ticket_id, selectedTicket?.messages]);

  // Open ticket sidepanel and auto-mark as 'viewed'
  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);

    // Immediately mark author messages as read in database (so author sees double blue tick)
    api.markMessagesRead(ticket.ticket_id).then(() => {
      setSelectedTicket(prev => prev ? {
        ...prev,
        messages: prev.messages?.map(m => m.sender_role === 'author' ? { ...m, is_read: true } : m)
      } : null);
      setTickets(prev => prev.map(t => {
        if (t.ticket_id === ticket.ticket_id) {
          return {
            ...t,
            messages: t.messages?.map(m => m.sender_role === 'author' ? { ...m, is_read: true } : m)
          };
        }
        return t;
      }));
    }).catch(err => console.warn('Failed to mark messages as read:', err));

    // If currently unviewed, automatically update state to 'viewed'
    if (ticket.view_state === 'unviewed') {
      try {
        await api.updateTicketViewState(ticket.ticket_id, 'viewed');
        setTickets(prev => prev.map(t => 
          t.ticket_id === ticket.ticket_id ? { ...t, view_state: 'viewed' } : t
        ));
        setSelectedTicket(prev => prev ? { ...prev, view_state: 'viewed' } : null);
      } catch (err) {
        console.error('Failed to auto-mark ticket as viewed:', err);
      }
    }
  };

  // Toggle viewed/unviewed state directly
  const handleToggleViewState = async (ticketId, currentState, e) => {
    e?.stopPropagation();
    const newState = currentState === 'viewed' ? 'unviewed' : 'viewed';
    try {
      await api.updateTicketViewState(ticketId, newState);
      if (newState === 'viewed') {
        api.markMessagesRead(ticketId).catch(() => {});
      }
      setTickets(prev => prev.map(t => 
        t.ticket_id === ticketId ? { ...t, view_state: newState } : t
      ));
      if (selectedTicket && selectedTicket.ticket_id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, view_state: newState }));
      }
    } catch (err) {
      console.error('Failed to update ticket view state:', err);
    }
  };

  // Update ticket workflow status
  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      await api.updateTicketStatus(ticketId, newStatus);
      setTickets(prev => prev.map(t => 
        t.ticket_id === ticketId ? { ...t, status: newStatus } : t
      ));
      if (selectedTicket && selectedTicket.ticket_id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  // Admin Override Category
  const handleOverrideCategory = async (newCategory) => {
    if (!selectedTicket) return;
    try {
      setUpdatingOverride(true);
      await api.overrideTicket(selectedTicket.ticket_id, { category: newCategory });
      setTickets(prev => prev.map(t => 
        t.ticket_id === selectedTicket.ticket_id ? { ...t, category: newCategory } : t
      ));
      setSelectedTicket(prev => ({ ...prev, category: newCategory }));
    } catch (err) {
      alert('Failed to override category: ' + err.message);
    } finally {
      setUpdatingOverride(false);
    }
  };

  // Admin Override Priority
  const handleOverridePriority = async (newPriority) => {
    if (!selectedTicket) return;
    try {
      setUpdatingOverride(true);
      await api.overrideTicket(selectedTicket.ticket_id, { priority: newPriority });
      setTickets(prev => prev.map(t => 
        t.ticket_id === selectedTicket.ticket_id ? { ...t, priority: newPriority } : t
      ));
      setSelectedTicket(prev => ({ ...prev, priority: newPriority }));
    } catch (err) {
      alert('Failed to override priority: ' + err.message);
    } finally {
      setUpdatingOverride(false);
    }
  };

  // Save Private Internal Notes
  const handleSaveInternalNotes = async () => {
    if (!selectedTicket) return;
    try {
      setSavingNotes(true);
      await api.updateInternalNotes(selectedTicket.ticket_id, internalNotesDraft);
      setTickets(prev => prev.map(t => 
        t.ticket_id === selectedTicket.ticket_id ? { ...t, internal_notes: internalNotesDraft } : t
      ));
      setSelectedTicket(prev => ({ ...prev, internal_notes: internalNotesDraft }));
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2500);
    } catch (err) {
      alert('Failed to save internal notes: ' + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // Assign Ticket
  const handleAssignTicket = async (staff) => {
    if (!selectedTicket) return;
    try {
      await api.assignTicket(selectedTicket.ticket_id, staff);
      setTickets(prev => prev.map(t => 
        t.ticket_id === selectedTicket.ticket_id ? { ...t, assigned_to: staff } : t
      ));
      setSelectedTicket(prev => ({ ...prev, assigned_to: staff }));
    } catch (err) {
      alert('Failed to assign ticket: ' + err.message);
    }
  };

  // Re-run AI Analysis
  const handleReanalyzeTicket = async (ticketId) => {
    try {
      setReanalyzingId(ticketId);
      const res = await api.reanalyzeTicket(ticketId);
      const updatedTicket = res.ticket;
      if (updatedTicket) {
        setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, ...updatedTicket } : t));
        if (selectedTicket && selectedTicket.ticket_id === ticketId) {
          setSelectedTicket(prev => ({ ...prev, ...updatedTicket }));
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.details || err.response?.data?.message || err.message;
      alert('AI Re-Analysis Failed:\n' + errorMsg);
    } finally {
      setReanalyzingId(null);
    }
  };

  // Apply AI Draft into reply input
  const handleApplyAiDraft = (draftText) => {
    setReplyMessage(draftText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  // Send admin chat reply
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyMessage.trim() || !selectedTicket || sendingReply) return;

    try {
      setSendingReply(true);
      const res = await api.sendTicketMessage(selectedTicket.ticket_id, replyMessage.trim(), adminAlias);

      const newMsg = res.message || {
        message_id: Date.now(),
        sender_role: 'admin',
        sender_name: adminAlias,
        message: replyMessage.trim(),
        created_at: new Date().toISOString()
      };

      setTickets(prev => prev.map(t => {
        if (t.ticket_id === selectedTicket.ticket_id) {
          return {
            ...t,
            updated_at: new Date().toISOString(),
            messages: [...(t.messages || []), newMsg]
          };
        }
        return t;
      }));

      setSelectedTicket(prev => ({
        ...prev,
        updated_at: new Date().toISOString(),
        messages: [...(prev.messages || []), newMsg]
      }));

      setReplyMessage('');
    } catch (err) {
      console.error('Failed to send admin reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  // Helper for priority score styling
  const getPriorityScoreBadge = (score, priority) => {
    if (score >= 9 || priority === 'Critical') {
      return {
        bg: 'bg-rose-100 text-rose-900 border-rose-300',
        dot: 'bg-rose-600',
        label: `${score ? `${score}/10` : ''} Critical`
      };
    }
    if (score >= 7 || priority === 'High') {
      return {
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: 'bg-amber-500',
        label: `${score ? `${score}/10` : ''} High`
      };
    }
    if (score >= 4 || priority === 'Medium') {
      return {
        bg: 'bg-blue-100 text-blue-900 border-blue-300',
        dot: 'bg-blue-500',
        label: `${score ? `${score}/10` : ''} Medium`
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-800 border-slate-300',
      dot: 'bg-slate-400',
      label: `${score ? `${score}/10` : ''} Low`
    };
  };

  // Counts for KPI summary
  const totalCount = tickets.length;
  const unviewedCount = tickets.filter(t => t.view_state === 'unviewed').length;
  const criticalCount = tickets.filter(t => t.priority === 'Critical' || (t.ai_priority_score && t.ai_priority_score >= 9)).length;
  const openCount = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;

  // Filtered queue items
  const filteredTickets = tickets.filter(t => {
    // View state filter
    if (viewFilter !== 'ALL' && t.view_state !== viewFilter) return false;

    // Status filter
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

    // Priority filter
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchId = t.ticket_id?.toLowerCase().includes(q);
      const matchAuthor = t.author_name?.toLowerCase().includes(q) || t.author_id?.toLowerCase().includes(q);
      const matchEmail = t.author_email?.toLowerCase().includes(q);
      const matchCategory = t.category?.toLowerCase().includes(q);
      const matchBook = t.book_title?.toLowerCase().includes(q);
      return matchSubject || matchId || matchAuthor || matchEmail || matchCategory || matchBook;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner & Queue KPIs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 tracking-wide uppercase flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
                LangGraph AI Agent Active
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                PostgreSQL Live Queue
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
              AI Support Desk & Ticket Queue
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Automated classification, 1–10 priority scoring, Knowledge Base draft generation, and viewed/unviewed state queue.
            </p>
          </div>

          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="self-start md:self-auto flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Queue'}</span>
          </button>
        </div>

        {/* Counter KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          {/* Total Tickets */}
          <div 
            onClick={() => setViewFilter('ALL')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              viewFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-slate-50/80 border-slate-200/70 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${viewFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                Total Tickets
              </span>
              <Inbox className={`w-4 h-4 ${viewFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`} />
            </div>
            <div className="text-2xl font-bold mt-2 font-mono">{totalCount}</div>
            <span className={`text-[11px] mt-1 block ${viewFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`}>
              All author queries
            </span>
          </div>

          {/* Unviewed Queue */}
          <div 
            onClick={() => setViewFilter('unviewed')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              viewFilter === 'unviewed'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/50'
                : 'bg-amber-50/50 border-amber-200/80 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${viewFilter === 'unviewed' ? 'text-amber-100' : 'text-amber-800'}`}>
                Unviewed (New)
              </span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            </div>
            <div className={`text-2xl font-bold mt-2 font-mono ${viewFilter === 'unviewed' ? 'text-white' : 'text-amber-900'}`}>
              {unviewedCount}
            </div>
            <span className={`text-[11px] mt-1 block ${viewFilter === 'unviewed' ? 'text-amber-100' : 'text-amber-700'}`}>
              Awaiting admin review
            </span>
          </div>

          {/* Critical / High Urgency */}
          <div 
            onClick={() => setPriorityFilter('Critical')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              priorityFilter === 'Critical'
                ? 'bg-rose-700 text-white border-rose-700 shadow-md'
                : 'bg-rose-50/50 border-rose-200/70 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${priorityFilter === 'Critical' ? 'text-rose-100' : 'text-rose-800'}`}>
                Critical / Urgent
              </span>
              <AlertTriangle className={`w-4 h-4 ${priorityFilter === 'Critical' ? 'text-rose-200' : 'text-rose-600'}`} />
            </div>
            <div className={`text-2xl font-bold mt-2 font-mono ${priorityFilter === 'Critical' ? 'text-white' : 'text-rose-900'}`}>
              {criticalCount}
            </div>
            <span className={`text-[11px] mt-1 block ${priorityFilter === 'Critical' ? 'text-rose-100' : 'text-rose-700'}`}>
              AI score 9-10 / Critical
            </span>
          </div>

          {/* Open / Active */}
          <div className="p-4 rounded-xl border bg-slate-50/80 border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active Workflows</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold mt-2 font-mono text-indigo-950">{openCount}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Open or in-progress
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subject, book, ID, author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View State Pills & Dropdowns */}
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setViewFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              viewFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setViewFilter('unviewed')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              viewFilter === 'unviewed'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Unviewed ({unviewedCount})</span>
          </button>
          <button
            onClick={() => setViewFilter('viewed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              viewFilter === 'viewed'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100'
            }`}
          >
            Viewed ({tickets.filter(t => t.view_state === 'viewed').length})
          </button>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical (Score 10)</option>
            <option value="High">High (Score 8-9)</option>
            <option value="Medium">Medium (Score 4-7)</option>
            <option value="Low">Low (Score 1-3)</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Ticket List Queue */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
          <div className="w-8 h-8 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading ticket queue from PostgreSQL...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">No Tickets in this Queue</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No tickets match your active filter criteria. Try resetting your search or view filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const isUnviewed = ticket.view_state === 'unviewed';
            const latestMsg = ticket.messages?.[ticket.messages.length - 1];
            const priorityBadge = getPriorityScoreBadge(ticket.ai_priority_score, ticket.priority);

            return (
              <div
                key={ticket.ticket_id}
                onClick={() => handleOpenTicket(ticket)}
                className={`group relative bg-white rounded-xl p-5 border transition-all duration-200 hover:shadow-md cursor-pointer ${
                  isUnviewed
                    ? 'border-amber-300 bg-gradient-to-r from-amber-50/40 via-white to-white ring-1 ring-amber-300/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  
                  {/* Left: Queue state & ticket details */}
                  <div className="flex items-start space-x-3.5 min-w-0">
                    
                    {/* View state badge */}
                    <div className="shrink-0 mt-0.5">
                      {isUnviewed ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>Unviewed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Viewed</span>
                        </span>
                      )}
                    </div>

                    {/* Ticket metadata & Subject */}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {ticket.ticket_id}
                        </span>
                        <span className="text-slate-300">•</span>
                        
                        {/* Author info */}
                        <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-slate-900">
                            {ticket.author_name || ticket.author_id}
                          </span>
                          {ticket.author_email && (
                            <span className="text-slate-400 font-normal hidden md:inline">
                              ({ticket.author_email})
                            </span>
                          )}
                        </div>

                        <span className="text-slate-300">•</span>

                        {/* Book Badge (if book specific) */}
                        {ticket.book_title && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <BookOpen className="w-3 h-3 text-emerald-600" />
                            <span className="truncate max-w-[150px]">{ticket.book_title}</span>
                          </span>
                        )}

                        {/* Attachment indicator */}
                        {ticket.file_attachment_name && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200" title={ticket.file_attachment_name}>
                            <Paperclip className="w-3 h-3 text-slate-500" />
                            <span>Attachment</span>
                          </span>
                        )}

                        {/* AI Category badge */}
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-100">
                          {ticket.category || 'General Inquiry'}
                        </span>

                        {/* AI Priority Score badge */}
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold border ${priorityBadge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityBadge.dot}`}></span>
                          <span>Score: {priorityBadge.label}</span>
                        </span>

                        {/* Assigned staff badge */}
                        {ticket.assigned_to ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200">
                            <UserCheck className="w-3 h-3 text-purple-600" />
                            <span>{ticket.assigned_to}</span>
                          </span>
                        ) : null}

                        {/* Status badge */}
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          ticket.status === 'Open'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ticket.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>

                      {/* Ticket Subject */}
                      <h3 className={`text-sm sm:text-base mt-1.5 font-medium transition-colors ${
                        isUnviewed ? 'text-slate-950 font-bold' : 'text-slate-800'
                      }`}>
                        {ticket.subject}
                      </h3>

                      {/* Message preview / description */}
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                        "{ticket.description || latestMsg?.message || 'No description provided'}"
                      </p>
                    </div>
                  </div>

                  {/* Right Action buttons */}
                  <div className="flex items-center justify-between sm:justify-end space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    
                    {/* Direct Toggle State Button */}
                    <button
                      onClick={(e) => handleToggleViewState(ticket.ticket_id, ticket.view_state, e)}
                      title={isUnviewed ? 'Click to mark as Viewed' : 'Click to mark as Unviewed'}
                      className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        isUnviewed
                          ? 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 border-slate-200'
                      }`}
                    >
                      {isUnviewed ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Mark Viewed</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span className="hidden sm:inline">Mark Unviewed</span>
                        </>
                      )}
                    </button>

                    {/* Open Ticket Button */}
                    <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-800 bg-emerald-50 group-hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Chat ({ticket.messages?.length || 0})</span>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SLIDING DETAIL, AI TRIAGE & CHAT SIDEPANEL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setSelectedTicket(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
          />

          {/* Drawer container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-left">
              
              {/* Drawer Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-900/30">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {selectedTicket.ticket_id}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs text-slate-300">
                        {selectedTicket.author_name || selectedTicket.author_id}
                      </span>
                    </div>
                    <h2 className="font-serif font-bold text-base text-white tracking-tight line-clamp-1">
                      {selectedTicket.subject}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleReanalyzeTicket(selectedTicket.ticket_id)}
                    disabled={reanalyzingId === selectedTicket.ticket_id}
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 text-xs font-medium border border-indigo-700/60 transition-colors"
                    title="Re-run LangGraph AI Agent analysis on this ticket"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reanalyzingId === selectedTicket.ticket_id ? 'animate-spin text-emerald-400' : ''}`} />
                    <span className="hidden sm:inline">Re-analyze</span>
                  </button>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* State Controls Bar */}
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                {/* View State Toggle */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-medium">Queue State:</span>
                  <button
                    onClick={() => handleToggleViewState(selectedTicket.ticket_id, selectedTicket.view_state)}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      selectedTicket.view_state === 'unviewed'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    {selectedTicket.view_state === 'unviewed' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>Unviewed</span>
                        <span className="text-[10px] text-amber-700 underline ml-1">(Click to Mark Viewed)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Viewed</span>
                        <span className="text-[10px] text-emerald-700 underline ml-1">(Click to Mark Unviewed)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Workflow Status Selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(selectedTicket.ticket_id, e.target.value)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Container with AI Panels & Chat */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                
                {/* SECTION 1: AI Auto-Classification & Urgency Score with Admin Overrides */}
                <div className="p-5 bg-gradient-to-b from-indigo-50/40 via-white to-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-indigo-900">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>AI AUTO-CLASSIFICATION & PRIORITY TRIAGE</span>
                    </div>
                    {selectedTicket.ai_priority_score && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        Score: {selectedTicket.ai_priority_score} / 10
                      </span>
                    )}
                  </div>

                  {/* Overrides Controls Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Category with Admin Override */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-slate-500">
                          Category (Admin Override)
                        </label>
                        <span className="text-[10px] text-slate-400">
                          AI: {selectedTicket.ai_category || 'N/A'}
                        </span>
                      </div>
                      <select
                        value={selectedTicket.category || 'General Inquiry'}
                        disabled={updatingOverride}
                        onChange={(e) => handleOverrideCategory(e.target.value)}
                        className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      >
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Priority with Admin Override */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-slate-500">
                          Priority (Admin Override)
                        </label>
                        <span className="text-[10px] text-slate-400">
                          AI: {selectedTicket.ai_priority || selectedTicket.priority}
                        </span>
                      </div>
                      <select
                        value={selectedTicket.priority || 'Medium'}
                        disabled={updatingOverride}
                        onChange={(e) => handleOverridePriority(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      >
                        {PRIORITY_OPTIONS.map((pri) => (
                          <option key={pri} value={pri}>{pri}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* AI Reasoning Tooltip / Error Alert Box */}
                  {selectedTicket.ai_reasoning && (
                    <div className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 ${
                      selectedTicket.ai_reasoning.includes('Error') || selectedTicket.ai_reasoning.includes('Failed')
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-indigo-50/70 border-indigo-100 text-indigo-950'
                    }`}>
                      {selectedTicket.ai_reasoning.includes('Error') || selectedTicket.ai_reasoning.includes('Failed') ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      )}
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-semibold">
                          {selectedTicket.ai_reasoning.includes('Error') || selectedTicket.ai_reasoning.includes('Failed')
                            ? 'AI Service Status: '
                            : 'AI Triage Reasoning: '}
                        </span>
                        <span>{selectedTicket.ai_reasoning}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 2: Ticket Assignment & Private Internal Notes */}
                <div className="p-5 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <StickyNote className="w-4 h-4 text-amber-500" />
                      STAFF ASSIGNMENT & PRIVATE INTERNAL NOTES
                    </span>
                    <span className="text-[11px] text-slate-400 italic">Not visible to author</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Assignment Selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Assigned To
                      </label>
                      <select
                        value={selectedTicket.assigned_to || ''}
                        onChange={(e) => handleAssignTicket(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Unassigned</option>
                        <option value="Admin (You)">Admin (You)</option>
                        <option value="BookLeaf Royalty Desk">BookLeaf Royalty Desk</option>
                        <option value="Production & Proofing Lead">Production & Proofing Lead</option>
                        <option value="Distribution Specialist">Distribution Specialist</option>
                      </select>
                    </div>

                    {/* Internal Notes Textarea */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-500">
                          Private Internal Notes
                        </label>
                        {notesSavedSuccess && (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Saved!
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={internalNotesDraft}
                          onChange={(e) => setInternalNotesDraft(e.target.value)}
                          placeholder="e.g. Verified with Repro India warehouse; reprint batch scheduled..."
                          className="flex-1 text-xs bg-amber-50/40 border border-amber-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handleSaveInternalNotes}
                          disabled={savingNotes}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white transition-colors"
                        >
                          {savingNotes ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: AI-Drafted Response (BookLeaf Knowledge Base) */}
                {selectedTicket.ai_draft_response && (
                  <div className="p-5 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-white space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                        <Bot className="w-4 h-4 text-emerald-700" />
                        <span>AI-GENERATED DRAFT (BookLeaf Knowledge Base)</span>
                      </div>
                      <button
                        onClick={() => handleApplyAiDraft(selectedTicket.ai_draft_response)}
                        className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-xs"
                      >
                        {copiedDraft ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                        <span>{copiedDraft ? 'Inserted into Reply!' : 'Use Draft in Reply'}</span>
                      </button>
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-emerald-200/80 text-xs text-slate-700 leading-relaxed shadow-xs max-h-48 overflow-y-auto whitespace-pre-line font-sans">
                      {selectedTicket.ai_draft_response}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      💡 Click <strong>"Use Draft in Reply"</strong> to populate your reply box below. You can edit any details before sending to the author.
                    </p>
                  </div>
                )}

                {/* SECTION 4: Original Query Context & Attachments */}
                <div className="p-5 bg-slate-50/70 border-b border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px]">
                    <span>AUTHOR SUBMITTED DETAILS:</span>
                    <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    {selectedTicket.book_title && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-emerald-900 border border-emerald-200">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Linked Book: <strong>{selectedTicket.book_title}</strong></span>
                      </span>
                    )}

                    {selectedTicket.file_attachment_name && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-slate-800 border border-slate-300">
                        <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                        <span>Attached File: <strong>{selectedTicket.file_attachment_name}</strong></span>
                      </span>
                    )}
                  </div>

                  {selectedTicket.description && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800">
                      <span className="font-semibold text-slate-500 block text-[10px] uppercase mb-1">
                        Detailed Query Description:
                      </span>
                      {selectedTicket.description}
                    </div>
                  )}
                </div>

                {/* SECTION 5: Live Chat Thread */}
                <div className="p-5 space-y-4 bg-slate-50/30">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Conversation History
                  </div>

                  {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No chat messages in this ticket yet.
                    </div>
                  ) : (
                    selectedTicket.messages.map((msg, idx) => {
                      const isAdminMsg = msg.sender_role === 'admin';
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center space-x-1.5 mb-1 text-[11px] text-slate-500">
                            <span className={`font-semibold ${isAdminMsg ? 'text-indigo-700' : 'text-emerald-800'}`}>
                              {msg.sender_name || (isAdminMsg ? 'Publisher Admin' : 'Author')}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs whitespace-pre-line ${
                              isAdminMsg
                                ? 'bg-indigo-600 text-white rounded-tr-xs'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                            }`}
                          >
                            <p>{msg.message}</p>
                            
                            {/* Timestamp & Delivery/Read Status Ticks */}
                            <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] select-none ${
                              isAdminMsg ? 'text-indigo-200/80' : 'text-slate-400'
                            }`}>
                              <span>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

              </div>

              {/* Canned Quick Responses Toolbar */}
              <div className="px-5 py-2 bg-slate-100 border-t border-slate-200 flex items-center space-x-1.5 overflow-x-auto text-[11px] shrink-0">
                <span className="text-slate-400 font-semibold shrink-0">Quick reply:</span>
                <button
                  type="button"
                  onClick={() => setReplyMessage('Hello! We are currently reviewing your request and will provide an update shortly.')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 whitespace-nowrap"
                >
                  "Reviewing request"
                </button>
                <button
                  type="button"
                  onClick={() => setReplyMessage('The royalty payout batch has been queued with our finance desk for bank transfer.')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 whitespace-nowrap"
                >
                  "Royalty batched"
                </button>
                <button
                  type="button"
                  onClick={() => setReplyMessage('Our book production & cover design team has updated your revisions.')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 whitespace-nowrap"
                >
                  "Production update"
                </button>
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 shrink-0">
                <div className="flex items-center space-x-2">
                  <textarea
                    rows={2}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type or edit your response to the author before sending..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 font-sans resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!replyMessage.trim() || sendingReply}
                    className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-sm self-end"
                  >
                    <span>{sendingReply ? 'Sending...' : 'Send'}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTicketQueue;
