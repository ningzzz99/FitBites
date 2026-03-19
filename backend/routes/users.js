import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/search?q=...
router.get('/search', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 10'
    ).all(`%${q}%`, userId);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
