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
confirmed substitutes. Gold borders mark repeated player/class assignments.

Two selection modes (required composition is first in both):

- **Prioritize gearing:** required comp → player preferences + locks →
  preferred comp → constraints.
- **Prioritize team quality:** required comp → preferred comp → constraints →
  player preferences + locks.

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
python3 -m py_compile server.py
bash -n start.sh
```

Pushes to `main` run `.github/workflows/pages.yml`, which validates the
planner and deploys `public/` to GitHub Pages. Pull requests validate without
deploying. Manual redeploy: Actions → **CI and GitHub Pages** →
Run workflow on `main`.

All app assets (including class icons) are local. No server state or external
hosting integration is required. Class artwork is credited to LOTRO Wiki.
