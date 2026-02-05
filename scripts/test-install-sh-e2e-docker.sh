#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${ZERO_INSTALL_E2E_IMAGE:-zero-install-e2e:local}"
INSTALL_URL="${ZERO_INSTALL_URL:-https://zero.local/install.sh}"

OPENAI_API_KEY="${OPENAI_API_KEY:-}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
ANTHROPIC_API_TOKEN="${ANTHROPIC_API_TOKEN:-}"
ZERO_E2E_MODELS="${ZERO_E2E_MODELS:-}"

echo "==> Build image: $IMAGE_NAME"
docker build \
  -t "$IMAGE_NAME" \
  -f "$ROOT_DIR/scripts/docker/install-sh-e2e/Dockerfile" \
  "$ROOT_DIR/scripts/docker/install-sh-e2e"

echo "==> Run E2E installer test"
docker run --rm \
  -e ZERO_INSTALL_URL="$INSTALL_URL" \
  -e ZERO_INSTALL_TAG="${ZERO_INSTALL_TAG:-latest}" \
  -e ZERO_E2E_MODELS="$ZERO_E2E_MODELS" \
  -e ZERO_INSTALL_E2E_PREVIOUS="${ZERO_INSTALL_E2E_PREVIOUS:-}" \
  -e ZERO_INSTALL_E2E_SKIP_PREVIOUS="${ZERO_INSTALL_E2E_SKIP_PREVIOUS:-0}" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e ANTHROPIC_API_TOKEN="$ANTHROPIC_API_TOKEN" \
  "$IMAGE_NAME"
