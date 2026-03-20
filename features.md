# FitBites — Feature Implementation Reference

Each feature has three sections:
- **Summary** — what the feature does from the user's point of view
- **High-level** — which parts of the system are involved and how they connect
- **Technical** — specific files, functions, SQL queries, and data structures

---

## 1. Registration & Login

### Summary

New users create an account with a username, email, and password. Returning users log in with email and password. Once authenticated, the app navigates to the main experience. Logging out returns the user to the login screen.

### High-level

The mobile app sends credentials to the backend. The backend validates them, creates a server-side session, and responds. The mobile app's `AuthContext` stores the returned user object, which causes React Navigation to switch from the auth stack to the main tab stack. Navigation is entirely state-driven — no imperative `navigate()` calls are needed at the auth boundary.

After registration, a new `isNewUser` flag in `AuthContext` is set to `true` before `user` is set. This causes the navigator to render the `Onboarding` screen as the first screen in the logged-in stack, routing the new user there automatically without any explicit navigation call. Once onboarding is complete, `finishOnboarding()` clears the flag and the navigator switches to `Main`.

### Technical

**Backend — `backend/routes/auth.js`**

- `POST /api/auth/register`: Checks for duplicate email with `SELECT id FROM users WHERE email = ?`. Hashes password with `bcryptjs.hash(password, 10)`. Inserts new user row, then immediately calls the same login logic to set the session.
- `POST /api/auth/login`: Fetches user by email, calls `bcryptjs.compare(password, user.password_hash)`. On success, sets `req.session.userId = user.id` and returns `{ id, username, email }`.
- `POST /api/auth/logout`: Calls `req.session.destroy()`.
- `GET /api/auth/me`: Returns the user row if `req.session.userId` is set, otherwise 401.

**Mobile — `mobile/src/context/AuthContext.js`**

- On app mount, `AuthContext` calls `getCurrentUser()` (→ `GET /api/auth/me`). If it succeeds, `user` state is set; if it throws a 401, `user` stays `null`.
- `signIn(email, password)` calls `login()`, then `getCurrentUser()` to hydrate the user object, sets `user` state.
- `signUp(username, email, password)` calls `register()`, then `getCurrentUser()`, sets `isNewUser = true` before setting `user`. The order matters — `isNewUser` must be true when React Navigation re-renders on `user` being set.
- `signOut()` calls `logout()`, sets `user` to `null`.
- `finishOnboarding()` sets `isNewUser = false`.
- `refreshUser()` re-fetches from `/api/auth/me` to keep the global user object in sync after profile edits.
- Context value: `{ user, loading, isNewUser, signIn, signUp, signOut, refreshUser, finishOnboarding }`.

**Mobile — `mobile/src/navigation/index.js`**

`RootStack` receives `isLoggedIn` and `isNewUser` as props from `AppNavigator` (which reads them from `useAuth()`):

```js
function RootStack({ isLoggedIn, isNewUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          {isNewUser && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
          <Stack.Screen name="Main" component={MainTabs} />
          {!isNewUser && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
```

When `isNewUser` is `true`, `Onboarding` is the first screen declared so React Navigation renders it first. When `false`, `Main` is first and `Onboarding` is still available for the edit-habits flow via `navigation.navigate('Onboarding', { editMode: true })`. `Onboarding` is never in the auth stack, so logout never accidentally routes there.

---

## 2. Onboarding & Habit Selection

### Summary

After registering, users are taken to an onboarding screen where they choose which daily habits they want to track from a pre-defined list. They can optionally add a custom habit. The same screen is accessible later (via pencil icon on Home) to edit their selection.

### High-level

The onboarding screen loads the full habits catalogue from the backend, lets the user multi-select, and saves the selection. The backend replaces any previous habit selection atomically inside a transaction. When opened in edit mode, the screen pre-populates with the user's current selection. Completion in onboarding mode calls `finishOnboarding()` from context instead of navigating — the navigator reacts to the state change and renders `Main`.

### Technical

**Backend — `backend/routes/habits.js`**

- `GET /api/habits`: Returns all rows from the `habits` table (10 pre-seeded habits: drink water, sleep 8 hours, walk 10k steps, etc.).
- `POST /api/user-habits/save`: Runs inside a SQLite transaction:
  1. `DELETE FROM user_habits WHERE user_id = ?` — clears current selection
  2. `INSERT INTO user_habits (user_id, habit_id) VALUES (?, ?)` — for each selected habit ID
  3. If `customTask` is provided, `INSERT INTO custom_habits (user_id, task, created_at) VALUES (...)`
