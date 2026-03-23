# PickEm — Technical Architecture

**Version:** 1.0
**Date:** March 2026
**Status:** Draft — pre-build

---

## Overview

PickEm is a Next.js PWA backed by Supabase, hosted on Vercel. This document covers the data model, auth flow, real-time architecture, external API integrations, scheduled jobs, and the key logic flows for picking, locking, tiebreakers, and results.

---

## Data Model

The database is PostgreSQL, hosted on Supabase. Tables are listed below with their key fields and relationships.

---

### `users`
Authenticated players and the commissioner.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key, from Supabase Auth |
| `email` | text | Unique |
| `name` | text | Display name |
| `avatar_url` | text | Profile photo |
| `role` | enum | `player` or `commissioner` |
| `created_at` | timestamp | |

---

### `invites`
Pending invitations. Only invited users can create accounts.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `email` | text | Who was invited |
| `token` | uuid | Unique token in the invite link |
| `invited_by` | uuid | FK → `users.id` (commissioner) |
| `accepted_at` | timestamp | Null until accepted |
| `created_at` | timestamp | |

---

### `league`
Single row for V1. Holds season-level settings.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `name` | text | e.g. "2026 Pick'em League" |
| `season_year` | int | e.g. 2026 |
| `weekly_prize_display` | text | Display only — e.g. "$50" |
| `season_prize_display` | text | Display only — e.g. "$200" |
| `pick_count` | int | Number of picks required per week (default: 6). Hardcoded to 6 for V1 but stored as config so multi-league V2 can vary it without a schema change. |
| `tiebreaker_threshold` | int | MNF tiebreaker triggers if winners > this number |
| `posting_window_hours` | int | Commissioner reminder fires X hours before Thursday kickoff if slate not posted |
| `created_at` | timestamp | |

---

### `weeks`
One row per NFL week.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `week_number` | int | 1–18 |
| `season_year` | int | |
| `status` | enum | `pending` → `open` → `sunday_complete` → `tiebreaker` → `results_posted` → `closed` |
| `thursday_kickoff` | timestamp | Used to trigger commissioner reminder |
| `created_at` | timestamp | |

**Week status flow:**

```
pending
  ↓ (commissioner publishes slate)
open
  ↓ (all Thu–Sun games complete + commissioner confirms results)
sunday_complete
  ↓ (if winners > threshold)            ↓ (if winners ≤ threshold)
tiebreaker                          results_posted
  ↓ (MNF complete)                       ↓
results_posted                      closed
  ↓ (commissioner posts results announcement)
closed
```

---

### `games`
One row per game in the weekly slate. Includes only games in the pick pool (Thu–Sun). MNF tiebreaker games are stored here too but flagged separately.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `week_id` | uuid | FK → `weeks.id` |
| `home_team` | text | |
| `away_team` | text | |
| `spread` | decimal | Positive = home favored, negative = away favored. Locked at time of commissioner publish. |
| `spread_favorite` | text | Which team is favored (for display clarity) |
| `kickoff_time` | timestamp | UTC. Pick locks at this time. |
| `day` | enum | `thursday`, `friday`, `saturday`, `sunday`, `monday` |
| `is_tiebreaker` | boolean | True only for MNF tiebreaker game |
| `result` | enum | `pending`, `home_win`, `away_win`, `push` |
| `result_confirmed` | boolean | True after commissioner confirms |
| `external_id` | text | The Odds API game ID, used for result polling |
| `created_at` | timestamp | |

---

### `picks`
One row per player per game. Only created for games in the active pick pool.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → `users.id` |
| `game_id` | uuid | FK → `games.id` |
| `week_id` | uuid | FK → `weeks.id` (denormalized for query efficiency) |
| `picked_team` | text | `home` or `away` |
| `result` | enum | `pending`, `win`, `loss`, `push`, `void` |
| `locked_at` | timestamp | Set at game kickoff — pick cannot be changed after this |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Constraint:** A player can only have one pick per game — upsert on `(user_id, game_id)`. This implicitly prevents picking both sides of the same matchup at the data level. Editing a pick simply overwrites the previous selection.

---

### `announcements`
Commissioner posts to the league feed.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `week_id` | uuid | FK → `weeks.id` (nullable — some posts are not week-specific) |
| `author_id` | uuid | FK → `users.id` |
| `type` | enum | `slate`, `pre_snf_update`, `tiebreaker`, `results`, `general` |
| `content` | text | Rich text / markdown |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### `comments`
Player comments on announcements.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `announcement_id` | uuid | FK → `announcements.id` |
| `user_id` | uuid | FK → `users.id` |
| `content` | text | |
| `created_at` | timestamp | |

---

### `reactions`
Emoji reactions on announcements.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `announcement_id` | uuid | FK → `announcements.id` |
| `user_id` | uuid | FK → `users.id` |
| `emoji` | text | e.g. "🔥", "😂", "👏" |

