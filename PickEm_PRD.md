# PickEm — Product Requirements Document

**Version:** 1.3
**Date:** March 2026
**Author:** Alex Koh
**Status:** Ready for engineering handoff

---

## Problem Statement

A private NFL pick'em league is currently run entirely by hand. Every Thursday during the NFL regular season, the commissioner sends a group email with that week's spreads and players reply via email to submit their picks. Tracking results, maintaining standings, and managing the league requires manual effort each week. The email format creates engagement and banter that the group values — but it offers no real-time feedback, no live scores, no standings view, and no record of historical performance. As the league grows, the manual process becomes increasingly fragile and the experience lags far behind what a dedicated app could offer.

---

## Goals

1. **Replace the manual email workflow** — players can submit and manage their weekly picks entirely within the app, with the same or better engagement than email.
2. **Give every player visibility into their season** — each user can see their picks, results, and standings at any time without waiting for the commissioner to send an update.
3. **Keep the community feel** — players can react to and comment on weekly announcements, preserving the banter that makes the league fun.
4. **Give players real-time visibility into results** — as games complete, pick results and standings update automatically so players stay in the app during game days, not just at pick submission time. (Live in-game scores are a V1.1 goal.)
5. **Be ready for the 2026 NFL regular season** — a working V1 ships before kickoff in early September 2026.

---

## Non-Goals (V1)

- **Multi-league support** — V1 serves one league only. The architecture will be designed to support multiple leagues in V2, but we are not building multi-tenancy now.
- **Public sign-up** — there is no open registration. Only users invited by the commissioner can join the league. No marketplace, no discovery.
- **Real-money payment processing** — the app tracks who wins weekly and season prizes, but does not process payments. Prize payouts happen outside the app (Venmo, cash, etc.).
- **Automated line movement tracking** — V1 pulls spreads once on Thursday via The Odds API and locks them at time of commissioner publish. Real-time line movement updates (tracking how spreads shift after Thursday) are a V2 consideration.
- **Native iOS / Android apps on app stores** — V1 is a mobile-responsive web app. A native app may follow in V2 based on usage and demand.

---

## Users

### Commissioner (Admin)
Alex's future brother-in-law. Runs the league. Sets up each week, posts announcements, and manages league membership. There is one commissioner per league. Not a technical user — all admin tasks must be completable through a simple UI.

### League Player
A member of the commissioner's friend/family group. The league has ~100 players (confirmed from 2025 season data), making standings, the weekly feed, and performance at scale core design considerations — not afterthoughts. Submits 6 picks per week against the spread, views their results, tracks standings, and engages with weekly announcements. Variable technical comfort — the app needs to be dead simple to use on mobile.

**Mid-season joins:** The commissioner can invite new players at any point during the season. A mid-season joiner starts with 0 picks and appears in standings from their first active week. Their season record reflects only weeks they participated in.

---

## User Stories

### Commissioner

- As the commissioner, I want to post this week's lines (spreads) as a weekly announcement so that all players are notified and can start making their picks.
- As the commissioner, I want to invite players to the league by email so that only people I choose can participate.
- As the commissioner, I want game results to be fetched and applied automatically after each game ends, with the ability to override any incorrect result, so that I don't have to manually track scores and player pick results stay accurate.
- As the commissioner, I want to post free-form announcements and updates to the league feed so that I can communicate news, trash talk, or weekly context to the group.
- As the commissioner, I want to post a mid-week update before Sunday Night Football highlighting who is still perfect heading into SNF so that the league stays engaged and the stakes feel real.
- As the commissioner, I want to post an official results announcement at the end of each week — confirming the winner(s), results, and any notable commentary — so that the week is officially closed in the app and players get the same experience as the current results email.
- As the commissioner, I want to set a winner threshold for the season so that the app knows when to trigger the Monday Night Football tiebreaker vs. let multiple winners split.
- As the commissioner, I want to see a dashboard of who has submitted picks each week and who hasn't so that I can send reminders if needed.
- As the commissioner, I want to set the weekly prize amount and the season prize amount so that the app reflects the actual stakes.
- As the commissioner, I want to set up the league before the season starts — name, season year, tiebreaker threshold, prize display amounts, and posting window — so that the app is configured before I invite any players.

### League Player

