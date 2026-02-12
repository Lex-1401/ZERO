#!/bin/bash
# Script de Instalação Simplificada - ZERO OS

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # Sem cor

echo -e "${BLUE}∅ ZERO — Iniciando Instalação Simplificada${NC}"
echo "------------------------------------------"

# 1. Verificar Node.js (>= 22)
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}❌ Node.js não encontrado!${NC}"
    echo "Por favor, instale o Node.js (versão 22 ou superior) em: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2)
MAJOR_VER=${NODE_VERSION%%.*}
if [ "$MAJOR_VER" -lt 22 ]; then
    echo -e "${RED}❌ Node.js $NODE_VERSION detectado. O ZERO requer versão 22 ou superior.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js v${NODE_VERSION} detectado.${NC}"

# 2. Instalar pnpm se necessário
if ! command -v pnpm >/dev/null 2>&1; then
    echo "📦 Instalando gerenciador de pacotes pnpm..."
    npm install -g pnpm
fi

# 3. Instalação de dependências
echo -e "${BLUE}🛠️  Instalando o cérebro do ZERO (isso pode levar um minuto)...${NC}"
pnpm install

# 4. Compilação
echo -e "${BLUE}🏗️  Construindo a interface e o núcleo...${NC}"
pnpm ui:build
pnpm build

# 5. Link Global
echo -e "${BLUE}🔗 Tornando o comando 'zero' disponível em qualquer lugar...${NC}"
pnpm link --global

echo "------------------------------------------"
echo -e "${GREEN}🎉 TUDO PRONTO!${NC}"
echo -e "Agora, basta digitar o comando abaixo para começar a usar:"
echo -e "${BLUE}zero onboard${NC}"
