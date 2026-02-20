#!/usr/bin/env bash
set -euo pipefail

cd /repo

export ZERO_STATE_DIR="/tmp/zero-test"
export ZERO_CONFIG_PATH="${ZERO_STATE_DIR}/zero.json"

echo "==> Seed state"
mkdir -p "${ZERO_STATE_DIR}/credentials"
mkdir -p "${ZERO_STATE_DIR}/agents/main/sessions"
echo '{}' >"${ZERO_CONFIG_PATH}"
echo 'creds' >"${ZERO_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${ZERO_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm zero reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${ZERO_CONFIG_PATH}"
test ! -d "${ZERO_STATE_DIR}/credentials"
test ! -d "${ZERO_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${ZERO_STATE_DIR}/credentials"
echo '{}' >"${ZERO_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm zero uninstall --state --yes --non-interactive

test ! -d "${ZERO_STATE_DIR}"

echo "OK"
