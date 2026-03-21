import express from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import { handle } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', handle(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const db = getDb();
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, passwordHash);
    req.session.userId = result.lastInsertRowid;
    req.session.username = username;
    return res.json({ ok: true });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Username or email already taken' });
    throw err;
  }
}));

router.post('/login', handle(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  req.session.username = user.username;
  return res.json({ ok: true });
}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', handle((req, res) => {
  if (!req.session?.userId) return res.json({ user: null });
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, email, height, weight, dietary_req, total_coins, shown_in_leaderboard, banner_color, banner_icon FROM users WHERE id = ?'
  ).get(req.session.userId);
  if (!user) return res.json({ user: null });
  return res.json({ user: { ...user, shown_in_leaderboard: Boolean(user.shown_in_leaderboard) } });
}));

export default router;
