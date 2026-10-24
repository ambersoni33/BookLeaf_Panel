# 🌿 BookLeaf Publishing Platform — Fullstack Assessment Application

A modern, production-grade publishing management and support automation platform built with **React.js 18, Node.js Express (ES Modules), Tailwind CSS**, a canonical **PostgreSQL relational database schema**, and an autonomous **LangGraph AI Support Intelligence Agent**.

The platform is engineered around two core personas:
1. **Authors (Book Writers)**: Personalized author studio featuring financial & royalty dashboards, book production statuses, an interactive support desk, and a **right-side sliding navigation drawer**.
2. **Company Publishers (Admin)**: Executive operations console overseeing author catalogs, total royalty disbursements, inbound ticket queues with real-time polling, and an **interactive sliding sidepanel** to chat directly with authors and manage workflows.

---

## 🧠 1. How I Thought About the Project Creation

### The Problem Context
In self-publishing and assisted publishing houses like BookLeaf, the author-publisher relationship is deeply personal yet fraught with friction:
- **High Emotional Investment**: Writing a book takes months or years. When an author sees their book "Currently Unavailable" on Amazon, notices an ISBN mismatch, or doesn't receive expected royalty payouts, anxiety spikes immediately.
- **Support Ticket Deluges**: Publishing desks receive hundreds of repetitive queries daily. Support agents struggle to manually calculate net profits, verify production milestones across 9 stages, and trace physical book distribution channels.
- **The Information Gap**: Authors lack financial clarity (e.g., confusing gross retail sales with net author profit after platform cuts and printing costs).

### The Guiding Design Principles
When designing this platform, I focused on three pillars:

1. **Empathy-First Author Experience**:
   - The Author Dashboard must provide radical transparency: lifetime copies sold, total royalties earned, disbursed payments, and exact pending balances with previous payout dates.
   - When an author has a question about a specific book, they shouldn't have to re-type book titles or ISBNs. A 1-click **"Book Query"** button automatically pre-fills ticket metadata.
   - Authors deserve modern messaging cues. Adding **single-tick (delivered) and double-tick (viewed by publisher)** indicators removes the black-box anxiety of traditional support email threads.

2. **Operational Ergonomics for Publisher Admins**:
   - Publishers should never navigate away from their dashboard to answer a ticket. An **interactive sliding sidepanel** enables admins to review an author's complete catalog, inspect financial ledgers, and chat in real time within a unified view.
   - An intelligent **Inbound Ticket Queue** separates new, unviewed tickets from active workflows, color-coding priorities and calculating queue velocity in real time.

3. **Autonomous AI Assistance with Human-in-the-Loop Supervision**:
   - Rather than deploying an unconstrained chatbot that hallucinates policies or gives inaccurate royalty figures, the AI acts as a **copilot for publisher operations**.
   - The AI autonomously triages, prioritizes (1–10 urgency score), and drafts calibrated, empathetic responses grounded strictly in BookLeaf's official publishing policies and author database records.

---

## 🏗️ 2. System Architecture & Technical Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (React 18)                       │
│  ┌───────────────────────┐   ┌──────────────────────────────────────┐  │
│  │ Author Dashboard &    │   │  Publisher Executive Console         │  │
│  │ Sliding Nav Drawer    │   │  (Queue, Sidepanels, Live Chat)      │  │
│  └───────────┬───────────┘   └──────────────────┬───────────────────┘  │
└──────────────┼──────────────────────────────────┼──────────────────────┘
               │ HTTP / REST                      │ Polling + Read Receipts
               ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API ROUTING & SECURITY                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Express REST Endpoints (/api/auth, /api/authors, /api/tickets)    │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │ RBAC Security Middleware (JWT Verification, Role Guard Policies) │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
