import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDb } from './db/connection.js';

import authRoutes from './routes/auth.js';
import challengesRoutes from './routes/challenges.js';
import habitsRoutes from './routes/habits.js';
import ingredientsRoutes from './routes/ingredients.js';
import postsRoutes from './routes/posts.js';
import leaderboardRoutes from './routes/leaderboard.js';
import friendsRoutes from './routes/friends.js';
import profileRoutes from './routes/profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fitbites-secret-key-dev',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/user-habits', habitsRoutes);
app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/profile', profileRoutes);

initDb();

app.listen(process.env.PORT || 3001, () => {
  console.log(`FitBites backend running on http://localhost:${process.env.PORT || 3001}`);
});
