import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { dataService, pool } from '../db/db.js';
import { runTicketAiAgent } from '../ai/ticketAgent.js';

const router = express.Router();

const VALID_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];

const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const VALID_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

/**
 * GET /api/tickets - Fetch tickets for author or all for admin
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    let authorId = null;

    if (req.user.role === 'author') {
      authorId = req.user.author_id;
    } else if (req.user.role === 'admin') {
      if (req.query.author_id) {
        authorId = req.query.author_id.trim();
      }
    }

    const tickets = await dataService.getTickets(authorId);

    // Optional status filter validation
    if (req.query.status) {
      const statusParam = req.query.status.trim();
      const filtered = tickets.filter(t => t.status.toLowerCase() === statusParam.toLowerCase());
      return res.json(filtered);
    }

    res.json(tickets);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({
      error: 'Database Query Failed',
      message: 'Failed to retrieve tickets from database: ' + err.message
    });
  }
});

/**
 * POST /api/tickets - Create a new support ticket with strict input validation
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      subject,
      category,
      priority,
      initial_message,
      description,
      book_id,
      file_attachment_name,
      author_id
    } = req.body;

    const validationErrors = [];

    // Validate subject
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      validationErrors.push({ field: 'subject', message: 'Subject line is required.' });
    } else if (subject.trim().length < 5) {
      validationErrors.push({ field: 'subject', message: 'Subject line must be at least 5 characters long.' });
    } else if (subject.trim().length > 255) {
      validationErrors.push({ field: 'subject', message: 'Subject line cannot exceed 255 characters.' });
    }

    // 2. Validate description / detailed message
    const messageContent = (description || initial_message || '').trim();
    if (messageContent.length === 0) {
      validationErrors.push({ field: 'description', message: 'Detailed description is required.' });
    } else if (messageContent.length < 10) {
      validationErrors.push({ field: 'description', message: 'Detailed description must be at least 10 characters long to provide sufficient context for support.' });
    }

    //  Determine and validate author
    let targetAuthorId = req.user.role === 'author' ? req.user.author_id : author_id;
    if (!targetAuthorId) {
      validationErrors.push({ field: 'author_id', message: 'Author ID is required to create a ticket.' });
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      validationErrors.push({
        field: 'category',
        message: `Invalid category '${category}'. Allowed categories: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    // Validate priority if provided
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      validationErrors.push({
        field: 'priority',
        message: `Invalid priority '${priority}'. Allowed priorities: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    //  Validate book_id exists if specified
    const cleanBookId = book_id && book_id !== 'general' ? book_id.trim() : null;
    if (cleanBookId) {
      try {
        const allAuthors = await dataService.getAllAuthors();
        const bookExists = allAuthors.some(a => (a.books || []).some(b => b.book_id === cleanBookId));
        if (!bookExists) {
          validationErrors.push({ field: 'book_id', message: `Book ID '${cleanBookId}' does not exist in the database.` });
        }
      } catch (dbErr) {
        console.warn('Book lookup check warning:', dbErr.message);
      }
    }

    // Return 400 Bad Request if validation failed
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation Failed',
        message: 'The submitted ticket data did not meet required criteria.',
        errors: validationErrors
      });
    }

    const senderName = req.user.role === 'author'
      ? req.user.name || 'Author'
      : 'BookLeaf Support Desk (Admin)';

    // Persist new ticket to PostgreSQL
    const newTicket = await dataService.createTicket({
      author_id: targetAuthorId,
      book_id: cleanBookId,
      subject: subject.trim(),
      description: messageContent,
      file_attachment_name: file_attachment_name ? String(file_attachment_name).trim().slice(0, 255) : null,
      category: category || 'General Inquiry',
      priority: priority || 'Medium',
      initial_message: messageContent,
      sender_name: senderName
    });

    // Trigger LangGraph AI Agent in background and log result or capture failure
    runTicketAiAgent(newTicket).catch(err => {
      console.warn(`[AI Triage Background Notification] Ticket ${newTicket.ticket_id}:`, err.message);
    });

    res.status(201).json(newTicket);
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({
      error: 'Ticket Creation Failed',
      message: 'Failed to create support ticket: ' + err.message
    });
  }
});

/**
 * POST /api/tickets/:id/messages - Post chat message in ticket thread
 */
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Failed',
        field: 'message',
        message: 'Message body cannot be empty.'
      });
    }

    if (message.trim().length < 2) {
      return res.status(400).json({
        error: 'Validation Failed',
        field: 'message',
        message: 'Message must be at least 2 characters long.'
      });
    }

    // Check ticket exists
    const tickets = await dataService.getTickets();
    const ticket = tickets.find(t => t.ticket_id === ticketId);
    if (!ticket) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Ticket with ID '${ticketId}' was not found.`
      });
    }

    // Authors can only message on their own tickets
    if (req.user.role === 'author' && ticket.author_id !== req.user.author_id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not authorized to post messages on another author\'s ticket.'
      });
    }

    const senderRole = req.user.role === 'admin' ? 'admin' : 'author';
    const senderName = req.user.role === 'admin'
      ? (req.body.admin_alias || 'BookLeaf Support Specialist')
      : (req.user.name || 'Author');

    const result = await dataService.addMessageToTicket(ticketId, {
      sender_role: senderRole,
      sender_name: senderName,
      message: message.trim()
    });

    if (!result) {
      return res.status(500).json({
        error: 'Message Delivery Failed',
        message: 'Failed to append message to ticket thread.'
      });
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('Error posting ticket message:', err);
    res.status(500).json({
      error: 'Message Post Failed',
      message: 'Failed to post message: ' + err.message
    });
  }
});

/**
 * PATCH /api/tickets/:id/status - Update ticket status
 */
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Validation Failed',
        field: 'status',
        message: `Invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const tickets = await dataService.getTickets();
    const ticket = tickets.find(t => t.ticket_id === ticketId);
    if (!ticket) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Ticket with ID '${ticketId}' was not found.`
      });
    }

    if (req.user.role === 'author' && ticket.author_id !== req.user.author_id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not authorized to modify another author\'s ticket.'
      });
    }

    const updated = await dataService.updateTicketStatus(ticketId, status);
    res.json(updated);
  } catch (err) {
    console.error('Error updating ticket status:', err);
    res.status(500).json({
      error: 'Status Update Failed',
      message: 'Failed to update ticket status: ' + err.message
    });
  }
});

/**
 * PATCH /api/tickets/:id/view-state - Mark ticket as viewed or unviewed (Admin Only)
 */
router.patch('/:id/view-state', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { view_state } = req.body;

    if (view_state && !['viewed', 'unviewed'].includes(view_state)) {
      return res.status(400).json({
        error: 'Validation Failed',
        field: 'view_state',
        message: "Invalid view_state. Must be either 'viewed' or 'unviewed'."
      });
    }

    const targetState = view_state === 'viewed' ? 'viewed' : 'unviewed';
    const updated = await dataService.updateTicketViewState(ticketId, targetState);
    if (targetState === 'viewed') {
      await dataService.markMessagesAsRead(ticketId, 'admin');
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating ticket view state:', err);
    res.status(500).json({
      error: 'View State Update Failed',
      message: 'Failed to update ticket view state: ' + err.message
    });
  }
});

/**
 * PATCH /api/tickets/:id/read-messages - Mark messages in ticket thread as viewed (Double Tick)
 */
router.patch('/:id/read-messages', requireAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const readerRole = req.user.role; // 'admin' or 'author'

    // If author, verify ticket belongs to this author
    if (readerRole === 'author') {
      const tickets = await dataService.getTickets(req.user.author_id);
      const ticket = tickets.find(t => t.ticket_id === ticketId);
      if (!ticket) {
        return res.status(403).json({ error: 'Forbidden', message: 'Not authorized for this ticket.' });
      }
    }

    await dataService.markMessagesAsRead(ticketId, readerRole);
    res.json({ success: true, ticket_id: ticketId, reader_role: readerRole });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ error: 'Failed to mark messages as read: ' + err.message });
  }
});

/**
 * PATCH /api/tickets/:id/override - Admin override for Category and Priority (Admin Only)
 */
router.patch('/:id/override', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only BookLeaf administrators can override AI category and priority ratings.'
      });
    }

    const ticketId = req.params.id;
    const { category, priority, priority_score } = req.body;

    const validationErrors = [];

    if (category && !VALID_CATEGORIES.includes(category)) {
      validationErrors.push({
        field: 'category',
        message: `Invalid category '${category}'. Allowed categories: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      validationErrors.push({
        field: 'priority',
        message: `Invalid priority '${priority}'. Allowed priorities: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    if (priority_score !== undefined && priority_score !== null) {
      const parsedScore = parseInt(priority_score, 10);
      if (isNaN(parsedScore) || parsedScore < 1 || parsedScore > 10) {
        validationErrors.push({
          field: 'priority_score',
          message: 'Priority score must be an integer between 1 and 10.'
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation Failed',
        message: 'Invalid override parameters.',
        errors: validationErrors
      });
    }

    const updated = await dataService.updateTicketOverrides(ticketId, {
      category: category || undefined,
      priority: priority || undefined,
      priority_score: priority_score !== undefined ? parseInt(priority_score, 10) : undefined
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating ticket overrides:', err);
    res.status(500).json({
      error: 'Override Failed',
      message: 'Failed to update ticket overrides: ' + err.message
    });
  }
});

/**
 * PATCH /api/tickets/:id/internal-notes - Admin private internal notes (Admin Only)
 */
router.patch('/:id/internal-notes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { internal_notes } = req.body;

    if (internal_notes !== undefined && typeof internal_notes !== 'string') {
      return res.status(400).json({
        error: 'Validation Failed',
        field: 'internal_notes',
        message: 'Internal notes must be a string.'
      });
    }

    const updated = await dataService.updateTicketInternalNotes(ticketId, internal_notes ? internal_notes.trim() : '');
    res.json(updated);
  } catch (err) {
    console.error('Error updating internal notes:', err);
    res.status(500).json({
      error: 'Notes Update Failed',
      message: 'Failed to update internal notes: ' + err.message
    });
  }
});

/**
 * PATCH /api/tickets/:id/assign - Admin ticket assignment (Admin Only)
 */
router.patch('/:id/assign', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { assigned_to } = req.body;

    if (assigned_to !== undefined && assigned_to !== null && typeof assigned_to !== 'string') {
      return res.status(400).json({
        error: 'Validation Failed',
        field: 'assigned_to',
        message: 'Assigned staff must be a valid string name.'
      });
    }

    const updated = await dataService.updateTicketAssignment(ticketId, assigned_to ? assigned_to.trim() : null);
    res.json(updated);
  } catch (err) {
    console.error('Error assigning ticket:', err);
    res.status(500).json({
      error: 'Assignment Failed',
      message: 'Failed to assign ticket: ' + err.message
    });
  }
});

/**
 * POST /api/tickets/:id/re-analyze - Trigger LangGraph AI Agent analysis on demand (Admin Only)
 * Returns actionable, meaningful error messages (422 / 502) if AI execution fails, NOT generic 500s.
 */
router.post('/:id/re-analyze', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const tickets = await dataService.getTickets();
    const ticket = tickets.find(t => t.ticket_id === ticketId);

    if (!ticket) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Ticket with ID '${ticketId}' was not found.`
      });
    }

    try {
      const result = await runTicketAiAgent(ticket);
      const updatedTickets = await dataService.getTickets();
      const refreshed = updatedTickets.find(t => t.ticket_id === ticketId);

      res.json({
        message: 'AI Agent analysis successfully completed.',
        ticket: refreshed || result
      });
    } catch (aiErr) {
      console.error(`AI triage failed for ${ticketId}:`, aiErr.message);
      // Meaningful error status with root cause
      return res.status(422).json({
        error: 'AI Service Error',
        message: 'The LangChain/LangGraph AI Agent could not process this ticket.',
        details: aiErr.message
      });
    }
  } catch (err) {
    console.error('Error in re-analyze handler:', err);
    res.status(500).json({
      error: 'Execution Error',
      message: err.message
    });
  }
});

export default router;
