# Algorithm audit — 2026-10-11

## Specification reviewed

Required comp is first in all modes. Comp mode then considers preferences/locks, preferred comp, constraints. Locks mode considers locks, preferences, preferred comp, constraints. Perfect mode considers preferred comp, constraints, preferences/locks. Run recommendations require minimum comp; perfect mode additionally requires preferred staffing/placement and enabled constraints. Neutral player choices should not receive abnormal-choice notes.

## Findings and fixes

| Finding | Resolution |
|---|---|
| Locks-first accepted missing minimum roles instead of repeating a required character | Required comp is the first objective in every mode; all modes can open required repeat fallback |
| Local, parallel and final searches disagreed about priority order | Shared lexicographic objective for evaluated improvements; legacy weighted local/parallel constraint scorers removed |
| Perfect mode placed constraints ahead of preferred comp | Corrected in shared objective and UI description |
| Recommendation scoring used mode-dependent positional indices | Named metrics and shared policy; explicit eligibility gate |
| Invalid recommendation could still be applied | No qualifying configuration message; Apply guard |
| Extra/parallel checks used a different feasibility standard and repeat policy | Shared recommendation gate and fresh/repeat allocation policy |
| Candidate creation happened outside repair deadline | Deadline checks inside enumeration, smaller caps and per-run quotas |
| Later runs and required providers could disappear behind seed-cost pruning | Per-run quotas and mixed constraint/fresh/seed shortlists |
| Expensive redundant weighted parallel search preceded global repair | Replaced with bounded shared-policy checks; normal generation uses one global repair stage |
| Global fresh graph repeatedly scanned unrelated players | Per-player available-run index |
| Fellowship cache could reuse layouts from another mode | Mode added to cache key; lexicographic fellowship placement objective |
| Late optional results could overwrite roster edits | Edits terminate active planning and invalidate its job ID |
| Initial generation lacked an independent timeout | 20-second worker watchdog; previous teams kept on timeout |
| Tentative flags were not remapped with changed run slots | Remapped alongside availability and inherited for added slots |
| Neutral choices were described as abnormal alternate choices | Removed those notes; explicit depriorities, locks and shortages remain |

## Validation

- Existing planner regression suite: role/spec mapping, 24-player fellowships, overrides, templates, JSON round trips, priorities, tentative backups, partial splits, fresh-character flow, cross-run repair and session recovery.
- Worker/controller suite: actual worker execution, cancellation, stale-result protection, optional watchdog and initial-generation watchdog.
- New audit suite: every pair of mode priority levels, required repeat fallback in all modes, perfect staffing precedence, strict recommendation gates, neutral notes, expired repair deadline, tentative remapping, and exhaustive optimum comparison on a small availability-sensitive fixture.
- Syntax checks and Git whitespace checks.

## Uploaded five-run session replay

On the same local runtime, the prior locks mode took about 9.5 seconds, filled 60 spots without repeats, but had 4 units of missing required comp. The audited locks mode took about 6 seconds and filled all 60 spots with zero required-comp deficit. It used six repeated assignments across six players; heal-cut deficits remained because constraints follow locks and preferred comp in this mode.

Comp and perfect modes also completed the replay in approximately six seconds with zero required-comp deficit. Perfect mode improved preferred-comp cost, with more repeats. Timings and exact layouts can vary because search budgets are based on wall time.

The earlier separate integer-program diagnostic showed this uploaded session can satisfy role minima and heal cut with two repeated assignments. The website still does not guarantee that optimum. This audit fixes policy inconsistencies and bounds expensive stages; it does not claim to have replaced heuristic search with an exact solver.

## Remaining limitations

Weighted seed flow and cheap candidate pruning can miss useful layouts. Cooperative deadlines allow a single in-progress validation to overrun. Fellowship search and cooldown rotations remain heuristic. Recommendation results are the best checked configurations, not a proof of the largest feasible schedule. See SELECTION.md for the implemented contract.
