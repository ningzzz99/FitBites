import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, handle } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, handle((req, res) => {
  const db = getDb();
  const posts = db.prepare(
    `SELECT p.id as post_id, p.user_id, p.content, p.topic, p.anonymous, p.upvotes, p.created_at,
            u.username,
            CASE WHEN pu.id IS NOT NULL THEN 1 ELSE 0 END as user_upvoted
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN post_upvotes pu ON pu.post_id = p.id AND pu.user_id = ?
     ORDER BY p.created_at DESC`
  ).all(req.session.userId);
  return res.json(posts);
}));

router.post('/', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const { content, topic, anonymous } = req.body;
  if (!content || content.trim().length < 5) return res.status(400).json({ error: 'Content too short' });
  const db = getDb();
  db.prepare('INSERT INTO posts (user_id, content, topic, anonymous) VALUES (?, ?, ?, ?)')
    .run(userId, content.trim(), topic || 'general', anonymous ? 1 : 0);
  // Award a badge on the user's first ever post
  const postCount = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(userId).c;
  if (postCount === 1) {
    db.prepare("INSERT OR IGNORE INTO badges (user_id, badge_type, label) VALUES (?, 'contributor', 'First Post')").run(userId);
  }
  return res.json({ ok: true });
}));

router.post('/:id/upvote', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const postId = Number(req.params.id);
  const db = getDb();
  const existing = db.prepare('SELECT id FROM post_upvotes WHERE post_id = ? AND user_id = ?').get(postId, userId);
  if (existing) {
    db.prepare('DELETE FROM post_upvotes WHERE post_id = ? AND user_id = ?').run(postId, userId);
  } else {
    db.prepare('INSERT INTO post_upvotes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
  }
  const count = db.prepare('SELECT COUNT(*) as c FROM post_upvotes WHERE post_id = ?').get(postId).c;
  db.prepare('UPDATE posts SET upvotes = ? WHERE id = ?').run(count, postId);
  return res.json({ upvotes: count, upvoted: !existing });
}));

router.get('/:id/replies', requireAuth, handle((req, res) => {
  const db = getDb();
  const replies = db.prepare(
    `SELECT r.id as reply_id, r.post_id, r.user_id, r.content, r.anonymous, r.created_at, u.username
     FROM post_replies r
     JOIN users u ON u.id = r.user_id
     WHERE r.post_id = ? ORDER BY r.created_at ASC`
  ).all(Number(req.params.id));
  return res.json(replies);
}));

router.post('/:id/replies', requireAuth, handle((req, res) => {
  const { content, anonymous } = req.body;
  if (!content || content.trim().length < 5) return res.status(400).json({ error: 'Content too short' });
  const db = getDb();
  db.prepare('INSERT INTO post_replies (post_id, user_id, content, anonymous) VALUES (?, ?, ?, ?)')
    .run(Number(req.params.id), req.session.userId, content.trim(), anonymous ? 1 : 0);
  return res.json({ ok: true });
}));

export default router;
