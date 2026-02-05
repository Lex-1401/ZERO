#!/usr/bin/env bash
# ZERO Magic Setup - Distro Brasileira de IA Pessoal
# O caminho mais rápido e seguro para o seu A-POS.

set -euo pipefail

# Cores e Estilo
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}∅ ZERO Magic Setup${NC}"
echo -e "Configurando seu ambiente de IA pessoal...\n"

# 1. Verificação de Dependências (Node.js)
echo -ne "🔍 Verificando Node.js... "
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 22 ]; then
        echo -e "${GREEN}v$(node -v) detectado.${NC}"
    else
        echo -e "\n❌ Precisamos do Node.js v22 ou superior. Você tem a v$(node -v)."
        echo "Sugestão: Use 'nvm install 22' ou baixe em https://nodejs.org"
        exit 1
    fi
else
    echo -e "\n❌ Node.js não encontrado."
    echo "Por favor, instale o Node.js v22+ antes de continuar."
    exit 1
fi

# 2. Instalação/Build do ZERO (Simulado para este repositório local)
echo -e "📦 Preparando binários do ZERO..."
# Se fosse uma distro instalável, aqui faríamos pnpm install / build
# Como estamos operando no repo, vamos garantir que o comando setup funcione

# 3. Execução do Smart Scan
echo -e "🧠 Iniciando Smart Scan (Análise de Sistema)...\n"
# Aqui chamamos o CLI que acabamos de modificar
pnpm zero setup --smart

# 4. Finalização e Dashboard
echo -e "\n${GREEN}${BOLD}Setup Concluído com Sucesso!${NC}"
echo -e "----------------------------------------"
echo -e "🚀 Próximos passos:"
echo -e "1. Ative seu Gateway: ${BOLD}zero gateway${NC}"
echo -e "2. Fale comigo: ${BOLD}zero agent --message \"Olá\"${NC}"
echo -e "3. Painel Web: ${BLUE}http://localhost:18789/?onboarding=true${NC}"
echo -e "----------------------------------------\n"