- As a player, I want to sign in with Google or create an account with my email and password so that I can access the league regardless of which accounts I have.
- As a player, I want to see this week's spreads and select my 6 picks before games kick off so that I'm entered into the weekly contest.
- As a player, I want to be able to submit picks across multiple sessions (e.g., 1 pick Thursday, more Sunday, the last one Monday morning) as long as the relevant game hasn't started yet so that I have flexibility in when I commit.
- As a player, I want to see which of my picks have been locked in (game started) vs. which I can still change so that I don't accidentally miss a window.
- As a player, I want to see my pick results update as games complete so that I know whether I'm still alive for the weekly prize.
- As a player, I want to see live scores for games in progress so that I can follow along and see how my picks are tracking in real time.
- As a player, I want to see the full league standings — weekly and season-to-date — so that I know where I rank and how far behind (or ahead) I am.
- As a player, I want to see my complete pick history across all weeks so that I can reflect on my performance over the season.
- As a player, I want to comment on and react to the commissioner's weekly announcements so that the group banter is preserved inside the app.
- As a player, I want to be notified and given a pick window if I'm eligible for the Monday Night Football tiebreaker so that I don't miss my chance when it's triggered.
- As a player, I want to receive a push notification or in-app alert when the commissioner posts spreads or a new announcement so that I don't miss the weekly post.

---

## Requirements

### Must-Have (P0)
*The app cannot ship without these. These represent the minimum viable version of the product.*

**Authentication & Accounts**
- [ ] Users can sign in via Google OAuth or email/password — both options are available on the sign-in screen; Facebook and Apple are optional for V1
- [ ] All sign-in methods are invite-gated — the invite email is the key, not the auth method. The app checks the signed-in user's verified email against the `invites` table; if no match exists, access is denied regardless of how they authenticated
- [ ] Email/password accounts require email verification before access is granted — this ensures a GM cannot sign up with someone else's invited email address
- [ ] Commissioner can invite players by email; invited players create accounts via the invitation flow using whichever sign-in method they prefer
- [ ] There is a single commissioner account with elevated permissions
- [ ] Users cannot self-register without an invitation

**Weekly Picks Submission**
- [ ] Commissioner triggers a one-time odds pull on Thursday — the app fetches that week's spreads from The Odds API and populates the slate automatically; commissioner reviews and publishes
- [ ] The fetched spread is locked at time of publishing — it does not update if the line moves after Thursday
- [ ] Pick selection does not open until the commissioner publishes the weekly slate — publishing is a deliberate action that posts the spreads and an accompanying announcement to the feed simultaneously, mirroring the current Thursday email workflow
- [ ] Players select exactly 6 teams against the spread from the weekly pick pool — defined as all games from Thursday through end of Sunday that week (including any Saturday games that appear in the late-season schedule); Monday Night Football is always excluded from the pick pool and reserved solely as a tiebreaker
- [ ] A player can only make one pick per game (home or away) — picking both sides of the same matchup is not allowed and is enforced at the data level
- [ ] Players can freely edit any pick up until that game's kickoff — once the game starts, the pick is locked and cannot be changed
- [ ] Players can submit picks incrementally (e.g., 1 on Thursday, more Sunday morning) and revisit to swap any unlocked pick before its game starts
- [ ] A player who hasn't submitted all 6 picks before their last available game kicks off forfeits the remaining picks (or is prompted to complete before the window closes)
- [ ] No commissioner intervention is needed to manage pick changes — players self-serve via the edit flow
- [ ] The spread shown is the Thursday spread, locked at the time the commissioner publishes the slate — it does not update if the line moves after that point

**Results & Standings**
- [ ] Game results are fetched automatically after each game ends — the app polls for final scores and calculates win/loss/push against the spread without commissioner involvement
- [ ] Each player's pick results update automatically as final game results come in; the commissioner has a manual override to correct any result the API gets wrong
- [ ] Weekly results are not finalized until the commissioner posts an official results announcement — this mirrors the current results email and is the deliberate action that closes the week in the app
- [ ] Any player who goes 6-for-6 (from the Thu/Sun pool) is surfaced as a potential weekly winner; final winner(s) are confirmed when the commissioner posts the results announcement
- [ ] If a game is postponed/cancelled after picks are locked, the commissioner can void that pick and open a replacement window for affected players
- [ ] The app displays current league standings: weekly winners and season-to-date record
- [ ] Season standings track cumulative performance (e.g., total correct picks, number of weekly wins)

**Monday Night Tiebreaker**
- [ ] Commissioner sets a winner threshold before the season starts (e.g., "more than 3 winners = tiebreaker") — this setting is fixed for the season and stored in league settings
- [ ] After Sunday games resolve, the app surfaces provisional results to the commissioner for review — the commissioner confirms (and overrides any API errors) before the tiebreaker can be triggered; results are not final and the tiebreaker cannot fire until the commissioner takes this action
- [ ] If confirmed perfect players exceed the threshold, the commissioner triggers the MNF tiebreaker — posts the MNF line and an announcement; eligible players are notified and can submit a single MNF pick
- [ ] If winners are at or below the threshold, the week closes normally with no MNF pick — those players split the prize outside the app
- [ ] MNF tiebreaker picks follow the same lock-at-kickoff rule and are only visible to eligible players until the week is officially closed

