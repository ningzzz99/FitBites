import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'fitbites.db');

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function initSchema(db: Database.Database) {
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
      shown_in_leaderboard INTEGER NOT NULL DEFAULT 1,
      banner_color TEXT NOT NULL DEFAULT '#4ade80',
      banner_icon TEXT NOT NULL DEFAULT 'leaf',
      buddy_id INTEGER,
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

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_name TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      tags TEXT,
      calories INTEGER
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

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_type TEXT NOT NULL,
      label TEXT NOT NULL,
      awarded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fun_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      content TEXT NOT NULL,
      fact_date TEXT
    );

    CREATE TABLE IF NOT EXISTS unlocked_banner_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      item_value TEXT NOT NULL,
      UNIQUE(user_id, item_type, item_value)
    );

    CREATE TABLE IF NOT EXISTS post_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hidden_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE(user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS group_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedData(db);
}

function seedData(db: Database.Database) {
  const habitCount = (db.prepare('SELECT COUNT(*) as c FROM habits').get() as { c: number }).c;
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

  const recipeCount = (db.prepare('SELECT COUNT(*) as c FROM recipes').get() as { c: number }).c;
  if (recipeCount === 0) {
    const ins = db.prepare(
      'INSERT INTO recipes (recipe_name, ingredients, instructions, tags, calories) VALUES (?,?,?,?,?)'
    );
    [
      ['Vegetable Omelette', '["eggs","bell pepper","onion","olive oil","salt","pepper"]',
        '1. Beat eggs. 2. Sauté vegetables. 3. Pour eggs over veg. 4. Fold and serve.', 'vegetarian,high-protein,quick', 320],
      ['Avocado Toast', '["bread","avocado","lemon juice","salt","chili flakes"]',
        '1. Toast bread. 2. Mash avocado with lemon and salt. 3. Spread and top with chili flakes.', 'vegetarian,vegan,quick', 280],
      ['Banana Oat Smoothie', '["banana","oats","milk","honey","cinnamon"]',
        '1. Blend all ingredients until smooth. 2. Serve chilled.', 'vegetarian,breakfast,quick', 350],
      ['Chicken Stir Fry', '["chicken breast","broccoli","soy sauce","garlic","ginger","sesame oil","rice"]',
        '1. Cook rice. 2. Stir fry chicken. 3. Add veg and sauce. 4. Serve over rice.', 'high-protein,gluten-free', 480],
      ['Greek Salad', '["tomato","cucumber","feta cheese","olives","red onion","olive oil","oregano"]',
        '1. Chop vegetables. 2. Combine with feta and olives. 3. Dress with oil and oregano.', 'vegetarian,low-calorie,quick', 220],
      ['Lentil Soup', '["red lentils","onion","garlic","cumin","tomato","vegetable broth","olive oil"]',
        '1. Sauté onion and garlic. 2. Add lentils and broth. 3. Simmer 25 min. 4. Season.', 'vegan,high-fiber,meal-prep', 310],
      ['Peanut Butter Banana Toast', '["bread","peanut butter","banana","honey"]',
        '1. Toast bread. 2. Spread peanut butter. 3. Slice banana on top. 4. Drizzle honey.', 'vegetarian,breakfast,quick', 420],
      ['Tuna Salad Wrap', '["tuna","tortilla wrap","lettuce","tomato","mayo","lemon juice","salt","pepper"]',
        '1. Mix tuna with mayo and lemon. 2. Layer with veg in wrap. 3. Roll tight and serve.', 'high-protein,lunch', 390],
    ].forEach((r) => ins.run(...r));
  }

  const factCount = (db.prepare('SELECT COUNT(*) as c FROM fun_facts').get() as { c: number }).c;
  if (factCount === 0) {
    const ins = db.prepare('INSERT INTO fun_facts (topic, content, fact_date) VALUES (?,?,?)');
    const today = new Date();
    [
      ['nutrition', 'Eating slowly can reduce calorie intake by up to 10% — it takes 20 minutes for your brain to register fullness.'],
      ['exercise', 'Just 10 minutes of brisk walking can boost your mood for up to 2 hours.'],
      ['recipe', 'Cooking with olive oil at low heat retains more healthy monounsaturated fats than frying at high heat.'],
      ['mental-health', 'Eating fermented foods like yogurt can improve gut health, which is linked to reduced anxiety.'],
      ['nutrition', 'Broccoli contains more protein per calorie than steak — approximately 11g per 100 calories.'],
      ['exercise', 'Strength training two days a week can reduce the risk of type 2 diabetes by 34%.'],
      ['recipe', 'Adding lemon juice to salads increases iron absorption from plant-based foods by up to 67%.'],
    ].forEach(([topic, content], i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      ins.run(topic, content, d.toISOString().split('T')[0]);
    });
  }
}

export function getDb(): Database.Database {
  if (process.env.NODE_ENV === 'production') {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    return db;
  }

  if (!global.__db) {
    global.__db = new Database(DB_PATH);
    global.__db.pragma('journal_mode = WAL');
    global.__db.pragma('foreign_keys = ON');
    initSchema(global.__db);
  }
  return global.__db;
}
