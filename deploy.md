# Cursor migration and GitHub Pages deployment

## Task for Cursor

Apply this migration to the existing `nayberhq/vanguard-raid-planner` repository,
preserve unrelated repository changes and the included commit history, run the
checks below, and redeploy the GitHub Pages site using its existing workflow.
Do not introduce a build system, backend, server persistence, or ChatGPT hosting.
Do not force-push or replace the repository's Git history.

The package contains:

- `source/`: complete tracked source snapshot at the packaged Git tip.
- `history/planner.bundle`: Git history, including all 17 new commits since the last fetched public baseline.
- `history/commits.md`: actual commit subjects, bodies and file changes for that range.
- `patches/series/`: one mailbox patch per commit, in chronological order.
- `patches/base-to-current.patch`: combined changes since the baseline.
- `migration.json`: exact base/tip hashes and changed paths.
- `SHA256SUMS`: checksums of package contents.

Use one integration method, not all three. The Git bundle merge is preferred.
The patch and snapshot routes are alternatives if history integration is blocked.
Read `SELECTION.md` and `ALGORITHM-AUDIT.md` from the snapshot before resolving
planner conflicts. Intermediate commits implement superseded behavior; preserve
the final two-mode behavior rather than reintroducing those intermediate states.

## 1. Inspect the repository

Extract this package outside the Git repository. Open the existing repository in
Cursor and read its applicable AGENTS.md instructions. Check its current status,
remotes, default branch, and Pages configuration. Do not overwrite uncommitted
work. If necessary, use a separate clean worktree for this migration.

```bash
git status --short
git remote -v
git fetch origin
```

The recorded baseline is `6b06397b0a7c1364a1718d8a3745c6b70fffa1b5`.
It is the last fetched public source used here, not a claim that today's remote
still matches it. Preserve newer remote changes. `migration.json` records the
exact packaged tip; verify it when fetching the bundle.

## 2. Integrate with history preserved

Set `MIGRATION_DIR` to the absolute path of the extracted package directory.
Run these commands from the repository; use a distinct branch name if it exists.

```bash
MIGRATION_DIR=/absolute/path/to/vanguard-cursor-migration-2026-10-11
git bundle verify "$MIGRATION_DIR/history/planner.bundle"
git fetch "$MIGRATION_DIR/history/planner.bundle" HEAD:refs/remotes/cursor-migration/latest
git rev-parse cursor-migration/latest
git switch -c cursor/planner-2026-10-11 origin/main
git merge --no-commit --no-ff cursor-migration/latest
```

If the merge is already up to date, do not create a redundant commit. Otherwise,
resolve conflicts deliberately, preserving unrelated changes while applying the
packaged planner behavior. Stage resolved paths, inspect `git diff --cached`, and
complete the merge commit after checks pass. The merged ancestry preserves the
actual chat-work commit history. Do not apply mailbox patches after this merge.

For a clean worktree instead of switching the current checkout:

```bash
git worktree add -b cursor/planner-2026-10-11 ../vanguard-planner-migration origin/main
cd ../vanguard-planner-migration
```

Then fetch and merge the bundle as above, skipping `git switch -c`.

### Alternative: mailbox patches

On a clean migration branch, only if the commits have not already been applied:

```bash
git am --3way "$MIGRATION_DIR"/patches/series/*.patch
```

For a conflict, resolve and stage it, then `git am --continue`; use `git am
--abort` to abandon that attempt. If earlier migration commits are already
present, use the bundle merge or select only missing commits after inspecting
history. Do not blindly reapply the full series.

### Alternative: source snapshot

Compare `source/` and `migration.json` against the checkout. Copy or merge the
listed changed files only, preserving newer unrelated work. Do not copy Git
metadata or erase files not listed in the manifest. This route creates one new
integration commit rather than importing historical commit objects; retain the
history report with the handoff if history cannot be imported.

## 3. Validate

No dependency installation or build command is needed. From the repository root:

```bash
node tests/planner.test.cjs
node tests/background.test.cjs
node tests/audit.test.cjs
python3 -m py_compile server.py
bash -n start.sh
git diff --check
```

Run `node --check` on the changed JavaScript files. The existing Pages workflow
performs syntax/icon/file checks plus all three test suites. It now includes the
new audit suite; retain this workflow addition when resolving conflicts.

Preview with `bash start.sh --host 127.0.0.1 --port 8080`. Verify:

1. Exactly two modes: Prioritize gearing and Prioritize team quality.
2. Gearing: required comp → preferences/locks → preferred comp → constraints.
3. Team quality: required comp → preferred comp → constraints → preferences/locks.
4. All recommendations meet required comp; Team quality recommendations also
   meet preferred staffing/placement and all enabled constraints.
5. Saved Comp/Locks sessions migrate to Gearing; Perfect migrates to Team quality.
6. Tentatives appear normally with substitute icons; repeated character icons
   have gold borders; neutral class selections have no abnormal-choice note.
7. Cancel and time limits preserve teams; roster edits cannot be overwritten by
   late worker results; JSON session export/import and browser recovery work.

Complete the merge commit, for example:

```bash
git commit -m "Integrate audited planner with gearing and team quality modes"
```

## 4. Push and redeploy

Use the repository's normal branch protections. If a pull request is required,
push the migration branch, open a PR against `main`, wait for CI, and merge using
an option that preserves commits (not squash). If direct main updates are
permitted and deployment is authorized, fetch again, incorporate any new
`origin/main` changes into the migration branch, rerun checks if necessary, then
fast-forward a clean local `main` to the migration branch and push normally.
Never force-push. Do not disable protections to deploy.

```bash
git push -u origin cursor/planner-2026-10-11
```

After the reviewed integration reaches `main`, the existing **CI and GitHub
Pages** workflow deploys `public/`. Confirm the workflow's deployment job succeeds
and check https://nayberhq.github.io/vanguard-raid-planner/ . GitHub repository
Settings → Pages should use **GitHub Actions** as its source. If no new push is
needed, run the existing workflow_dispatch on `main` after confirming the source
is already integrated.

The deployment artifact is `public/`, not the repository root or the migration
package. Keep all scripts beside index.html, including planner-worker.js,
session-recovery.js and builtin-templates.js, plus `public/icons/`. Relative script
and asset paths support the existing GitHub Pages project URL.

Report the integration commit, test results, deployment workflow URL and live
URL. The private ChatGPT preview is separate; this package requires no credentials
or configuration for it. For rollback, revert the integration merge (with the
correct mainline parent) or integration commit and let the normal workflow redeploy.
