#!/usr/bin/env bash
set -euo pipefail

# Garantir UTF-8 para evitar erros com caracteres especiais/emojis no Linux
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
EXTRA_COMPOSE_FILE="$ROOT_DIR/docker-compose.extra.yml"
IMAGE_NAME="${ZERO_IMAGE:-zero:local}"
EXTRA_MOUNTS="${ZERO_EXTRA_MOUNTS:-}"
HOME_VOLUME_NAME="${ZERO_HOME_VOLUME:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Dependência ausente: $1" >&2
    exit 1
  fi
}

require_cmd docker
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose não disponível (tente: docker compose version)" >&2
  exit 1
fi

mkdir -p "${ZERO_CONFIG_DIR:-$HOME/.zero}"
mkdir -p "${ZERO_WORKSPACE_DIR:-$HOME/zero}"

export ZERO_CONFIG_DIR="${ZERO_CONFIG_DIR:-$HOME/.zero}"
export ZERO_WORKSPACE_DIR="${ZERO_WORKSPACE_DIR:-$HOME/zero}"
export ZERO_GATEWAY_PORT="${ZERO_GATEWAY_PORT:-18789}"
export ZERO_BRIDGE_PORT="${ZERO_BRIDGE_PORT:-18790}"
export ZERO_GATEWAY_BIND="${ZERO_GATEWAY_BIND:-lan}"
export ZERO_IMAGE="$IMAGE_NAME"
export ZERO_DOCKER_APT_PACKAGES="${ZERO_DOCKER_APT_PACKAGES:-}"