**Constraint:** One reaction per user per emoji per announcement. Upsert on `(user_id, announcement_id, emoji)`.

---

### `push_subscriptions`
Web push subscription objects for each browser/device.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → `users.id` |
| `subscription` | jsonb | Web Push API subscription object (endpoint, keys) |
| `created_at` | timestamp | |

---

## Auth Flow

Supabase Auth handles all authentication. OAuth providers: Google (required), Facebook and Apple (optional for V1).

```
1. User receives invite email with link: /invite/[token]
2. User clicks link → app verifies token against `invites` table
3. If valid: user is prompted to sign in with Google (or other OAuth)
4. On OAuth callback: Supabase creates auth user
5. App checks if `users` row exists for this auth ID
   - If not: create `users` row, mark invite as accepted
   - If yes: just sign in
6. If no valid invite token: access denied, show "You need an invitation" screen
```

**Row Level Security (RLS) — key policies:**

| Table | Policy |
|-------|--------|
| `picks` | Players can read/write their own picks only. Commissioner can read all picks. Players cannot read other players' picks until `weeks.status = 'closed'`. |
| `games` | All authenticated users can read. Only commissioner can insert/update. |
| `users` | All authenticated users can read basic profile info. Users can only update their own row. |
| `announcements` | All authenticated users can read. Only commissioner can insert/update/delete. |
| `comments` | All authenticated users can read and insert. Users can only delete their own comments. |
| `league` | All authenticated users can read. Only commissioner can update. |
| `invites` | Only commissioner can read/insert. |

---

## Real-Time Architecture

Supabase Realtime lets the frontend subscribe to database changes over websockets. No polling needed on the client side.

**Active subscriptions:**

| Subscription | Trigger | Effect in UI |
|---|---|---|
| `games` WHERE `week_id = current` | Game result updated | Player's pick result badge updates (✅ / ❌) |
| `picks` WHERE `user_id = me` | My pick locked or result posted | Lock icon appears, result badge appears |
| `announcements` | New post inserted | New post appears in feed instantly |
| `comments` WHERE `announcement_id = open` | New comment inserted | Comment appears in thread in real time |
| `weeks` WHERE `id = current` | Week status changes | UI state transitions (e.g., tiebreaker banner appears) |

**Why this works at scale:** Supabase Realtime uses PostgreSQL's logical replication. For 50–100 concurrent users during a Sunday game window, this is well within Supabase's free tier limits. Each user subscribes to a narrow channel (their picks, current week, current announcement) — not a firehose of all data.

---

## The Odds API Integration

Used for two distinct purposes, both on the free tier.

### Thursday Spread Pull
**Triggered by:** Commissioner clicking "Fetch This Week's Lines" in the admin UI.

```
Commissioner clicks → POST /api/odds/fetch-week
  → Calls The Odds API: GET /sports/americanfootball_nfl/odds
     params: regions=us, markets=spreads, week=[current]
  → Response: array of games with home/away spreads
  → App filters to Thu–Sun games only (excludes MNF)
  → Inserts into `games` table with status = pending
  → Commissioner reviews in UI, edits any spreads if needed
  → Commissioner clicks "Publish" → week.status = 'open', announcement posted
```

### Automated Result Polling
**Triggered by:** Vercel cron job running every 30 minutes during game windows.

```
Cron fires → GET /api/results/poll
  → Queries `games` WHERE result = 'pending' AND kickoff_time < now()
  → For each pending game: calls The Odds API scores endpoint
  → If final score available: calculates win/loss/push against spread
  → Updates `games.result`
  → Triggers Supabase Realtime cascade → all subscribed clients update
  → After all Thu–Sun games complete: flags week for commissioner review
```

**Spread calculation logic:**
- Home team covers if: `home_score - away_score > spread` (when spread is positive/home favored)
- Push if: difference exactly equals spread
- Away team covers otherwise

---

## Scheduled Jobs (Vercel Cron)

All cron jobs are defined in `vercel.json` and run as Next.js API routes.

| Job | Schedule | What it does |
|-----|----------|--------------|
| `result-poller` | Every 30 min, Thu 7pm – Mon midnight ET | Polls The Odds API for final scores on pending games |
| `pick-locker` | Every 5 min during game windows | Locks picks where `game.kickoff_time <= now()` |
| `commissioner-reminder` | Thursday mornings | Checks if week slate is posted; if not, sends push to commissioner with time remaining before Thursday kickoff |
| `player-pick-reminders` | Sat/Sun mornings + 2hrs before each game window | Sends reminders to players with incomplete picks |

---

## Key Logic Flows

### Weekly Flow: Start to Close

