# FitBites Mobile

React Native client for FitBites, built with Expo Router.

## Prerequisites

- Node.js 18+
- Expo Go app on Android or iOS
- FitBites backend running in the repository root (`npm run dev`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3000
```

3. Start Expo:

```bash
npm run start
```

## Screens Included

- Auth: Login, Register, Onboarding
- Tabs: Home, Pantry, Community, Leaderboard, Profile

All screens use the same API contract as the Next.js web app.
