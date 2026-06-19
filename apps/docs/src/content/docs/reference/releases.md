---
title: Releases
description: How teemtape ships releases — a two-phase, PR-based flow that keeps main protected, plus the manual version helper.
---

teemtape ships releases through a **two-phase, PR-based flow** so that `main` can
stay a protected, pull-request-only branch. No bot ever pushes a commit directly
to `main`.

## Why two phases?

Branch protection applies to **branches** (`refs/heads/*`) but **not** to **tags**
(`refs/tags/*`) or GitHub Releases. So the release is split:

1. **Prepare** — bump the version and update `CHANGELOG.md` on a branch, then open
   a pull request. The version bump lands on `main` only by merging that PR.
2. **Tag & release** — once the PR is merged, tag the merge commit, cut the GitHub
   release, and publish to npm. Tagging is allowed even with `main` locked down.

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

Workflow: `.github/workflows/release.yml`. Trigger it from **Actions → Prepare
release → Run workflow**.

**Inputs:**

- `release_type`: `patch` (default), `minor`, or `major`.
- `version`: an explicit version (e.g. `1.2.3`) that overrides `release_type`.
- `dry_run`: bump, build, and `npm publish --dry-run` without opening a PR.

It computes the next version, writes it to **all** `package.json` files and
rewrites internal `@teemtape/*` dependency ranges, builds and tests the
publishable packages, generates a Keep a Changelog-style entry from merged PRs,
and opens (or updates) a `chore(release): v<version>` PR against `main`.

## Phase 2 — Tag and release (on merge)

Workflow: `.github/workflows/tag-release.yml`. Triggered by a push to `main` that
changes `packages/cli/package.json` (i.e. the release PR merging). Keyed off the
`@teemtape/cli` version: it cuts the release only if there's no `v<version>` tag
yet — so ordinary merges don't trigger one.

It detects the new version, builds and tests the publishable packages, creates and
pushes the annotated tag `v<version>`, cuts the GitHub release (notes from the
matching `CHANGELOG.md` section), and publishes `@teemtape/api-client` and
`@teemtape/cli` to npm with provenance. `packages/mock-server` and `workers/*` are
intentionally **not** published. The publish step is idempotent.

## Human approval gates

Nothing ships without a human in the loop, and you can layer two gates:

1. **Release PR review.** Nothing is tagged, released, or published until someone
   **merges** the `chore(release): v<version>` PR — the merge *is* the approval.
   To require an explicit reviewer, add **Require a pull request before merging →
   Require approvals** to the `main` ruleset.
2. **Pre-publish approval.** `tag-release.yml` runs in the `release` environment.
   Configure **Settings → Environments → release → Required reviewers** and the
   job pauses after merge until an approver clicks **Approve**. With no reviewers,
   the environment is inert and the job runs straight through.

## Requirements

- **`NPM_PACKAGE_TOKEN`** — an npm automation token with publish access to the
  `@teemtape` scope.
- **`contents: write`** + **`id-token: write`** permissions (already configured)
  for pushing the tag, creating the release, and npm provenance.
- For Phase 1 to open the PR with the built-in `GITHUB_TOKEN`, enable **Settings →
  Actions → General → Allow GitHub Actions to create and approve pull requests**.
  Alternatively set a **`RELEASE_TOKEN`** secret (a PAT with `contents` +
  `pull-requests` write); both workflows prefer it when present.

## Manual version helper

`scripts/version.mjs` can be run locally:

```bash
node scripts/version.mjs current          # print the current version
node scripts/version.mjs next minor       # print the next version for a bump type
node scripts/version.mjs set 1.2.3        # write 1.2.3 across all package.json files
```

## Cutting a release by hand

If you ever need to bypass the workflows, the same protected-branch-friendly shape
works locally — open a version-bump PR, merge it, then tag and release:

```bash
git checkout main && git pull
git tag -a v0.1.1 -m "Release 0.1.1"
git push origin v0.1.1                       # allowed: tags aren't branch-protected
gh release create v0.1.1 --target main --generate-notes
```

## Recommendation

Use the built-in two-phase flow: run **Prepare release** to open the release PR,
review the version bump and `CHANGELOG.md` entry, then merge to automatically tag,
publish the GitHub release, and push the npm packages — all while keeping `main`
protected.