**League Feed / Announcements**
- [ ] Commissioner can post rich-text announcements to a league feed
- [ ] Players can comment on announcements
- [ ] Players can react to announcements with emoji reactions
- [ ] The feed is visible to all league members and is the primary communication hub

**Notifications**
- [ ] Players receive a notification when the commissioner posts the weekly slate or any update/announcement
- [ ] Players receive a pick reminder notification when they have unfilled picks and games are approaching kickoff (e.g., "You still have 3 picks to make — Sunday games kick off in 2 hours")
- [ ] Players receive an escalating reminder if they haven't picked at all and the window is closing — especially important if they're at risk of not having enough remaining games to fill all 6 picks
- [ ] Players can configure notification preferences (on/off per type) in the Settings screen
- [ ] Commissioner receives a reminder notification if the weekly slate has not been posted within a configurable window before Thursday kickoff (e.g., "Lines not posted — Thursday game kicks off in 2 hours"); the deadline buffer is set in league settings and ensures players always have a minimum window to make informed picks
- [ ] V1: web push notifications (browser-based). Native push (iOS/Android) is a V2 consideration alongside native apps.

---

### Nice-to-Have (P1)
*Significantly improves the experience but the core use case works without them.*

**Live Scores** *(moved to V1.1 — knowing results is higher priority than live tracking)*
- [ ] The app shows live scores for in-progress games
- [ ] Players can see how their picks are trending in real time (winning or losing against the spread)
- [ ] Live score data is sourced from a third-party sports data API
  > ⚠️ **Cost flag:** Live score APIs (e.g., Sportradar, The Odds API, ESPN unofficial) vary significantly in cost. This feature requires a cost decision before implementation. Free tiers exist but may have rate limits.

**Pick Comparison**
- [ ] During or after a game week, players can see how others picked (e.g., who else picked the same team)
- [ ] A weekly recap view shows side-by-side picks for the full group

**Push Notifications (Mobile)**
- [ ] Browser/web push notifications for pick reminders and announcements
- [ ] Game-start reminders for upcoming games where the player hasn't picked yet

