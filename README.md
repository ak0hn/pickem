# Pick'em

An NFL pick'em league app. Players pick 6 games against the spread each week — all 6 must be correct to win the weekly prize. Built to replace a manual email-based system with a real mobile-first web app.

**Status:** In development · Target launch: September 2026 (NFL season opener)

---

## What it does

- **Players** get an invite link, sign in with Google, and pick 6 games per week against the spread
- **Picks lock at kickoff** — no changing your picks once the game starts
- **Results update automatically** after each game, with real-time pick result badges (✅ / ❌)
- **Commissioner controls the week** — publishes the slate, confirms results, posts announcements
- **Tiebreaker system** — if more than N players go 6-for-6 on Sunday, a Monday Night Football pick determines the winner
- **Invite-only** — no one gets in without a direct invite from the commissioner

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Real-time | Supabase Realtime (WebSockets) |
| Deployment | Vercel |
| Odds data | The Odds API |
| Push notifications | Web Push API |
| Type | Progressive Web App (PWA) |

All services run on free tiers for a 50–100 player league. Estimated infrastructure cost: **$0/month**.

---

## Project structure

```
/
├── app/
│   ├── (auth)/             # Login + invite acceptance
│   ├── (app)/              # Authenticated app screens
│   │   ├── home/           # Announcements feed
│   │   ├── week/           # This week's picks
│   │   ├── standings/      # Season standings
│   │   ├── profile/[id]/   # Player profile
│   │   └── settings/       # Account settings
│   └── api/                # Server-side API routes
├── components/             # Shared UI components
├── lib/
│   ├── supabase/           # Browser + server clients
│   ├── odds-api/           # The Odds API wrapper
│   └── push/               # Web push helpers
├── supabase/
│   └── migrations/         # Full DB schema as SQL
└── public/                 # PWA manifest + service worker
```

---

## Data model

10 tables covering the full league lifecycle:

`users` · `invites` · `league` · `weeks` · `games` · `picks` · `announcements` · `comments` · `reactions` · `push_subscriptions`

Row-level security (RLS) is enforced at the database level:
- Players can only see their own picks until a week closes
- Only the commissioner can publish slates, confirm results, and manage invites
- All security is enforced in the database — not just the UI

---

## Auth flow

```
Invite email → /invite/[token] → verify token → Google OAuth
→ /api/auth/callback → check invite in DB → create user row → /home
```

No invite token = no access. Enforced server-side.

---

## Key automation

All scheduled jobs run as Vercel cron → Next.js API routes:

| Job | Schedule | Purpose |
|---|---|---|
| `result-poller` | Every 30 min (Thu–Mon) | Fetches final scores from The Odds API, calculates win/loss/push |
| `pick-locker` | Every 5 min | Locks picks when `kickoff_time <= now()` |
| `commissioner-reminder` | Thursday mornings | Pushes a reminder if the slate hasn't been published |
| `player-reminders` | Sat/Sun mornings | Reminds players with incomplete picks |

Result scoring is handled by a **PostgreSQL trigger** — not application code — so results are always consistent and propagate atomically to all subscribed clients via Realtime.

---

## Local setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) OAuth app
- A [The Odds API](https://the-odds-api.com) key (free tier)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=       # From Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # From Supabase project settings
SUPABASE_SERVICE_ROLE_KEY=      # From Supabase project settings (keep secret)
ODDS_API_KEY=                   # From the-odds-api.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=                    # Any random string — used to authenticate cron calls
```

### 3. Run database migrations
In your Supabase dashboard → SQL Editor, run the files in order:
```
supabase/migrations/20260101000000_initial_schema.sql
supabase/migrations/20260101000001_rls_policies.sql
```

### 4. Enable Google OAuth in Supabase
Supabase Dashboard → Authentication → Providers → Google → add your OAuth credentials.

Set the redirect URL to: `https://your-project.supabase.co/auth/v1/callback`

### 5. Run locally
```bash
npm run dev
```

---

## Roadmap

### Phase 1 — Core picks loop
- [ ] Picks submission UI (`/week`)
- [ ] Commissioner slate publish flow
- [ ] Automated result polling + pick scoring
- [ ] Basic standings

### Phase 2 — Social + notifications
- [ ] Announcements feed (`/home`)
- [ ] Comments + emoji reactions
- [ ] Web push notifications (slate published, results posted, pick reminders)

### Phase 3 — Polish + admin
- [ ] Commissioner admin panel
- [ ] Player profiles
- [ ] Pre-SNF update flow
- [ ] MNF tiebreaker flow
- [ ] PWA install prompt

### V2 (future)
- [ ] Multi-league support
- [ ] Co-commissioner role
- [ ] Live in-game scores
