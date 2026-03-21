import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, handle } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', requireAuth, handle((req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const db = getDb();
  return res.json(
    db.prepare('SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 10').all(`%${q}%`, req.session.userId)
  );
}));

export default router;
