# PickEm User Stories

> High-level user stories for the Lovable prototype. Two roles: **Commissioner** (league admin) and **GM** (player). These are intentionally high-level — implementation detail belongs in the PRD and architecture docs.

---

## Auth & Onboarding (All Users)

- As a user, I can sign in with my email (magic link) or a social account (Google or Apple) so I never have to create or remember a password
- As a new user joining via invite link, I'm taken directly into the league after signing in — no extra setup steps
- As a user, I can set my display name so other players know who I am

---

## Commissioner Stories

### League Setup
- As a Commissioner, I can set up my league (name, season, settings) so the app is ready for players to join
- As a Commissioner, I can invite players by email or shareable link
- As a Commissioner, I can configure league settings (push scoring rule, picks-per-week count) before the season starts

### Announcements & Feed
- As a Commissioner, I can post any message or announcement to the league feed at any time — for updates, trash talk, reminders, or anything else
- As a Commissioner, I can publish the weekly slate by posting a special **"Picks are open"** announcement, which simultaneously unlocks the pick screen for all players
- As a Commissioner, I can open the MNF tiebreaker by posting a special **"Tiebreaker picks are open"** announcement with the MNF spread, which unlocks the tiebreaker pick for eligible players only

### Weekly Workflow — Opening the Week
- As a Commissioner, I can trigger a fetch of the week's spreads from The Odds API so I don't have to enter them manually
- As a Commissioner, I can review the fetched spreads and make manual adjustments before publishing
- As a Commissioner, I can see how many players have submitted picks so I know engagement is happening

### Weekly Workflow — During the Week
- As a Commissioner, I can post a mid-week update to the feed highlighting who's still perfect before Sunday Night Football
- As a Commissioner, I can see which players have locked in all their picks vs. still have open picks

### Weekly Workflow — Closing the Week
- As a Commissioner, I can review final game results before posting them officially
- As a Commissioner, I can manually override a result if the API pulled the wrong score
- As a Commissioner, I can post the official results announcement so picks are revealed and standings update
- As a Commissioner, I can close the week so the cycle is complete and the next week can begin

### Tiebreaker
- As a Commissioner, I can choose after Sunday results whether to open an MNF tiebreaker — this is my call each week, not automatic
- As a Commissioner, I can see which players went 6-for-6 and are eligible for the tiebreaker
- As a Commissioner, I post the MNF line with a tiebreaker announcement to open picks for eligible players
- As a Commissioner, I can post the MNF result to close the tiebreaker; if players are still tied, they remain tied and the week ends
- As a Commissioner, if I choose not to run a tiebreaker, I simply close the week without posting one

### Corrections
- As a Commissioner, I can edit a player's pick in exceptional circumstances (e.g., a documented technical issue)
- As a Commissioner, I can void a pick for a postponed game and open a replacement pick window for affected players

---

## GM (Player) Stories

### Weekly Pick Flow
- As a GM, I can see the published slate of matchups and spreads once the Commissioner opens the week
- As a GM, I can select my 6 teams and review them before submitting so I don't accidentally lock in the wrong pick
- As a GM, I can submit picks progressively (e.g., my Thursday pick now, Sunday picks later) so I'm not forced to decide everything at once
- As a GM, I always see how many picks I've locked in (e.g., "3 of 6 submitted") at a glance
- As a GM, I see both teams and the spread on my submitted picks so I have full context on what I locked in
- As a GM, I cannot edit a pick after submitting — I know my picks are final

### Tiebreaker Pick
- As a GM who went 6-for-6, I see the MNF tiebreaker matchup and can submit my pick if the Commissioner opens it
- As a GM who did not go 6-for-6, I do not see or have access to the tiebreaker pick
- As a GM, I can see the tiebreaker result and final weekly outcome once it's posted
- As a GM, I know that my MNF tiebreaker pick counts toward my overall season total

### Results & Standings
- As a GM, I cannot see other players' picks until the Commissioner posts results — my decisions aren't influenced
- As a GM, I can see my pick results (correct/incorrect per game) after results are posted
- As a GM, I can see who went 6-for-6 this week and who the weekly winner(s) are
- As a GM, I can see the season leaderboard showing cumulative correct picks for all players
- As a GM, I can see my personal pick history across all weeks of the regular season

### Feed & Social
- As a GM, I can see all Commissioner announcements and league activity in a feed
- As a GM, I can like any post or comment in the feed (like only — no other reactions)
- As a GM, I can comment on Commissioner announcements to react, talk trash, or ask questions
- As a GM, I can like other players' comments
- As a GM, I am notified when the slate is published so I know it's time to pick

---

## Shared / System Stories

- The app is available as an **iOS app and a web app** — both connected to the same data. Players who don't want to download an app can use any mobile or desktop browser and get the full experience.
- The app prevents picks from being submitted after a game's kickoff time
- The app shows pick status accurately at all times (draft, submitted, locked, result)
- The app covers the NFL regular season only — 18 weeks

---

## Out of Scope for Prototype

These are real features but don't need to work in the Lovable prototype:

- Live in-game scores
- Real Odds API integration (use mock/hardcoded data)
- Real auth (any placeholder login flow is fine — just show the logged-in state)
- Push notifications
- Multiple leagues
- Payment processing
