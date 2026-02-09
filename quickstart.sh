#!/bin/bash
# ∅ ZERO — Smart Quickstart Installer
# Este script automatiza a instalação, resolve dependências e lança o sistema.

set -e

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}∅ ZERO — Iniciando Instalação Inteligente${NC}"
echo "------------------------------------------"

# 1. Detecção de OS e Hardware
OS_TYPE="$(uname)"
ARCH_TYPE="$(uname -m)"
echo -e "🖥️  Ambiente detectado: ${BLUE}$OS_TYPE ($ARCH_TYPE)${NC}"

# Verificar Memória (Aproximado)
if [ "$OS_TYPE" == "Darwin" ]; then
    RAM_GB=$(sysctl hw.memsize | awk '{print $2/1024/1024/1024}')
else
    RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
fi

if (( $(echo "$RAM_GB < 1.0" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Atenção: Menos de 1GB de RAM detectado. A compilação pode falhar sem Swap.${NC}"
fi

# 2. Verificar Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "${YELLOW}📦 Node.js não encontrado. Tentando instalar via NVM...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 22
    nvm use 22
else
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    if [ "${NODE_VERSION%%.*}" -lt 22 ]; then
        echo -e "${RED}❌ Node.js versão $NODE_VERSION detectada. O ZERO requer versão 22 ou superior.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js $(node -v) pronto.${NC}"
fi

# 3. Gerenciador de Pacotes (pnpm)
if ! command -v pnpm >/dev/null 2>&1; then
    echo -e "${BLUE}📦 Instalando pnpm globalmente...${NC}"
    npm install -g pnpm
fi

# 4. Rust & Native Modules
if ! command -v cargo >/dev/null 2>&1; then
    echo -e "${YELLOW}🦀 Rust não encontrado. Tentando instalar via rustup...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

echo -e "${BLUE}⚙️  Verificando módulos nativos...${NC}"
PLATFORM_ARCH="$(node -e 'console.log(`${process.platform}-${process.arch}`)')"
if [ "$OS_TYPE" == "Linux" ]; then
    # Detectar libc para Linux
    LIBC=$(ldd --version 2>&1 | grep -q "musl" && echo "musl" || echo "gnu")
    PLATFORM_ARCH="$PLATFORM_ARCH-$LIBC"
fi

BINARY_NAME="ratchet.$PLATFORM_ARCH.node"
if [ ! -f "rust-core/$BINARY_NAME" ] && [ ! -f "rust-core/ratchet.node" ]; then
    echo -e "${YELLOW}⚠️  Binário nativo para $PLATFORM_ARCH não encontrado. Compilando...${NC}"
    (cd rust-core && pnpm install && pnpm build)
    echo -e "${GREEN}✅ Módulo nativo compilado.${NC}"
fi

# 5. Instalação e Build
echo "------------------------------------------"
echo -e "${BLUE}🛠️  Instalando dependências do ZERO...${NC}"
pnpm install

echo -e "${BLUE}🏗️  Construindo Interface Altair e Núcleo...${NC}"
pnpm ui:build
pnpm build

# 6. Configuração do Comando Global (Fix pnpm link)
echo -e "${BLUE}🔗 Configurando comando 'zero' globalmente...${NC}"
if ! pnpm link --global >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Aviso: Falha ao linkar globalmente. Tentando 'pnpm setup'...${NC}"
    pnpm setup || true
    # Tentar novamente após o setup (pode precisar de um novo shell, mas tentamos o binário local como fallback)
    pnpm link --global || echo -e "${YELLOW}💡 Nota: Se 'zero onboard' falhar, use 'pnpm zero onboard'${NC}"
fi

# 7. Finalização
echo "------------------------------------------"
echo -e "${GREEN}🎉 ZERO está pronto para iniciar!${NC}"
echo -e "Agora você pode usar o comando abaixo diretamente:"
echo -e "${BLUE}zero onboard --install-daemon${NC}"
echo -e "Ou, se o comando acima não for encontrado:"
echo -e "${BLUE}pnpm zero onboard --install-daemon${NC}"

# Tentar abrir o dashboard se o gateway já estiver configurado
if [ -f "$HOME/.zero/zero.json" ]; then
    echo -e "${BLUE}Abrindo dashboard...${NC}"
    if [ "$OS_TYPE" == "Darwin" ]; then
        open http://localhost:18789/control || true
    else
        xdg-open http://localhost:18789/control || true
    fi
fi
