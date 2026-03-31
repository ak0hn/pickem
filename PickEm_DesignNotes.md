# PickEm — Design Notes

> Parked design ideas to revisit. These are functional improvements, not bugs.
> Added during build sessions as they come up.

---

## Feed / Announcements

- **Week open post title format:** Default placeholder for the commissioner's opening message should be titled `Week <WeekNumber> is now LIVE!` followed by a separator and then the post body. Currently the placeholder is generic. The post that goes to the feed when commish publishes the slate should lead with this header format so players know immediately what week it is.

---

## Tiebreaker Flow

- **Player pill tooltip — picks preview:** Anywhere the commissioner sees a player displayed in a pill/chip (tiebreaker-eligible, winner, perfect scorer, etc.), tapping or hovering that chip should show a popover with their full picks for that week — showing each matchup and which side they picked, with a W/L/P indicator. Applies to: tiebreaker-eligible chips in all sub-phases, winner chips in `results_posted` and tiebreaker sub-phase 4, perfect scorer chips in `sunday_complete`. This gives the commish full context without navigating away to the player detail page.

- **Post-lines-fetch eligible players:** Once MNF lines are fetched, the eligible players list should stay visible in the same location and style as before the fetch (same chip UI, same hover behavior). Currently this may shift or disappear.

- **MNF matchup priority in tileview:** Once lines are fetched, the MNF game should be visually prioritized (shown first / highlighted) within the same tile as the rest of the week's slate — not broken out into a separate tile. We're still in the same week; the tiebreaker is part of it.

- **Single tiebreaker post box:** There should be one post text box for the tiebreaker, not two distinct ones. Currently the flow may show separate boxes for "launch tiebreaker" and "post results." Consolidate.

---

## Scoring / Results

- **Auto-score via background cron:** Currently, fetching scores (regular games + MNF tiebreaker) requires the commissioner to manually tap a button. Before go-live, replace this with a scheduled job that polls the Odds API every ~15 min during game windows (Sunday afternoon, Sunday night, Monday night). On completion: fetch final scores, score all picks, advance week status, and surface results to players automatically — no commissioner action required. Needs idempotency (safe to run repeatedly), error handling, and a game-window schedule to avoid burning API quota on off-days.

---