┌───────────────────────────────┐             ┌──────────────────────────────┐
│     DATABASE ENGINE (pg)      │             │   AUTONOMOUS AI AGENT ENGINE │
│  ┌─────────────────────────┐  │             │  ┌─────────────────────────┐ │
│  │ PostgreSQL Relational   │  │             │  │ LangGraph StateGraph    │ │
│  │ Schema (schema.sql)     │  │             │  │ Multi-Node Orchestration│ │
│  └───────────┬─────────────┘  │             │  └────────────┬────────────┘ │
│              │ Fallback       │             │               │              │
│  ┌───────────▼─────────────┐  │   Context   │  ┌────────────▼────────────┐ │
│  │ In-Memory Data Service  │◄─┼─────────────┼──┤ Structured LLM Triage & │ │
│  │ (Zero-Downtime Cache)   │  │  Injection  │  │ Calibrated Prompts      │ │
│  └─────────────────────────┘  │             │  └─────────────────────────┘ │
└───────────────────────────────┘             └──────────────────────────────┘
```

### Key Architectural Decisions

1. **Strict Role-Based Access Control (RBAC) at the Network & DB Layer**:
   - Role separation is enforced on backend endpoints via JWT tokens (`requireAuth`, `requireAdmin`, `requireAuthor`), not merely hidden in the UI.
   - **Authors**: Sign in with **Email Only** (passwordless author workflow). An author's token grants access strictly to their own books, royalty ledger, and ticket threads.
   - **Publisher Admin**: Requires both **Email and Password** (`admin123`). Admin tokens permit global catalog auditing, author sidepanel inspection, and ticket status mutations.

2. **Real-Time Polling & Read Receipts Engine**:
   - Modern instant messaging dynamics are achieved using optimized periodic polling (3-second cadence).
   - When an author submits a message, it is marked as `is_read = FALSE` (**single tick** / delivered).
   - The moment an admin opens the ticket in the queue or sidepanel, a batch update sets `is_read = TRUE` (**double tick** / viewed), giving the author instant visual confirmation that their query is being addressed.

3. **Dual-Strategy Resilient Data Layer**:
   - Primary: Canonical PostgreSQL database accessed through a `pg.Pool` connection pool with automatic SSL negotiation (compatible with local PostgreSQL, Supabase, Neon, Render, or AWS RDS).
   - Secondary: In-memory fallback layer. If a reviewer tests the application without an active PostgreSQL instance, the app automatically boots with seed data in-memory, ensuring zero crashes.

---

## 🤖 3. The LangGraph LLM Agent Architecture

The ticket analysis engine is built on **LangGraph** (`@langchain/langgraph`) using a stateful, multi-node Directed Acyclic Graph (DAG):

```
[Start] ──▶ Node 1: classifyAndPrioritize
                │ (Structured Output via Zod Schema)
                ▼
            Node 2: generateResponse
                │ (Dynamic Routing to Isolated Domain Prompts)
                ▼
            Node 3: persistResults
                │ (Direct PostgreSQL Update)
                ▼
              [End]
