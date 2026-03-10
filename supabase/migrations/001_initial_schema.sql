-- FitBites initial schema migration

-- Extend auth.users with app-specific profile data
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  height      int,
  weight      int,
  dietary_req text,
  total_coins int not null default 0,
  shown_in_leaderboard boolean not null default true,
  banner_color text not null default '#4ade80',
  banner_icon  text not null default 'leaf',
  buddy_id     uuid references public.profiles(user_id),
  created_at  timestamptz not null default now()
);

-- Friends / social graph
create table if not exists public.friends (
  friend_id  serial primary key,
  user_id_1  uuid not null references public.profiles(user_id) on delete cascade,
  user_id_2  uuid not null references public.profiles(user_id) on delete cascade,
  status     text not null default 'pending', -- pending | accepted | buddy
  created_at timestamptz not null default now(),
  unique (user_id_1, user_id_2)
);

-- Pre-seeded habit catalogue
create table if not exists public.habits (
  habit_id serial primary key,
  task     text not null unique
);

insert into public.habits (task) values
  ('Drink 8 glasses of water'),
  ('Exercise 30 mins'),
  ('Sleep 8 hours'),
  ('Eat fruits / vegetables'),
  ('No junk food today'),
  ('Meditate 10 mins'),
  ('Cook a healthy meal'),
  ('Walk 10,000 steps'),
  ('Eat breakfast'),
  ('Limit screen time to 2 hours')
on conflict do nothing;

-- Per-user selected habits
create table if not exists public.user_habits (
  id       serial primary key,
  user_id  uuid not null references public.profiles(user_id) on delete cascade,
  habit_id int  not null references public.habits(habit_id) on delete cascade,
  unique (user_id, habit_id)
);

-- Custom user-created habits
create table if not exists public.custom_habits (
  habit_id serial primary key,
  user_id  uuid not null references public.profiles(user_id) on delete cascade,
  task     text not null,
  created_at timestamptz not null default now()
);

-- Daily challenge log
create table if not exists public.daily_challenges (
  challenge_id    serial primary key,
  user_id         uuid not null references public.profiles(user_id) on delete cascade,
  habit_id        int,
  custom_habit_id int,
  status          text not null default 'pending', -- pending | completed
  date_completed  date,
  proof_image_url text,
  coins_issued    int not null default 0,
  streak_count    int not null default 0,
  created_at      timestamptz not null default now()
);

-- User pantry / grocery inventory
create table if not exists public.ingredients (
  ingredient_id   serial primary key,
  user_id         uuid not null references public.profiles(user_id) on delete cascade,
  ingredient_name text not null,
  category        text,
  quantity        int not null default 1,
  unit            text not null default 'units',
  created_at      timestamptz not null default now()
);

-- Recipe catalogue
create table if not exists public.recipes (
  recipe_id    serial primary key,
  recipe_name  text not null,
  ingredients  text not null,  -- JSON array of ingredient names
  instructions text not null,
  tags         text,           -- comma-separated e.g. "vegan,high-protein"
  calories     int
);

-- Seed some sample recipes
insert into public.recipes (recipe_name, ingredients, instructions, tags, calories) values
  ('Vegetable Omelette',
   '["eggs","bell pepper","onion","olive oil","salt","pepper"]',
   '1. Beat eggs. 2. Sauté vegetables. 3. Pour eggs over veg. 4. Fold and serve.',
   'vegetarian,high-protein,quick',
   320),
  ('Avocado Toast',
   '["bread","avocado","lemon juice","salt","chili flakes"]',
   '1. Toast bread. 2. Mash avocado with lemon and salt. 3. Spread and top with chili flakes.',
   'vegetarian,vegan,quick',
   280),
  ('Banana Oat Smoothie',
   '["banana","oats","milk","honey","cinnamon"]',
   '1. Blend all ingredients until smooth. 2. Serve chilled.',
   'vegetarian,breakfast,quick',
   350),
  ('Chicken Stir Fry',
   '["chicken breast","broccoli","soy sauce","garlic","ginger","sesame oil","rice"]',
   '1. Cook rice. 2. Stir fry chicken. 3. Add veg and sauce. 4. Serve over rice.',
   'high-protein,gluten-free',
   480),
  ('Greek Salad',
   '["tomato","cucumber","feta cheese","olives","red onion","olive oil","oregano"]',
   '1. Chop vegetables. 2. Combine with feta and olives. 3. Dress with oil and oregano.',
   'vegetarian,low-calorie,quick',
   220),
  ('Lentil Soup',
   '["red lentils","onion","garlic","cumin","tomato","vegetable broth","olive oil"]',
   '1. Sauté onion and garlic. 2. Add lentils and broth. 3. Simmer 25 min. 4. Season.',
   'vegan,high-fiber,meal-prep',
   310),
  ('Peanut Butter Banana Toast',
   '["bread","peanut butter","banana","honey"]',
   '1. Toast bread. 2. Spread peanut butter. 3. Slice banana on top. 4. Drizzle honey.',
   'vegetarian,breakfast,quick',
   420),
  ('Tuna Salad Wrap',
   '["tuna","tortilla wrap","lettuce","tomato","mayo","lemon juice","salt","pepper"]',
   '1. Mix tuna with mayo and lemon. 2. Layer with veg in wrap. 3. Roll tight and serve.',
   'high-protein,lunch',
   390)
