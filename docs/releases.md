# Releases and changelog

Teemtape keeps a [CHANGELOG.md](../CHANGELOG.md) at the repo root. Entries are
added automatically when a **GitHub release is published** on `main`.

## Current setup (PR-based, on release)

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

**Stick with the current PR-based workflow** while the project is early and commit
messages are mixed. It matches “update on release from merged PRs” without forcing
conventional commits.

When you start versioning packages for npm (`@teemtape/cli`, etc.) and want semver
automation, consider **release-please** (Option A) or **git-cliff** (Option B)
with squash-merge + conventional PR titles.
