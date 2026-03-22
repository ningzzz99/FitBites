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
```

The SQLite database (`fitbites.db`) is created automatically.

### 2. Mobile App

```bash
cd mobile
npm install
```

**Set your backend URL** — open `src/api.js` and update `BASE_URL`:
- iOS Simulator: `http://localhost:3001` (default)
- Android Emulator: `http://10.0.2.2:3001` (default)
- Physical device: `http://<your-computer-local-ip>:3001`

**Android Setup Note:**
If you get an "SDK location not found" error, create `mobile/android/local.properties` with:
`sdk.dir=C\:\\Users\\<your-user>\\AppData\\Local\\Android\\Sdk`

Start the app:
```bash
cd mobile
npm run android
```
