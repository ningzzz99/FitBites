import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, handle } from '../middleware.js';

const router = express.Router();

router.get('/', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const db = getDb();

  const global = db.prepare(
    `SELECT id as user_id, username, total_coins, banner_color, banner_icon, current_streak as streak_count
     FROM users
     WHERE shown_in_leaderboard = 1
     ORDER BY current_streak DESC, total_coins DESC`
  ).all();

  const friendRows = db.prepare(
    `SELECT CASE WHEN user_id_1 = ? THEN user_id_2 ELSE user_id_1 END as friend_id
     FROM friends WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'`
  ).all(userId, userId, userId);

  const friendIdSet = new Set([userId, ...friendRows.map((f) => f.friend_id)]);
  const friends = global.filter((e) => friendIdSet.has(e.user_id));

  return res.json({ global, friends, currentUserId: userId });
}));

router.get('/user-search', requireAuth, handle((req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const db = getDb();
  return res.json(
    db.prepare('SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 10').all(`%${q}%`, req.session.userId)
  );
}));

export default router;
