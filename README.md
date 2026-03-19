# FitBites (React Native + SQLite)

Standalone React Native + SQLite version of FitBites.

## Project Structure

```
FitBites-MySQL/
├── backend/   → Node.js + Express + SQLite (better-sqlite3)
└── mobile/    → React Native (Expo) + React Navigation
```

## Setup

### 1. Backend

```bash
cd backend
npm install
npm run dev    # development (auto-reload with nodemon)
npm start      # production
```

The SQLite database (`fitbites.db`) is created automatically on first run in the `backend/` folder. All tables and seed data (habits, recipes, fun facts) are set up without any manual steps.

### 2. Mobile App

```bash
cd mobile
npm install
```

**Set your backend URL** — open `src/lib/api.js` and update `BASE_URL`:
- iOS Simulator: `http://localhost:3001` (default)
- Android Emulator: `http://10.0.2.2:3001` (default)
- Physical device: `http://<your-computer-local-ip>:3001`

Start the app:
```bash
npm start       # opens Expo DevTools
npm run ios     # iOS simulator
npm run android # Android emulator
```

## Features

- **Auth** — Register, Login, Logout with session cookies
- **Daily Challenges** — Generated from selected habits, complete with photo proof
- **Streak Tracking** — Consecutive day counter with 7-day week view
- **Coin Rewards** — 10 coins per completed challenge
- **Pantry** — Add/edit ingredients with quantity controls
- **Recipes** — Smart recipe matching based on pantry ingredients
- **Community** — Posts with topics, upvotes, and replies; anonymous mode
- **Leaderboard** — Global and friends rankings by streak & coins
- **Friends** — Send/accept friend requests, search users
- **Profile** — Health metrics, customizable banner colors & icons (coin shop)
- **Badges** — Earned for milestones (e.g. First Post)
- **Fun Facts** — Daily health/nutrition tips
