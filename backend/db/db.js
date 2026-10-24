import pg from 'pg';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

// PostgreSQL Database Configuration & Connection Pool
// Live PostgreSQL instance configured via DATABASE_URL in .env:

const isRemoteDb =
  Boolean(process.env.DATABASE_URL && (
    process.env.DATABASE_URL.includes('supabase') ||
    process.env.DATABASE_URL.includes('pooler') ||
    process.env.DATABASE_URL.includes('neon') ||
    process.env.DATABASE_URL.includes('render') ||
    process.env.DATABASE_URL.includes('sslmode=require') ||
    process.env.NODE_ENV === 'production'
  ));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "",
  connectionTimeoutMillis: isRemoteDb ? 10000 : 3000,
  idleTimeoutMillis: 10000,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false
});

let isPostgresAvailable = false;

// Test connection on boot
export const dbReady = (async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');

    // Automatically ensure is_read column exists on ticket_messages table
    await client.query(`
      ALTER TABLE ticket_messages 
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;
    `).catch(e => console.warn('Note: ticket_messages is_read column verify:', e.message));

    client.release();
    isPostgresAvailable = true;
    const dbTarget = pool.options.connectionString ? pool.options.connectionString.replace(/:[^:@]+@/, ':***@') : 'localhost';
    console.log(`✅ Connected to PostgreSQL Database [${dbTarget}] at:`, res.rows[0].now);
    return true;
  } catch (err) {
    isPostgresAvailable = false;
    console.error(`❌ PostgreSQL connection failed: ${err.message}`);
    return false;
  }
})();

// In-Memory fallback store (empty default)
let memoryAuthors = [];
let memoryTickets = [];
let messageIdCounter = 100;
let ticketIdCounter = 2000;

/**
 * Data Service Abstraction:
 * Supports querying PostgreSQL tables directly if present,
 * or using our pre-seeded data store with identical schemas.
 */
