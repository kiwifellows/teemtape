# Releases and changelog

Teemtape ships releases through a **two-phase, PR-based flow** so that `main`
can stay a protected, pull-request-only branch. No bot ever pushes a commit
directly to `main`.

## Why two phases?

GitHub branch protection rules (and rulesets) apply to **branches**
(`refs/heads/*`) — they're what produce the `GH013: ... Changes must be made
through a pull request` error when a workflow tries to `git push origin main`.

They do **not** apply to **tags** (`refs/tags/*`) or to GitHub Releases. So the
release is split:

1. **Prepare** — bump the version and update `CHANGELOG.md` on a branch, then
   open a pull request. The version bump lands on `main` only by merging that PR
   (protection satisfied).
2. **Tag & release** — once the PR is merged, tag the merge commit, cut the
   downloadable GitHub release, and publish to npm. Tagging is allowed even with
   `main` locked down.

```
Actions ▸ Prepare release ──▶ opens "chore(release): vX.Y.Z" PR
                                      │  (review version bump + CHANGELOG)
                                      ▼
                                merge PR to main
                                      │
                                      ▼
       tag-release.yml ──▶ tag vX.Y.Z ─▶ GitHub release ─▶ npm publish
```

## Phase 1 — Prepare release (manual)

Workflow: [`.github/workflows/release.yml`](../.github/workflows/release.yml)

**Trigger:** manual — **Actions → Prepare release → Run workflow**.

**Inputs:**

- `release_type`: `patch` (default), `minor`, or `major` — the semver bump
  applied to the current version.
- `version`: an explicit version such as `1.2.3` that overrides `release_type`.
- `dry_run`: bump, build, and run `npm publish --dry-run` without opening a PR.

**What it does:**

1. Computes the next version. The current version is the highest of the latest
   `v*` git tag and every `package.json` version in the workspace.
2. Writes that version to **all** `package.json` files (root, `apps/web`,
   `packages/*`, `workers/*`) and rewrites internal `@teemtape/*` dependency
   ranges to `^<version>` via [`scripts/version.mjs`](../scripts/version.mjs),
   then refreshes `package-lock.json`.
3. Builds and tests the publishable packages (`@teemtape/api-client`,
   `@teemtape/cli`).
4. Generates a Keep a Changelog-style entry from PRs merged into `main` since the
   previous tag and prepends it to `CHANGELOG.md`.
5. Commits everything to a `release/v<version>` branch and opens (or updates) a
   `chore(release): v<version>` pull request against `main`.

Review the PR — the version bump and the `CHANGELOG.md` diff are right there —
then merge it to ship.

## Phase 2 — Tag and release (on merge)

Workflow: [`.github/workflows/tag-release.yml`](../.github/workflows/tag-release.yml)

**Trigger:** `push` to `main` that changes `packages/cli/package.json` (i.e. the
release PR merging). The job is keyed off the `@teemtape/cli` version: if there
is no `v<version>` tag yet it cuts the release; otherwise it's a no-op, so
ordinary merges don't trigger a release.

**What it does:**

1. Detects the new version from `packages/cli/package.json`.
2. Builds and tests the publishable packages.
3. Creates the annotated tag `v<version>` and pushes it (tags bypass branch
   protection).
4. Cuts the GitHub release for `v<version>` — downloadable source archives are
   attached automatically by GitHub. Release notes come from the matching
   `CHANGELOG.md` section, falling back to GitHub's auto-generated notes.
5. Publishes `@teemtape/api-client` and `@teemtape/cli` to npm (with provenance).
   `packages/mock-server` and `workers/*` are intentionally **not** published.
   The publish step is idempotent — it skips a package if that exact version is
   already on npm, so the workflow is safe to re-run.

### Human approval gates

The flow is built so nothing ships without a human in the loop, and you can layer
two independent approval gates:

1. **Release PR review (Phase 1 → Phase 2).** Nothing is tagged, released, or
   published until someone **merges** the `chore(release): v<version>` PR — the
   merge *is* the approval. To require an explicit reviewer (not just a merge
   click), add to the `main` ruleset: **Require a pull request before merging →
   Require approvals**.
2. **Pre-publish approval (Environments).** `tag-release.yml` runs in the
   `release` environment. Configure it under **Settings → Environments → release
   → Required reviewers** and the tag/release/npm-publish job will **pause after
   merge and wait for an approver** to click **Approve** in the Actions run. With
   no reviewers configured the environment is inert and the job runs straight
   through.

Use gate 1 alone for a lightweight "review the PR, merge to ship" flow, or add
gate 2 when you want a second explicit sign-off right before publishing.

### Requirements

- **`NPM_PACKAGE_TOKEN`** secret — an npm automation token with publish access to
  the `@teemtape` scope. Used as `NODE_AUTH_TOKEN` when publishing.
- **`contents: write`** + **`id-token: write`** permissions (already configured)
  so `tag-release.yml` can push the tag, create the release, and attach npm
  provenance.
- For Phase 1 to open the PR with the built-in `GITHUB_TOKEN`, enable
  **Settings → Actions → General → Allow GitHub Actions to create and approve
  pull requests**. Alternatively set a **`RELEASE_TOKEN`** secret (a PAT / fine-
  grained token with `contents` + `pull-requests` write); both workflows prefer
  it when present, and using it lets the `release: published` event trigger any
  downstream release-event workflows (the default `GITHUB_TOKEN` does not, as a
  GitHub safeguard against loops).
- **`main` stays protected.** Because the version bump arrives via a PR and only
  the tag/release/publish happen automatically, no branch-protection bypass is
  needed. (If you also enable **tag protection / rulesets** for `v*`, allow
  `github-actions[bot]` — or the `RELEASE_TOKEN` identity — to create those
  tags.)

### Manual version helper

[`scripts/version.mjs`](../scripts/version.mjs) can be run locally:

```bash
node scripts/version.mjs current          # print the current version
node scripts/version.mjs next minor       # print the next version for a bump type
node scripts/version.mjs set 1.2.3        # write 1.2.3 across all package.json files
```

### Cutting a release entirely by hand

If you ever need to bypass the workflows, the same protected-branch-friendly
shape works locally: open a version-bump PR, merge it, then tag and release.

```bash
# After the version-bump PR is merged to main:
git checkout main && git pull
git tag -a v0.1.1 -m "Release 0.1.1"
git push origin v0.1.1                       # allowed: tags aren't branch-protected
gh release create v0.1.1 --target main --generate-notes
```

---

## Alternative approaches

### Option A — Release Please (release PR before tagging)

[release-please](https://github.com/googleapis/release-please) opens a standing
**Release PR** on `main` that bumps versions and updates `CHANGELOG.md` from
**conventional commits** (`feat:`, `fix:`, etc.). Merging that PR creates the
tag and GitHub release. This is essentially a packaged version of the two-phase
flow above.

| Pros | Cons |
| --- | --- |
| Changelog is reviewed *before* the release ships | Requires conventional commit messages |
| Version bumps are automated | More moving parts (manifest, config) |
| Great for npm monorepos | |

### Option B — git-cliff (commit/tag based, on release)

[git-cliff](https://git-cliff.org/) generates changelog sections from git
history when a tag is pushed or a release is published.

| Pros | Cons |
| --- | --- |
| Fast, single binary, very configurable | Quality depends on commit message discipline |
| Works offline from git history | Merge/squash strategy affects output |

### Option C — semantic-release (fully automatic)

[semantic-release](https://github.com/semantic-release/semantic-release) analyzes
every push to `main`, decides the next semver version, updates the changelog,
publishes to npm, and creates a GitHub release — no manual tagging.

| Pros | Cons |
| --- | --- |
| Fully hands-off after setup | Opinionated; every merge to `main` may release |
| npm publish integrated | Heavy for early-stage / non-published packages |
| | Requires strict conventional commits |

### Option D — Manual release notes only

Skip `CHANGELOG.md` automation; use GitHub's **Generate release notes** button
(or `gh release create --generate-notes`) when publishing.

| Pros | Cons |
| --- | --- |
| Zero maintenance | No single in-repo changelog file |
| No bot commits at all | Harder to read history offline |

---

## Recommendation for teemtape

Use the built-in **two-phase flow**: run **Prepare release** to open the release
PR, review the version bump and `CHANGELOG.md` entry, then merge to
automatically tag, publish the downloadable GitHub release, and push the npm
packages — all while keeping `main` protected.