```
Monday (prev week) — Week created in DB with status = 'pending'
       ↓
Thursday morning — commissioner-reminder cron fires
  → If slate not posted within posting_window_hours: push to commissioner
       ↓
Thursday — Commissioner fetches lines → reviews → publishes
  → week.status = 'open'
  → announcement type = 'slate' posted to feed
  → players notified via web push
       ↓
Thu–Sun — Players submit and edit picks freely (until kickoff)
  pick-locker cron locks picks at each game's kickoff_time
       ↓
Pre-SNF — Commissioner posts pre-SNF update
  → announcement type = 'pre_snf_update'
       ↓
Sunday completes — result-poller polls final scores
  → All Thu–Sun game results populated
  → week.status auto-advances to 'sunday_complete'
  → Commissioner notified: "All Sunday results in — review and confirm"
       ↓
Commissioner reviews → overrides any bad results → confirms
       ↓
App evaluates: count of players with all picks = 'win' > tiebreaker_threshold?
       ↓
  YES: week.status = 'tiebreaker'         NO: week.status = 'results_posted'
  Commissioner fetches MNF line            Commissioner posts results announcement
  Commissioner posts tiebreaker post       week.status = 'closed'
  Eligible players notified + pick window
  MNF plays → result-poller polls
  Commissioner posts results announcement
  week.status = 'closed'
```

---

### Pick Submission Flow

```
Player opens "This Week" screen
  → Sees game list with spreads (read from `games` WHERE week_id = current AND is_tiebreaker = false)
  → Games past kickoff are shown as locked (greyed out, no interaction)
  → Player selects a team → POST /api/picks/upsert
      → Server validates: game.kickoff_time > now() (server-side lock check)
      → Upserts into `picks` (user_id, game_id, picked_team)
  → Player can change any unlocked pick the same way — upsert replaces previous selection
  → Pick count badge on nav updates in real time
```

---

### Result Cascade Flow

```
result-poller updates games.result
  → Supabase trigger fires: calculate pick results
      → For each pick WHERE game_id = updated_game:
          compare pick.picked_team against game.result
          set pick.result = 'win' / 'loss' / 'push'
  → Supabase Realtime pushes update to all subscribed clients
  → Players see their pick badge update instantly (✅ / ❌)
  → "Still alive" status on Current Week screen recalculates
```

This cascade is handled by a **Supabase Database Function** (PostgreSQL trigger) — not application code. This ensures results are always consistent and propagate atomically.

---

## Project File Structure

```
/pickem
├── /app                         # Next.js App Router
│   ├── /(auth)
│   │   ├── /login               # OAuth sign-in page
│   │   └── /invite/[token]      # Invite acceptance flow
│   ├── /(app)                   # Authenticated app shell
│   │   ├── /home                # Feed screen
│   │   ├── /week                # Current Week screen
│   │   ├── /standings           # Standings / League screen
│   │   ├── /profile/[userId]    # Profile screen
│   │   └── /settings            # Settings / Account screen
│   └── /api                     # API routes (server-side only)
│       ├── /odds
│       │   └── fetch-week       # Thursday odds pull
│       ├── /results
│       │   └── poll             # Result polling cron target
│       ├── /picks
│       │   └── upsert           # Pick submission
│       └── /notifications
│           └── send             # Web push dispatch
├── /lib
│   ├── /supabase                # Supabase client (browser + server)
│   ├── /odds-api                # The Odds API wrapper
│   └── /push                   # Web Push helpers
├── /supabase
│   ├── /migrations              # DB schema as SQL migrations
│   └── /functions               # Supabase Edge Functions (triggers)
├── /public
│   ├── manifest.json            # PWA manifest
│   └── sw.js                    # Service worker (push + offline)
└── vercel.json                  # Cron job definitions
```

---

## Multi-League Readiness (V2 Design Consideration)

V1 has a single `league` row. To support multiple leagues in V2, the following changes are needed:

- Add `league_id` foreign key to: `users` (membership), `weeks`, `games`, `picks`, `announcements`
- Add a `league_memberships` junction table (user can belong to multiple leagues)
- Commissioner role becomes per-league, not global
- Auth flow: after login, if user belongs to multiple leagues, show a league selector

By naming the `league` table and adding the FK pattern now (even with one row), the V2 migration is additive, not a rewrite.

---

## Cost Summary

| Service | Usage | Cost |
|---------|-------|------|
| Supabase | ~50–100 MAU, <500MB DB, real-time | Free tier |
| Vercel | Static + serverless, ~18 weeks of cron | Free tier |
| The Odds API | ~300 requests/season (spreads + results) | Free tier (500 req/month) |
| Web Push | Browser-native, no third-party service | Free |
| **Total V1** | | **$0/month** |

The only cost trigger is if the league scales significantly beyond 50–100 users or if live in-game scores (V1.1) require a paid API tier.
