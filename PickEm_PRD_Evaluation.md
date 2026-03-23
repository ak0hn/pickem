# PickEm PRD — Engineering Handoff Evaluation

**Evaluated by:** Claude (as technical PM)
**Date:** March 2026
**PRD Version:** 1.0
**Verdict:** Strong foundation with specific gaps to close before handoff

---

## The Rubric: PRD Engineering-Readiness Scorecard

This rubric synthesizes four widely-referenced product management frameworks into a single reusable scoring tool:

**Framework sources:**
1. **Marty Cagan's Four Big Risks** (SVPG / *Inspired*) — every PRD must address value, usability, feasibility, and business viability risk
2. **Aakash Gupta's Modern PRD Guide** — acceptance criteria via Given-When-Then, the "new engineer test" (could a new engineer build exactly what's needed from this doc alone?)
3. **Lenny Rachitsky's 1-Pager Principles** — problem-first framing, explicit non-goals, collaborative iteration
4. **ISO/IEC 25010 Quality Attributes** — performance, reliability, usability, security, maintainability (even one line per attribute improves alignment)

The rubric has **10 dimensions**, each scored **1–5**, for a total of **50 points**.

---

### Scoring Scale

| Score | Label | What it means |
|-------|-------|---------------|
| 5 | Ship-ready | Engineering can build from this without ambiguity |
| 4 | Strong | Minor gaps — a quick conversation would close them |
| 3 | Adequate | Workable but engineering will have meaningful questions |
| 2 | Weak | Gaps will cause rework or misalignment |
| 1 | Missing | This dimension is absent or fundamentally incomplete |

---

### The 10 Dimensions

| # | Dimension | What it evaluates | Framework source |
|---|-----------|-------------------|------------------|
| 1 | **Problem Clarity** | Is the problem real, specific, and grounded in evidence — not a hypothetical? | Cagan (value risk), Lenny (problem-first) |
| 2 | **User Definition** | Are users clearly defined with distinct needs, scale, and context? | Cagan (usability risk) |
| 3 | **Scope Discipline** | Are goals, non-goals, and boundaries internally consistent and unambiguous? | Lenny (non-goals), Aakash |
| 4 | **Requirements Specificity** | Can engineering estimate and build each requirement without asking "what do you mean?" | Aakash (acceptance criteria) |
| 5 | **Edge Cases & Error Handling** | Are failure modes, degraded states, and "what if" scenarios addressed? | Cagan (feasibility risk), ISO 25010 (reliability) |
| 6 | **Acceptance Criteria** | Is each P0 requirement testable — can QA write a test case from the PRD? | Aakash (Given-When-Then) |
| 7 | **Technical Feasibility** | Has the tech been validated? Is the stack decided with rationale? | Cagan (feasibility risk), ISO 25010 |
| 8 | **Dependencies & Risks** | Are external dependencies documented with mitigation plans? | Cagan (business viability) |
| 9 | **Success Metrics** | Are metrics measurable, baselined, and instrumented — not aspirational? | Aakash, Lenny |
| 10 | **Engineering Handoff Readiness** | Could a new engineer understand exactly what to build and why from this doc + its companions? | Aakash ("new engineer test") |

---

## PickEm PRD Score: 35 / 50

---

### Dimension-by-Dimension Evaluation

---

#### 1. Problem Clarity — 5 / 5

**Strength:** This is a real problem for a real group of people. The problem statement is specific (manual email workflow), grounded in evidence (the league exists today with ~101 players), and the pain is concrete (no standings, no live feedback, fragile as the league grows). This isn't a hypothetical or market research exercise — it's a validated need with a committed user base.

**No changes needed.** This is as strong as a problem statement gets for a V1 product.

---

#### 2. User Definition — 4 / 5

