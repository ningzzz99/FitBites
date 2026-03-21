import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = join(__dirname, '..', 'fitbites.db');

let _db;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      height INTEGER,
      weight INTEGER,
      dietary_req TEXT,
      total_coins INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      shown_in_leaderboard INTEGER NOT NULL DEFAULT 1,
      banner_color TEXT NOT NULL DEFAULT '#4ade80',
      banner_icon TEXT NOT NULL DEFAULT 'leaf',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id_1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_id_2 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id_1, user_id_2)
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS user_habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE(user_id, habit_id)
    );

    CREATE TABLE IF NOT EXISTS custom_habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      habit_id INTEGER,
      custom_habit_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      date_completed TEXT,
      proof_image_url TEXT,
      coins_issued INTEGER NOT NULL DEFAULT 0,
      streak_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ingredient_name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'units',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      topic TEXT,
      anonymous INTEGER NOT NULL DEFAULT 0,
      upvotes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_upvotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS post_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_type TEXT NOT NULL,
      label TEXT NOT NULL,
      awarded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS unlocked_banner_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      item_value TEXT NOT NULL,
      UNIQUE(user_id, item_type, item_value)
    );
  `);

  // Migrations for existing databases
  try { db.exec('ALTER TABLE users ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN shown_in_leaderboard INTEGER NOT NULL DEFAULT 1'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN banner_color TEXT NOT NULL DEFAULT \'#4ade80\''); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN banner_icon TEXT NOT NULL DEFAULT \'leaf\''); } catch {}

  seedData(db);
}

function seedData(db) {
  const habitCount = db.prepare('SELECT COUNT(*) as c FROM habits').get().c;
  if (habitCount === 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO habits (task) VALUES (?)');
    [
      'Drink 8 glasses of water',
      'Exercise 30 mins',
      'Sleep 8 hours',
      'Eat fruits / vegetables',
      'No junk food today',
      'Meditate 10 mins',
      'Cook a healthy meal',
      'Walk 10,000 steps',
      'Eat breakfast',
      'Limit screen time to 2 hours',
    ].forEach((t) => ins.run(t));
  }

}

function initDb() {
  getDb();
  console.log('SQLite database initialized at', DB_PATH);
}

export { getDb, initDb };