if [[ -z "${ZERO_GATEWAY_TOKEN:-}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    ZERO_GATEWAY_TOKEN="$(openssl rand -hex 32)"
  else
    ZERO_GATEWAY_TOKEN="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
)"
  fi
fi
export ZERO_GATEWAY_TOKEN

COMPOSE_FILES=("$COMPOSE_FILE")
COMPOSE_ARGS=()

write_extra_compose() {
  local home_volume="$1"
  shift
  local -a mounts=("$@")
  local mount

  cat >"$EXTRA_COMPOSE_FILE" <<'YAML'
services:
  zero-gateway:
    volumes:
YAML

  if [[ -n "$home_volume" ]]; then
    printf '      - %s:/home/node\n' "$home_volume" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/.zero\n' "$ZERO_CONFIG_DIR" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/zero\n' "$ZERO_WORKSPACE_DIR" >>"$EXTRA_COMPOSE_FILE"
  fi

  for mount in "${mounts[@]}"; do
    printf '      - %s\n' "$mount" >>"$EXTRA_COMPOSE_FILE"
  done

  cat >>"$EXTRA_COMPOSE_FILE" <<'YAML'
  zero-cli:
    volumes:
YAML

  if [[ -n "$home_volume" ]]; then
    printf '      - %s:/home/node\n' "$home_volume" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/.zero\n' "$ZERO_CONFIG_DIR" >>"$EXTRA_COMPOSE_FILE"
    printf '      - %s:/home/node/zero\n' "$ZERO_WORKSPACE_DIR" >>"$EXTRA_COMPOSE_FILE"
  fi

  for mount in "${mounts[@]}"; do
    printf '      - %s\n' "$mount" >>"$EXTRA_COMPOSE_FILE"
  done

  if [[ -n "$home_volume" && "$home_volume" != *"/"* ]]; then
    cat >>"$EXTRA_COMPOSE_FILE" <<YAML
volumes:
  ${home_volume}:
YAML
  fi
}

VALID_MOUNTS=()
if [[ -n "$EXTRA_MOUNTS" ]]; then
  IFS=',' read -r -a mounts <<<"$EXTRA_MOUNTS"
  for mount in "${mounts[@]}"; do
    mount="${mount#"${mount%%[![:space:]]*}"}"
    mount="${mount%"${mount##*[![:space:]]}"}"
    if [[ -n "$mount" ]]; then
      VALID_MOUNTS+=("$mount")
    fi
  done
fi

if [[ -n "$HOME_VOLUME_NAME" || ${#VALID_MOUNTS[@]} -gt 0 ]]; then
  write_extra_compose "$HOME_VOLUME_NAME" "${VALID_MOUNTS[@]}"
  COMPOSE_FILES+=("$EXTRA_COMPOSE_FILE")
fi
for compose_file in "${COMPOSE_FILES[@]}"; do
  COMPOSE_ARGS+=("-f" "$compose_file")
done
COMPOSE_HINT="docker compose"
for compose_file in "${COMPOSE_FILES[@]}"; do
  COMPOSE_HINT+=" -f ${compose_file}"
done

ENV_FILE="$ROOT_DIR/.env"
upsert_env() {
  local file="$1"
  shift
  local -a keys=("$@")
  local tmp
  tmp="$(mktemp)"
  declare -A seen=()

  if [[ -f "$file" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      local key="${line%%=*}"
      local replaced=false
      for k in "${keys[@]}"; do
        if [[ "$key" == "$k" ]]; then
          printf '%s=%s\n' "$k" "${!k-}" >>"$tmp"
          seen["$k"]=1
          replaced=true
          break
        fi
      done
      if [[ "$replaced" == false ]]; then
        printf '%s\n' "$line" >>"$tmp"
      fi
    done <"$file"
  fi

  for k in "${keys[@]}"; do
    if [[ -z "${seen[$k]:-}" ]]; then
      printf '%s=%s\n' "$k" "${!k-}" >>"$tmp"
    fi
  done

  mv "$tmp" "$file"
}

upsert_env "$ENV_FILE" \
  ZERO_CONFIG_DIR \
  ZERO_WORKSPACE_DIR \
  ZERO_GATEWAY_PORT \
  ZERO_BRIDGE_PORT \
  ZERO_GATEWAY_BIND \
  ZERO_GATEWAY_TOKEN \
  ZERO_IMAGE \
  ZERO_EXTRA_MOUNTS \
  ZERO_HOME_VOLUME \
  ZERO_DOCKER_APT_PACKAGES

echo "==> Construindo imagem Docker: $IMAGE_NAME"
docker build \
  --build-arg "ZERO_DOCKER_APT_PACKAGES=${ZERO_DOCKER_APT_PACKAGES}" \
  -t "$IMAGE_NAME" \
  -f "$ROOT_DIR/Dockerfile" \
  "$ROOT_DIR"

echo ""
echo "==> Onboarding (interativo)"
echo "Quando solicitado:"
echo "  - Gateway bind: lan"
echo "  - Gateway auth: token"
echo "  - Gateway token: $ZERO_GATEWAY_TOKEN"
echo "  - Tailscale exposure: Off"
echo "  - Install Gateway daemon: No"
echo ""
docker compose "${COMPOSE_ARGS[@]}" run --rm zero-cli onboard --no-install-daemon

echo ""
echo "==> Configuração de Provedor (opcional)"
echo "WhatsApp (QR):"
echo "  ${COMPOSE_HINT} run --rm zero-cli providers login"
echo "Telegram (bot token):"
echo "  ${COMPOSE_HINT} run --rm zero-cli providers add --provider telegram --token <token>"
echo "Discord (bot token):"
echo "  ${COMPOSE_HINT} run --rm zero-cli providers add --provider discord --token <token>"
echo "Docs: https://docs.zero.bot/providers"

echo ""
echo "==> Iniciando gateway"
docker compose "${COMPOSE_ARGS[@]}" up -d zero-gateway

echo ""
echo "Gateway rodando com mapeamento de porta no host."
echo "Acesse de dispositivos tailnet via o IP tailnet do host."
echo "Configuração: $ZERO_CONFIG_DIR"
echo "Workspace: $ZERO_WORKSPACE_DIR"
echo "Token: $ZERO_GATEWAY_TOKEN"
echo ""
echo "Comandos:"
echo "  ${COMPOSE_HINT} logs -f zero-gateway"
echo "  ${COMPOSE_HINT} exec zero-gateway node dist/index.js health --token \"$ZERO_GATEWAY_TOKEN\""
