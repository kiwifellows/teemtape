#!/usr/bin/env node
// Monorepo version helper used by the automated release workflow.
//
// Usage:
//   node scripts/version.mjs current
//       Print the current version (highest of the latest semver git tag and any
//       package.json version in the workspace).
//
//   node scripts/version.mjs next <patch|minor|major>
//       Print the next version after bumping the current one.
//
//   node scripts/version.mjs set <version>
//       Write <version> to every workspace package.json (root + all workspaces)
//       and rewrite internal @teemtape/* dependency ranges to "^<version>".
//
// The script is dependency-free so it can run in CI without an npm install.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

function parseSemver(version) {
  const match = SEMVER_RE.exec(String(version).trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  };
}

function isValidSemver(version) {
  return parseSemver(version) !== null;
}

// Returns 1 if a > b, -1 if a < b, 0 if equal. A release (no prerelease) ranks
// higher than a prerelease of the same x.y.z.
function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa && !pb) return 0;
  if (!pa) return -1;
  if (!pb) return 1;
  for (const key of ['major', 'minor', 'patch']) {
    if (pa[key] !== pb[key]) return pa[key] > pb[key] ? 1 : -1;
  }
  if (pa.prerelease === pb.prerelease) return 0;
  if (pa.prerelease === null) return 1; // release > prerelease
  if (pb.prerelease === null) return -1;
  return pa.prerelease > pb.prerelease ? 1 : -1;
}

// Expand the root "workspaces" globs (only the simple "dir/*" form is used here)
// into concrete package.json paths, always including the repo root manifest.
function findPackageJsonFiles() {
  const rootPkgPath = join(repoRoot, 'package.json');
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
  const patterns = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : [];
  const files = [rootPkgPath];

  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const baseDir = join(repoRoot, pattern.slice(0, -2));
      if (!existsSync(baseDir)) continue;
      for (const entry of readdirSync(baseDir)) {
        const candidate = join(baseDir, entry, 'package.json');
        if (existsSync(candidate) && statSync(join(baseDir, entry)).isDirectory()) {
          files.push(candidate);
        }
      }
    } else {
      const candidate = join(repoRoot, pattern, 'package.json');
      if (existsSync(candidate)) files.push(candidate);
    }
  }

  return files;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Preserve a trailing newline so diffs stay minimal.
function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function getLatestTagVersion() {
  try {
    const out = execSync('git tag --list "v*" --sort=-v:refname', {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    for (const line of out.split('\n')) {
      const tag = line.trim();
      if (!tag) continue;
      const version = tag.replace(/^v/, '');
      if (isValidSemver(version)) return version;
    }
  } catch {
    // No git history / no tags — fall back to package.json versions.
  }
  return null;
}

function getCurrentVersion() {
  const candidates = [];
  const tagVersion = getLatestTagVersion();
  if (tagVersion) candidates.push(tagVersion);

  for (const file of findPackageJsonFiles()) {
    const { version } = readJson(file);
    if (version && isValidSemver(version)) candidates.push(version);
  }

  if (candidates.length === 0) return '0.0.0';
  return candidates.sort(compareSemver).at(-1);
}

function bump(version, releaseType) {
  const parsed = parseSemver(version);
  if (!parsed) throw new Error(`Cannot bump invalid version: ${version}`);
  let { major, minor, patch } = parsed;

  switch (releaseType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      // A patch bump from a prerelease just drops the prerelease tag.
      if (parsed.prerelease === null) patch += 1;
      break;
    default:
      throw new Error(`Unknown release type: ${releaseType} (expected patch|minor|major)`);
  }

  return `${major}.${minor}.${patch}`;
}

function collectInternalPackageNames(files) {
  const names = new Set();
  for (const file of files) {
    const { name } = readJson(file);
    if (name) names.add(name);
  }
  return names;
}

function setVersion(newVersion) {
  if (!isValidSemver(newVersion)) {
    throw new Error(`Refusing to set invalid version: ${newVersion}`);
  }

  const files = findPackageJsonFiles();
  const internalNames = collectInternalPackageNames(files);
  const depFields = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];

  const updated = [];
  for (const file of files) {
    const pkg = readJson(file);
    pkg.version = newVersion;

    for (const field of depFields) {
      const deps = pkg[field];
      if (!deps) continue;
      for (const depName of Object.keys(deps)) {
        if (internalNames.has(depName)) {
          deps[depName] = `^${newVersion}`;
        }
      }
    }

    writeJson(file, pkg);
    updated.push(file);
  }

  return updated;
}

function main() {
  const [command, arg] = process.argv.slice(2);

  switch (command) {
    case 'current': {
      process.stdout.write(`${getCurrentVersion()}\n`);
      break;
    }
    case 'next': {
      const releaseType = arg || 'patch';
      process.stdout.write(`${bump(getCurrentVersion(), releaseType)}\n`);
      break;
    }
    case 'set': {
      if (!arg) throw new Error('Usage: node scripts/version.mjs set <version>');
      const version = arg.replace(/^v/, '');
      const updated = setVersion(version);
      process.stdout.write(
        `Set version ${version} across ${updated.length} package.json files:\n`,
      );
      for (const file of updated) {
        process.stdout.write(`  - ${file.replace(`${repoRoot}/`, '')}\n`);
      }
      break;
    }
    default:
      process.stderr.write(
        'Usage:\n' +
          '  node scripts/version.mjs current\n' +
          '  node scripts/version.mjs next <patch|minor|major>\n' +
          '  node scripts/version.mjs set <version>\n',
      );
      process.exit(1);
  }
}

main();