**Commissioner Quality of Life**
- [ ] Commissioner gets a submission summary dashboard (who's in, who's out, who's partial)
- [ ] Commissioner can edit the weekly slate post before games start if there's a line change or correction
- [ ] Commissioner can post a weekly results recap after all games complete

---

### Future Considerations (P2)
*Out of scope for V1, but worth designing toward so we don't paint ourselves into a corner.*

See the **Future Iterations Parking Lot** section at the bottom of this document for the full list.

---

## Known Edge Cases

Scenarios engineering should be aware of. Expected behaviors are the PM's recommendation — engineering may push back during build if a simpler approach achieves the same outcome.

| # | Scenario | Expected Behavior | Priority |
|---|----------|-------------------|----------|
| 1 | **The Odds API is down on Thursday** when the commissioner clicks "Fetch Lines" | Show an error message with a retry button. If the API remains unavailable, the commissioner can manually enter spreads via the same UI (the fields are editable regardless of source). | P0 |
| 2 | **A player submits 5 picks and all remaining games have kicked off** — they can never reach 6 | The app shows a message: "X picks submitted — no more games available this week." The player is not penalized beyond losing the unsubmitted pick(s). Their submitted picks are still scored normally. | P0 |
| 3 | **OAuth fails during the invite flow** (Google is down, user cancels, etc.) | The invite token remains valid. The user sees a friendly error with a "Try again" button. The invite does not expire on failed attempts. | P0 |
| 4 | **The result-poller returns a result that later changes** (NFL score corrections, stat corrections) | The commissioner override flow handles this. If the commissioner notices a correction after results are posted, they can manually override the game result, which triggers a re-cascade of affected pick results. No automatic re-polling after a game is marked final. | P0 |
| 5 | **A game goes to overtime and overlaps with the next game window's kickoff** | The pick-locker operates per-game based on `kickoff_time`, not per-window. Overtime does not affect pick locking — picks lock at the scheduled kickoff time, not at game completion. | P0 |
| 6 | **A player's browser doesn't support web push notifications** | The app works fully without push notifications. In-app badges (on the "This Week" nav item) and the feed serve as fallback notification mechanisms. The Settings screen shows "Push notifications are not supported in your browser" instead of the toggle. | P1 |
| 7 | **Commissioner forgets to post the slate and Thursday game kicks off** | The commissioner-reminder cron fires before kickoff. If the slate still isn't posted, players simply cannot pick the Thursday game — it locks at kickoff like any other game. The remaining games (Sat/Sun) are still available once the commissioner publishes. No system-breaking failure. | P0 |
| 8 | **First week of the season — no prior week exists** | The commissioner setup flow (league creation + settings) must complete before Week 1 can be created. The app shows an onboarding wizard on first login for the commissioner: create league → configure settings → invite players → create Week 1. | P0 |
| 9 | **A player tries to pick via API after kickoff** (circumventing the UI lock) | Server-side validation: `game.kickoff_time > now()` check on every pick upsert. Returns 403 if the game has started. The UI lock is a UX convenience; the server is the source of truth. | P0 |
| 10 | **Two games kick off simultaneously** | The pick-locker cron runs every 5 minutes. Both games lock at the same cron tick. Players are warned in the UI: "Locks in <X minutes>" badge on each game card. The 5-minute granularity means a pick could theoretically lock up to 5 minutes late — acceptable for V1. | P1 — Decide during build |

---

## Acceptance Criteria (High-Risk P0 Flows)

Formal Given-When-Then criteria for the four flows where getting the behavior wrong would be most visible or costly to fix.

### Pick Submission & Locking

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | A player has not yet picked for Game X, and Game X's kickoff is in the future | The player selects a team for Game X | The pick is saved. The player's pick count increments. The pick is shown as "pending" (editable). |
| AC-2 | A player has an existing pick for Game X, and Game X's kickoff is in the future | The player selects the other team for Game X | The pick is overwritten (upsert). The previous selection is replaced. Pick count stays the same. |
| AC-3 | A player has a pick for Game X, and Game X's kickoff time has passed | The player attempts to change their pick for Game X | The UI shows the pick as locked (greyed out, lock icon). The server rejects any API call with a 403. The pick is unchanged. |
| AC-4 | A player has submitted 6 picks for this week | The player tries to add a 7th pick | ⚠️ **Under review** — see Open Question #9. Current behavior allows picking beyond 6; exact enforcement and UX TBD. |
| AC-5 | A player has submitted 3 picks. The remaining games they haven't picked all have future kickoff times. | The player opens the Current Week screen | The screen shows 3 submitted picks (editable) and the remaining available games. A badge reads "3 of 6 picks made." |
| AC-6 | A player has submitted 4 picks. The 2 unpicked games have already kicked off. | The player opens the Current Week screen | The screen shows 4 submitted picks (some locked, some pending depending on kickoff) and 2 unpickable games (greyed out). A message reads "4 picks submitted — 2 games no longer available." |

### Result Cascade

| # | Given | When | Then |
|---|-------|------|------|
| AC-7 | Game X has 50 picks from various players. Game X's result is `pending`. | The result-poller updates Game X's result to `home_win` | A database trigger fires. All 50 picks for Game X are evaluated: picks for `home` are set to `win`, picks for `away` are set to `loss`. If the spread is exactly met, picks are set to `push`. All subscribed clients receive a real-time update. |
| AC-8 | A player has 5 wins and 1 pending pick for the week | The pending game's result comes in as a win for the player's pick | The player's pick result updates to `win`. The player is flagged as a potential weekly winner (6-for-6). The "Still alive" indicator on Current Week updates to "Perfect week!" |
| AC-9 | A player has 5 wins and the pending game result comes in as a loss | The result-poller updates the game result | The player's pick result updates to `loss`. The player is no longer eligible for weekly winner. "Still alive" updates to "5 of 6." |
| AC-10 | The commissioner overrides Game X's result from `home_win` to `away_win` | The commissioner saves the override | All picks for Game X are re-evaluated. Pick results that changed are updated. Any player whose weekly winner status changed is updated. Realtime pushes the changes to all clients. |

### Tiebreaker Trigger

| # | Given | When | Then |
|---|-------|------|------|
| AC-11 | All Thu–Sun games are complete. 5 players went 6-for-6. The tiebreaker threshold is set to 3. | The commissioner reviews and confirms the provisional results | The app surfaces: "5 perfect players — exceeds threshold of 3. Post MNF tiebreaker?" The commissioner can post the MNF line + announcement. Week status moves to `tiebreaker`. The 5 eligible players are notified. |
| AC-12 | All Thu–Sun games are complete. 2 players went 6-for-6. The tiebreaker threshold is set to 3. | The commissioner reviews and confirms the provisional results | The app surfaces: "2 perfect players — at or below threshold. No tiebreaker needed." The commissioner posts the results announcement. Week status moves to `results_posted` → `closed`. |
| AC-13 | Week is in `tiebreaker` status. 5 eligible players have been notified. | MNF kicks off | Only the MNF tiebreaker pick locks. Eligible players who didn't submit a tiebreaker pick forfeit their tiebreaker chance (their Thu–Sun record still stands). |

### Week Status Transitions

| # | Given | When | Then |
|---|-------|------|------|
| AC-14 | Week status is `pending`. Commissioner has fetched and reviewed the slate. | Commissioner clicks "Publish" | Week status changes to `open`. A `slate` announcement is posted to the feed. All players receive a push notification. Pick selection becomes available. |
| AC-15 | Week status is `open`. All Thu–Sun game results are in. | The last game result is recorded by the result-poller | Week status auto-advances to `sunday_complete`. Commissioner receives a notification: "All Sunday results in — review and confirm." |
| AC-16 | Week status is `sunday_complete`. | Commissioner reviews results and clicks "Confirm" | If winners > threshold → status moves to `tiebreaker`. If winners ≤ threshold → status moves to `results_posted`. |
| AC-17 | Week status is `results_posted` (or `tiebreaker` after MNF completes). | Commissioner posts the official results announcement | Week status moves to `closed`. All player picks for the week become visible to all players. Weekly standings are finalized. |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **The Odds API changes or removes free tier** | Low (stable since 2020, documented free tier) | High — breaks spread ingestion and result polling | Fallback: commissioner can manually enter spreads and results via the same UI. Build the manual path as a first-class fallback, not an afterthought. Alternative APIs: ESPN unofficial, Sportradar free tier. |
| **The Odds API is temporarily down during a game window** | Medium | Medium — result polling pauses until API recovers | Result-poller retries on next cron tick (30 min). Commissioner can manually override individual game results if the API is down for an extended period. No data loss — just delayed updates. |
| **Supabase free tier limits under Sunday peak load** | Low (~100 users, well under 50k MAU / 500MB limits) | High — app becomes unresponsive during the most critical moment | Monitor Supabase dashboard during first 2 weeks. Realtime subscriptions are scoped narrowly (per-user, per-week). If limits are hit, upgrade to Supabase Pro ($25/month) — acceptable cost for a working product. |
| **Web Push not supported in player's browser** | Medium (Safari support is recent; older browsers vary) | Low — the app works without push | In-app badges and feed serve as fallback. Settings screen gracefully degrades. PWA install prompt encourages use of supported browsers. |
| **Phase 1 takes longer than planned (slips past June)** | Medium (first project with this stack) | High — compresses Phase 2 and 3 before Sept deadline | Minimum viable launch = Phase 1 only (auth + picks + results + standings). If Phase 2 slips, the feed features can launch in-season as an update. Phase 3 (live scores) is already V1.1 and non-blocking. |
| **Player adoption is slow — league doesn't switch from email** | Medium | High — product is useless if nobody uses it | Commissioner sends invites 4+ weeks before Week 1. Onboarding metric tracks adoption pace. Fallback: commissioner runs email + app in parallel for Week 1 to reduce switching friction. |

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js | Dominant React framework; handles UI and server logic in one place; PWA-capable |
| Backend / Database | Supabase | PostgreSQL (great for relational data like picks and standings), built-in OAuth, real-time subscriptions, generous free tier (50k MAU) |
| Hosting | Vercel | Made by the Next.js team; seamless deployment, generous free tier |
| App delivery | PWA (Progressive Web App) | Works in any browser (no app store needed); can be installed to home screen on mobile; enables web push notifications |
| Push notifications | Web Push API | V1 browser-based push. Native push (FCM) is V2, alongside native apps. |
| Sports data | The Odds API (free tier) | One-time Thursday spread pull (~18 req/season) + automated final results after each game. Free tier: 500 req/month — season usage is ~300 total requests. |

**Why not Streamlit:** Built for data dashboards and single-user tools. Cannot support real-time multi-user features, a social feed, push notifications, or mobile-first UX at 50–100 concurrent users.

---

## High-Level Screen Architecture

The app has five primary screens for players, plus a sixth Commissioner screen that is only visible to the league commissioner. All screens are accessible via a bottom navigation bar (mobile) or top nav (web).

---

### 1. Home (Feed)
**Purpose:** The social hub of the league. The first thing users see when they open the app.

**What lives here:**
- Commissioner announcements and posts (weekly slate drops, results recaps, general updates)
- Player comments and emoji reactions on posts
- A pinned "this week" status card showing whether the current user has submitted their picks and how many remain
- Notifications / activity feed for recent events (new posts, results posted, etc.)

**Admin extras:**
- Compose button to create a new post or announcement directly from the feed
- Each post shows an engagement summary (X comments, X reactions) with a quick-tap to edit or delete
- Pinned banner if the weekly slate hasn't been posted yet ("⚠️ Week 4 slate not posted — tap to create")

**Who uses it:** Everyone. This is the engagement layer — the replacement for the group email thread.

---

### 2. Current Week
**Purpose:** The action screen. Where players make their picks and track the week in progress.

**What lives here:**
- This week's game matchups with spreads (as posted Thursday by the commissioner)
- Pick selection UI — players select their 6 teams against the spread; any unlocked pick can be changed until kickoff
- Visual status of each pick: locked (game started), pending (game hasn't started), result posted (W/L)
- Incremental submission support — players can pick some games, save, and come back before other games kick off
- "Your week so far" summary: X of 6 picked, X results in, still alive / eliminated for the weekly prize

**Admin extras:**
- A "picks submitted" count badge at the top (e.g., "47 of 100 players have submitted full picks") with a link to the full submission tracker in the Commissioner page

**Who uses it:** All players, primarily Thursday through Monday each week.

---

### 3. Standings / League
**Purpose:** The competitive layer. See how everyone stacks up.

**What lives here:**
- Tabbed layout: **This Week** | **Season** | **History**
- **This Week tab:** Who went 6-for-6 this week (winner(s)), everyone else's pick count for the week; picks comparison view (P1) after the week ends
- **Season tab:** Cumulative record across all weeks — total correct picks, number of weekly wins, overall rank
- **History tab (V1.1):** Multi-season records and aggregate stats — bet type breakdown (home fav, away dog, etc.), time slot breakdown (Thursday / Sunday 1pm / 4pm / SNF), team-by-team ATS record

**Who uses it:** Everyone, especially on Mondays after the last game and mid-season as standings tighten.

---

### 4. Profile
**Purpose:** A player's personal performance view and account hub.

**What lives here:**
- Season-to-date stats: overall W/L/Push record, win %, weekly win count, total picks made
- Best and worst weeks of the season
- Full pick history by week — expandable breakdown of each week's picks and results with W/L per pick
- Comparison prompt: "How do you stack up?" linking to the Standings screen
- **Settings section** (within Profile, not a separate nav item):
  - Profile info (name, avatar)
  - Notification preferences (toggle on/off per type: new announcements, pick reminders, results posted)
  - Account settings (email, OAuth connections, password if applicable)
  - Sign out

**Admin extras (when viewing any player's profile):**
- Full pick history visible regardless of week status (admin can always see all picks)

**Who uses it:** Players checking their own stats. Also visible to others (read-only) — a player can tap another player's name in Standings to see their profile. Settings accessed infrequently — mostly at setup and to adjust notifications.

---

### 5. Commissioner
**Purpose:** The commissioner's operational hub. Not visible to regular players.

The commissioner's workflow follows a predictable weekly rhythm. This page is organized around that rhythm — the right actions are surfaced at the right moment based on the current week's status.

**This Week section (primary — changes each stage of the week):**

| Week status | What the commissioner sees |
|-------------|---------------------------|
| `pending` (no slate yet) | "Fetch this week's lines" button — pulls spreads from The Odds API; commissioner reviews, edits if needed, then publishes. Publishing posts the slate announcement to the Feed and notifies all players. |
| `open` (picks live) | Pick submission tracker: total full / partial / no picks submitted, with per-player drilldown and ability to send nudge notifications to individuals. Ability to edit the slate (correct a spread) before any picks lock for that game. |
| `sunday_complete` (all results in) | Results dashboard: game-by-game results with manual override per game. "Confirm provisional results" action — shows who's perfect, prompts tiebreaker decision. |
| `tiebreaker` | Post MNF line + announcement. Eligible players listed. |
| `results_posted` / `closed` | Post official results announcement. Once posted, week closes and all picks become visible to all players. |

**Postponement handling:** If a game is cancelled or postponed after picks lock, the commissioner can void that pick and open a replacement window for affected players.

**Invites & Players tab:**
- Invite a player by email
- View pending invites (resend or revoke)
- Full player roster with the ability to toggle a player's visibility in standings (e.g., if someone drops out mid-season) or remove them entirely

**League Settings tab** *(configured once before the season, rarely changed):*
- Season name and year
- MNF tiebreaker threshold (e.g., "more than 3 winners = tiebreaker")
- Prize display amounts (weekly and season — display only, not processed in-app)
- Commissioner reminder deadline (minimum window before Thursday kickoff before the reminder fires)
- Broadcast push notification to all league members (for urgent updates outside the normal announcement flow)

**Who uses it:** Commissioner only. Displayed as a fifth bottom nav item only when `role === 'commissioner'`. Regular players never see this screen or nav item.

---

### Navigation & Layout Notes

**Design philosophy: mobile-first, centered on desktop.**
The primary experience is mobile. The league skews toward mobile users, and the time-sensitive nature of picks (Thursday night, Sunday morning, Monday before kickoff) means people will primarily act on their phone. That said, some players — particularly those who skew older or less tech-savvy — may access it via a browser on their laptop or desktop. The app should work for them without any friction.

The solution is a single UI built for mobile, centered in the middle of the screen on desktop — not a wide layout designed for large screens. Think Instagram or Twitter on a laptop: it's the mobile column, just with more whitespace on the sides. This means we build one design, not two, and desktop users get a clean, readable experience without us doing any extra work for them.

**Navigation:**
- **Mobile:** Bottom navigation bar with four items for all players — **Feed | Picks | Standings | Profile**. Settings is accessible within Profile (not a nav item). For the commissioner, a fifth item — **Commissioner** — appears at the end of the nav bar. Regular players never see it.
- **Desktop/web:** Same destinations, rendered as a left sidebar or top nav depending on screen width. The content column stays centered and capped at a mobile-friendly width (~480px max).
- **Badge on "Picks" nav item** when a player has unfilled picks and games are approaching — the visual nudge that replaces a push notification for users who haven't installed the PWA.

**PWA install prompt:**
- On first visit via mobile browser, prompt users to "Add to Home Screen" so the app lives on their phone like a native app.
- For desktop users, a browser install prompt is available but not pushed — the web experience is sufficient for that audience.

**Commissioner access:** The commissioner uses the same nav and layout as all players for the four shared screens. Commissioner-specific tools live exclusively in the Commissioner screen — there are no elevated controls scattered across the player-facing screens, with one exception: a "picks submitted" count badge on the Picks screen links through to the full submission tracker in the Commissioner screen.

---

### Leading Indicators (first 4 weeks of the season)

| Metric | Target | Notes |
|--------|--------|-------|
| Pick submission rate | ≥ 90% of players submit picks each week | Baseline for the current email league is ~100% since it's a small committed group |
| On-time pick rate | ≥ 80% of picks submitted before game kickoff | Measures whether the app is accessible enough to not miss windows |
| Feed engagement | ≥ 1 comment or reaction per player per announcement | Proxy for whether the community feel has transferred from email |
| DAU during game windows | ≥ 50% of players open the app on game days (Thu/Sun/Mon) | Measures whether players check results in-app vs. waiting for commissioner updates. V1 shows results as they finalize; live in-game scores are V1.1. |
| Onboarding completion | ≥ 90% of invited players complete account creation within 2 weeks of invite | The single riskiest moment — if players don't switch from email, the product fails regardless of quality |

**Instrumentation:** Metrics will be tracked via Supabase queries against existing tables (`picks`, `users`, `comments`, `reactions`). No third-party analytics tool needed for V1 — all data is already in the database. DAU approximated via `picks.updated_at` and feed activity timestamps.

### Lagging Indicators (end of regular season)

| Metric | Target | Notes |
|--------|--------|-------|
| Season retention | 100% of players complete the full regular season | Small committed group — any dropout is a signal of product failure |
| Commissioner satisfaction | Commissioner would use the app again next season | If the commissioner hates it, the league won't use it |
| NPS / satisfaction | "Would you recommend this to another league?" > 8/10 | Proxy for V2 multi-league viability |
| Email elimination | Commissioner sends 0 league emails after Week 2 | If the commissioner still sends email updates, the app hasn't replaced the workflow |

---

## Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| 1 | ~~Sports data API~~ **Resolved:** The Odds API free tier covers both Thursday spread pulls (~18 req/season) and automated final results (~288 req/season). Well within the 500 req/month free tier. Live in-game scores (continuous updates during games) remain parked in V1.1 as a separate cost decision. | ✅ Resolved | — |
| 2 | ~~Prize rules~~ **Resolved:** Since payments are handled outside the app, "winner" = any player who goes 6-for-6. Multiple winners are all shown. The app tracks who won, not who gets paid. | ✅ Resolved | — |
| 3 | ~~Postponed games~~ **Resolved:** If a game is postponed or cancelled after picks are locked, the pick is voided and the commissioner opens a replacement window for affected players to pick a different game. | ✅ Resolved | — |
| 4 | ~~Pick visibility~~ **Resolved:** Players cannot see each other's picks until the end of the week to prevent influencing decisions. | ✅ Resolved | — |
| 5 | ~~Co-commissioner~~ **Resolved:** Single commissioner only for V1. Co-commissioner is a V2 consideration. | ✅ Resolved | — |
| 6 | ~~League size~~ **Resolved:** ~100 players (confirmed from 2025 season data). Standings, feed, and performance at scale are core design considerations, not afterthoughts. | ✅ Resolved | — |
| 7 | ~~Push notification type~~ **Resolved:** Web push for V1. Native app push notifications are V2, alongside native iOS/Android apps. Players can configure notification preferences in Settings. | ✅ Resolved | — |
| 8 | What API/cost approach for live in-game scores? Revisit before V1.1. The Odds API may have a paid tier for live data; alternatives include Sportradar or ESPN unofficial. | Alex + Claude | Blocks V1.1 live scores only |
| 9 | **Pick count flexibility:** Should the app enforce exactly 6 picks, or allow players to select more than 6 and trim down before kickoff? The current email workflow supports "loading up" picks and narrowing — the UX for browsing, selecting a pool of picks, and then editing down to the final 6 needs design work before we build it. A heavy-handed enforcement model could add friction and turn players off. | Alex + Claude | Does not block core pick flow; blocks final pick count UX decision |

---

## Timeline Considerations

**Hard deadline:** NFL regular season 2026 begins in early September 2026 (~5 months from March 2026).

**Suggested phasing:**

| Phase | Scope | Target |
|-------|-------|--------|
| **Phase 1 — Core** | Auth, picks submission, results entry, basic standings | June 2026 |
| **Phase 2 — Community** | League feed, comments, reactions, notifications | July 2026 |
| **Phase 3 — Live** | Live scores, pick comparison, commissioner dashboard | August 2026 |
| **Buffer / Polish** | Bug fixes, mobile responsiveness, user testing with the group | August–Sept 2026 |

> **Note on live scores:** This is a P1 feature that requires a cost decision. If the API cost is prohibitive, Phase 3 can be scoped down to manual score updates only (which is already covered in P0 via commissioner result entry).

---

## Future Iterations Parking Lot

Ideas that are explicitly out of scope for V1 but worth keeping track of. These are good ideas — they're here because we chose to stay focused, not because they're bad. Revisit at the start of each new build cycle.

| Idea | Category | Why It's Parked |
|------|----------|-----------------|
| **Live in-game scores** | Engagement | Continuous score updates *during* games (every few minutes) require many API calls and a real cost decision. Final results are already automated in V1 — this is purely the "watch it live" experience. Revisit for V1.1. |
| **Prize / payment tracking** | Finance | Prizes settled outside app (Venmo/cash). No payment handling in V1. Could add in-app tracking + Venmo/Stripe integration later. |
| **Multi-league support** | Platform | V1 is single-league. Design the architecture to support multi-tenancy, but don't build it yet. High value for V2 / portfolio. |
| **Native iOS / Android apps** | Distribution | V1 is mobile-responsive web. Native apps unlock better push notifications, home screen presence, and app store visibility. |
| **Pick comparison view** | Engagement | Side-by-side view of everyone's picks after the week ends. Great for banter. Parked as P1 — not blocking V1 but high engagement value. |
| **Advanced tiebreaker options** | Rules | V1 uses MNF as the tiebreaker. Future options: total points scored, margin of victory, or custom commissioner-defined rules. Low priority unless the league wants more flexibility. |
| **Custom league rules** | Commissioner UX | Allow commissioner to configure pick count (e.g., 5 instead of 6), scoring rules, or tiebreaker method. Useful for V2 multi-league. |
| **Co-commissioner** | Admin | A second admin who can post and manage results. Not needed for a single commissioner running one league. |
| **Historical season archive** | Stats | Browse results and standings from prior seasons. Meaningful after Year 1. |
| **Direct messaging / player-to-player chat** | Social | Players can message each other in the app. Currently handled outside the app. Could deepen engagement. |
| **Member invites by non-commissioner** | Multi-league / Access | In V1, only the commissioner can invite. Opening invites to all members supports organic league growth and is important for multi-league where the commissioner shouldn't be a bottleneck. |
| **Configurable pick count** | Multi-league / Rules | V1 always uses 6 picks. Multi-league platforms may want leagues that use 5, 7, or other counts. Already designed into the architecture (`league.pick_count`); just needs to be surfaced in league settings. |
| **Rich stats dashboard** | Analytics | Bet type breakdown (Home Favs, Away Dogs, etc.), time slot breakdown, team-by-team record, and league-wide pick distribution. All computable from existing V1 data — no new data collection needed. Scoped to V1.1. |
| **Betting intelligence** | Analytics | Layer in contextual data to help players make picks: sharp money indicators, public betting % vs. league pick %, line movement since Thursday, injury report flags. Requires additional data sources beyond The Odds API. |

---

## Appendix — How the League Works Today (for reference)

- Commissioner sends a group email every Thursday with the spread for each game that week
- Players reply by email with their 6 picks against the spread (teams must beat or cover the spread)
- Picks use the Thursday spread, locked at time of the email — the spread does not update
- Pick pool = all games from Thursday through end of Sunday that week (including Saturday games in the late-season schedule, weeks 15–18); Monday Night Football is always excluded and reserved as a tiebreaker regardless of the week's schedule
- Players can pick at different times across Thursday and Sunday as long as the relevant game hasn't kicked off
- If a player picks a Thursday game and gets it wrong, they're eliminated from that week's prize (though they usually still submit the rest)
- After Sunday games: if the number of perfect players exceeds the commissioner's threshold, the commissioner posts the MNF line and eligible players pick MNF as a tiebreaker
- If winners are at or below the threshold, they split the prize — no MNF tiebreaker needed
- Commissioner sends a mid-week update before SNF highlighting who is still perfect — a recurring engagement touchpoint
- Commissioner sends an official results email/announcement after the week closes confirming winners and any notable commentary
- A separate season-long prize is awarded at the end of the regular season
- The league is private — all personal friends/family of the commissioner, 50–100 players
