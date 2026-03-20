import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/profile
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT id, username, email, height, weight, dietary_req, total_coins, current_streak, shown_in_leaderboard, banner_color, banner_icon FROM users WHERE id = ?'
    ).get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const badges = db.prepare(
      'SELECT id as badge_id, badge_type, label, awarded_at FROM badges WHERE user_id = ? ORDER BY awarded_at DESC'
    ).all(userId);

    const streakRow = { streak: user.current_streak ?? 0 };

    const unlockedItems = db.prepare(
      'SELECT item_type, item_value FROM unlocked_banner_items WHERE user_id = ?'
    ).all(userId);

    return res.json({
      profile: { ...user, shown_in_leaderboard: Boolean(user.shown_in_leaderboard) },
      badges,
      streak: streakRow.streak,
      unlocked_items: unlockedItems,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/profile
router.patch('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { height, weight, dietary_req, banner_color, banner_icon, shown_in_leaderboard } = req.body;
  try {
    const db = getDb();
    db.prepare(
      `UPDATE users SET
        height = COALESCE(?, height),
        weight = COALESCE(?, weight),
        dietary_req = COALESCE(?, dietary_req),
        banner_color = COALESCE(?, banner_color),
        banner_icon = COALESCE(?, banner_icon),
        shown_in_leaderboard = COALESCE(?, shown_in_leaderboard)
       WHERE id = ?`
    ).run(
      height !== undefined ? height : null,
      weight !== undefined ? weight : null,
      dietary_req !== undefined ? dietary_req : null,
      banner_color || null,
      banner_icon || null,
      shown_in_leaderboard !== undefined ? (shown_in_leaderboard ? 1 : 0) : null,
      userId
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/unlock
router.post('/unlock', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { item_type, item_value } = req.body;
  if (!['color', 'icon'].includes(item_type) || !item_value) {
    return res.status(400).json({ error: 'Invalid item' });
  }
  const cost = item_type === 'color' ? 100 : 200;
  try {
    const db = getDb();
    const existing = db.prepare(
      'SELECT id FROM unlocked_banner_items WHERE user_id = ? AND item_type = ? AND item_value = ?'
    ).get(userId, item_type, item_value);
    if (existing) return res.json({ ok: true, already_owned: true });

    const user = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId);
    if (user.total_coins < cost) {
      return res.status(400).json({ error: 'Not enough coins', remaining_coins: user.total_coins });
    }

    db.prepare('UPDATE users SET total_coins = total_coins - ? WHERE id = ?').run(cost, userId);
    db.prepare('INSERT OR IGNORE INTO unlocked_banner_items (user_id, item_type, item_value) VALUES (?, ?, ?)').run(userId, item_type, item_value);

    const updated = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId);
    return res.json({ ok: true, remaining_coins: updated.total_coins });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
