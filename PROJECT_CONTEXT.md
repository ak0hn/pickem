# PickEm — Project Context

> Read this file at the start of every PickEm session.

---

## What It Is
A mobile + web app for running an NFL pick'em league against the spread. Players pick 6 teams per week against the Thursday spread. All 6 must be correct to win the weekly prize. A separate prize is awarded to the overall regular-season winner. Built to replace a manual email-based system run by Alex's future brother-in-law.

## Status
- [x] PRD / Spec written → `PickEm_PRD.md`
- [x] Tech stack decided → Next.js + Supabase + Vercel (PWA)
- [x] Technical architecture decided → `PickEm_Architecture.md`
- [x] GitHub repo created → `ak0hn/pickem`
- [x] Development started — Phase 1 in progress
- [ ] MVP shipped

## Target Launch
Before NFL regular season 2026 (early September 2026)

## V1 Scope
Single league only (for Alex's group). Designed with multi-league architecture in mind for V2.

## GitHub
- Repo: `ak0hn/pickem` → https://github.com/ak0hn/pickem
- Alex handles all git operations via terminal/Claude Code
- Cowork is used for brainstorming, planning, and documentation only

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| V1 scope | Single league | Cost-conscious; multi-league is V2 |
| Timeline | Before Sept 2026 | Real deadline — season starts |
| Live scores | V1.1 (not V1) | Knowing final results > live tracking; avoids API cost decision for now |
| Payment handling | Out of scope entirely | Prizes settled outside app (Venmo/cash); P2 to revisit |
| Pick visibility | Hidden until end of week | Players cannot see each other's picks until the week ends to avoid influencing decisions |
| Winner definition | Anyone who goes 6-for-6 | Multiple winners shown in app; prize settled outside app |
| Postponed games | Pick voided, replacement window | Commissioner opens a swap window for affected players |
| Commissioner | Single admin, V1 only | Co-commissioner is V2 |
| League size | 50–100 players | Scale and performance are core design considerations |
| Tech stack | Next.js + Supabase + Vercel | PWA; mobile-first but web-accessible for less tech-savvy users |
| Design approach | Mobile-first, centered on desktop | One UI for all screen sizes; desktop is a centered column, not a wide layout |
| Navigation | Feed, Picks, Standings, Profile + Commissioner (commissioner only) | Settings merged into Profile; Commissioner is a 5th conditional nav item only visible to commissioner |
| Stats page | Tabs within Standings (This Week / Season / History) | Not a standalone nav item; historical/bet-type stats live in Standings History tab (V1.1) |
| Commissioner tools | Dedicated Commissioner page | All admin-heavy actions consolidated there; not scattered inline across player screens |
| Spread ingestion | Automated via The Odds API (V1) | One-time Thursday pull, ~18 req/season, free tier. Commissioner reviews and publishes. |
| Results | Automated via The Odds API (V1) | Final score fetched after each game ends, ~288 req/season, free tier. Manual override available for corrections. |
| Live in-game scores | V1.1 (parked) | Continuous updates during games = many API calls = cost decision needed. Distinct from final results. |
| Pick pool | Thu + Sun only | MNF excluded from regular picks; reserved as tiebreaker only |
| Picks gate | Commissioner publish | Picks don't open until commissioner publishes slate + announcement |
| Results gate | Commissioner announcement | Results not final until commissioner posts official results announcement |
| MNF tiebreaker | V1, commissioner-controlled threshold | Fixed for season; triggers if Sunday winners exceed threshold; commissioner posts MNF line for eligible players |
| Pre-SNF update | Recurring commissioner touchpoint | Commissioner posts mid-week update highlighting who's still perfect before SNF |

## Documents
| File | Description |
|------|-------------|
| `PROJECT_CONTEXT.md` | This file |
| `PickEm_PRD.md` | Full product requirements document |
| `PickEm_Architecture.md` | Technical architecture: data model, auth, real-time, cron jobs, file structure |

## Testing & Rollout Plan

### QA Strategy (two layers)
1. **Playwright E2E tests** — built alongside each feature as we go. Automated regression safety net. Covers commissioner flow, player pick flow, results/standings.
2. **MLB controlled beta** — real users, real data, ~4–6 weeks before NFL season starts.

### MLB Beta Plan
- **Users:** Alex's BIL (commissioner) + his brothers (players) — the actual target users
- **Pick format:** Pick the winner (moneyline, no spread) — simpler than NFL against-the-spread but tests the core "pick a side" mechanic that everything else is built on
- **Data:** Live MLB games via The Odds API (same integration, sport key swapped)
- **Scope of changes:** Sport as a config variable, MLB team/logo data, moneyline pick format. Core app (commissioner workflow, picks, standings, announcements) unchanged.
- **Feedback:** In-app "Report a bug" button → Supabase table → email to Alex
- **Goal:** Surface UX issues, edge cases, and real-world bugs before NFL launch. Fix what the beta surfaces, then go live for NFL.

### Pre-Beta Checklist
- [ ] Set `MOCK_ODDS=false` in `.env.local` (and in Vercel env vars) before first real data fetch
- [ ] Verify Odds API key is valid and on correct plan
- [ ] Seed league with real commissioner + player accounts
- [ ] End-to-end test: fetch lines → publish → pick → post results → standings

### Why not multi-sport (decided against it)
The app's value is the commissioner-controlled workflow for a specific group — not the sport. Full sport-agnostic spread handling (run lines, puck lines, etc.) is a V2 decision that needs real user demand behind it. The MLB beta uses moneyline to avoid rebuilding the pick data model.

---

## Key UX Decisions (from build sessions)
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pick UX | Select → Submit → Lock (game-by-game kickoff) | Two distinct states: draft (selected, not committed) and submitted (locked). A pick only counts if explicitly submitted before that game's kickoff. Draft selections that expire at kickoff are unplayed — no auto-lock. Supports both batch submitters (submit all at once) and progressive submitters (submit Thursday pick, come back for Sunday). |
| Pick editing | No player-side editing post-submit | Edit requests handled case-by-case via commissioner override tool or direct DB edit. Too rare to warrant a self-serve flow in V1. |
| Submitted pick display | Full matchup + spread context | Submitted picks always show both teams + spread (e.g. "Chiefs -3.5 vs. Bills"), not just the picked team. |
| Pick count summary | Always-visible "X of 6 submitted" | Players always know how many picks they've locked in. |
| Spread display | Chip outside team pill | Team pill = brand identity (color). Spread chip = data (dark, subtle). Separate concerns. |
| MNF in slate | Never in regular slate | MNF only appears as a tiebreaker flow, commissioner-controlled. Separate creation UI. |
| Auto-fetch | Configurable hours before TNF | Commissioner always publishes manually (with announcement). Automation only pulls lines. |
| Push scoring | Configurable (win or tie) | League setting: push counts as correct pick or doesn't count. Default: tie (no credit). |
| Wednesday preview | Matchups visible pre-spread | Players see matchups once commissioner runs "fetch" but picks don't open until commissioner publishes. |
| Persistent header | Layout-level week bar | Always shows current week + open/pending status. Pick count shown only on picks page. |

---

## Next Steps
1. ✅ PRD written and iterated — v1.3 current
2. ✅ Tech stack decided — Next.js + Supabase + Vercel, PWA, mobile-first design
3. ✅ Technical architecture doc written → `PickEm_Architecture.md`
4. ✅ **GitHub repo created** — `ak0hn/pickem`, local clone at `~/Desktop/CLAUDE/pickem`
5. ✅ **Phase 1 started** — Scaffold, DB schema, RLS, auth complete
6. ✅ **`/week` picks screen built** — two-half tap cards, submit-then-lock UX, post-submit view, team logos, day/time grouping, result cards
7. ✅ **Commissioner page built** — full lifecycle (fetch lines → review slate → publish → submission tracker → post results → close week), league settings, player invites, dev tools
8. **Next session: Picks page (`/week`)** — rebuild around select→submit→lock model. Alex wireframing in FigJam first; share via Figma MCP when ready.
9. **Then: Standings page (`/standings`)** — not built yet, placeholder exists. Wireframe first.
10. **Then: Profile page (`/profile`)** — review and refine.
11. **Then: Mobile UI review** — test exact mobile scale (not browser sim).
10. **Then: Results + standings** — result polling, pick scoring, standings screen with tabs (This Week / Season / History)
11. **Then: Playwright E2E tests** — commissioner flow, player pick flow, results/standings (built alongside features going forward)
12. **Then: MLB beta prep** — sport config variable, MLB team data, moneyline pick format, in-app bug report button
13. **Then: MLB controlled beta** — ~4–6 weeks of live testing with BIL + brothers before NFL season
