import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/friends
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT f.id, f.user_id_1, f.user_id_2, f.status,
             u1.username as username_1, u2.username as username_2
      FROM friends f
      JOIN users u1 ON u1.id = f.user_id_1
      JOIN users u2 ON u2.id = f.user_id_2
      WHERE f.user_id_1 = ? OR f.user_id_2 = ?
    `).all(userId, userId);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/friends
router.post('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { targetUserId } = req.body;
  if (!targetUserId || targetUserId === userId) return res.status(400).json({ error: 'Invalid target' });
  try {
    const db = getDb();
    db.prepare("INSERT OR IGNORE INTO friends (user_id_1, user_id_2, status) VALUES (?, ?, 'pending')")
      .run(userId, targetUserId);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/friends/:id
router.patch('/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const friendId = Number(req.params.id);
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const db = getDb();
    if (status === 'rejected') {
      db.prepare('DELETE FROM friends WHERE id = ? AND user_id_2 = ?').run(friendId, userId);
    } else {
      db.prepare("UPDATE friends SET status = 'accepted' WHERE id = ? AND user_id_2 = ?").run(friendId, userId);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