on conflict do nothing;

-- Community posts
create table if not exists public.posts (
  post_id    serial primary key,
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  content    text not null,
  topic      text,           -- nutrition | recipe | mental-health | general
  anonymous  boolean not null default false,
  upvotes    int not null default 0,
  created_at timestamptz not null default now()
);

-- Post upvotes (to prevent double voting)
create table if not exists public.post_upvotes (
  id      serial primary key,
  post_id int  not null references public.posts(post_id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  unique (post_id, user_id)
);

-- Community badges
create table if not exists public.badges (
  badge_id   serial primary key,
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  badge_type text not null, -- contributor | milestone | streak
  label      text not null,
  awarded_at timestamptz not null default now()
);

-- Daily fun facts
create table if not exists public.fun_facts (
  fact_id    serial primary key,
  topic      text not null, -- nutrition | recipe | exercise | mental-health
  content    text not null,
  fact_date  date
);

-- Seed fun facts
insert into public.fun_facts (topic, content, fact_date) values
  ('nutrition',     'Eating slowly can reduce calorie intake by up to 10% — it takes 20 minutes for your brain to register fullness.', current_date),
  ('exercise',      'Just 10 minutes of brisk walking can boost your mood for up to 2 hours.', current_date + 1),
  ('recipe',        'Cooking with olive oil at low heat retains more healthy monounsaturated fats than frying at high heat.', current_date + 2),
  ('mental-health', 'Eating fermented foods like yogurt can improve gut health, which is linked to reduced anxiety.', current_date + 3),
  ('nutrition',     'Broccoli contains more protein per calorie than steak — approximately 11g per 100 calories.', current_date + 4),
  ('exercise',      'Strength training two days a week can reduce the risk of type 2 diabetes by 34%.', current_date + 5),
  ('recipe',        'Adding lemon juice to salads increases iron absorption from plant-based foods by up to 67%.', current_date + 6)
on conflict do nothing;

-- User fun fact topic preferences
create table if not exists public.user_fact_preferences (
  id      serial primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  topic   text not null,
  unique (user_id, topic)
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.friends enable row level security;
alter table public.user_habits enable row level security;
alter table public.custom_habits enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.ingredients enable row level security;
alter table public.posts enable row level security;
alter table public.post_upvotes enable row level security;
alter table public.badges enable row level security;
alter table public.user_fact_preferences enable row level security;

-- profiles: users can read all (for leaderboard), only edit own
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);

-- friends: visible to participants
create policy "friends_select" on public.friends for select using (auth.uid() = user_id_1 or auth.uid() = user_id_2);
create policy "friends_insert" on public.friends for insert with check (auth.uid() = user_id_1);
create policy "friends_update" on public.friends for update using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- user_habits: own only
create policy "user_habits_own" on public.user_habits for all using (auth.uid() = user_id);

-- custom_habits: own only
create policy "custom_habits_own" on public.custom_habits for all using (auth.uid() = user_id);

-- daily_challenges: own only
create policy "challenges_own" on public.daily_challenges for all using (auth.uid() = user_id);

-- ingredients: own only
create policy "ingredients_own" on public.ingredients for all using (auth.uid() = user_id);

-- posts: insert own, select all
create policy "posts_select_all" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on public.posts for update using (auth.uid() = user_id);

-- post_upvotes: own only
create policy "upvotes_own" on public.post_upvotes for all using (auth.uid() = user_id);

-- badges: select all, insert own
create policy "badges_select_all" on public.badges for select using (true);
create policy "badges_insert_own" on public.badges for insert with check (auth.uid() = user_id);

-- user_fact_preferences: own only
create policy "fact_prefs_own" on public.user_fact_preferences for all using (auth.uid() = user_id);

-- Function: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
