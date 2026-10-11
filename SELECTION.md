# Team selection specification

## Eligibility and required composition

Players must be available, have the selected playable class/spec enabled, occupy at most one spot per raid, and never attend overlapping runs. Raid capacity is strict. Fellowships hold at most six players. Changing spec does not unlock a character: repeat identity is player ID plus class.

Required composition comes first in **every mode**. It includes filling selected raids, minimum role staffing, required role assignments, class/spec presence assignments, and required fellowship placement. If no complete composition is found, return the closest eligible schedule and flag missing requirements. A bounded search failure is not proof of infeasibility.

Role assignments and targeting overrides determine coverage and placement. Overrides add no staffing demand and remove no requirements. A player can meet compatible healer/class-presence requirements. Unspecified providers can move freely; no class has a hidden tank/DPS-group placement rule.

## Mode order

The shared `selectionObjective` compares numeric vectors lexicographically. A lower level cannot outweigh a worse higher level.

| Mode | Order |
|---|---|
| Prioritize gearing | Required comp → player preferences + locks → preferred comp → additional constraints |
| Prioritize team quality | Required comp → preferred comp → additional constraints → player preferences + locks |

Within additional constraints, required deficits precede preferred deficits. After these mode levels, all modes consider uncovered players, balanced partial team sizes, duplicate classes, and participation evenness.

Player preferences are class-level stars: prioritized, neutral, or deprioritized. Prioritized selections cost zero; neutral selections cost 1,000 only when the player has other prioritized classes; deprioritized selections cost 2,000. No preferences means zero cost. Neutral selections produce no abnormal-choice note. List order is not a preference.

Repeat cost sums squared prior appearances of each player/class: 0, 1, 4, 9, etc. Both modes combine player preference cost with 100,000 times this repeat metric. Avoiding a repeat therefore outweighs a single missed preference, and subsequent repeats grow increasingly expensive.

Preferred comp includes preferred role staffing, surplus staffing penalties, soft fellowship assignments, and role class/spec priorities. Only the first selected copy of a prioritized class/spec gets its role-priority bonus per raid; additional copies receive ordinary cost and duplicate-class penalties.

Saved `comp` and `unlocked` sessions migrate to `gearing`; saved `perfect` sessions migrate to `quality`. New plans default to gearing. Exported sessions use only these two canonical values. Restored generated plans from the removed locks mode are marked pending regeneration because the preference policy changed.

## Search stages and efficiency

1. A minimum-cost flow builds a seed, strongly favoring minimum roles and reserving future role supply where practical. Its weighted cost is an inexpensive seed heuristic, not the acceptance policy.
2. Local replacements and paired character changes use the shared mode objective, actual fellowship placement and rule validation. Previously selected runs inform schedule-wide constraints and character repeat cost.
3. A global maximum-flow fresh-character seed can redistribute selected player/classes across sequential runs when required comp is unresolved. Its indexed graph connects each character only to that player's available runs. Overlapping schedules use conflict-aware allocation instead.
4. Repeat-allowed seeds are introduced when required comp remains unresolved. Team quality mode can additionally consider repeats to improve preferred comp or additional constraints. Keep the best fully evaluated schedule, not the last attempted seed.
5. Global repair considers replacements and cross-run exchanges, enforces availability/overlap/capacity, and evaluates the same objective. Candidate enumeration is bounded by both time and count, with quotas across runs and a mixed shortlist for seed quality, constraints and fresh characters. Alternative starts can cross temporarily worse layouts, but the retained result must improve the full objective.
6. Final annotation resolves fellowships and validates all rules. Lightweight parallel checks use bounded exchanges with the same objective.

The overall improvement budget is six seconds per normal assignment, with smaller budgets for optional checks. Local improvement is normally limited to 250 ms per team; global repair to 1.5 seconds within the overall budget. These are cooperative bounds: an individual flow or validation already in progress can finish after the deadline. The UI worker has a separate 20-second generation watchdog that keeps previous teams on timeout. Optional work stops three seconds after teams become visible. Cancel terminates the worker, and edits invalidate late worker results.

Fellowship search uses the same ordering of required placement, preferred placement and additional constraints. Its layout tie-break favors DPS concentration and proximity to own-fellowship buffers. It has bounded passes and time, and its cache includes the selected mode. The cooldown shortlist/placement search uses a capacity estimate; final validation uses a greedy rotation simulation over the configured horizon.

## Run recommendations

A candidate schedule must meet **all required comp** before it can be recommended in any mode. In team quality mode it must additionally meet preferred staffing/placement goals and every enabled additional constraint, including soft constraints. Role class/spec stars remain ranking preferences rather than introducing mandatory classes.

Among qualifying schedules, recommendations favor player coverage, then the selected mode's priorities, distinct playable characters and an earlier finish. Candidate count and time are bounded. New runs inherit last-run availability and tentative status. Recommendations use the same repeat policy as generation. Extra/parallel feasibility markers use the same eligibility gate.

If none of the checked configurations qualify, show that result rather than offering an invalid Apply action. It does not mean no possible configuration exists. Manual schedule buttons remain available to try other configurations. Applying a recommendation changes run settings; generation is separate.

## Limits

This is a bounded heuristic, not an exact optimizer. Weighted seeds, candidate pruning, limited alternate starts and cooperative deadlines can miss the global optimum. Future availability supply is estimated rather than solved jointly with every role/constraint. Cooldown simulation is greedy and assumes abilities ready at the start. Its failure does not prove no rotation exists.

Priority adherence means that an accepted evaluated improvement follows the shared ordering; it does not guarantee that the bounded search discovers every possible higher-priority improvement. All unmet configured requirements remain visible even when the selected mode intentionally gives them lower priority.
