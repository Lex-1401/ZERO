#!/usr/bin/env bash
set -euo pipefail

INSTALL_URL="${ZERO_INSTALL_URL:-https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.sh}"
SMOKE_PREVIOUS_VERSION="${ZERO_INSTALL_SMOKE_PREVIOUS:-}"
SKIP_PREVIOUS="${ZERO_INSTALL_SMOKE_SKIP_PREVIOUS:-0}"

echo "==> Resolve npm versions"
if [[ -n "$SMOKE_PREVIOUS_VERSION" ]]; then
  LATEST_VERSION="$(npm view zero version)"
  PREVIOUS_VERSION="$SMOKE_PREVIOUS_VERSION"
else
  VERSIONS_JSON="$(npm view zero versions --json)"
  versions_line="$(node - <<'NODE'
const raw = process.env.VERSIONS_JSON || "[]";
let versions;
try {
  versions = JSON.parse(raw);
} catch {
  versions = raw ? [raw] : [];
}
if (!Array.isArray(versions)) {
  versions = [versions];
}
if (versions.length === 0) {
  process.exit(1);
}
const latest = versions[versions.length - 1];
const previous = versions.length >= 2 ? versions[versions.length - 2] : latest;
process.stdout.write(`${latest} ${previous}`);
NODE
)"
  LATEST_VERSION="${versions_line%% *}"
  PREVIOUS_VERSION="${versions_line#* }"
fi

if [[ -n "${ZERO_INSTALL_LATEST_OUT:-}" ]]; then
  printf "%s" "$LATEST_VERSION" > "$ZERO_INSTALL_LATEST_OUT"
fi

echo "latest=$LATEST_VERSION previous=$PREVIOUS_VERSION"

if [[ "$SKIP_PREVIOUS" == "1" ]]; then
  echo "==> Skip preinstall previous (ZERO_INSTALL_SMOKE_SKIP_PREVIOUS=1)"
else
  echo "==> Preinstall previous (forces installer upgrade path)"
  npm install -g "zero@${PREVIOUS_VERSION}"
fi

echo "==> Run official installer one-liner"
curl -fsSL "$INSTALL_URL" | bash

echo "==> Verify installed version"
INSTALLED_VERSION="$(zero --version 2>/dev/null | head -n 1 | tr -d '\r')"
echo "installed=$INSTALLED_VERSION expected=$LATEST_VERSION"

if [[ "$INSTALLED_VERSION" != "$LATEST_VERSION" ]]; then
  echo "ERROR: expected zero@$LATEST_VERSION, got zero@$INSTALLED_VERSION" >&2
  exit 1
fi

echo "==> Sanity: CLI runs"
zero --help >/dev/null

echo "OK"
