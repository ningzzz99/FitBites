import express from 'express';
import { requireAuth, handle } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, handle(async (_req, res) => {
  try {
    const response = await fetch('https://api.api-ninjas.com/v1/facts', {
      headers: { 'X-Api-Key': process.env.API_NINJAS_KEY || '' },
    });
    const data = await response.json();
    const fact = data?.[0]?.fact;
    return res.json(fact ? { content: fact } : null);
  } catch {
    return res.json(null);
  }
}));

export default router;