- `GET /api/user-habits/current`: Returns `{ habitIds: [...], customTask: '...' }` — queries `user_habits` for IDs and `custom_habits ORDER BY id DESC LIMIT 1` for any custom task. Used to pre-populate edit mode.

**Mobile — `mobile/src/screens/auth/OnboardingScreen.js`**

- Accepts a `route` prop. `const editMode = route?.params?.editMode ?? false`.
- On mount: if `editMode`, calls `getUserHabits()` and populates `selectedIds` and `customTask` field.
- Habits rendered as a scrollable `FlatList` of toggle chips. Tapping adds/removes the habit ID from `selectedIds`.
- `handleFinish` calls `saveUserHabits(selectedIds, customTask.trim() || undefined)`. On success: `editMode ? navigation.goBack() : finishOnboarding()`. In non-edit mode, calling `finishOnboarding()` sets `isNewUser = false` in context, which causes the navigator to re-render with `Main` as the first screen — no `navigate()` call needed.
- The pencil icon in the `HomeScreen` header calls `navigation.navigate('Onboarding', { editMode: true })`. `Onboarding` is registered in the logged-in stack so this navigation is always valid when logged in.

---

## 3. Daily Challenges & Streak

### Summary

Every day, the app generates a checklist of the user's selected habits as "challenges". Completing a challenge awards 10 coins. The app tracks how many consecutive days the user has completed at least one challenge, shown as a streak. A 7-day calendar strip shows which days were active.

### High-level

When the Home screen loads, it asks the backend for today's challenges. The backend lazily creates them if they don't exist yet using an idempotent `INSERT OR IGNORE ... WHERE NOT EXISTS` pattern, then returns them along with streak and weekly data. Marking one complete updates the challenge row, adds coins, recomputes the streak from the full completion history, and writes the new streak value to both the challenge row and the `users.current_streak` column. This denormalized `current_streak` column is the source of truth read by the leaderboard and profile screens.

### Technical

**Backend — `backend/routes/challenges.js`**

**Challenge generation (`GET /api/challenges`):**

```sql
-- For each habit the user has selected:
INSERT OR IGNORE INTO daily_challenges (user_id, habit_id, status, created_at)
SELECT ?, ?, 'pending', datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM daily_challenges
  WHERE user_id = ? AND habit_id = ? AND date(created_at) = ?
)
-- Same pattern for custom_habits using custom_habit_id column
```

The `WHERE NOT EXISTS` guard combined with `INSERT OR IGNORE` ensures idempotency — calling `GET` multiple times in the same day does not create duplicate challenges.

**`computeStreak(logs)` function:**
1. Receives an array of `{ date, completed }` objects from `daily_challenges WHERE date_completed IS NOT NULL`.
2. Builds a `Set` of date strings where `status = 'completed'`.
3. Starts from today. If today isn't in the completed set, starts from yesterday.
4. Counts backwards while consecutive dates exist in the set.

**`weeklyView(logs)` function:** Generates an array of the last 7 dates (today and 6 days prior), each with a `completed: true/false` flag based on the same completion set.

**Challenge completion (`PATCH /api/challenges/:id`):**

```sql
UPDATE daily_challenges
SET status = 'completed', date_completed = ?, proof_image_url = ?, coins_issued = 10
WHERE id = ?

UPDATE users SET total_coins = total_coins + 10 WHERE id = ?
```

After updating, `computeStreak` is called on the full history, and the result is written to:
- `UPDATE daily_challenges SET streak_count = ? WHERE id = ?` — stored on the row for historical reference
- `UPDATE users SET current_streak = ? WHERE id = ?` — denormalized for fast leaderboard and profile reads

Returns `{ ok: true, coins: updatedTotal, streak }`.

**Mobile — `mobile/src/screens/main/HomeScreen.js`**

- `loadData()` fetches `GET /api/challenges`, sets `challenges`, `streak`, `coins`, `weekDays`.
- `useFocusEffect` calls `loadData()` every time the Home tab is focused.
- `orderedWeek = weekDays` — renders the 7-day strip. Day labels are derived by mapping the date string to a `getDay()` index.
- Completing a challenge calls `completeChallenge(challengeId, null)`, then updates coin/streak display with values returned from the server (`coins` and `streak` from the response) and patches local challenge state to `status: 'completed'`.

