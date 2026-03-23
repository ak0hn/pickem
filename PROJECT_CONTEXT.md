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

## Next Steps
1. ✅ PRD written and iterated — v1.3 current
2. ✅ Tech stack decided — Next.js + Supabase + Vercel, PWA, mobile-first design
3. ✅ Technical architecture doc written → `PickEm_Architecture.md`
4. ✅ **GitHub repo created** — `ak0hn/pickem`, local clone at `~/Desktop/CLAUDE/pickem`
5. ✅ **Phase 1 started** — Scaffold, DB schema, RLS, auth complete
6. ✅ **`/week` picks screen built** — game cards, spreads, pick selection, optimistic updates, persistence, team logos, day/time accordions, unselect, lock states
7. **Next: Commissioner page** — `/commissioner` route, weekly workflow (fetch lines → publish → submission tracker → results → close week), invites & players tab, league settings tab
8. **Then: Results + standings** — result polling, pick scoring, standings screen with tabs (This Week / Season / History)
