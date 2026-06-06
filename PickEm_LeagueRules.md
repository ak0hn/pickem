# PickEm League Rules

> This document defines how the pick'em league works and what the app needs to support. It is intentionally a blend of league rules and product requirements — written to serve as the primary input for the Lovable prototype.

---

## Platform

PickEm is an **iOS app + web app** (interconnected). The audience spans a wide age range — players who want a native iOS experience can download the app; those who prefer not to can use the exact same app in any mobile or desktop browser. Both surfaces share the same data and experience.

---

## Overview

PickEm is an NFL pick'em league against the spread, played during the **NFL regular season only** (18 weeks, September–January). Each week, a slate of games is published with point spreads. Players pick 6 teams to cover the spread. All 6 must be correct to be a winner that week. There can be multiple weekly winners. A separate season winner is determined by who has the most cumulative correct picks across all regular season weeks.

---

## The Slate

- Each week, the Commissioner publishes a slate of games with point spreads
- The slate is drawn from **Thursday Night Football + Sunday games only** (Monday Night Football is excluded from regular picks — it only appears as a tiebreaker)
- Spreads are fetched automatically from The Odds API on Thursday, then reviewed and published manually by the Commissioner
- Players cannot see the slate or submit picks until the Commissioner officially publishes it
- The Commissioner publishes the slate by posting a special **"Picks are open"** announcement to the feed — this is what unlocks the pick screen for players

---

## Picks

- Each player picks **exactly 6 teams** per week to cover the spread
- Picks are **hidden** until the week closes — no player can see another's picks until results are posted
- A pick is only valid if it is **submitted** before that game's kickoff
  - Selecting a team ≠ submitting — players must explicitly confirm their picks
  - Draft selections that aren't submitted before kickoff expire unplayed (no auto-lock)
- Players can submit picks progressively (e.g., submit Thursday pick first, return for Sunday picks) or all at once
- No editing after submission — edit requests go to the Commissioner
- Players always see how many picks they've locked in (e.g., "3 of 6 submitted")

---

## Weekly Winners

- Any player who goes **6-for-6** (all 6 picks correct against the spread) is a winner for that week
- **Multiple players can win the same week** — there is no limit on weekly winners
- If no player goes 6-for-6, there is no winner for that week
- Winners are announced by the Commissioner after results are posted

---

## Tiebreaker (MNF)

The MNF tiebreaker is **entirely Commissioner-driven and optional each week**. There is no automatic threshold — the Commissioner decides in the moment, that week, whether to open a tiebreaker.

- After Sunday results are posted, the Commissioner reviews who went 6-for-6
- If the Commissioner chooses to run a tiebreaker, they post the **MNF spread with a special "Tiebreaker picks are open" announcement** — this unlocks MNF picks only for players who went 6-for-6 that week
- Only players who went 6-for-6 are eligible to participate in the tiebreaker
- The tiebreaker pick works the same way as a regular pick — pick the team to cover the MNF spread, submit before kickoff
- MNF tiebreaker picks **count toward each player's overall season total** (cumulative correct picks)
- When MNF ends, the Commissioner posts the MNF result
- If players are still tied after MNF, they remain tied — that marks the end of the week. There is no further tiebreaker within a single week.
- If the Commissioner does not open a tiebreaker, the week simply ends after Sunday results

---

## Results

- Final scores are fetched automatically from The Odds API after each game ends
- The Commissioner reviews results and posts an official results announcement
- Results are not considered final until the Commissioner posts the announcement
- The Commissioner has a manual override to correct any incorrect result
- Once results are posted, picks become visible to all players

---

## Standings

- **Weekly:** Shows who went 6-for-6 each week and who the winner(s) were
- **Season:** Tracks cumulative correct picks across all weeks; the player with the most correct picks at regular season end is the season winner
- **History:** Past week results and full pick records (V1.1)

---

## Scoring Edge Cases

- **Push (tie):** A pick against a spread that lands exactly on the number. Default: push does not count as correct. Commissioner can configure this per league.
- **Postponed game:** The affected player's pick is voided. The Commissioner opens a replacement pick window for affected players.
- **Game cancelled:** Treated same as postponed — pick voided, no penalty.

---

## Commissioner Role

The Commissioner is the single admin of the league. Beyond the weekly workflow, the Commissioner has **evergreen ability to post any message or announcement to the league feed at any time** — for trash talk, updates, reminders, or anything else. Two announcement types are "special" in that they trigger specific app behavior:

1. **"Picks are open" announcement** — unlocks the pick screen for the current week. Attached to the slate the Commissioner publishes.
2. **"Tiebreaker picks are open" announcement** — unlocks the MNF tiebreaker pick for eligible players (those who went 6-for-6). Commissioner attaches the MNF spread when posting.

All other Commissioner actions:

3. **Fetch lines** — triggers an automatic pull of spreads from The Odds API
4. **Review slate** — reviews the fetched spreads, makes manual adjustments if needed
5. **Post pre-SNF update** — optional mid-week announcement highlighting who's still perfect before Sunday Night Football
6. **Post results** — reviews final scores, posts official results announcement (reveals picks, updates standings)
7. **Close week** — locks the week, finalizes standings
8. **Override picks** — can edit a player's pick in exceptional circumstances
9. **Override results** — can manually correct a final score if the API is wrong
10. **Manage players** — invite players, manage league membership
11. **Configure league settings** — set push scoring rule, picks-per-week count

---

## Players (GMs)

Players interact with the app to:

1. **Sign in** — via email magic link or social login (Google, Apple). No passwords.
2. **View the slate** — see published matchups and spreads for the week
3. **Make and submit picks** — select and lock in 6 teams before their respective kickoffs
4. **Track pick status** — see how many picks are locked in vs. still open
5. **View results** — see which picks were correct after the Commissioner posts results
6. **Check standings** — see weekly winners, season leaderboard, and personal pick history
7. **View feed** — see all Commissioner announcements and league activity
8. **React to posts** — like any announcement or comment in the feed (like only, no other reactions)
9. **Comment on announcements** — reply to Commissioner announcements; other players can like those comments

---

## Season Structure

- Follows the **NFL regular season only** (18 weeks, September–January)
- Weekly winners: any player who goes 6-for-6 that week
- Season winner: player with the most cumulative correct picks across the full regular season
- Prizes and any financial settlement happen entirely outside the app

---

## What the App Does Not Handle

- Payment processing or prize management — settled outside the app
- Official NFL rules disputes — app defers to Commissioner judgment
- Live in-game scores — app shows final results only (V1); live scores are V1.1
- Multiple leagues — V1 supports one league; multi-league is V2
- Post-season games — regular season only
