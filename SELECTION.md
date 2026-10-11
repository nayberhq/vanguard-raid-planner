# How team selection works

## Inputs and eligibility

Each selected class/spec supplies its native role. Role priorities rank only class/specs eligible for that role; they do not change roles, add staffing requirements, or exclude a spec. Event-specific signup choices, selected specs and run availability determine the candidate choices. Each player can occupy only one spot in a team and cannot attend overlapping runs. Team and fellowship capacity are strict.

Role assignments describe required/preferred coverage and placement. Their derived role counts are an initial staffing guide, not a replacement for detailed validation. Class/spec overrides change provider reach; they add no staffing demand and remove no requirement. A presence requirement can share a role slot with the same player.

## Search stages

The planner first searches with repeated player/class assignments excluded. Confirmed and tentative signups participate in the same normal selection pool. Confirmed substitute suggestions are checked independently for tentative assignments. Only unresolved required deficits or empty spots open a repeat-allowed fallback. Each stage retains the best fully evaluated result; failing a bounded fresh search is not proof of infeasibility.

1. Initial allocation proceeds through runs. A minimum-cost flow selects player/class/spec choices and fills role slots, strongly favoring minimums, then preferred staffing. Future role supply influences preferred staffing to reduce early overconsumption.
2. Local team improvement evaluates single replacements and a bounded shortlist of paired character changes. Scores include roles, constraints, class variety, repeats and preferences.
3. Parallel balancing exchanges members and selected alts between simultaneous groups.
4. Schedule-wide repair considers replacements and exchanges across runs, checks eligibility/conflicts, and uses final fellowship and rule evaluation. Its objective compares these levels in order: summed required deficits (including empty spots and role shortages), escalating repeated-character penalty, uncovered player count, composition/preferences, then squared participation counts for evenness. Tentative status carries no selection penalty. Later levels cannot compensate for a worse earlier level.
5. Alternate starts allow a temporarily worse layout and repair it, but retain it only if its final objective improves. Enumeration, shortlist sizes and pass counts are bounded.
6. Final annotation resolves fellowships, evaluates constraints and marks each team valid/incomplete. Recommended extra/parallel runs use lighter allocation; their feasibility is checked, but their search does not receive the full schedule repair pass until scheduled.

## Current soft weights

These are internal costs, not hard bans. Initial/local stages and parallel balancing use weighted sums; the final schedule repair separates required deficits and repeated characters before coverage and softer goals.

| Item | Cost |
|---|---:|
| Ordinary required role shortage | 10,000,000 per missing role; squared in parallel balancing |
| Required detailed rule deficit | 100,000,000 times deficit in local/fellowship search |
| Above preferred role staffing | 250,000 times squared excess |
| Same player's same-class repeats | 100,000 × prior appearances of that player/class; final repeat objective sums the squared prior counts (0, 1, 4, 9…) |
| Earlier appearances | 50,000 each in initial/local selection |
| Duplicate classes | 30,000 times squared duplicates beyond the first |
| Missing preferred role slots | 6,000 each; squared in parallel balancing |
| Preferred detailed constraints | 4,000 times deficit |
| Nonpreferred player class | 1,000 each |
| Role priority tier | First selected copy 0; additional or unselected copies 100 |
| Signup choice order | No preference cost; deterministic ties only |

A player's class preference has greater individual weight than the maximum role-tier difference, but aggregate weighted preferences can trade off across an entire team. There is no strict separate player-preference tier in the final objective.

## Fellowship placement and constraint evaluation

Fellowships hold at most six players. Their search considers member exchanges, detailed role coverage/placement and per-fellowship constraints. Its soft layout cost favors DPS concentration and proximity to buffers that affect their own fellowship. Unspecified sources may move freely; raid-wide effects do not impose a hidden tank-group placement rule. Same/any/raid reach and overrides determine whether a provider can satisfy a target group.

Heal contribution rules combine eligible providers according to the configured addition, multiplication, highest-only and stacking-group settings. Cooldowns use a fast capacity estimate during candidate selection, then a greedy time simulation in final validation. A failed greedy rotation is not proof that no valid rotation exists.

Required composition rules are validated goals, not filters that suppress all output. When constraints conflict or resources are insufficient, the planner returns the closest solution it found and flags the unmet rules. The search is heuristic and cannot guarantee a global optimum.

Roster class preferences are binary: starred classes are first choice, unstarred classes second choice. Signup/spec list order has no score weight. Multiple classes may share first choice; all playable specs of that class share its preference.

## Recommended run configurations

After generating the current schedule, a bounded background check compares sequential and parallel templates. It prioritizes required deficits, player coverage, avoiding repeats, distinct player/class assignments, then an earlier finish. The card reports the best configuration checked, not a globally optimal guarantee. Applying it updates runs and copies last-run availability for new runs; generation is a separate action.
