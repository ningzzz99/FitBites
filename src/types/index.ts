// ─── Core domain types ────────────────────────────────────────────────────────

export interface Habit {
  habit_id: number;
  task: string;
}

export interface DailyChallenge {
  challenge_id: number;
  user_id: number;
  habit_id: number | null;
  custom_habit_id: number | null;
  status: 'pending' | 'completed';
  date_completed: string | null;
  proof_image_url: string | null;
  coins_issued: number;
  streak_count: number;
  created_at: string;
  task?: string;
}

export interface Ingredient {
  ingredient_id: number;
  user_id: number;
  ingredient_name: string;
  category: string | null;
  quantity: number;
  unit: string;
  created_at: string;
}

export interface Recipe {
  recipe_id: number;
  recipe_name: string;
  ingredients: string;
  instructions: string;
  tags: string | null;
  calories: number | null;
  thumb_url?: string;
}

export interface ScoredRecipe extends Recipe {
  matchCount: number;
  missingCount: number;
  matchPercentage: number;
  parsedIngredients: string[];
}

export interface Post {
  post_id: number;
  user_id: number;
  content: string;
  topic: string | null;
  anonymous: boolean;
  upvotes: number;
  created_at: string;
  username?: string;
}

export interface Badge {
  badge_id: number;
  user_id: number;
  badge_type: 'contributor' | 'milestone' | 'streak';
  label: string;
  awarded_at: string;
}

export interface FunFact {
  fact_id: number;
  topic: string;
  content: string;
  fact_date: string | null;
}

export interface LeaderboardEntry {
  user_id: number;
  username: string;
  streak_count: number;
  total_coins: number;
  banner_color: string;
  banner_icon: string;
}

// ─── Algorithm types ──────────────────────────────────────────────────────────

export interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
}

export interface ChallengeLog {
  date: string;
  completed: boolean;
}

export interface CalorieLog {
  date: string;
  calories: number;
}