---

## 4. Custom Challenges

### Summary

On the Home screen, users can type in any task and add it as a personal challenge for that day. Custom challenges can be deleted as long as they haven't been completed.

### High-level

Custom challenges are stored in a separate `custom_habits` table. Like regular habits, they get a corresponding `daily_challenges` row when the Home screen loads. Deleting a custom habit removes both the habit record and any pending challenge entry for today. Completed custom challenges are not deleted — history is preserved.

### Technical

**Backend — `backend/routes/challenges.js`**

- `POST /api/challenges/custom`: Inserts into `custom_habits (user_id, task, created_at)`. Returns `{ id, task }`.
- `DELETE /api/challenges/custom/:id`:
  1. Verifies ownership: `SELECT id FROM custom_habits WHERE id = ? AND user_id = ?`
  2. Deletes today's pending challenge: `DELETE FROM daily_challenges WHERE user_id = ? AND custom_habit_id = ? AND status = 'pending' AND date(created_at) = ?`
  3. Deletes the habit: `DELETE FROM custom_habits WHERE id = ? AND user_id = ?`

**Mobile — `mobile/src/screens/main/HomeScreen.js`**

- State: `customInput` (text field value), `addingCustom` (loading bool), `deletingCustomId` (which habit is being deleted).
- `handleAddCustom`: calls `addCustomChallenge(task)`, then `loadData(false)` (refreshes without full-screen spinner).
- `handleDeleteCustom(customHabitId)`: calls `deleteCustomChallenge(id)`, then `loadData(false)`.
- In the challenge list, `challenge.custom_habit_id` being truthy identifies a custom challenge. Custom challenges that are not yet completed show a trash icon button. Tapping it calls `handleDeleteCustom`.

---

## 5. Pantry Management

### Summary

Users maintain a pantry — a list of ingredients they have at home, each with a quantity. They can add new ingredients, increment or decrement quantity with +/- buttons, and delete items.

### High-level

Pantry data is per-user and stored in the `ingredients` table. The mobile app mirrors changes locally immediately (optimistic update) then syncs to the backend. If the backend call fails, the screen re-fetches to show the true server state.

### Technical

**Backend — `backend/routes/ingredients.js`**

- `GET /api/ingredients`: `SELECT * FROM ingredients WHERE user_id = ? ORDER BY created_at DESC`
- `POST /api/ingredients`: Inserts with `quantity = 1` and `unit = 'unit'` as defaults.
- `PATCH /api/ingredients/:id`: `UPDATE ingredients SET quantity = ? WHERE id = ? AND user_id = ?`
- `DELETE /api/ingredients/:id`: `DELETE FROM ingredients WHERE id = ? AND user_id = ?`

**Mobile — `mobile/src/screens/main/PantryScreen.js`**

- `changeQuantity(ingredientId, delta)`: Computes `nextQty = max(0, item.quantity + delta)`. If `nextQty === 0`, calls `onDelete` instead (decrementing to zero deletes the item). Otherwise, updates local state immediately, then calls `updateIngredientQuantity`. If the API call fails, calls `loadData(false)` to revert to server state.
- `onDelete`: Removes item from local state immediately, calls `removeIngredient`. Reverts on failure.
- `onAddIngredient`: Calls `addIngredient(name)`, prepends the returned item to local state.
- `useFocusEffect` reloads pantry data every time the Pantry tab is focused.
- Data is loaded on focus with a `RefreshControl` for pull-to-refresh.

---

## 6. Recipe Discovery

### Summary

On the Recipes tab in Pantry, users press "Find Recipes" to see dishes they can make with their current pantry ingredients. Each recipe card shows the meal thumbnail, name, and which pantry ingredient triggered the match. Tapping a recipe opens a full bottom-sheet modal with a banner image, category, full ingredient list, and cooking instructions.

### High-level

