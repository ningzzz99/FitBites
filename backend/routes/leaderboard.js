import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/leaderboard
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  try {
    const db = getDb();

    const global = db.prepare(`
      SELECT u.id as user_id, u.username, u.total_coins, u.banner_color, u.banner_icon,
             COALESCE(MAX(dc.streak_count), 0) as streak_count
      FROM users u
      LEFT JOIN daily_challenges dc ON dc.user_id = u.id
      WHERE u.shown_in_leaderboard = 1
      GROUP BY u.id
      ORDER BY streak_count DESC
    `).all();

    const friendRows = db.prepare(`
      SELECT CASE WHEN user_id_1 = ? THEN user_id_2 ELSE user_id_1 END as friend_id
      FROM friends WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'
    `).all(userId, userId, userId);

    const friendIdSet = new Set([userId, ...friendRows.map((f) => f.friend_id)]);
    const friends = global.filter((e) => friendIdSet.has(e.user_id));

    return res.json({ global, friends, currentUserId: userId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
