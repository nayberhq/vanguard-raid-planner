# Vanguard Raid Planner

Static LOTRO raid scheduler with Raid-Helper link imports, multi-character
signups, per-run availability, class/spec preferences, role assignments,
fellowship targeting, constraint templates, tentative substitutes, Discord
exports and session backup.

Live site: https://nayberhq.github.io/vanguard-raid-planner/

## Launch locally

No npm install or build step. Python 3.7+:

```bash
bash start.sh --host 127.0.0.1 --port 8080
```

Open http://127.0.0.1:8080, or serve `public/` with any static HTTP/HTTPS
server. Workers need HTTP/HTTPS (not a `file://` open of `index.html`).
Raid-Helper imports need internet access. Restore players and settings from a
saved session JSON; raw signup JSON upload is no longer offered.

## Planning and saving

1. Import an event link.
2. In Roster, enable playable specs and set class preferences.
3. In Comp, configure role requirements, overrides, role priorities and
   additional constraints.
4. In Team, generate and adjust sequential or parallel runs.

New plans start from the Default raid template, one run, and Prioritize
gearing. Tentative players participate normally, with independently checked
confirmed substitutes. Silver borders mark soft-locked characters.

## Global allocation policy

Primary replaces the former Kin marker. Older sessions migrate `kinsman` to
`primary`; imports and browser recovery preserve the marker.

All runs are allocated together. The global policy is:

1. Hard requirements and individual eligibility.
2. Primary players' first assignments, then other players' first assignments.
3. Fewest locked assignment instances, then repeat severity and experience.
4. Primary additional unlocked assignments before other additional assignments.
5. Preferred staffing, role priority, soft constraints and finishing preferences.

A Primary player may receive a fourth unlocked assignment before another player
receives a second. First-run coverage still precedes extras. The finishing
preference retains legacy `gearing` / `quality` session values: Player preferences
puts class preferences ahead of experience balance; Team balance reverses those
fine objectives. Neither changes hard validity, coverage, lock or Primary policy.

`public/allocation.js` contains shared eligibility queries with exclusion reasons,
role matching bounds, global constraint search and multi-assignment neighbourhood
repair. The old allocator provides a quick starting candidate. Global allocation
uses its own policy and validates before accepting completed drafts; fellowship
placement and configured constraint checks participate in candidate evaluation.
Tentative alternatives use the eligibility engine as well.

Search runs under deadlines and node budgets. Valid means the configured checks
pass, not that global optimality was proven. Partial results are explicitly marked
when no valid candidate was found. Fellowship and cooldown checks retain their
bounded existing evaluators; a failure does not prove no valid layout exists.

Session import/export is on the Import tab. Browser recovery uses local
storage only; move hosts by exporting and importing a session. Old mode names
migrate on import. Team generation runs in a cancellable background worker;
optional run checks have their own timeout.

## Test and deploy

Node.js for tests; Python and Bash for launcher checks:

```bash
node tests/planner.test.cjs
node tests/background.test.cjs
node tests/audit.test.cjs
node tests/allocation.test.cjs
python3 -m py_compile server.py
bash -n start.sh
```

Pushes to `main` run `.github/workflows/pages.yml`, which validates the
planner and deploys `public/` to GitHub Pages. Pull requests validate without
deploying. Manual redeploy: Actions → **CI and GitHub Pages** →
Run workflow on `main`.

All app assets (including class icons) are local. No server state or external
hosting integration is required. Class artwork is credited to LOTRO Wiki.

## Grima signup links

Grima opens `#grima=<base64url(zlib(UTF-8 JSON))>` snapshots directly in the
roster. The Import tab also accepts these URLs and can create a compressed link
from the current plan. Imports validate before changing the plan, preserve the
previous plan under **Restore plan before Grima import**, and clear the snapshot
from the address bar. Links contain signup data; they are snapshots, not live sync.
Tokens are limited to 20,000 characters and decompressed JSON to 2 MB. Grima uses
a smaller Discord message limit and attaches Session JSON for oversized rosters.
Event identity and fellowship groups survive session export; **Return plan to
Grima** provides a compressed paste code after team generation.

### Compact signup links (GS1)

Fresh Grima exports use a versioned binary payload, compressed with zlib and
encoded as base64url in `#grima=`. IDs use unsigned 64-bit little-endian bytes;
UTF-8 strings have unsigned LEB128 byte lengths. The payload is `GS1`, event ID,
raid size (LEB128), duration in seconds (LEB128), title, player count (LEB128),
then each player's ID, clean name, class/spec mask (LEB128), and a priority byte
(0 or 1). Bit positions are frozen in SIGNUP_CHOICES / grimaSignupChoices; changes
require a new protocol version. Roles and fresh-session defaults are reconstructed.
Names never include custom Discord emoji; network kin markers become priority.

The decoder retains support for older compressed JSON URLs. Saved plans with
custom settings continue using full JSON; compact encoding is only for fresh
signups. Tests exercise 200 signups with every supported class/spec. Random
12-character names produced 5,488-character links; 32-character names produced
9,707 characters. Browser decoder limit: 20,000 token characters, 2 MB inflated.
Discord links retain their smaller transport limits; oversized rosters receive
Session JSON plus planner-link.txt containing the complete URL when it fits.
