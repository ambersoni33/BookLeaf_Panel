// Smart API Base Resolver:
// 1. Uses VITE_API_URL if explicitly provided in environment
// 2. Falls back to '/api' (proxied to http://localhost:5000) when running locally on localhost
// 3. Falls back to live Render backend if deployed to Vercel/production without an env var
const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`;
  }
  
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return '/api'; // Proxied to http://localhost:5000 by Vite
    }
  }

  // Deployed production fallback (e.g. Vercel deployment)
  return 'https://bookleaf-panel.onrender.com/api';
};

const API_BASE = getApiBase();

function getAuthHeaders() {
  const token = localStorage.getItem('bookleaf_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  async login(email, password = null) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email ? email.trim() : '', 
        password: password ? password.trim() : undefined 
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Login failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to verify session');
    return data.user;
  },

  async getDemoUsers() {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load demo accounts');
    return data;
  },

  // Authors & Books
  async getAllAuthors() {
    const res = await fetch(`${API_BASE}/authors`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch authors');
    return data;
  },

  async getCompanyStats() {
    const res = await fetch(`${API_BASE}/authors/stats/summary`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch publishing stats');
    return data;
  },

  async getAuthorDetails(authorId) {
    const res = await fetch(`${API_BASE}/authors/${authorId}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch author details');
    return data;
  },

  // Tickets & Chat
  async getTickets(authorId = null, status = null) {
    const params = new URLSearchParams();
    if (authorId) params.append('author_id', authorId);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/tickets?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
    return data;
  },

  async createTicket({ author_id, book_id, subject, description, file_attachment_name, category, priority, initial_message }) {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        author_id, 
        book_id, 
        subject, 
        description, 
        file_attachment_name, 
        category, 
        priority, 
        initial_message 
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create ticket');
    return data;
  },

  async sendTicketMessage(ticketId, message, adminAlias = null) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, admin_alias: adminAlias }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post message');
    return data;
  },

  async updateTicketStatus(ticketId, status) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update ticket status');
    return data;
  },

  async updateTicketViewState(ticketId, viewState) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/view-state`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ view_state: viewState }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update view state');
    return data;
  },

  async overrideTicket(ticketId, { category, priority, priority_score }) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/override`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ category, priority, priority_score }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update ticket overrides');
    return data;
  },

  async updateInternalNotes(ticketId, internal_notes) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/internal-notes`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ internal_notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save internal notes');
    return data;
  },

  async assignTicket(ticketId, assigned_to) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/assign`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ assigned_to }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to assign ticket');
    return data;
  },

  async reanalyzeTicket(ticketId) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/re-analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to re-analyze ticket with AI');
    return data;
  },

  async markMessagesRead(ticketId) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/read-messages`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to mark messages as read');
    return data;
  }
};
