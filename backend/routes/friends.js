import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, handle } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, handle((req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT f.id, f.user_id_1, f.user_id_2, f.status,
            u1.username as username_1, u2.username as username_2
     FROM friends f
     JOIN users u1 ON u1.id = f.user_id_1
     JOIN users u2 ON u2.id = f.user_id_2
     WHERE f.user_id_1 = ? OR f.user_id_2 = ?`
  ).all(req.session.userId, req.session.userId);
  return res.json(rows);
}));

router.post('/', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const { targetUserId } = req.body;
  if (!targetUserId || targetUserId === userId) return res.status(400).json({ error: 'Invalid target' });
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO friends (user_id_1, user_id_2, status) VALUES (?, ?, 'pending')").run(userId, targetUserId);
  return res.json({ ok: true });
}));

router.patch('/:id', requireAuth, handle((req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const friendId = Number(req.params.id);
  const db = getDb();
  if (status === 'rejected') {
    db.prepare('DELETE FROM friends WHERE id = ? AND user_id_2 = ?').run(friendId, req.session.userId);
  } else {
    db.prepare("UPDATE friends SET status = 'accepted' WHERE id = ? AND user_id_2 = ?").run(friendId, req.session.userId);
  }
  return res.json({ ok: true });
}));

export default router;
