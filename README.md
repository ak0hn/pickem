# PickEm

An NFL pick'em league app. Players pick 6 teams per week against the spread — all 6 must be correct to win the weekly prize. A separate prize goes to the overall regular-season winner.

Built to replace a manual email-based system for a private league.

---

## Status

**Branch: `v2`** — active development, Lovable-first prototype.

`main` contains the v1 scaffold (parked). This branch is a clean rebuild.

## Stack

- **Frontend:** Next.js (PWA, mobile-first)
- **Backend:** Supabase (Postgres + RLS + Auth)
- **Hosting:** Vercel
- **Odds data:** The Odds API

## Roles

- **Commissioner** — manages the weekly slate (fetch lines, publish, post results, handle edge cases)
- **Player (GM)** — picks 6 games per week, views standings, tracks their season

## Docs

- [`PickEm_LeagueRules.md`](./PickEm_LeagueRules.md) — how the league works
- [`PickEm_UserStories.md`](./PickEm_UserStories.md) — Commissioner and GM user stories

## Target launch

Before NFL regular season 2026.