Recipe discovery uses the [TheMealDB](https://www.themealdb.com/api.php) free public API — no backend involvement. The app fetches recipes directly from TheMealDB for each pantry ingredient individually (the free tier only supports single-ingredient lookup). Requests are made in parallel using `Promise.allSettled`. Results are deduplicated by meal ID and limited to 2 meals per ingredient to keep the list manageable. Full meal details (instructions, full ingredient list) are fetched on demand when a recipe card is tapped.

### Technical

**Mobile — `mobile/src/lib/api.js`**

Two TheMealDB functions — these call the external API directly, bypassing the backend:

```js
const MEALDB = 'https://www.themealdb.com/api/json/v1/1';

export async function getMealsByIngredient(ingredient) {
  const query = ingredient.trim().replace(/\s+/g, '_');
  const res = await fetch(`${MEALDB}/filter.php?i=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.meals || [];  // Returns basic meal list: { idMeal, strMeal, strMealThumb }
}

export async function getMealById(id) {
  const res = await fetch(`${MEALDB}/lookup.php?i=${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.meals?.[0] ?? null;  // Returns full detail object
}
```

**Mobile — `mobile/src/screens/main/PantryScreen.js`**

**`findRecipes()`** — parallel per-ingredient fetch with deduplication:

```js
const results = await Promise.allSettled(
  ingredients.map((row) =>
    getMealsByIngredient(row.ingredient_name).then((meals) =>
      meals.slice(0, 2).map((m) => ({ ...m, sourceIngredient: row.ingredient_name }))
    )
  )
);
const seen = new Set();
const merged = [];
for (const r of results) {
  if (r.status !== 'fulfilled') continue;
  for (const meal of r.value) {
    if (!seen.has(meal.idMeal)) {
      seen.add(meal.idMeal);
      merged.push(meal);
    }
  }
}
setRecipes(merged);
```

- `Promise.allSettled` ensures one failing ingredient lookup doesn't block the rest.
- `.slice(0, 2)` limits to 2 results per ingredient before deduplication.
- Each meal object is tagged with `sourceIngredient` so the card can show which pantry item matched.

**`openRecipe(meal)`** — on-demand detail fetch:

```js
setSelectedRecipe(meal);   // Show modal immediately with loading spinner
setDetailLoading(true);
const detail = await getMealById(meal.idMeal);
setMealDetail(detail);
```

**`parseMealIngredients(meal)`** — TheMealDB stores ingredients as 20 parallel fields (`strIngredient1`–`strIngredient20`, `strMeasure1`–`strMeasure20`). This function loops them and builds a readable array:

```js
for (let i = 1; i <= 20; i++) {
  const name = meal[`strIngredient${i}`];
  const measure = meal[`strMeasure${i}`];
  if (name && name.trim()) {
    items.push(`${measure ? measure.trim() + ' ' : ''}${name.trim()}`);
  }
}
```

**Modal** — bottom sheet (`justifyContent: 'flex-end'`, `borderTopLeftRadius/RightRadius: 20`) with an internal `ScrollView`. Shows: banner image (`strMealThumb`), category + area (`strCategory · strArea`), parsed ingredient list with bullet points, and full `strInstructions` text. A spinner is shown while `getMealById` is in flight.

---

## 7. Community Posts & Replies

### Summary

Users can post questions, tips, or thoughts to a community feed, optionally anonymously. Posts can be upvoted; clicking the upvote button a second time removes the upvote. Each post has a reply thread that can be expanded inline.

### High-level

Posts are stored in the database with a `user_id` and an `anonymous` flag. When loading posts, the backend joins with `post_upvotes` to include whether the current user has upvoted each post. Upvoting is a toggle: the backend checks for an existing row and either inserts or deletes it. Replies follow the same anonymous pattern. The first post a user makes earns a badge.

### Technical

**Backend — `backend/routes/posts.js`**

`GET /api/posts` — includes the current user's upvote status per post using a `LEFT JOIN`:

```sql
SELECT p.*, u.username,
  CASE WHEN pu.id IS NOT NULL THEN 1 ELSE 0 END as user_upvoted
FROM posts p
JOIN users u ON u.id = p.user_id
LEFT JOIN post_upvotes pu ON pu.post_id = p.id AND pu.user_id = ?
ORDER BY p.created_at DESC
```

`POST /api/posts/:id/upvote` — toggle logic:

```js
const existing = db.prepare(
  'SELECT id FROM post_upvotes WHERE post_id = ? AND user_id = ?'
).get(postId, userId);
if (existing) {
  db.prepare('DELETE FROM post_upvotes WHERE post_id = ? AND user_id = ?').run(postId, userId);
} else {
  db.prepare('INSERT INTO post_upvotes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
}
// Recount and UPDATE posts.upvotes
// Returns { upvotes: count, upvoted: !existing }
```

**Badge on first post:** After inserting, counts the user's total posts. If count is 1:
```sql
INSERT OR IGNORE INTO badges (user_id, badge_type, label)
VALUES (?, 'contributor', 'First Post')
```

**Mobile — `mobile/src/screens/main/CommunityScreen.js`**

- Implemented with `FlatList` (not `ScrollView`) to avoid iOS gesture responder conflicts between the scroll view and nested `Pressable`/`TextInput` elements. The compose box is passed as `ListHeaderComponent`.
- Per-post state is managed with dictionaries keyed by `post_id`:
  - `replyDrafts: { [postId]: string }` — text input value per post
  - `replyAnons: { [postId]: bool }` — anonymous toggle per post
  - `replyErrors: { [postId]: string | null }` — error message per post
  - `repliesByPost: { [postId]: Reply[] }` — loaded replies per post
  - `sendingReplyId` — which post is currently sending (for loading state)
- The upvote button applies `styles.actionBtnActive` (green background) and `styles.actionBtnTextActive` (white text) when `post.user_upvoted` is truthy. On tap, `handleUpvote` calls the API and updates `user_upvoted` and `upvotes` in local state from the response.
- `toggleReplies(postId)` lazily loads replies — only calls `getReplies` if this post's replies haven't been fetched yet.
- `sendReply` has a `try/catch` that writes to `replyErrors[postId]` on failure, so the user sees an inline error message rather than a silent failure.

---

## 8. Leaderboard & Friends

### Summary

The leaderboard ranks users by their current consecutive streak. Users can switch between a global view (all public users) and a friends-only view. Coins are used as a tiebreaker when streaks are equal. From this screen, users can search for other users by username and send friend requests. Incoming requests can be accepted or declined.

### High-level

The leaderboard reads directly from the `users.current_streak` column — a denormalized value written on every challenge completion. This avoids a costly `MAX(streak_count)` aggregate over the full `daily_challenges` history and ensures the leaderboard always reflects the user's live streak rather than their all-time best. The friends filter is applied in application code by filtering the global results against a resolved friend ID set. Friend management is a request/accept/reject flow with a `status` field.

### Technical

**Backend — `backend/routes/leaderboard.js`**

```sql
-- Global leaderboard
SELECT id as user_id, username, total_coins, banner_color, banner_icon,
       current_streak as streak_count
FROM users
WHERE shown_in_leaderboard = 1
ORDER BY current_streak DESC, total_coins DESC
```

The friends leaderboard is computed in JavaScript by filtering the global results:

```js
const friendRows = db.prepare(`
  SELECT CASE WHEN user_id_1 = ? THEN user_id_2 ELSE user_id_1 END as friend_id
  FROM friends WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'
`).all(userId, userId, userId);

const friendIdSet = new Set([userId, ...friendRows.map((f) => f.friend_id)]);
const friends = global.filter((e) => friendIdSet.has(e.user_id));
```

Returns `{ global, friends, currentUserId }`.

**Backend — `backend/routes/friends.js`**

- `POST /api/friends`: Uses `INSERT OR IGNORE INTO friends (user_id_1, user_id_2, status) VALUES (?, ?, 'pending')` — the `INSERT OR IGNORE` handles the case where a request already exists.
- `PATCH /api/friends/:id`: Accepts `'accepted'` or `'rejected'`. If rejected, the row is deleted (`DELETE FROM friends WHERE id = ? AND user_id_2 = ?`). If accepted, `UPDATE friends SET status = 'accepted'`. Only the recipient (`user_id_2 = req.session.userId`) can update the status.
- `GET /api/friends`: Returns all friend rows joined with both users' usernames via `JOIN users u1 ON u1.id = f.user_id_1 JOIN users u2 ON u2.id = f.user_id_2 WHERE f.user_id_1 = ? OR f.user_id_2 = ?`.

**Backend — `backend/routes/users.js`**

- `GET /api/users/search?q=`: `SELECT id, username FROM users WHERE username LIKE ? LIMIT 10` with `%q%` pattern.

**Mobile — `mobile/src/screens/main/LeaderboardScreen.js`**

- `tab` state switches between `'global'` and `'friends'` leaderboard views.
- Search input calls `searchUsers(q)` on change. Results show "Add friend" buttons that call `addFriend(userId)`.
- Incoming pending requests (where the current user is `user_id_2`) are shown with Accept/Decline buttons that call `respondFriend(friendId, 'accepted' | 'rejected')`.
- Leaderboard rows display the user's banner avatar using `banner_color` and `banner_icon` from the response.

---

## 9. Profile & Customisation

### Summary

Users can record their height, weight, and dietary requirements. They can customise their leaderboard avatar by choosing a banner colour and icon — some are locked behind a coin cost. A badge section shows achievements earned. Users can toggle whether they appear on the leaderboard at all.

### High-level

Profile data is stored on the `users` row. Customisation items that cost coins are tracked in `unlocked_banner_items`. When the user purchases one, coins are deducted and the unlock is recorded atomically. On the profile screen, the backend returns the full profile, all earned badges, current streak, and all unlocked items in one response. The streak is read directly from `users.current_streak` — no computation needed. Save errors are surfaced to the user via an inline error message below the save button.

### Technical

**Backend — `backend/routes/profile.js`**

`GET /api/profile` returns a compound object:

```js
{
  profile: { id, username, email, height, weight, dietary_req, total_coins,
             current_streak, shown_in_leaderboard, banner_color, banner_icon },
  badges: [ ...badges rows ],
  streak: user.current_streak ?? 0,   // read directly from users column
  unlocked_items: [ ...unlocked_banner_items rows ]
}
```

`PATCH /api/profile` updates `height`, `weight`, `dietary_req`, `shown_in_leaderboard`, `banner_color`, `banner_icon` on the `users` row in a single `UPDATE` statement using `COALESCE(?, column)` to leave fields unchanged when `null` is passed.

`POST /api/profile/unlock`:

```js
const cost = item_type === 'color' ? 100 : 200;

// Check balance
const user = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId);
if (user.total_coins < cost) return res.status(400).json({ error: 'Not enough coins' });

// Deduct and record
db.prepare('UPDATE users SET total_coins = total_coins - ? WHERE id = ?').run(cost, userId);
db.prepare('INSERT OR IGNORE INTO unlocked_banner_items (user_id, item_type, item_value) VALUES (?, ?, ?)').run(userId, item_type, item_value);
```

Returns `{ ok: true, remaining_coins }`.

**Mobile — `mobile/src/screens/main/ProfileScreen.js`**

- `isUnlocked(type, value)` checks `data.unlocked_items` array. The default colour (`#4ade80`) and icon (`leaf`) are always considered unlocked without a database entry.
- Each colour/icon chip checks `isUnlocked`. If unlocked, tapping sets the local active state. If locked, tapping calls `handleUnlock`, which deducts coins server-side then reloads the profile. On a "Not enough coins" 400 response, `ApiError.message` is shown in an inline error below the save button.
- The logout button sits in the header card (top-right red icon) so it is always visible without scrolling.
- `handleSave` writes height/weight/dietary_req/banner settings in a single `PATCH /api/profile`, then calls `refreshUser()` from `AuthContext` to keep the global user object in sync. A `catch` block surfaces errors inline if the save fails.

---

## 10. Daily Fun Fact

### Summary

A lightbulb button on the Home screen opens a modal showing a wellness tip — a rotating daily fact covering nutrition, exercise, recipes, or mental health.

### High-level

Fun facts are pre-seeded rows in the database. The backend picks today's fact based on the date, falling back to a random fact if no date-matched entry exists. The mobile app caches the fetched fact in component state — re-opening the modal within the same session does not make a second API call.

### Technical

**Backend — `backend/routes/funfacts.js`**

```js
const today = new Date().toISOString().split('T')[0];
let fact = db.prepare('SELECT * FROM fun_facts WHERE date = ?').get(today);
if (!fact) {
  fact = db.prepare('SELECT * FROM fun_facts ORDER BY RANDOM() LIMIT 1').get();
}
return res.json(fact); // { topic, content }
```

**Mobile — `mobile/src/screens/main/HomeScreen.js`**

- `fact` state starts as `null`. `openFact()` sets `factOpen = true` and, if `fact` is still `null`, fetches from `GET /api/fun-facts`.
- Once fetched, `fact` is cached in state — re-opening the modal in the same session does not make another API call.
- The modal renders `fact.topic` (capitalised with `textTransform: 'capitalize'`) and `fact.content`.
