#!/usr/bin/env bash
# Idempotently publish a single workspace package to npm.
#
# Required environment variables:
#   PKG             npm package name (e.g. "@teemtape/cli")
#   VERSION         version expected to be published (e.g. "1.2.3")
#   NODE_AUTH_TOKEN npm auth token (provided by setup-node via .npmrc)
#
# If PKG@VERSION already exists on the registry the publish is skipped, which
# makes the release workflow safe to re-run.
set -euo pipefail

if [ -z "${PKG:-}" ] || [ -z "${VERSION:-}" ]; then
  echo "::error::PKG and VERSION must be set" >&2
  exit 1
fi

if npm view "${PKG}@${VERSION}" version >/dev/null 2>&1; then
  echo "${PKG}@${VERSION} is already published — skipping."
  exit 0
fi

echo "Publishing ${PKG}@${VERSION} to npm..."
npm publish --workspace "${PKG}" --provenance --access public
echo "Published ${PKG}@${VERSION}."
