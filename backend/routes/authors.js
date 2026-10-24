import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { dataService } from '../db/db.js';

const router = express.Router();

// Helper to compute metrics for an author
const enrichAuthorWithMetrics = (author) => {
  const books = author.books || [];
  const totalBooks = books.length;
  const totalCopiesSold = books.reduce((sum, b) => sum + (Number(b.total_copies_sold) || 0), 0);
  const totalRoyaltyEarned = books.reduce((sum, b) => sum + (Number(b.total_royalty_earned) || 0), 0);
  const totalRoyaltyPaid = books.reduce((sum, b) => sum + (Number(b.royalty_paid) || 0), 0);
  const totalRoyaltyPending = books.reduce((sum, b) => sum + (Number(b.royalty_pending) || 0), 0);

  // Latest payout date across all books
  const payoutDates = books
    .map(b => b.last_royalty_payout_date)
    .filter(Boolean)
    .sort()
    .reverse();

  const latestPayoutDate = payoutDates[0] || null;

  return {
    ...author,
    metrics: {
      totalBooks,
      totalCopiesSold,
      totalRoyaltyEarned,
      totalRoyaltyPaid,
      totalRoyaltyPending,
      latestPayoutDate
    }
  };
};

// GET /api/authors - (Admin Only) List all authors with metrics
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const authors = await dataService.getAllAuthors();
    const enrichedAuthors = authors.map(enrichAuthorWithMetrics);
    res.json(enrichedAuthors);
  } catch (err) {
    console.error('Error fetching authors:', err);
    res.status(500).json({ error: 'Failed to fetch author list' });
  }
});

// GET /api/authors/stats/summary - (Admin Only) Aggregate Publishing Stats
router.get('/stats/summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const authors = await dataService.getAllAuthors();
    let totalAuthors = authors.length;
    let totalBooks = 0;
    let totalCopiesSold = 0;
    let totalRoyaltyEarned = 0;
    let totalRoyaltyPaid = 0;
    let totalRoyaltyPending = 0;
    let publishedBooksCount = 0;
    let inProductionCount = 0;

    authors.forEach(a => {
      const books = a.books || [];
      totalBooks += books.length;
      books.forEach(b => {
        totalCopiesSold += Number(b.total_copies_sold) || 0;
        totalRoyaltyEarned += Number(b.total_royalty_earned) || 0;
        totalRoyaltyPaid += Number(b.royalty_paid) || 0;
        totalRoyaltyPending += Number(b.royalty_pending) || 0;
        if (b.status && b.status.toLowerCase().includes('published')) {
          publishedBooksCount++;
        } else {
          inProductionCount++;
        }
      });
    });

    const tickets = await dataService.getTickets();
    const openTicketsCount = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;

    res.json({
      totalAuthors,
      totalBooks,
      publishedBooksCount,
      inProductionCount,
      totalCopiesSold,
      totalRoyaltyEarned,
      totalRoyaltyPaid,
      totalRoyaltyPending,
      openTicketsCount,
      totalTicketsCount: tickets.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

// GET /api/authors/:id - Fetch author details and books (Author self or Admin)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization check: if user is author, can only access their own author_id
    if (req.user.role === 'author' && req.user.author_id.toLowerCase() !== id.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden: You cannot view another author profile' });
    }

    const author = await dataService.getAuthorByIdOrEmail(id);
    if (!author) {
      return res.status(404).json({ error: `Author ${id} not found` });
    }

    res.json(enrichAuthorWithMetrics(author));
  } catch (err) {
    console.error('Error fetching author details:', err);
    res.status(500).json({ error: 'Failed to fetch author' });
  }
});

export default router;
