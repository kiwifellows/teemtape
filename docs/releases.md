# Releases and changelog

Teemtape keeps a [CHANGELOG.md](../CHANGELOG.md) at the repo root. Entries are
added automatically when a **GitHub release is published** on `main`.

## Automated release + npm publish

Workflow: [`.github/workflows/release.yml`](../.github/workflows/release.yml)

**Trigger:** manual — run it from the **Actions → Release → Run workflow** menu.

**Inputs:**

- `release_type`: `patch` (default), `minor`, or `major` — the semver bump applied
  to the current version.
- `version`: an explicit version such as `1.2.3` that overrides `release_type`.
- `dry_run`: preview the bump and run `npm publish --dry-run` without pushing,
  tagging, or publishing.

**What it does:**

1. Computes the next version. The current version is the highest of the latest
   `v*` git tag and every `package.json` version in the workspace.
2. Writes that version to **all** `package.json` files (root, `apps/web`,
   `packages/*`, `workers/*`) and rewrites internal `@teemtape/*` dependency
   ranges to `^<version>` via [`scripts/version.mjs`](../scripts/version.mjs), then
   refreshes `package-lock.json`.
3. Builds and tests the publishable packages (`@teemtape/api-client`,
   `@teemtape/cli`).
4. Commits the bump to `main`, creates an annotated tag `v<version>`, and pushes.
5. Publishes `@teemtape/api-client` and `@teemtape/cli` to npm (with provenance).
   `packages/mock-server` is intentionally **not** published. The publish step is
   idempotent — it skips a package if that exact version already exists on npm.
6. Creates the GitHub release with auto-generated notes.

### Requirements

- **`NPM_PACKAGE_TOKEN`** secret — an npm automation token with publish access to
  the `@teemtape` scope. Used as `NODE_AUTH_TOKEN` when publishing.
- **`contents: write`** + **`id-token: write`** permissions (already configured) so
  the workflow can push to `main` and attach npm provenance.
- Optional **`RELEASE_TOKEN`** secret (a PAT with `repo` scope). When set, the
  GitHub release is created with it so the `release: published` event can trigger
  the changelog workflow below. Without it the release is still created using the
  default token, but releases created by the default `GITHUB_TOKEN` do **not**
  re-trigger other `release`-event workflows (a GitHub safeguard against loops).
- If `main` is branch-protected, allow **github-actions[bot]** (or the
  `RELEASE_TOKEN` identity) to bypass so the version-bump push succeeds.

### Manual version helper

[`scripts/version.mjs`](../scripts/version.mjs) can be run locally:

```bash
node scripts/version.mjs current          # print the current version
node scripts/version.mjs next minor       # print the next version for a bump type
node scripts/version.mjs set 1.2.3        # write 1.2.3 across all package.json files
```

## Changelog setup (PR-based, on release)

Workflow: [`.github/workflows/changelog.yml`](../.github/workflows/changelog.yml)

**Trigger:** `release: published`, only when `target_commitish` is `main`.

**What it does:**

1. Finds the previous git tag (if any).
2. Lists merged PRs into `main` since that tag (via `gh pr list`).
3. Prepends a Keep a Changelog-style section to `CHANGELOG.md`.
4. Commits and pushes the update back to `main`.
5. If the release has no body, fills the GitHub release notes with the same entry.

**How to cut a release:**

1. Merge work to `main`.
2. Create a tag (e.g. `v0.1.0`) and publish a GitHub release from `main`.
3. The workflow runs and updates `CHANGELOG.md`.

```bash
git checkout main && git pull
git tag v0.1.0
git push origin v0.1.0
# Then publish the release in GitHub UI (or: gh release create v0.1.0 --generate-notes)
```

### Requirements

- **`contents: write`** on the workflow (already configured) so it can push to `main`.
- If `main` is branch-protected, allow **github-actions[bot]** to bypass or use a
  PAT with bypass permissions; otherwise the push step will fail.
- PR titles become changelog bullets — write clear merge/PR titles.

---

## Alternative approaches

### Option A — Release Please (release PR before tagging)

[release-please](https://github.com/googleapis/release-please) opens a standing
**Release PR** on `main` that bumps versions and updates `CHANGELOG.md` from
**conventional commits** (`feat:`, `fix:`, etc.). Merging that PR creates the
tag and GitHub release.

| Pros | Cons |
| --- | --- |
| Changelog is reviewed *before* the release ships | Requires conventional commit messages |
| Version bumps are automated | More moving parts (manifest, config) |
| Great for npm monorepos | |

Best when you want semver + reviewed changelog in one PR.

### Option B — git-cliff (commit/tag based, on release)

[git-cliff](https://git-cliff.org/) generates changelog sections from git
history (commits, merge commits, conventional prefixes) when a tag is pushed or
a release is published.

| Pros | Cons |
| --- | --- |
| Fast, single binary, very configurable | Quality depends on commit message discipline |
| Works offline from git history | Merge/squash strategy affects output |
| Can replace or complement PR listing | |

Best when you standardize on conventional commits and squash-merge PR titles.

### Option C — semantic-release (fully automatic)

[semantic-release](https://github.com/semantic-release/semantic-release) analyzes
every push to `main`, decides the next semver version, updates changelog, publishes
to npm, and creates a GitHub release — no manual tagging.

| Pros | Cons |
| --- | --- |
| Fully hands-off after setup | Opinionated; every merge to `main` may release |
| npm publish integrated | Heavy for early-stage / non-published packages |
| | Requires strict conventional commits |

Best for mature libraries with continuous delivery to npm.

### Option D — Manual release notes only

Skip `CHANGELOG.md` automation; use GitHub’s **Generate release notes** button
(or `gh release create --generate-notes`) when publishing. No bot commits to `main`.

| Pros | Cons |
| --- | --- |
| Zero maintenance | No single in-repo changelog file |
| No branch-protection bypass needed | Harder to read history offline |

Best for small teams that rarely release.

---

## Recommendation for teemtape

Use the **automated release workflow** (top of this doc) to bump versions, tag,
publish `@teemtape/cli` + `@teemtape/api-client` to npm, and cut the GitHub
release in one step. The **PR-based changelog workflow** then keeps
`CHANGELOG.md` up to date from merged PR titles — no conventional commits
required.

If you later want a reviewed changelog/version bump *before* tagging, consider
**release-please** (Option A) or **git-cliff** (Option B) with squash-merge +
conventional PR titles.