**Strength:** Two clear user types (Commissioner, League Player) with distinct needs. The commissioner persona is well-grounded (Alex's future brother-in-law, non-technical, runs the league). The player description captures the key constraint: variable technical comfort, mobile-first behavior.

**Gap:** The Users section says "50–100 players" but the actual confirmed count from season data is 101. More importantly, the PRD doesn't address: what happens when a new player joins mid-season? Can the commissioner invite someone in Week 8? What's their standings baseline? This is an edge case engineering will ask about.

**Suggested fix:** Update player count to "~100 players (confirmed from 2025 season data)" and add one line about mid-season joins (either: "Mid-season invites are allowed; the new player starts with 0 picks and appears in standings from their first active week" or explicitly mark it as out of scope for V1).

---

#### 3. Scope Discipline — 3 / 5

**Strength:** The Non-Goals section is well-structured. The parking lot is excellent — 14 items, each with a reason for parking. Goals are clear and numbered.

**Gap — Internal contradictions (this is the most important finding):**

Three statements in the PRD directly contradict each other:

1. **Non-Goals says automated spread ingestion is V2.** Line 31: *"Automated spread ingestion — in V1, the commissioner manually enters the weekly spreads."* But P0 Requirements (line 88) say: *"Commissioner triggers a one-time odds pull on Thursday — the app fetches that week's spreads from The Odds API and populates the slate automatically."* These cannot both be true. The P0 requirement is correct (this was decided during the session). The Non-Goal is stale.

2. **Goal #4 references a feature that isn't in V1.** Line 22: *"Show live scores during game windows."* But live scores are explicitly V1.1 / P1. A goal that isn't achievable in V1 sends a confusing signal to engineering about what "done" means.

3. **Commissioner user story references manual results.** Line 52: *"As the commissioner, I want to manually mark each game result."* But P0 Requirements say results are fetched automatically via The Odds API. This user story is a leftover from an earlier iteration.

**Why this matters:** An engineer reading this PRD top-to-bottom would encounter the Non-Goals section first and understand "spreads are manual." Then they'd reach the P0 requirements and read "spreads are automated." They'd stop and ask — which is it? Internal contradictions are the #1 source of engineering confusion and rework. They erode trust in the document.

**Suggested fix:** Remove or rewrite all three contradictions (specific edits provided below).

---

#### 4. Requirements Specificity — 4 / 5

**Strength:** P0 requirements are detailed and well-structured by domain (Auth, Picks, Results, Tiebreaker, Feed, Notifications). The pick submission flow is especially strong — it covers incremental submission, lock-at-kickoff, self-serve edits, and the forfeiture rule. The architecture doc provides the data model and API routes that back these up.

**Gap:** Some requirements are compound — they pack multiple conditions into a single bullet, making them harder to estimate and test individually. For example, line 91 is a single requirement that specifies: (a) exactly 6 picks, (b) against the spread, (c) from the weekly pick pool, (d) defined as Thu–Sun including Saturday, (e) excluding MNF, (f) which is reserved for tiebreaker. That's six testable conditions in one bullet. Engineering would benefit from these being broken apart.

**Suggested fix:** For the PRD agent, build in a rule: "Each requirement bullet should express one testable behavior. If a requirement contains the word 'and' or a semicolon connecting two distinct conditions, consider splitting it." Not urgent for this specific handoff (the architecture doc compensates), but important for the reusable framework.

---

#### 5. Edge Cases & Error Handling — 2 / 5

**Strength:** The PRD handles the postponed/cancelled game edge case (pick voided, replacement window). The architecture doc handles the "pick both sides" constraint at the data level.

**Gap — Missing edge cases that engineering will encounter:**

- **What if The Odds API is down on Thursday?** Commissioner clicks "Fetch Lines" and gets an error. What's the fallback? Manual entry? Retry? Show an error message and wait?
- **What if a player's browser doesn't support web push?** Not all browsers support the Web Push API (notably Safari had limited support until recently). What's the graceful degradation?
- **What if a player submits 5 picks and all remaining games have already kicked off?** They can never reach 6. Is that an auto-forfeit? Does the UI show a message?
- **What if the result-poller returns a result that changes later?** (NFL has had score corrections after initial "final" reporting.) Is there a re-poll mechanism, or is this handled entirely by the commissioner override?
- **What if a game goes to overtime and overlaps with the next game window's kickoff?** Does the pick-locker handle this correctly?
- **What if OAuth fails during the invite flow?** Does the invite token remain valid for retry?
- **What about the first week of the season?** Is there any setup flow — commissioner creates the league, sets the tiebreaker threshold, configures settings — or is this assumed to be done in the DB?

**Suggested fix:** Add a "Known Edge Cases" section to the PRD with a table: Scenario | Expected Behavior | Priority. Engineering doesn't need every edge case solved in the PRD, but they need to know which ones the PM has thought about vs. which are "figure it out during build."

---

#### 6. Acceptance Criteria — 2 / 5

**Strength:** Requirements are described in enough detail that an experienced engineer could infer the acceptance criteria. The architecture doc's logic flows (weekly flow, pick submission flow, result cascade flow) serve as partial AC.

**Gap:** No formal acceptance criteria exist anywhere in the PRD. Every P0 requirement is a narrative description, not a testable condition. For example:

> "Players can freely edit any pick up until that game's kickoff — once the game starts, the pick is locked and cannot be changed."

This is clear *intent*, but the acceptance criteria would be:

- **Given** a player has submitted a pick for Game X, **When** the current time is before Game X's kickoff_time, **Then** the player can change their pick to the other team.
- **Given** a player has submitted a pick for Game X, **When** the current time is at or after Game X's kickoff_time, **Then** the edit button is disabled and the pick displays a lock icon.
- **Given** a player attempts to submit a pick change via the API after kickoff, **Then** the server returns a 403 and the pick is not modified.

Without these, QA cannot write test cases directly from the PRD, and engineering has to infer the expected behavior for every state transition.

**Suggested fix:** For this PRD, add acceptance criteria to the highest-risk P0 requirements: pick submission, result cascade, tiebreaker trigger, and pick locking. You don't need AC for every requirement — focus on the ones where getting the behavior wrong would be most visible or most costly to fix. For the PRD agent, this should be a standard step: after requirements are written, generate Given-When-Then AC for all P0 items.

---

#### 7. Technical Feasibility — 5 / 5

**Strength:** This is unusually strong for a PRD. The tech stack is decided with rationale. The architecture doc exists with a full data model (10 tables), auth flow, RLS policies, real-time subscriptions, cron job definitions, API routes, and a file structure. Cost is validated at $0/month with specific API call math (300 req/season against a 500 req/month free tier). The "why not Streamlit" note shows the decision was deliberate, not default.

**No changes needed.** The architecture doc is a companion artifact that most PRDs don't have at this stage. This compensates for several gaps elsewhere.

---

#### 8. Dependencies & Risks — 3 / 5

**Strength:** The Odds API dependency is documented with specific usage math. The cost summary is clear. The multi-league V2 readiness section shows forward-thinking architecture decisions.

**Gap — Missing risk mitigations:**

- **The Odds API is the single point of failure for two V1 features** (spread ingestion and result polling). What if the API changes its free tier, deprecates an endpoint, or goes down during a Sunday game window? There's no fallback documented.
- **Supabase free tier limits during peak load.** 50–100 concurrent users during Sunday game windows, all with active real-time subscriptions + pick submissions + result polling — is this within free tier? The architecture doc says "well within" but doesn't cite specific limits.
- **Web Push API browser compatibility.** This is a known constraint with real-world implications (older browsers, iOS Safari). No fallback is documented.
- **No timeline risks.** The Phase 1–3 timeline exists but there's no risk section: what if Phase 1 takes longer? What's the minimum viable version that ships even if Phase 2 slips?
- **Player onboarding / migration.** 101 existing players need to be invited and onboarded to a new system. This is a real operational risk — if adoption is slow, the league can't switch from email.

**Suggested fix:** Add a "Risks & Mitigations" table to the PRD. Five rows: API dependency, infrastructure limits, browser compatibility, timeline, and adoption/migration. Each with a mitigation plan or an explicit "accepted risk."

---

#### 9. Success Metrics — 3 / 5

**Strength:** Metrics are structured as leading (first 4 weeks) and lagging (end of season), which is a smart split. Targets are specific (≥ 90%, ≥ 80%, etc.). The commissioner satisfaction metric is smart — it correctly identifies the commissioner as the kingmaker for league adoption.

**Gap:**

- **Goal #4 metric doesn't match V1 scope.** "DAU during game windows ≥ 60% of players open the app on game days" is described as indicating "live scores are driving retention" — but live scores aren't in V1. This metric is measuring a feature that won't exist at launch.
- **No baseline measurement plan.** "Baseline for the current email league is ~100%" — but this is an assumption, not data. How would you know if the email league's pick rate was actually ~100%? The PRD doesn't specify how these metrics will be instrumented (analytics tool? Supabase queries? Manual tracking?).
- **No metric for the migration itself.** The single riskiest moment is getting 101 players from email to the app. There should be a leading indicator for this: "% of invited players who complete onboarding within 2 weeks of invite."

**Suggested fix:** Replace the live scores metric with something V1 can actually measure (e.g., "app opens during Sunday game windows ≥ 50% of active players — measures whether players check results in-app vs. waiting for the email"). Add a sentence about instrumentation approach. Add an onboarding metric.

---

#### 10. Engineering Handoff Readiness — 4 / 5

**Strength:** The PRD + Architecture doc together form a strong handoff package. The architecture doc provides what most PRDs lack: a data model engineers can start writing migrations from, API routes they can scaffold, and logic flows they can implement directly. The file structure is explicit. The cron job definitions are specific enough to configure in vercel.json on day one.

**Gap:** The contradictions in dimension #3 are the main blocker. A new engineer reading the PRD would get confused within the first two pages (Non-Goals says manual spreads, P0 says automated). The stale user story about manual results would add to the confusion. These aren't huge issues to fix, but they must be fixed before handoff — otherwise the engineer's first question in the kickoff meeting will be "which version of this document is correct?"

**Additional gap:** No onboarding / setup flow is described. The very first thing the commissioner will do is create the league and configure settings. There's no user story or requirement for this "day zero" experience. Engineering will have to invent it.

**Suggested fix:** Fix the three contradictions. Add a "Commissioner Setup Flow" requirement or user story: "As the commissioner, I want to set up the league for the first time — name, season year, tiebreaker threshold, prize display amounts — before inviting any players."

---

## Score Summary

| # | Dimension | Score | Notes |
|---|-----------|-------|-------|
| 1 | Problem Clarity | 5 / 5 | Real problem, real users, validated need |
| 2 | User Definition | 4 / 5 | Strong; add mid-season join handling |
| 3 | Scope Discipline | 3 / 5 | Three internal contradictions must be fixed |
| 4 | Requirements Specificity | 4 / 5 | Detailed; some compound requirements could split |
| 5 | Edge Cases & Error Handling | 2 / 5 | Biggest gap — add a Known Edge Cases section |
| 6 | Acceptance Criteria | 2 / 5 | No formal AC; add Given-When-Then for high-risk P0s |
| 7 | Technical Feasibility | 5 / 5 | Exceptionally strong — architecture doc compensates |
| 8 | Dependencies & Risks | 3 / 5 | Dependencies documented but mitigations missing |
| 9 | Success Metrics | 3 / 5 | Good structure; fix V1.1 metric, add instrumentation |
| 10 | Engineering Handoff Readiness | 4 / 5 | Strong package; fix contradictions before handoff |
| | **TOTAL** | **35 / 50** | |

---

## Interpretation

| Range | Grade | Meaning |
|-------|-------|---------|
| 45–50 | A | Ship to engineering as-is |
| 38–44 | B | One focused editing pass, then ship |
| 30–37 | **C+ (you are here)** | **Strong bones, specific gaps to close — one working session** |
| 20–29 | D | Significant rework needed |
| <20 | F | Start over or rethink scope |

**35/50 is a strong C+.** The PRD has excellent bones — the problem is real, the requirements are detailed, and the technical feasibility work (architecture doc, cost analysis) is above average. The gaps are specific and fixable in a single editing session: fix the contradictions, add edge cases, add acceptance criteria for the riskiest flows, and tighten the metrics.

---

## Priority Edits Before Engineering Handoff

Ordered by impact on engineering clarity:

### Must-Fix (blocks clear handoff)

1. **Fix Non-Goals #4:** Remove or rewrite "Automated spread ingestion — in V1, the commissioner manually enters the weekly spreads." Replace with something like: "Automated line movement tracking — V1 locks the spread at time of commissioner publish. Real-time line movement updates are a V2 consideration."

2. **Fix Goal #4:** "Show live scores during game windows" is a V1.1 feature, not a V1 goal. Either reframe as "Give players real-time visibility into their pick results as games complete" (which IS V1 — automated result updates) or move it to a "V1.1 Goals" subsection.

3. **Fix stale commissioner user story:** "As the commissioner, I want to manually mark each game result" → Rewrite to: "As the commissioner, I want game results to be fetched and applied automatically after each game ends, with the ability to override any incorrect result, so that I don't have to manually track scores."

4. **Add commissioner setup user story:** "As the commissioner, I want to set up the league before the season — name, tiebreaker threshold, prize amounts, posting window — so that the app is configured for the first week."

### Should-Fix (reduces engineering questions by ~50%)

5. **Add a Known Edge Cases section** with the 7+ scenarios from Dimension 5 above. Format: Scenario | Expected Behavior | Priority (P0 / P1 / Decide-During-Build).

6. **Add acceptance criteria for 4 high-risk P0 flows:**
   - Pick submission + locking (Given-When-Then for each state)
   - Result cascade (what triggers, what updates, in what order)
   - Tiebreaker trigger (threshold logic, commissioner confirmation gate)
   - Week status transitions (what moves the week from one state to the next)

7. **Add a Risks & Mitigations table:** API dependency, Supabase limits, browser compatibility, timeline slip, player adoption/migration.

### Nice-to-Fix (improves the doc but doesn't block handoff)

8. **Fix the DAU metric** to reference V1 behavior (result checking), not V1.1 (live scores).

9. **Add an onboarding/migration metric:** "% of invited players who complete account creation within 2 weeks."

10. **Standardize league size:** Replace "50–100" with "~100 (confirmed from 2025 season data)" throughout.

11. **Add one line about mid-season joins:** Either allow with a blank record or explicitly scope out.

---

## For the Reusable PRD Agent

This evaluation surfaces a pattern: the PickEm PRD is strong on *what the product does* and weak on *what happens when things go wrong*. This is the most common PRD failure mode — PMs describe the happy path thoroughly and skip the sad paths. A reusable PRD agent should enforce these rules:

1. **Contradiction detector:** After drafting, re-read Non-Goals against P0 Requirements and Goals against scope. Flag any statement that contradicts another.

2. **Edge case generator:** For every P0 requirement, ask: "What happens if this fails? What happens if the input is unexpected? What happens if the dependency is unavailable?"

3. **Acceptance criteria step:** After requirements are written, generate Given-When-Then AC for all P0 items. This is a separate pass, not inline with requirement writing.

4. **"New engineer" test:** As a final check, re-read the PRD as if you've never seen the product. Note every place you'd ask a clarifying question. Those are the gaps.

5. **Stale content detector:** When a requirement is changed during iteration, check all other sections that reference the same concept (user stories, non-goals, metrics) and flag any that are now stale.

6. **Risk register prompt:** After tech stack and dependencies are documented, prompt for a Risks & Mitigations table. Every external dependency gets a row.

7. **Metrics-to-scope alignment:** Every success metric must reference a feature that exists in the version being shipped. If a metric references a parked feature, flag it.

---

## Re-Score After Edits: 44 / 50

All edits applied. Here's the updated score with reasoning for each change.

| # | Dimension | Before | After | What changed |
|---|-----------|--------|-------|-------------|
| 1 | Problem Clarity | 5 | 5 | No change needed |
| 2 | User Definition | 4 | 5 | Added mid-season join policy. Standardized league size to ~100 (confirmed). |
| 3 | Scope Discipline | 3 | 5 | Fixed all 3 contradictions: Non-Goal now says "line movement tracking" (not manual spreads), Goal #4 now says "real-time visibility into results" (not live scores), commissioner user story now says automated results with override. Zero contradictions remain. |
| 4 | Requirements Specificity | 4 | 4 | No change — compound requirements remain but are compensated by the new AC section. Not worth splitting at the cost of document length. |
| 5 | Edge Cases & Error Handling | 2 | 4 | Added 10-row Known Edge Cases table covering API failure, browser compatibility, pick forfeiture, overtime overlap, simultaneous kickoffs, first-week setup, and more. Not a 5 because edge cases for the feed/social features aren't covered — acceptable for V1 priority. |
| 6 | Acceptance Criteria | 2 | 4 | Added 17 Given-When-Then acceptance criteria across 4 high-risk flows: pick submission (6 AC), result cascade (4 AC), tiebreaker trigger (3 AC), week status transitions (4 AC). Not a 5 because lower-risk P0s (auth, feed, notifications) don't have formal AC — acceptable for engineering handoff. |
| 7 | Technical Feasibility | 5 | 5 | No change needed |
| 8 | Dependencies & Risks | 3 | 5 | Added 6-row Risks & Mitigations table covering: API free tier change, API downtime, Supabase peak load, browser compatibility, timeline slip, and player adoption. Each has likelihood, impact, and a specific mitigation plan. |
| 9 | Success Metrics | 3 | 4 | Fixed DAU metric to reference V1 behavior (result checking, not live scores). Added onboarding completion metric (≥90% within 2 weeks). Added "email elimination" lagging indicator. Added instrumentation note (Supabase queries, no third-party tool needed). Not a 5 because baselines are still estimated, not measured — acceptable pre-launch. |
| 10 | Engineering Handoff Readiness | 4 | 4 | Contradictions fixed. Commissioner setup flow added. The "new engineer test" passes — but compound requirements and the length of the document (now ~500 lines) mean an engineer would still benefit from a 15-minute kickoff. Holding at 4. |
| | **TOTAL** | **35** | **44** | **+9 points, from C+ to B** |

### Grade: B (38–44 range)

The PRD is now ready for engineering handoff with one focused kickoff meeting. The remaining gaps (compound requirements, AC for lower-risk P0s, estimated baselines) are the kind of things that get resolved naturally in the first sprint — not blockers.

**What would get this to an A (45+):**
- Split compound requirements into atomic bullets (Dimension 4 → 5)
- Add AC for auth, feed, and notification P0s (Dimension 6 → 5)
- Measure actual baselines from the email league before launch (Dimension 9 → 5)

These are diminishing returns for this project — the ROI is higher in starting to build than in further polishing the doc.
