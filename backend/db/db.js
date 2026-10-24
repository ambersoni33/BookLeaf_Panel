import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
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
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bookleaf_db',
  connectionTimeoutMillis: isRemoteDb ? 10000 : 3000,
  idleTimeoutMillis: 10000,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false
});

let isPostgresAvailable = false;

// Test connection on boot and auto-seed if empty
export const dbReady = (async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');

    // 1. Check if 'authors' table exists in PostgreSQL
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'authors'
      );
    `);
    const tableExists = tableCheck.rows[0]?.exists;
    
    let authorsCount = 0;
    if (tableExists) {
      const countRes = await client.query('SELECT COUNT(*) FROM authors');
      authorsCount = parseInt(countRes.rows[0]?.count || '0', 10);
    }

    // 2. If table doesn't exist or is empty, auto-execute schema.sql
    if (!tableExists || authorsCount === 0) {
      console.log('🔄 PostgreSQL authors table missing or empty. Auto-executing schema.sql to initialize database...');
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('✅ schema.sql executed successfully! All tables & seed data initialized in PostgreSQL.');
      }
    }

    // 3. Automatically ensure is_read column exists on ticket_messages table
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

// In-Memory fallback store pre-populated with all 10 authors
let memoryAuthors = [
  {
    author_id: 'AUTH001',
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+91-98765-43210',
    city: 'Mumbai',
    joined_date: '2023-03-15',
    books: [
      {
        book_id: 'BK001',
        title: 'Whispers of the Ganges',
        isbn: '978-93-5XXXX-01-1',
        genre: 'Literary Fiction',
        publication_date: '2023-06-20',
        status: 'Published & Live',
        mrp: 399,
        author_royalty_per_copy: 35,
        total_copies_sold: 342,
        total_royalty_earned: 11970,
        royalty_paid: 8400,
        royalty_pending: 3570,
        last_royalty_payout_date: '2025-10-15',
        print_partner: 'In-House',
        available_on: ['Amazon India', 'Flipkart', 'BookLeaf Store']
      },
      {
        book_id: 'BK002',
        title: 'The Saffron Diaries',
        isbn: '978-93-5XXXX-02-8',
        genre: 'Non-Fiction / Memoir',
        publication_date: '2024-01-10',
        status: 'Published & Live',
        mrp: 450,
        author_royalty_per_copy: 42,
        total_copies_sold: 189,
        total_royalty_earned: 7938,
        royalty_paid: 7938,
        royalty_pending: 0,
        last_royalty_payout_date: '2025-12-01',
        print_partner: 'In-House',
        available_on: ['Amazon India', 'BookLeaf Store']
      }
    ]
  },
  {
    author_id: 'AUTH002',
    name: 'Rohit Kapoor',
    email: 'rohit.kapoor@email.com',
    phone: '+91-87654-32109',
    city: 'Delhi',
    joined_date: '2022-11-08',
    books: [
      {
        book_id: 'BK003',
        title: 'Code & Karma',
        isbn: '978-93-5XXXX-03-5',
        genre: 'Self-Help / Technology',
        publication_date: '2023-02-14',
        status: 'Published & Live',
        mrp: 350,
        author_royalty_per_copy: 30,
        total_copies_sold: 876,
        total_royalty_earned: 26280,
        royalty_paid: 21000,
        royalty_pending: 5280,
        last_royalty_payout_date: '2025-09-01',
        print_partner: 'Repro India',
        available_on: ['Amazon India', 'Flipkart', 'Amazon US', 'BookLeaf Store']
      },
      {
        book_id: 'BK004',
        title: 'Startup Sutra',
        isbn: '978-93-5XXXX-04-2',
        genre: 'Business / Entrepreneurship',
        publication_date: '2024-05-22',
        status: 'Published & Live',
        mrp: 499,
        author_royalty_per_copy: 48,
        total_copies_sold: 1203,
        total_royalty_earned: 57744,
        royalty_paid: 50000,
        royalty_pending: 7744,
        last_royalty_payout_date: '2025-11-15',
        print_partner: 'In-House',
        available_on: ['Amazon India', 'Flipkart', 'Amazon US', 'Amazon UK', 'BookLeaf Store']
      }
    ]
  },
  {
    author_id: 'AUTH003',
    name: 'Ananya Reddy',
    email: 'ananya.reddy@email.com',
    phone: '+91-76543-21098',
    city: 'Hyderabad',
    joined_date: '2024-02-20',
    books: [
      {
        book_id: 'BK005',
        title: 'Between Two Temples',
        isbn: '978-93-5XXXX-05-9',
        genre: 'Historical Fiction',
        publication_date: '2024-07-05',
        status: 'Published & Live',
        mrp: 425,
        author_royalty_per_copy: 38,
        total_copies_sold: 67,
        total_royalty_earned: 2546,
        royalty_paid: 0,
        royalty_pending: 2546,
        last_royalty_payout_date: null,
        print_partner: 'Epitome Books',
        available_on: ['Amazon India', 'BookLeaf Store']
      }
    ]
  },
  {
    author_id: 'AUTH004',
    name: 'Vikram Joshi',
    email: 'vikram.joshi@email.com',
    phone: '+91-65432-10987',
    city: 'Pune',
    joined_date: '2023-07-12',
    books: [
      {
        book_id: 'BK006',
        title: 'Debugging Life',
        isbn: '978-93-5XXXX-06-6',
        genre: 'Self-Help',
        publication_date: '2023-11-30',
        status: 'Published & Live',
        mrp: 299,
        author_royalty_per_copy: 25,
        total_copies_sold: 534,
        total_royalty_earned: 13350,
        royalty_paid: 10000,
        royalty_pending: 3350,
        last_royalty_payout_date: '2025-08-20',
        print_partner: 'In-House',
        available_on: ['Amazon India', 'Flipkart', 'BookLeaf Store']
      },
      {
        book_id: 'BK007',
        title: 'The Last Monsoon',
        isbn: '978-93-5XXXX-07-3',
        genre: 'Poetry',
        publication_date: '2024-08-15',
        status: 'Published & Live',
        mrp: 199,
        author_royalty_per_copy: 15,
        total_copies_sold: 123,
        total_royalty_earned: 1845,
        royalty_paid: 1845,
        royalty_pending: 0,
        last_royalty_payout_date: '2025-12-01',
        print_partner: 'In-House',
        available_on: ['Amazon India', 'BookLeaf Store']
      }
    ]
  },
  {
    author_id: 'AUTH005',
    name: 'Meera Nair',
    email: 'meera.nair@email.com',
    phone: '+91-54321-09876',
    city: 'Kochi',
    joined_date: '2023-01-05',
    books: [
      {
        book_id: 'BK008',
        title: 'Cardamom & Chaos',
        isbn: '978-93-5XXXX-08-0',
        genre: 'Contemporary Fiction',
        publication_date: '2023-04-18',
        status: 'Published & Live',
        mrp: 375,
        author_royalty_per_copy: 32,
        total_copies_sold: 445,
        total_royalty_earned: 14240,
        royalty_paid: 14240,
        royalty_pending: 0,
        last_royalty_payout_date: '2025-12-01',
        print_partner: 'Repro India',
        available_on: ['Amazon India', 'Flipkart', 'BookLeaf Store']
      },
      {
        book_id: 'BK009',
        title: 'Letters from Lakshadweep',
        isbn: '978-93-5XXXX-09-7',
        genre: 'Travel / Non-Fiction',
        publication_date: '2024-03-01',
        status: 'Published & Live',
        mrp: 550,
        author_royalty_per_copy: 55,
        total_copies_sold: 201,
        total_royalty_earned: 11055,
        royalty_paid: 8000,
        royalty_pending: 3055,
        last_royalty_payout_date: '2025-10-15',
        print_partner: 'In-House',
        available_on: ['Amazon India', 'Amazon US', 'BookLeaf Store']
      }
    ]
  },
  {
    author_id: 'AUTH006',
    name: 'Arjun Malhotra',
    email: 'arjun.malhotra@email.com',
    phone: '+91-43210-98765',
    city: 'Chandigarh',
    joined_date: '2024-06-01',
    books: [
      {
        book_id: 'BK010',
        title: 'Turban Tales',
        isbn: '978-93-5XXXX-10-3',
        genre: 'Humor / Essays',
        publication_date: '2024-09-10',
        status: 'Published & Live',
        mrp: 325,
        author_royalty_per_copy: 28,
        total_copies_sold: 88,
        total_royalty_earned: 2464,
        royalty_paid: 0,
        royalty_pending: 2464,
        last_royalty_payout_date: null,
        print_partner: 'In-House',
        available_on: ['Amazon India', 'BookLeaf Store']
      }
    ]
  },
  {
    author_id: 'AUTH007',
    name: 'Sneha Kulkarni',
    email: 'sneha.kulkarni@email.com',
    phone: '+91-32109-87654',
    city: 'Bangalore',
    joined_date: '2022-09-18',
    books: [
      {
        book_id: 'BK011',
        title: 'The Algorithm of Love',
        isbn: '978-93-5XXXX-11-0',
        genre: 'Romance',
        publication_date: '2022-12-25',
        status: 'Published & Live',
        mrp: 299,
        author_royalty_per_copy: 25,
        total_copies_sold: 1567,
        total_royalty_earned: 39175,
        royalty_paid: 35000,
        royalty_pending: 4175,
        last_royalty_payout_date: '2025-11-15',
        print_partner: 'Repro India',
        available_on: ['Amazon India', 'Flipkart', 'Amazon US', 'BookLeaf Store']
      },
      {
        book_id: 'BK012',
        title: 'Ctrl+Alt+Delete My Ex',
        isbn: '978-93-5XXXX-12-7',
        genre: 'Romance / Humor',
        publication_date: '2024-02-14',
        status: 'Published & Live',
        mrp: 350,
        author_royalty_per_copy: 30,
        total_copies_sold: 723,
        total_royalty_earned: 21690,
        royalty_paid: 18000,
        royalty_pending: 3690,
        last_royalty_payout_date: '2025-10-15',
        print_partner: 'In-House',
        available_on: ['Amazon India', 'Flipkart', 'BookLeaf Store']
      },
      {
        book_id: 'BK013',
        title: 'Midnight in Mysore',
        isbn: '978-93-5XXXX-13-4',
        genre: 'Thriller',
        publication_date: null,
        status: 'In Production - Cover Design',
        mrp: null,
        author_royalty_per_copy: null,
        total_copies_sold: 0,
        total_royalty_earned: 0,
        royalty_paid: 0,
        royalty_pending: 0,
        last_royalty_payout_date: null,
        print_partner: null,
        available_on: []
      }
    ]
  },
  {
    author_id: 'AUTH008',
    name: 'Farhan Sheikh',
    email: 'farhan.sheikh@email.com',
    phone: '+91-21098-76543',
    city: 'Lucknow',
    joined_date: '2023-10-01',
    books: [
      {
        book_id: 'BK014',
        title: 'Ghazal of the Forgotten',
        isbn: '978-93-5XXXX-14-1',
        genre: 'Poetry / Urdu Literature',
        publication_date: '2024-01-26',
        status: 'Published & Live',
        mrp: 250,
        author_royalty_per_copy: 20,
        total_copies_sold: 156,
        total_royalty_earned: 3120,
        royalty_paid: 3120,
        royalty_pending: 0,
        last_royalty_payout_date: '2025-12-01',
        print_partner: 'Epitome Books',
        available_on: ['Amazon India', 'BookLeaf Store']
      }
    ]
  },
  {
    author_id: 'AUTH009',
    name: 'Kavita Deshmukh',
    email: 'kavita.deshmukh@email.com',
    phone: '+91-10987-65432',
    city: 'Nagpur',
    joined_date: '2024-04-10',
    books: [
      {
        book_id: 'BK015',
        title: 'Raising Roots',
        isbn: '978-93-5XXXX-15-8',
        genre: 'Parenting / Non-Fiction',
        publication_date: null,
        status: 'In Production - Typesetting',
        mrp: null,
        author_royalty_per_copy: null,
        total_copies_sold: 0,
        total_royalty_earned: 0,
        royalty_paid: 0,
        royalty_pending: 0,
        last_royalty_payout_date: null,
        print_partner: null,
        available_on: []
      },
      {
        book_id: 'BK016',
        title: 'The Nagpur Notebooks',
        isbn: '978-93-5XXXX-16-5',
        genre: 'Essays / Memoir',
        publication_date: '2024-11-05',
        status: 'Published & Live',
        mrp: 299,
        author_royalty_per_copy: 25,
        total_copies_sold: 34,
        total_royalty_earned: 850,
        royalty_paid: 0,
        royalty_pending: 850,
        last_royalty_payout_date: null,
        print_partner: 'In-House',
        available_on: ['Amazon India', 'BookLeaf Store']
      }
    ]
  },
  {
    author_id: 'AUTH010',
    name: 'Diya Chatterjee',
    email: 'diya.chatterjee@email.com',
    phone: '+91-09876-54321',
    city: 'Kolkata',
    joined_date: '2023-05-22',
    books: [
      {
        book_id: 'BK017',
        title: "Durga's Daughters",
        isbn: '978-93-5XXXX-17-2',
        genre: 'Literary Fiction',
        publication_date: '2023-10-15',
        status: 'Published & Live',
        mrp: 475,
        author_royalty_per_copy: 45,
        total_copies_sold: 612,
        total_royalty_earned: 27540,
        royalty_paid: 25000,
        royalty_pending: 2540,
        last_royalty_payout_date: '2025-11-15',
        print_partner: 'Repro India',
        available_on: ['Amazon India', 'Flipkart', 'Amazon US', 'BookLeaf Store']
      },
      {
        book_id: 'BK018',
        title: 'Howrah Nights',
        isbn: '978-93-5XXXX-18-9',
        genre: 'Crime / Thriller',
        publication_date: '2025-01-20',
        status: 'Published & Live',
        mrp: 399,
        author_royalty_per_copy: 35,
        total_copies_sold: 45,
        total_royalty_earned: 1575,
        royalty_paid: 0,
        royalty_pending: 1575,
        last_royalty_payout_date: null,
        print_partner: 'In-House',
        available_on: ['Amazon India', 'BookLeaf Store']
      }
    ]
  }
];

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
