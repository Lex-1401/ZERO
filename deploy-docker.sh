#!/bin/bash
# ∅ ZERO — Docker Cloud Deploy
# Implementação rápida para VPS usando Docker Hub.

set -e

echo "∅ ZERO: Iniciando Deploy em Nuvem (Docker)"
echo "------------------------------------------"

# 1. Verificar Docker
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Erro: Docker não encontrado. Por favor, instale o Docker primeiro."
    exit 1
fi

# 2. Criar diretório de trabalho
MKDIR_PATH="$HOME/zero-cloud"
mkdir -p "$MKDIR_PATH"
cd "$MKDIR_PATH"

# 3. Baixar Docker Compose se não existir
if [ ! -f "docker-compose.yml" ]; then
    echo "📥 Baixando manifesto Docker Compose..."
    curl -sSL https://raw.githubusercontent.com/Lex-1401/ZERO/main/docker-compose.yml -o docker-compose.yml
fi

# 4. Configurar Ambiente (.env)
if [ ! -f ".env" ]; then
    echo "🔐 Gerando tokens de segurança..."
    GATEWAY_TOKEN=$(openssl rand -hex 32)
    cat > .env <<EOF
ZERO_GATEWAY_TOKEN=$GATEWAY_TOKEN
ZERO_GATEWAY_PORT=18789
ZERO_GATEWAY_BIND=lan
ZERO_CONFIG_DIR=$HOME/.zero
ZERO_WORKSPACE_DIR=$HOME/zero
EOF
    echo "✅ Arquivo .env criado com sucesso."
fi

# 5. Iniciar containers
echo "🚀 Subindo containers no modo detached..."
docker compose up -d

# 6. Finalização
IP_ADDR=$(curl -s ifconfig.me || echo "SEU_IP")
echo "------------------------------------------"
echo "✅ ZERO ONLINE no Docker."
echo "🔗 Dashboard: http://$IP_ADDR:18789/control"
echo "🔑 Seu Token: $(grep ZERO_GATEWAY_TOKEN .env | cut -d'=' -f2)"
echo ""
echo "Dica: Use 'docker compose logs -f' para acompanhar o sistema."