export const dataService = {
  async getAllAuthors() {
    await dbReady;
    if (isPostgresAvailable) {
      try {
        const query = `
          SELECT 
            a.author_id,
            a.name,
            a.email,
            a.phone,
            a.city,
            a.joined_date,
            json_agg(
              json_build_object(
                'book_id', b.book_id,
                'title', b.title,
                'isbn', b.isbn,
                'genre', b.genre,
                'publication_date', b.publication_date,
                'status', b.status,
                'mrp', b.mrp,
                'author_royalty_per_copy', b.author_royalty_per_copy,
                'total_copies_sold', b.total_copies_sold,
                'total_royalty_earned', b.total_royalty_earned,
                'royalty_paid', b.royalty_paid,
                'royalty_pending', b.royalty_pending,
                'last_royalty_payout_date', b.last_royalty_payout_date,
                'print_partner', b.print_partner,
                'available_on', b.available_on
              )
            ) FILTER (WHERE b.book_id IS NOT NULL) AS books
          FROM authors a
          LEFT JOIN books b ON a.author_id = b.author_id
          GROUP BY a.author_id
          ORDER BY a.author_id ASC;
        `;
        const res = await pool.query(query);
        if (res.rows && res.rows.length > 0) {
          return res.rows.map(row => ({
            ...row,
            books: row.books || []
          }));
        }
      } catch (err) {
        console.warn('Postgres query error, falling back to memory store:', err.message);
      }
    }

    return memoryAuthors;
  },

  /**
   * Get single author by ID or email
   */
  async getAuthorByIdOrEmail(identifier) {
    if (!identifier) return null;
    await dbReady;
    const cleanId = identifier.trim().toLowerCase();

    if (isPostgresAvailable) {
      try {
        const query = `
          SELECT 
            a.author_id, a.name, a.email, a.phone, a.city, a.joined_date,
            json_agg(
              json_build_object(
                'book_id', b.book_id,
                'title', b.title,
                'isbn', b.isbn,
                'genre', b.genre,
                'publication_date', b.publication_date,
                'status', b.status,
                'mrp', b.mrp,
                'author_royalty_per_copy', b.author_royalty_per_copy,
                'total_copies_sold', b.total_copies_sold,
                'total_royalty_earned', b.total_royalty_earned,
                'royalty_paid', b.royalty_paid,
                'royalty_pending', b.royalty_pending,
                'last_royalty_payout_date', b.last_royalty_payout_date,
                'print_partner', b.print_partner,
                'available_on', b.available_on
              )
            ) FILTER (WHERE b.book_id IS NOT NULL) AS books
          FROM authors a
          LEFT JOIN books b ON a.author_id = b.author_id
          WHERE LOWER(a.author_id) = $1 OR LOWER(a.email) = $1
          GROUP BY a.author_id;
        `;
        const res = await pool.query(query, [cleanId]);
        if (res.rows && res.rows.length > 0) {
          return {
            ...res.rows[0],
            books: res.rows[0].books || []
          };
        }
      } catch (err) {
        console.warn('Postgres single author fetch error, using fallback:', err.message);
      }
    }

    return memoryAuthors.find(
      a => a.author_id.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
    ) || null;
  },

  /**
   * Get tickets for an author (or all tickets if authorId is omitted/admin)
   */
  async getTickets(authorId = null) {
    await dbReady;
    if (isPostgresAvailable) {
      try {
        const query = `
          SELECT 
            t.ticket_id,
            t.author_id,
            t.book_id,
            b.title AS book_title,
            t.subject,
            t.description,
            t.file_attachment_name,
            t.category,
            t.priority,
            t.status,
            COALESCE(t.view_state, 'unviewed') AS view_state,
            t.ai_category,
            t.ai_priority,
            t.ai_priority_score,
            t.ai_reasoning,
            t.ai_draft_response,
            t.internal_notes,
            t.assigned_to,
            t.created_at,
            t.updated_at,
            a.name AS author_name,
            a.email AS author_email,
            a.city AS author_city,
            COALESCE(
              json_agg(
                json_build_object(
                  'message_id', m.message_id,
                  'sender_role', m.sender_role,
                  'sender_name', m.sender_name,
                  'message', m.message,
                  'is_read', COALESCE(m.is_read, false),
                  'created_at', m.created_at
                ) ORDER BY m.created_at ASC
              ) FILTER (WHERE m.message_id IS NOT NULL), '[]'::json
            ) AS messages
          FROM tickets t
          LEFT JOIN authors a ON t.author_id = a.author_id
          LEFT JOIN books b ON t.book_id = b.book_id
          LEFT JOIN ticket_messages m ON t.ticket_id = m.ticket_id
          WHERE ($1::text IS NULL OR t.author_id = $1)
          GROUP BY t.ticket_id, a.name, a.email, a.city, b.title
          ORDER BY t.created_at DESC;
        `;
        const res = await pool.query(query, [authorId]);
        return res.rows;
      } catch (err) {
        console.warn('Postgres ticket fetch error, using fallback:', err.message);
      }
    }

    if (authorId) {
      return memoryTickets
        .filter(t => t.author_id.toLowerCase() === authorId.toLowerCase())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return [...memoryTickets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * Create a new ticket
   * When a new ticket comes, it enters queue with state 'unviewed'
   */
  async createTicket({
    author_id,
    book_id = null,
    subject,
    description = null,
    file_attachment_name = null,
    category = 'General Inquiry',
    priority = 'Medium',
    initial_message,
    sender_name
  }) {
    await dbReady;
    let ticketId;
    if (isPostgresAvailable) {
      try {
        const idRes = await pool.query(`
          SELECT COALESCE(
            MAX(NULLIF(regexp_replace(ticket_id, '[^0-9]', '', 'g'), ''))::int, 
            1000
          ) + 1 AS next_id 
          FROM tickets;
        `);
        const nextNum = idRes.rows[0]?.next_id || 1001;
        ticketId = `TCK-${nextNum}`;
      } catch {
        ticketId = `TCK-${Date.now().toString().slice(-4)}`;
      }
    } else {
      ticketId = `TCK-${++ticketIdCounter}`;
    }
    const now = new Date().toISOString();

    const newTicket = {
      ticket_id: ticketId,
      author_id,
      book_id,
      subject,
      description: description || initial_message,
      file_attachment_name,
      category: category || 'General Inquiry',
      priority: priority || 'Medium',
      status: 'Open',
      view_state: 'unviewed',
      created_at: now,
      updated_at: now,
      messages: []
    };

    if (initial_message) {
      const msg = {
        message_id: ++messageIdCounter,
        sender_role: 'author',
        sender_name: sender_name || 'Author',
        message: initial_message,
        is_read: false,
        created_at: now
      };
      newTicket.messages.push(msg);
    }

    if (isPostgresAvailable) {
      try {
        await pool.query(
          `INSERT INTO tickets (
             ticket_id, author_id, book_id, subject, description, file_attachment_name,
             category, priority, status, view_state, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Open', 'unviewed', $9, $10)`,
          [
            ticketId,
            author_id,
            book_id,
            subject,
            newTicket.description,
            file_attachment_name,
            newTicket.category,
            newTicket.priority,
            now,
            now
          ]
        );

        if (initial_message) {
          await pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender_role, sender_name, message, is_read, created_at)
             VALUES ($1, $2, $3, $4, FALSE, $5)`,
            [ticketId, 'author', sender_name || 'Author', initial_message, now]
          );
        }
      } catch (err) {
        console.warn('Postgres insert error, ticket saved in memory:', err.message);
      }
    }

    memoryTickets.unshift(newTicket);
    return newTicket;
  },

  /**
   * Add a chat message to a ticket
   */
  async addMessageToTicket(ticketId, { sender_role, sender_name, message }) {
    await dbReady;
    const now = new Date().toISOString();
    const newMsg = {
      message_id: ++messageIdCounter,
      sender_role,
      sender_name,
      message,
      is_read: false,
      created_at: now
    };

    if (isPostgresAvailable) {
      try {
        const insertRes = await pool.query(
          `INSERT INTO ticket_messages (ticket_id, sender_role, sender_name, message, is_read, created_at)
           VALUES ($1, $2, $3, $4, FALSE, $5)
           RETURNING message_id, is_read`,
          [ticketId, sender_role, sender_name, message, now]
        );
        if (insertRes.rows.length > 0) {
          newMsg.message_id = insertRes.rows[0].message_id;
          newMsg.is_read = insertRes.rows[0].is_read;
        }
        await pool.query(
          `UPDATE tickets SET updated_at = $1 WHERE ticket_id = $2`,
          [now, ticketId]
        );
      } catch (err) {
        console.warn('Postgres add message error, saving to memory:', err.message);
      }
    }

    const ticket = memoryTickets.find(t => t.ticket_id === ticketId);
    if (ticket) {
      ticket.messages.push(newMsg);
      ticket.updated_at = now;
      return { ticket, message: newMsg };
    }
    return null;
  },

  /**
   * Update ticket status (e.g. Open -> In Progress -> Resolved -> Closed)
   */
  async updateTicketStatus(ticketId, status) {
    await dbReady;
    const now = new Date().toISOString();
    if (isPostgresAvailable) {
      try {
        await pool.query(
          `UPDATE tickets SET status = $1, updated_at = $2 WHERE ticket_id = $3`,
          [status, now, ticketId]
        );
      } catch (err) {
        console.warn('Postgres status update error:', err.message);
      }
    }

    const ticket = memoryTickets.find(t => t.ticket_id === ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updated_at = now;
      return ticket;
    }
    return null;
  },

  /**
   * Update ticket view state ('viewed' / 'unviewed')
   */
  async updateTicketViewState(ticketId, viewState) {
    await dbReady;
    const validState = viewState === 'viewed' ? 'viewed' : 'unviewed';
    const now = new Date().toISOString();
    if (isPostgresAvailable) {
      try {
        await pool.query(
          `UPDATE tickets SET view_state = $1, updated_at = $2 WHERE ticket_id = $3`,
          [validState, now, ticketId]
        );
      } catch (err) {
        console.warn('Postgres view_state update error:', err.message);
      }
    }

    const ticket = memoryTickets.find(t => t.ticket_id === ticketId);
    if (ticket) {
      ticket.view_state = validState;
      ticket.updated_at = now;
      return ticket;
    }
    return { ticket_id: ticketId, view_state: validState, updated_at: now };
  },

  /**
   * Admin override for Category and Priority
   */
  async updateTicketOverrides(ticketId, { category, priority, priority_score }) {
    await dbReady;
    const now = new Date().toISOString();
    if (isPostgresAvailable) {
      try {
        await pool.query(
          `UPDATE tickets 
           SET category = COALESCE($1, category), 
               priority = COALESCE($2, priority),
               ai_priority_score = COALESCE($3, ai_priority_score),
               updated_at = $4 
           WHERE ticket_id = $5`,
          [category || null, priority || null, priority_score || null, now, ticketId]
        );
      } catch (err) {
        console.warn('Postgres ticket overrides update error:', err.message);
      }
    }

    const ticket = memoryTickets.find(t => t.ticket_id === ticketId);
    if (ticket) {
      if (category) ticket.category = category;
      if (priority) ticket.priority = priority;
      if (priority_score) ticket.ai_priority_score = priority_score;
      ticket.updated_at = now;
      return ticket;
    }
    return { ticket_id: ticketId, category, priority, priority_score, updated_at: now };
  },

  /**
   * Update AI triage fields (category, priority, score, reasoning, draft response)
   */
  async updateTicketAiAnalysis(ticketId, { category, priority, priority_score, reasoning, ai_draft_response }) {
    await dbReady;
    const now = new Date().toISOString();

    if (isPostgresAvailable) {
      try {
        const query = `
          UPDATE tickets
          SET 
            category = COALESCE($1, category),
            priority = COALESCE($2, priority),
            ai_category = COALESCE($1, ai_category),
            ai_priority = COALESCE($2, ai_priority),
            ai_priority_score = COALESCE($3, ai_priority_score),
            ai_reasoning = COALESCE($4, ai_reasoning),
            ai_draft_response = COALESCE($5, ai_draft_response),
            updated_at = $6
          WHERE ticket_id = $7
        `;
        await pool.query(query, [
          category || null,
          priority || null,
          priority_score || null,
          reasoning || null,
          ai_draft_response || null,
          now,
          ticketId
        ]);
      } catch (err) {
        console.warn('Postgres AI analysis update error, saving to memory:', err.message);
      }
    }

    const ticket = memoryTickets.find(t => t.ticket_id === ticketId);
    if (ticket) {
      if (category) {
        ticket.category = category;
        ticket.ai_category = category;
      }
      if (priority) {
        ticket.priority = priority;
        ticket.ai_priority = priority;
      }
      if (priority_score) ticket.ai_priority_score = priority_score;
      if (reasoning) ticket.ai_reasoning = reasoning;
      if (ai_draft_response) ticket.ai_draft_response = ai_draft_response;
      ticket.updated_at = now;
      return ticket;
    }
    return null;
  },


  /**
   * Admin internal notes update
   */
  async updateTicketInternalNotes(ticketId, internal_notes) {
    await dbReady;
    const now = new Date().toISOString();
    if (isPostgresAvailable) {
      try {
        await pool.query(
          `UPDATE tickets SET internal_notes = $1, updated_at = $2 WHERE ticket_id = $3`,
          [internal_notes, now, ticketId]
        );
      } catch (err) {
        console.warn('Postgres internal notes update error:', err.message);
      }
    }

    const ticket = memoryTickets.find(t => t.ticket_id === ticketId);
    if (ticket) {
      ticket.internal_notes = internal_notes;
      ticket.updated_at = now;
      return ticket;
    }
    return { ticket_id: ticketId, internal_notes, updated_at: now };
  },

  /**
   * Admin ticket assignment
   */
  async updateTicketAssignment(ticketId, assigned_to) {
    await dbReady;
    const now = new Date().toISOString();
    if (isPostgresAvailable) {
      try {
        await pool.query(
          `UPDATE tickets SET assigned_to = $1, updated_at = $2 WHERE ticket_id = $3`,
          [assigned_to, now, ticketId]
        );
      } catch (err) {
        console.warn('Postgres ticket assignment update error:', err.message);
      }
    }

    const ticket = memoryTickets.find(t => t.ticket_id === ticketId);
    if (ticket) {
      ticket.assigned_to = assigned_to;
      ticket.updated_at = now;
      return ticket;
    }
    return { ticket_id: ticketId, assigned_to, updated_at: now };
  },

  /**
   * Mark messages in a ticket as read by the recipient.
   * If readerRole is 'admin' -> marks messages from 'author' as is_read = true (double tick for author)
   * If readerRole is 'author' -> marks messages from 'admin' as is_read = true (double tick for admin)
   */
  async markMessagesAsRead(ticketId, readerRole) {
    await dbReady;
    const senderToMark = readerRole === 'admin' ? 'author' : 'admin';

    if (isPostgresAvailable) {
      try {
        await pool.query(
          `UPDATE ticket_messages
           SET is_read = TRUE
           WHERE ticket_id = $1 AND sender_role = $2 AND is_read = FALSE`,
          [ticketId, senderToMark]
        );
      } catch (err) {
        console.warn('Postgres markMessagesAsRead error:', err.message);
      }
    }

    const ticket = memoryTickets.find(t => t.ticket_id === ticketId);
    if (ticket && ticket.messages) {
      ticket.messages.forEach(m => {
        if (m.sender_role === senderToMark) {
          m.is_read = true;
        }
      });
    }

    return true;
  }
};
