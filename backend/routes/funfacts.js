import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/fun-facts
router.get('/', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const db = getDb();
    let fact = db.prepare(
      'SELECT id as fact_id, topic, content, fact_date FROM fun_facts WHERE fact_date = ? LIMIT 1'
    ).get(today);
    if (!fact) {
      fact = db.prepare(
        'SELECT id as fact_id, topic, content, fact_date FROM fun_facts ORDER BY RANDOM() LIMIT 1'
      ).get();
    }
    return res.json(fact || null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
