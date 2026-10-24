-- ============================================================================
-- BOOKLEAF PUBLISHING PLATFORM - POSTGRESQL DATABASE SCHEMA
-- ============================================================================

-- 1. Create Enum Types for Status & Roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'author');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Resolved', 'Closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Authors Table
CREATE TABLE IF NOT EXISTS authors (
    author_id VARCHAR(30) PRIMARY KEY,            -- e.g. 'AUTH001'
    name VARCHAR(150) NOT NULL,                  -- Author full name
    email VARCHAR(150) UNIQUE NOT NULL,          -- Author email address
    phone VARCHAR(50),                           -- Contact phone
    city VARCHAR(100),                           -- City / Location
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Date when author signed up
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching authors by email or name
CREATE INDEX IF NOT EXISTS idx_authors_email ON authors(email);
CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);

-- 3. Books Table
CREATE TABLE IF NOT EXISTS books (
    book_id VARCHAR(30) PRIMARY KEY,             -- e.g. 'BK001'
    author_id VARCHAR(30) NOT NULL REFERENCES authors(author_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,                 -- Book title
    isbn VARCHAR(50),                            -- ISBN 13/10
    genre VARCHAR(100),                          -- e.g. 'Literary Fiction', 'Self-Help'
    publication_date DATE,                       -- Nullable for books in production
    status VARCHAR(100) NOT NULL,                -- e.g. 'Published & Live', 'In Production - Cover Design'
    mrp NUMERIC(10, 2),                          -- Maximum Retail Price (INR)
    author_royalty_per_copy NUMERIC(10, 2),      -- Royalty amount per copy sold
    total_copies_sold INTEGER NOT NULL DEFAULT 0,
    total_royalty_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    royalty_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    royalty_pending NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    last_royalty_payout_date DATE,
    print_partner VARCHAR(100),                  -- e.g. 'In-House', 'Repro India', 'Epitome Books'
    available_on TEXT[] DEFAULT '{}',            -- Array of platforms ['Amazon India', 'Flipkart', 'BookLeaf Store']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);

-- 4. User Accounts (Authentication & Authorization)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'author',  -- 'admin' or 'author'
    author_id VARCHAR(30) REFERENCES authors(author_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 5. Support Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    ticket_id VARCHAR(40) PRIMARY KEY,           -- e.g. 'TCK-1001'
    author_id VARCHAR(30) NOT NULL REFERENCES authors(author_id) ON DELETE CASCADE,
    book_id VARCHAR(30) REFERENCES books(book_id) ON DELETE SET NULL, -- Nullable if General/Account Level
    subject VARCHAR(255) NOT NULL,               -- Subject / summary of issue
    description TEXT,                            -- Detailed query description
    file_attachment_name VARCHAR(255),           -- Optional attachment filename
    category VARCHAR(100) NOT NULL DEFAULT 'General Inquiry', -- Auto-classified by AI or set by Admin
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    ai_category VARCHAR(100),                    -- Initial AI suggested category
    ai_priority VARCHAR(20),                    -- Initial AI suggested priority
    ai_priority_score INTEGER,                   -- Priority score 1 to 10
    ai_reasoning TEXT,                           -- AI reasoning behind classification
    ai_draft_response TEXT,                      -- AI drafted response based on Knowledge Base
    internal_notes TEXT,                         -- Admin private notes (not visible to author)
    assigned_to VARCHAR(150),                    -- Admin user assigned to ticket
    status VARCHAR(30) NOT NULL DEFAULT 'Open',  -- 'Open', 'In Progress', 'Resolved', 'Closed'
    view_state VARCHAR(20) NOT NULL DEFAULT 'unviewed', -- 'viewed' or 'unviewed' queue state
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_author_id ON tickets(author_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- 6. Ticket Chat Messages Table
CREATE TABLE IF NOT EXISTS ticket_messages (
    message_id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(40) NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL,            -- 'author' or 'admin'
    sender_name VARCHAR(150) NOT NULL,           -- Author's name or Publisher Agent name
    message TEXT NOT NULL,                       -- Chat text content
    is_read BOOLEAN NOT NULL DEFAULT FALSE,      -- Read receipts (delivered vs viewed)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- ============================================================================
-- 7. SEED DATA FOR AUTHORS, BOOKS, AND USER ACCOUNTS
-- ============================================================================
-- Execution: Can be run directly in Supabase SQL Editor or psql CLI.
-- Safe & idempotent: Uses ON CONFLICT DO UPDATE so it can be re-run safely.
-- ============================================================================

-- 1. Insert Authors
INSERT INTO authors (author_id, name, email, phone, city, joined_date)
VALUES 
    ('AUTH001', 'Priya Sharma', 'priya.sharma@email.com', '+91-98765-43210', 'Mumbai', '2023-03-15'),
    ('AUTH002', 'Rohit Kapoor', 'rohit.kapoor@email.com', '+91-87654-32109', 'Delhi', '2022-11-08'),
    ('AUTH003', 'Ananya Reddy', 'ananya.reddy@email.com', '+91-76543-21098', 'Hyderabad', '2024-02-20'),
    ('AUTH004', 'Vikram Joshi', 'vikram.joshi@email.com', '+91-65432-10987', 'Pune', '2023-07-12'),
    ('AUTH005', 'Meera Nair', 'meera.nair@email.com', '+91-54321-09876', 'Kochi', '2023-01-05'),
    ('AUTH006', 'Arjun Malhotra', 'arjun.malhotra@email.com', '+91-43210-98765', 'Chandigarh', '2024-06-01'),
    ('AUTH007', 'Sneha Kulkarni', 'sneha.kulkarni@email.com', '+91-32109-87654', 'Bangalore', '2022-09-18'),
    ('AUTH008', 'Farhan Sheikh', 'farhan.sheikh@email.com', '+91-21098-76543', 'Lucknow', '2023-10-01'),
    ('AUTH009', 'Kavita Deshmukh', 'kavita.deshmukh@email.com', '+91-10987-65432', 'Nagpur', '2024-04-10'),
    ('AUTH010', 'Diya Chatterjee', 'diya.chatterjee@email.com', '+91-09876-54321', 'Kolkata', '2023-05-22')
ON CONFLICT (author_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    joined_date = EXCLUDED.joined_date;

-- 2. Insert Books
INSERT INTO books (
    book_id, author_id, title, isbn, genre, publication_date, status, 
    mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned, 
    royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on
)
VALUES 
    -- AUTH001: Priya Sharma
    (
        'BK001', 'AUTH001', 'Whispers of the Ganges', '978-93-5XXXX-01-1', 'Literary Fiction',
        '2023-06-20', 'Published & Live', 399.00, 35.00, 342, 11970.00,
        8400.00, 3570.00, '2025-10-15', 'In-House',
        ARRAY['Amazon India', 'Flipkart', 'BookLeaf Store']
    ),
    (
        'BK002', 'AUTH001', 'The Saffron Diaries', '978-93-5XXXX-02-8', 'Non-Fiction / Memoir',
        '2024-01-10', 'Published & Live', 450.00, 42.00, 189, 7938.00,
        7938.00, 0.00, '2025-12-01', 'In-House',
        ARRAY['Amazon India', 'BookLeaf Store']
    ),

    -- AUTH002: Rohit Kapoor
    (
        'BK003', 'AUTH002', 'Code & Karma', '978-93-5XXXX-03-5', 'Self-Help / Technology',
        '2023-02-14', 'Published & Live', 350.00, 30.00, 876, 26280.00,
        21000.00, 5280.00, '2025-09-01', 'Repro India',
        ARRAY['Amazon India', 'Flipkart', 'Amazon US', 'BookLeaf Store']
    ),
    (
        'BK004', 'AUTH002', 'Startup Sutra', '978-93-5XXXX-04-2', 'Business / Entrepreneurship',
        '2024-05-22', 'Published & Live', 499.00, 48.00, 1203, 57744.00,
        50000.00, 7744.00, '2025-11-15', 'In-House',
        ARRAY['Amazon India', 'Flipkart', 'Amazon US', 'Amazon UK', 'BookLeaf Store']
    ),

    -- AUTH003: Ananya Reddy
    (
        'BK005', 'AUTH003', 'Between Two Temples', '978-93-5XXXX-05-9', 'Historical Fiction',
        '2024-07-05', 'Published & Live', 425.00, 38.00, 67, 2546.00,
        0.00, 2546.00, NULL, 'Epitome Books',
        ARRAY['Amazon India', 'BookLeaf Store']
    ),

    -- AUTH004: Vikram Joshi
    (
        'BK006', 'AUTH004', 'Debugging Life', '978-93-5XXXX-06-6', 'Self-Help',
        '2023-11-30', 'Published & Live', 299.00, 25.00, 534, 13350.00,
        10000.00, 3350.00, '2025-08-20', 'In-House',
        ARRAY['Amazon India', 'Flipkart', 'BookLeaf Store']
    ),
    (
        'BK007', 'AUTH004', 'The Last Monsoon', '978-93-5XXXX-07-3', 'Poetry',
        '2024-08-15', 'Published & Live', 199.00, 15.00, 123, 1845.00,
        1845.00, 0.00, '2025-12-01', 'In-House',
        ARRAY['Amazon India', 'BookLeaf Store']
    ),

    -- AUTH005: Meera Nair
    (
        'BK008', 'AUTH005', 'Cardamom & Chaos', '978-93-5XXXX-08-0', 'Contemporary Fiction',
        '2023-04-18', 'Published & Live', 375.00, 32.00, 445, 14240.00,
        14240.00, 0.00, '2025-12-01', 'Repro India',
        ARRAY['Amazon India', 'Flipkart', 'BookLeaf Store']
    ),
    (
        'BK009', 'AUTH005', 'Letters from Lakshadweep', '978-93-5XXXX-09-7', 'Travel / Non-Fiction',
        '2024-03-01', 'Published & Live', 550.00, 55.00, 201, 11055.00,
        8000.00, 3055.00, '2025-10-15', 'In-House',
        ARRAY['Amazon India', 'Amazon US', 'BookLeaf Store']
    ),

    -- AUTH006: Arjun Malhotra
    (
        'BK010', 'AUTH006', 'Turban Tales', '978-93-5XXXX-10-3', 'Humor / Essays',
        '2024-09-10', 'Published & Live', 325.00, 28.00, 88, 2464.00,
        0.00, 2464.00, NULL, 'In-House',
        ARRAY['Amazon India', 'BookLeaf Store']
    ),

    -- AUTH007: Sneha Kulkarni
    (
        'BK011', 'AUTH007', 'The Algorithm of Love', '978-93-5XXXX-11-0', 'Romance',
        '2022-12-25', 'Published & Live', 299.00, 25.00, 1567, 39175.00,
        35000.00, 4175.00, '2025-11-15', 'Repro India',
        ARRAY['Amazon India', 'Flipkart', 'Amazon US', 'BookLeaf Store']
    ),
    (
        'BK012', 'AUTH007', 'Ctrl+Alt+Delete My Ex', '978-93-5XXXX-12-7', 'Romance / Humor',
        '2024-02-14', 'Published & Live', 350.00, 30.00, 723, 21690.00,
        18000.00, 3690.00, '2025-10-15', 'In-House',
        ARRAY['Amazon India', 'Flipkart', 'BookLeaf Store']
    ),
    (
        'BK013', 'AUTH007', 'Midnight in Mysore', '978-93-5XXXX-13-4', 'Thriller',
        NULL, 'In Production - Cover Design', NULL, NULL, 0, 0.00,
        0.00, 0.00, NULL, NULL,
        ARRAY[]::TEXT[]
    ),

    -- AUTH008: Farhan Sheikh
    (
        'BK014', 'AUTH008', 'Ghazal of the Forgotten', '978-93-5XXXX-14-1', 'Poetry / Urdu Literature',
        '2024-01-26', 'Published & Live', 250.00, 20.00, 156, 3120.00,
        3120.00, 0.00, '2025-12-01', 'Epitome Books',
        ARRAY['Amazon India', 'BookLeaf Store']
    ),

    -- AUTH009: Kavita Deshmukh
    (
        'BK015', 'AUTH009', 'Raising Roots', '978-93-5XXXX-15-8', 'Parenting / Non-Fiction',
        NULL, 'In Production - Typesetting', NULL, NULL, 0, 0.00,
        0.00, 0.00, NULL, NULL,
        ARRAY[]::TEXT[]
    ),
    (
        'BK016', 'AUTH009', 'The Nagpur Notebooks', '978-93-5XXXX-16-5', 'Essays / Memoir',
        '2024-11-05', 'Published & Live', 299.00, 25.00, 34, 850.00,
        0.00, 850.00, NULL, 'In-House',
        ARRAY['Amazon India', 'BookLeaf Store']
    ),

    -- AUTH010: Diya Chatterjee
    (
        'BK017', 'AUTH010', 'Durga''s Daughters', '978-93-5XXXX-17-2', 'Literary Fiction',
        '2023-10-15', 'Published & Live', 475.00, 45.00, 612, 27540.00,
        25000.00, 2540.00, '2025-11-15', 'Repro India',
        ARRAY['Amazon India', 'Flipkart', 'Amazon US', 'BookLeaf Store']
    ),
    (
        'BK018', 'AUTH010', 'Howrah Nights', '978-93-5XXXX-18-9', 'Crime / Thriller',
        '2025-01-20', 'Published & Live', 399.00, 35.00, 45, 1575.00,
        0.00, 1575.00, NULL, 'In-House',
        ARRAY['Amazon India', 'BookLeaf Store']
    )
ON CONFLICT (book_id) DO UPDATE SET
    author_id = EXCLUDED.author_id,
    title = EXCLUDED.title,
    isbn = EXCLUDED.isbn,
    genre = EXCLUDED.genre,
    publication_date = EXCLUDED.publication_date,
    status = EXCLUDED.status,
    mrp = EXCLUDED.mrp,
    author_royalty_per_copy = EXCLUDED.author_royalty_per_copy,
    total_copies_sold = EXCLUDED.total_copies_sold,
    total_royalty_earned = EXCLUDED.total_royalty_earned,
    royalty_paid = EXCLUDED.royalty_paid,
    royalty_pending = EXCLUDED.royalty_pending,
    last_royalty_payout_date = EXCLUDED.last_royalty_payout_date,
    print_partner = EXCLUDED.print_partner,
    available_on = EXCLUDED.available_on;

-- 3. Insert User Accounts (Admin + All 10 Authors for Login & RBAC)
INSERT INTO users (email, role, author_id)
VALUES 
    ('admin@bookleaf.com', 'admin', NULL),
    ('priya.sharma@email.com', 'author', 'AUTH001'),
    ('rohit.kapoor@email.com', 'author', 'AUTH002'),
    ('ananya.reddy@email.com', 'author', 'AUTH003'),
    ('vikram.joshi@email.com', 'author', 'AUTH004'),
    ('meera.nair@email.com', 'author', 'AUTH005'),
    ('arjun.malhotra@email.com', 'author', 'AUTH006'),
    ('sneha.kulkarni@email.com', 'author', 'AUTH007'),
    ('farhan.sheikh@email.com', 'author', 'AUTH008'),
    ('kavita.deshmukh@email.com', 'author', 'AUTH009'),
    ('diya.chatterjee@email.com', 'author', 'AUTH010')
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    author_id = EXCLUDED.author_id;
