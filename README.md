# SkillSwap

A peer-to-peer skill trading mobile app built with Expo and React Native. Users list skills they can teach, browse skills others offer, propose trades, chat within a trade thread, and leave reviews once a trade is complete.

---

## Key Features

- **Skill listings** — Create and manage skills you can offer *or* seek, tagged by category with a 1–5 proficiency rating and optional portfolio media
- **Explore** — Browse other users' skills and profiles; send a trade proposal directly from a skill detail page
- **Trade lifecycle** — Full state machine: `pending → in_progress → awaiting_confirmation → completed` (or `declined`)
- **In-trade messaging** — Real-time chat thread per trade, powered by Supabase Realtime (`postgres_changes`)
- **Mutual confirmation** — Both parties must confirm completion before the trade closes
- **Reviews** — Post-trade ratings (overall + skill accuracy, 1–5 stars) with optional comments
- **Auth** — Email/password sign-up and Google OAuth via Supabase Auth; sessions persisted with `expo-secure-store`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo ~54.0.0 (managed workflow) |
| Language | TypeScript (strict mode) |
| React / React Native | React 19.1.0 / RN 0.81.5 |
| Navigation | React Navigation v7 (stack + bottom tabs) |
| State management | Zustand v5 |
| Backend / Database | Supabase (PostgreSQL + Auth + Realtime) |
| Image uploads | Expo Image Picker + Supabase Storage |
| Custom fonts | Expo Font + Bitter & Karla (Google Fonts) |
| Secure token storage | Expo Secure Store |
| Deep linking (OAuth) | Expo Linking (`skillswap://auth/callback`) |

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (comes with Node)
- **Expo CLI** — install globally: `npm install -g expo-cli` (or use `npx expo` without global install)
- **Expo Go** app on a physical iOS/Android device, **or** Xcode (iOS Simulator) / Android Studio (Android Emulator)
- A **Supabase** project with the required tables and RLS policies (see [Supabase Setup](#supabase-setup))

---

## Setup

1. **Clone the repo**

   ```bash
   git clone <your-repo-url> skillswap
   cd skillswap
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example file and fill in your Supabase project credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

   Both values are found in your Supabase dashboard under **Project Settings → API**.

---

## Running the App

```bash
# Start the Expo dev server (shows QR code + menu)
npm start

# Open directly on iOS Simulator (requires Xcode on macOS)
npm run ios

# Open directly on Android Emulator (requires Android Studio)
npm run android

# Run in a web browser (limited functionality)
npm run web
```

Scan the QR code with **Expo Go** on your phone, or press `i` / `a` in the terminal to launch a local simulator.

---

## Project Structure

```
skillswap/
├── App.tsx                  # Root component: font loading, deep-link handler, NavigationContainer
├── index.ts                 # Expo entry point (registerRootComponent)
├── app.json                 # Expo config (name, slug, icons, plugins)
├── tsconfig.json            # TypeScript config (extends expo/tsconfig.base, strict)
├── package.json
├── assets/                  # App icons and splash screen images
├── PROFILES_SETUP.sql       # Supabase: profiles table + trigger DDL
├── SUPABASE_RLS.sql         # Supabase: row-level security policies
└── src/
    ├── components/          # Reusable UI components
    │   ├── Button.tsx
    │   ├── CategoryIconMark.tsx
    │   ├── EmptyState.tsx
    │   ├── MessageBubble.tsx
    │   ├── RatingStars.tsx
    │   ├── SkillCard.tsx
    │   ├── TagSelector.tsx
    │   └── TradeCard.tsx
    ├── hooks/
    │   └── useRealtime.ts   # Supabase Realtime subscription for trade messages
    ├── lib/
    │   └── supabase.ts      # Supabase client (reads EXPO_PUBLIC_* env vars)
    ├── navigation/
    │   ├── RootNavigator.tsx  # Auth guard: renders AuthStack or AppTabs
    │   ├── AuthStack.tsx      # Welcome → Login / Register
    │   └── AppTabs.tsx        # Bottom tabs: Explore, Skills, Trades, Profile
    ├── screens/
    │   ├── auth/            # WelcomeScreen, LoginScreen, RegisterScreen
    │   ├── explore/         # ExploreScreen, UserProfileScreen
    │   ├── profile/         # ProfileScreen
    │   ├── skills/          # SkillListScreen, SkillDetailScreen, CreateSkillScreen
    │   └── trades/          # TradeListScreen, TradeDetailScreen,
    │                        # ProposeTradeScreen, MessageThreadScreen
    ├── services/            # Business logic (no direct DB calls in screens)
    │   ├── skillService.ts
    │   ├── tradeService.ts
    │   ├── messageService.ts
    │   ├── profileService.ts
    │   ├── reviewService.ts
    │   ├── confirmService.ts
    │   └── mediaService.ts
    ├── store/               # Zustand stores
    │   ├── authStore.ts     # Session + user state
    │   ├── skillStore.ts
    │   └── tradeStore.ts
    ├── theme/
    │   └── index.ts         # Design system: Colors, Typography (Bitter/Karla), Spacing, Shadows, TextStyles
    └── types/
        └── index.ts         # Shared domain models (Skill, Trade, Message, Profile, Review)
```

---

## Supabase Setup

The app requires the following tables in your Supabase project:

- `profiles` — auto-created on sign-up via a trigger
- `skills` — user skill listings
- `trades` — trade proposals and lifecycle state
- `messages` — per-trade chat messages
- `reviews` — post-completion ratings

SQL scripts are included in the repo:

```bash
# Run in Supabase SQL Editor:
# 1. Create profiles table + trigger
PROFILES_SETUP.sql

# 2. Apply row-level security policies
SUPABASE_RLS.sql
```

For Supabase Realtime (live message updates), enable the `messages` table under **Database → Replication** in the Supabase dashboard.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |

All variables are prefixed with `EXPO_PUBLIC_` so Expo bundles them into the client at build time. Never use the Supabase **service role key** here.
