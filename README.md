# Vanguard Raid Planner

Static LOTRO raid scheduler with Raid-Helper link imports, multi-character signups,
per-run availability, class/spec preferences, role assignments, fellowship targeting,
constraint templates, tentative substitutes, Discord exports and session backup.

Live GitHub Pages URL: https://nayberhq.github.io/vanguard-raid-planner/

## Launch locally

No npm installation or build step is required. Use Python 3.7+:

```bash
bash start.sh --host 127.0.0.1 --port 8080
```

Open http://127.0.0.1:8080. Or serve `public/` with a static HTTP/HTTPS server.
Workers require HTTP/HTTPS rather than opening index.html as a local file.
Internet access is needed for Raid-Helper links. Import saved session JSON to
restore your players/settings; raw signup JSON uploads are no longer offered.

## Planning and saving

Import an event link, then select playable specs and class preferences in Roster.
Configure role requirements, overrides, role priorities and additional constraints
in Comp. Generate and adjust sequential or parallel runs in Team. Tentative
players participate normally, with independently checked confirmed substitutes.
Gold borders denote repeated player/class assignments. New plans default to the
Default raid template, one run, and Prioritize gearing.

There are two selection modes:

- **Prioritize gearing:** required comp → player preferences + locks → preferred comp → constraints.
- **Prioritize team quality:** required comp → preferred comp → constraints → player preferences + locks.

Required comp comes first in both. See [SELECTION.md](SELECTION.md) for exact
semantics, recommendation gates and bounded-search limitations, and
[ALGORITHM-AUDIT.md](ALGORITHM-AUDIT.md) for the audit.

Session import/export lives in the Import tab. Automatic browser recovery uses
local storage, not a server database. Moving browsers/hostnames requires exporting
and importing a session. Old mode names migrate on import. Team generation runs
in a cancellable background worker; optional run checks have their own timeout.

## Test and deploy

Requires Node.js for tests, plus Python and Bash for launcher checks:

```bash
node tests/planner.test.cjs
node tests/background.test.cjs
node tests/audit.test.cjs
python3 -m py_compile server.py
bash -n start.sh
```

Pushes to `main` run `.github/workflows/pages.yml`, which validates the planner
and deploys `public/` to GitHub Pages. Pull requests validate without deploying.
See [deploy.md](deploy.md) for Cursor migration and deployment instructions.
All application assets, including class icons, are local; no server state or
ChatGPT/Sites integration is required. Class artwork is credited to LOTRO Wiki.