```

### Node 1: Classifier & Prioritizer (`classifyAndPrioritize`)
- Utilizes OpenAI's structured output API paired with a **Zod schema** (`ClassificationSchema`):
  ```javascript
  {
    category: z.enum([
      'Royalty & Payments',
      'ISBN & Metadata Issues',
      'Printing & Quality',
      'Distribution & Availability',
      'Book Status & Production Updates',
      'General Inquiry'
    ]),
    priority_score: z.number().int().min(1).max(10),
    priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
    reasoning: z.string()
  }
  ```
- **Why Structured Output?** Guarantees 100% type safety and database column compatibility. Eliminates fragile regex string parsing or JSON formatting errors.
- **Scoring Rubric**:
  - `Score 10 (Critical)`: Severe blockers — ISBN mismatches on Amazon/Flipkart, missing royalties >4-6 months, defective print batch before launch.
  - `Score 8-9 (High)`: Urgent operational issues — Out of stock during active promotion, misprinted author copies, payouts past 45-day window.
  - `Score 4-7 (Medium)`: Standard inquiries — Payout calendar clarification, typesetting progress check.
  - `Score 1-3 (Low)`: Non-urgent inquiries — Author bio updates, general marketing tips.

### Node 2: Contextual Response Generator (`generateResponse`)
- Injects full ticket context: Author profile, connected book metadata (Title, Status, ISBN, Sales), author message, priority score, and analytical reasoning.
- Dynamically routes the ticket to its **isolated domain prompt** via `getPromptForCategory(state.category)`.
- Generates a polished, professional response adhering to BookLeaf's brand voice and operational timelines.

### Node 3: Database Persistence (`persistResults`)
- Writes the AI category, priority score, analytical reasoning, and drafted response directly into the `tickets` table in PostgreSQL.
- Immediately surfaces the drafted response inside the Admin Ticket Queue, allowing the publisher agent to review, tweak, or approve it with 1 click.

---

## ✍️ 4. Prompt Engineering & Prompt Design Philosophy

### The Failure of Monolithic Prompts
A common pitfall in AI support bots is using a single "mega-prompt" containing every policy, table, and FAQ. This leads to:
1. **Context Dilution**: The LLM confuses royalty calculation formulas with book production timelines.
2. **Hallucination Risk**: The model invents arbitrary payout dates or makes unauthorized refund promises.
3. **Inconsistent Tone**: Cold robotic answers for sensitive royalty issues, or overly casual answers for critical catalog errors.

### The Modular Prompt Solution
I designed a **modular prompt architecture** with isolated domain prompts in `backend/ai/prompts.js`:

```
backend/ai/
├── knowledgeBase.js   # Authoritative ground-truth knowledge & policies
├── prompts.js         # 6 isolated domain prompts calibrated with benchmark examples
└── ticketAgent.js     # LangGraph state machine & LLM execution
```

Each category prompt contains **ONLY** the relevant policy knowledge and explicit calibration benchmark examples:

| Category Prompt | Domain Scope | Ground-Truth Benchmark Calibration |
|---|---|---|
| **Royalty & Payments** | Quarterly cycles, 80/20 profit split, ₹1,000 threshold | **Case 1 (Missing Royalty)**: Empathize sincerely ➔ Explain quarterly cycle & 45-day payout settlement window ➔ Remind to verify bank/IFSC details ➔ Provide next payout date (e.g. May 15, Aug 15) ➔ Escalate with 48h SLA if overdue.<br>**Case 2 (Low Royalty)**: Transparently explain net profit formula: `Net Profit = MRP - (Printing + Platform 40-50% Commission + Shipping) * 80%` ➔ Proactively offer an itemized line-by-line breakdown. |
| **ISBN & Metadata** | Imprints, 10/13-digit barcodes, marketplace listings | **Case (ISBN Mismatch on Amazon)**: Flag as HIGH/CRITICAL ➔ Apologize for retail confusion ➔ Escalate immediately to Production & Metadata Lead ➔ 48-hour resolution SLA. |
| **Printing & Quality** | Print partners, binding, defect verification | **Case (Defective Author Copies)**: Sincere apology ➔ Request defect photos/videos ➔ Confirm 100% Free Replacement Quality Guarantee ➔ 5 to 7 business day reprint turnaround. |
| **Distribution & Retail** | Amazon/Flipkart algorithms, stock latency | **Case (Unavailable on Amazon)**: Reassure book is not delisted ➔ Explain automated inventory API sync latency ➔ Trigger manual catalog sync ➔ 24 to 48 hour resolution. |
| **Book Production** | 9-stage sequential publishing workflow | **Case (Typesetting Delays)**: Check actual stage out of 9 ➔ Honest explanation of intricate formatting ➔ Collaborative creative partner tone (never blame author) ➔ Concrete galley proof delivery date. |
| **General Inquiry** | Packages, author bio updates, marketing | **Case (Post-Publication Updates)**: Direct warm "Yes" ➔ Explain 3 to 5 business day platform propagation window. |

### Core Behavioral Guardrails
- **Empathy First**: Validate the author's emotion before diving into policy or numbers.
- **Zero Vague Placeholders**: Never output `[Insert Date]` or `[Agent Name]`. Prompts mandate concrete operational timelines defined in the knowledge base.
- **Strict Data Grounding**: The LLM is barred from fabricating sales figures or promising payouts outside the database records.

---

## 📁 5. Project Directory Structure

```
BookLeafAssessment/
├── backend/
│   ├── package.json
│   ├── server.js                  # Express API server & route mounting
│   ├── .env.example               # Environment variables template
│   ├── ai/
│   │   ├── knowledgeBase.js       # Ground-truth BookLeaf operational policies
│   │   ├── prompts.js             # 6 Calibrated domain prompts & triage criteria
│   │   └── ticketAgent.js         # LangGraph state machine & AI triage execution
│   ├── db/
│   │   ├── schema.sql             # Unified PostgreSQL DDL, indexes, and full seeds
│   │   ├── seedData.js            # Initial dataset (10 Authors, 18 Books, Tickets)
│   │   └── db.js                  # pg connection pool & resilient data service
│   ├── middleware/
│   │   └── auth.js                # JWT token verification & RBAC guards
│   └── routes/
│       ├── auth.js                # Login & session validation (/api/auth)
│       ├── authors.js             # Author catalogs & analytics (/api/authors)
│       └── tickets.js             # Support tickets, live chat & polling (/api/tickets)
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js             # Vite configuration with API proxy to port 5000
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                # Application orchestrator & view router
│       ├── index.css
│       ├── context/
│       │   └── AuthContext.jsx    # Session state & role switcher context
│       ├── services/
│       │   └── api.js             # Axios-like API client with auto JWT injection
│       └── components/
│           ├── Navbar.jsx                 # Top header with session indicator & switcher
│           ├── RightSlidingNav.jsx         # Sliding right-side navigation drawer
│           ├── AuthorDetailsPage.jsx       # Page 1: Author profile & books financial cards
│           ├── AuthorTicketsChatPage.jsx   # Page 2: Author support desk & chat thread
│           ├── AdminTicketQueue.jsx        # Admin: Inbound ticket queue & AI copilot
│           ├── AdminAuthorDirectory.jsx    # Admin: Complete authors directory & KPIs
│           ├── AdminAuthorSidepanel.jsx    # Admin: Author inspection sidepanel with chat
│           └── LoginModal.jsx             # Clean RBAC login dialog
├── .gitignore                     # Repository exclusion rules
└── README.md                      # Comprehensive project documentation
```

---

## ⚡ 6. How to Run the Application

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- *(Optional)* PostgreSQL instance (local or cloud)

### Step 1: Start the Backend API
```bash
cd backend
npm install
npm run dev
```
The backend API server boots on **http://localhost:5000**.

### Step 2: Start the Frontend Application
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend application starts on **http://localhost:3000**.

---

## 👤 7. Authentication & Test Accounts (RBAC)

The application enforces strict Role-Based Access Control:
- **Publisher Administrator**: Requires both **Email** and **Password** (`admin123`).
- **Authors**: Require **Email Only** (passwordless author login).

| Role | Name | Email | Password | Details & Access |
|---|---|---|---|---|
| **Admin** | BookLeaf Publisher Admin | `admin@bookleaf.com` | `admin123` | Full administrative console, inbound tickets, inspect author pages |
| **Author** | Priya Sharma | `priya.sharma@email.com` | *(Email only)* | 2 books, pending royalty: ₹3,570 |
| **Author** | Rohit Kapoor | `rohit.kapoor@email.com` | *(Email only)* | 2 books, pending royalty: ₹5,280 |
| **Author** | Ananya Reddy | `ananya.reddy@email.com` | *(Email only)* | 1 book, pending royalty: ₹2,546 |
| **Author** | Vikram Joshi | `vikram.joshi@email.com` | *(Email only)* | 2 books, pending royalty: ₹3,350 |
| **Author** | Meera Nair | `meera.nair@email.com` | *(Email only)* | 2 books, pending royalty: ₹3,055 |
| **Author** | Arjun Malhotra | `arjun.malhotra@email.com` | *(Email only)* | 1 book, pending royalty: ₹2,464 |
| **Author** | Sneha Kulkarni | `sneha.kulkarni@email.com` | *(Email only)* | 3 books (1 in cover design), pending: ₹7,865 |
| **Author** | Farhan Sheikh | `farhan.sheikh@email.com` | *(Email only)* | 1 book, all royalties cleared |
| **Author** | Kavita Deshmukh | `kavita.deshmukh@email.com` | *(Email only)* | 2 books (1 in typesetting), pending: ₹850 |
| **Author** | Diya Chatterjee | `diya.chatterjee@email.com` | *(Email only)* | 2 books, pending royalty: ₹4,115 |

---

## 🗄️ 8. PostgreSQL Database Setup & Canonical Schema

All database definitions, table structures, and seed datasets are consolidated into a single self-contained SQL file:
```
backend/db/schema.sql
```

### What is Inside `backend/db/schema.sql`?

1. **Table Creation Queries (DDL)**:
   - **Custom Enums**: `user_role` (`admin`, `author`), `ticket_status` (`Open`, `In Progress`, `Resolved`, `Closed`), and `ticket_priority` (`Low`, `Medium`, `High`, `Urgent`).
   - **`authors`**: Core author profiles (`author_id`, `name`, `email`, `phone`, `city`, `joined_date`).
   - **`books`**: Complete catalog with foreign key to `authors` (`book_id`, `author_id`, `title`, `isbn`, `genre`, `mrp`, `author_royalty_per_copy`, `total_copies_sold`, `total_royalty_earned`, `royalty_paid`, `royalty_pending`, `print_partner`, and `available_on TEXT[]`).
   - **`users`**: System login credentials and role assignment (`email`, `role`, `author_id`).
   - **`tickets`**: Support ticket desk with AI metadata (`ticket_id`, `author_id`, `book_id`, `subject`, `description`, `category`, `priority`, `ai_category`, `ai_priority_score`, `ai_reasoning`, `ai_draft_response`, `internal_notes`, `view_state`).
   - **`ticket_messages`**: Real-time conversation thread with `is_read` read receipts (`single tick` for delivered, `double tick` for viewed).
   - **Indexes**: Query performance indexes on `email`, `author_id`, `status`, and `ticket_id`.

2. **Author & Book Seed Data (`INSERT ... ON CONFLICT DO UPDATE`)**:
   - Pre-populates all 10 authors and 18 books with complete sales and royalty data.
   - Idempotent and safe to execute repeatedly without duplicate key conflicts.

3. **Login & RBAC Account Seed Queries**:
   - Automatically provisions the publisher administrator (`admin@bookleaf.com`) and maps all 10 authors into the `users` table for instant sign-in.

---

### How to Run `backend/db/schema.sql`

You can execute `backend/db/schema.sql` on any local or cloud PostgreSQL instance:

#### Option 1: Cloud PostgreSQL (Supabase, Neon, Render, AWS RDS)
1. In your cloud provider dashboard, navigate to the **SQL Editor** or **Query Console**.
2. Open `backend/db/schema.sql`, copy its entire contents, paste into the query editor, and click **Run**.
3. In `backend/.env`, set your connection string:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres
   ```
   *(Note: If your database password contains special characters like `@` or `#`, URL-encode them, e.g. `%40` for `@`)*.

#### Option 2: Local PostgreSQL via CLI (`psql`)
1. Create your database:
   ```bash
   psql -U postgres -c "CREATE DATABASE bookleaf_db;"
   ```
2. Run the unified schema and seed script:
   ```bash
   psql -U postgres -d bookleaf_db -f backend/db/schema.sql
   ```
3. In `backend/.env`, set:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/bookleaf_db
   ```

#### Option 3: GUI Client (pgAdmin, DBeaver, TablePlus)
1. Connect to your database.
2. Open `backend/db/schema.sql` using the **Open File** or **SQL Query** tool.
3. Click **Execute** to run the complete script.

Once executed, restart the backend server (`npm run dev`) and it will automatically verify the connection and begin serving from PostgreSQL.
