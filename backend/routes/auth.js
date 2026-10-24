import express from 'express';
import { generateToken, requireAuth } from '../middleware/auth.js';
import { dataService } from '../db/db.js';

const router = express.Router();

const ADMIN_EMAIL = 'admin@bookleaf.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// POST /api/auth/login - Role-based Authentication
// Admin: requires both email and password
// Author: requires only email
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ 
        error: 'Validation Error', 
        message: 'Please provide a valid email address.' 
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Admin Authentication: STRICTLY requires BOTH email and password
    const isAdminAccount = cleanEmail === ADMIN_EMAIL || cleanEmail.endsWith('@bookleaf.com') || cleanEmail === 'admin@publisher.com';
    if (isAdminAccount) {
      if (!password || typeof password !== 'string' || password.trim() === '') {
        return res.status(400).json({ 
          error: 'Password Required', 
          message: 'Administrator login requires both email and password.' 
        });
      }

      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ 
          error: 'Invalid Credentials', 
          message: 'Invalid administrator password provided.' 
        });
      }

      const userPayload = {
        email: cleanEmail,
        role: 'admin',
        name: 'BookLeaf Publisher Admin',
        admin_id: 'ADM001'
      };
      const token = generateToken(userPayload);
      return res.json({
        message: 'Admin authentication successful',
        token,
        user: userPayload
      });
    }

    // Check if logging in as an Author from the database
    const author = await dataService.getAuthorByIdOrEmail(cleanEmail);
    if (author) {
      const userPayload = {
        email: author.email,
        role: 'author',
        author_id: author.author_id,
        name: author.name,
        city: author.city
      };
      const token = generateToken(userPayload);
      return res.json({
        message: 'Author authentication successful',
        token,
        user: userPayload
      });
    }

    return res.status(404).json({
      error: `No author or admin account registered with email "${cleanEmail}". Try "admin@bookleaf.com" or an author email like "priya.sharma@email.com".`
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication service error' });
  }
});

// GET /api/auth/me - Validate current session token
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'author') {
      const author = await dataService.getAuthorByIdOrEmail(req.user.author_id);
      return res.json({
        user: {
          ...req.user,
          ...author
        }
      });
    }
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// GET /api/auth/demo-users - Quick switch demo accounts
router.get('/demo-users', async (req, res) => {
  try {
    const authors = await dataService.getAllAuthors();
    const demoAccounts = [
      {
        role: 'admin',
        name: 'BookLeaf Publisher Admin',
        email: ADMIN_EMAIL,
        description: 'Company Publisher Admin (Full access to all authors & tickets)'
      },
      ...authors.map(a => ({
        role: 'author',
        author_id: a.author_id,
        name: a.name,
        email: a.email,
        booksCount: a.books?.length || 0,
        city: a.city
      }))
    ];
    res.json(demoAccounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch demo accounts' });
  }
});

export default router;
