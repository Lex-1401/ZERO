#!/bin/bash
# ∅ ZERO — Instalador Rápido Inteligente
# Este script automatiza a instalação, resolve dependências e lança o sistema.

set -e

# Garantir UTF-8 para evitar erros com caracteres especiais/emojis no Linux
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Funções de Log (ASCII Safe)
log_info() { echo -e "${BLUE}[INFO] $1${NC}"; }
log_success() { echo -e "${GREEN}[OK]   $1${NC}"; }
log_warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
log_error() { echo -e "${RED}[ERR]  $1${NC}"; }

# Cabeçalho
echo -e "${BLUE}ZERO - Iniciando Instalacao Inteligente${NC}"
echo "------------------------------------------"

# ... (Previous functions check_node, etc - updating logs)

# 6. Configuração Global
setup_global() {
    log_info "Configurando comando 'zero' globalmente..."

    # Define local padrao seguro se nao existir
    export PNPM_HOME="$HOME/.local/share/pnpm"
    mkdir -p "$PNPM_HOME"
    export PATH="$PNPM_HOME:$PATH"

    # Forca a configuracao do diretorio global
    pnpm config set global-bin-dir "$PNPM_HOME"
    
    # Tenta linkar
    if ! pnpm link --global; then
        log_warn "Link falhou na primeira tentativa."
        log_info "Tentando forcar setup do pnpm..."
        pnpm setup
        
        # Tenta novamente
        if ! pnpm link --global; then
             log_error "Falha critica ao linkar o comando 'zero'."
             log_warn "Adicione manualmente ao seu PATH: $PNPM_HOME"
             return 1
        fi
    fi
    
    log_success "Comando 'zero' linkado globalmente."
}

# 1. Detecção de OS e Hardware
check_environment() {
    OS_TYPE="$(uname)"
    ARCH_TYPE="$(uname -m)"
    log_info "Ambiente detectado: $OS_TYPE ($ARCH_TYPE)"

    # Verificar Memória (Aproximado)
    if [ "$OS_TYPE" == "Darwin" ]; then
        RAM_GB=$(sysctl hw.memsize | awk '{print $2/1024/1024/1024}')
    else
        RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
    fi

    # Se RAM_GB estiver vazio ou inválido, definir como 0 para evitar erro no bc
    RAM_GB=${RAM_GB:-0}

    if (( $(echo "$RAM_GB < 1.0" | bc -l 2>/dev/null || echo 0) )); then
        log_warn "Atenção: Menos de 1GB de RAM detectado. A compilação pode falhar sem Swap."
    fi
}

# 2. Verificar Node.js
check_node() {
    if ! command -v node >/dev/null 2>&1; then
        log_warn "Node.js não encontrado. Tentando instalar via NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 22
        nvm use 22
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2)
        # Comparação simples de versão principal
        MAJOR_VER=${NODE_VERSION%%.*}
        if [ "$MAJOR_VER" -lt 22 ]; then
            log_error "Node.js versão $NODE_VERSION detectada. O ZERO requer versão 22 ou superior."
            exit 1
        fi
        log_success "Node.js $(node -v) pronto."
    fi
}

# 3. Gerenciador de Pacotes (pnpm)
check_pnpm() {
    if ! command -v pnpm >/dev/null 2>&1; then
        log_info "Instalando pnpm globalmente..."
        npm install -g pnpm
    else
        log_success "pnpm detectado."
    fi
}

# 4. Rust & Native Modules
check_rust() {
    if ! command -v cargo >/dev/null 2>&1; then
        log_warn "Rust não encontrado. Tentando instalar via rustup..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
    else
        log_success "Rust detectado."
    fi
}

build_native_modules() {
    log_info "Verificando módulos nativos..."
    PLATFORM_ARCH="$(node -e 'console.log(`${process.platform}-${process.arch}`)')"
    if [ "$(uname)" == "Linux" ]; then
        # Detectar libc para Linux
        LIBC=$(ldd --version 2>&1 | grep -q "musl" && echo "musl" || echo "gnu")
        PLATFORM_ARCH="$PLATFORM_ARCH-$LIBC"
    fi

    BINARY_NAME="ratchet.$PLATFORM_ARCH.node"
    if [ ! -f "rust-core/$BINARY_NAME" ] && [ ! -f "rust-core/ratchet.node" ]; then
        log_warn "Binário nativo para $PLATFORM_ARCH não encontrado. Compilando..."
        (cd rust-core && pnpm install && pnpm build)
        log_success "Módulo nativo compilado."
    else
        log_success "Módulo nativo já existe."
    fi
}



# 4.5 Correção Preventiva do Workspace
fix_workspace_config() {
    log_info "Verificando integridade do workspace..."
    
    # 1. Garantir pnpm-workspace.yaml correto
    cat > pnpm-workspace.yaml <<EOF
packages:
  - .
  - ui
  - rust-core
  - channels
  - extensions/*
EOF
    log_success "Workspace configurado (rust-core incluído)."

    # 2. Limpar scripts do rust-core para evitar sobrescrita de tipos
    if [ -f "rust-core/package.json" ]; then
        node -e '
        try {
            const fs = require("fs"); 
            const p = "rust-core/package.json"; 
            const j = JSON.parse(fs.readFileSync(p, "utf8")); 
            j.scripts = {}; 
            fs.writeFileSync(p, JSON.stringify(j, null, 2));
            console.log("cleaned");
        } catch (e) { console.error(e); process.exit(1); }
        ' >/dev/null 2>&1
        log_success "Scripts nativos isolados."
    fi
}

# 5. Instalação e Build
install_and_build() {
    fix_workspace_config
    echo "------------------------------------------"
    log_info "Instalando dependências do ZERO..."
    if ! pnpm install --no-frozen-lockfile; then
        log_error "Falha na instalação das dependências."
        exit 1
    fi

    log_info "Construindo Interface Altair e Núcleo..."
    if ! pnpm ui:build; then
        log_error "Falha na construção da UI."
        exit 1
    fi
    if ! pnpm build; then
         log_error "Falha na construção do projeto."
         exit 1
    fi
}

# 6. Configuração Global
setup_global() {
    log_info "Configurando comando 'zero' globalmente..."

    # Tenta obter o diretório global atual
    PNPM_GLOBAL_BIN=$(pnpm config get global-bin-dir 2>/dev/null)

    # Se não estiver configurado ou for undefined, define um padrão seguro
    if [ -z "$PNPM_GLOBAL_BIN" ] || [ "$PNPM_GLOBAL_BIN" = "undefined" ]; then
        log_warn "Diretório global do pnpm não configurado."
        # Tenta rodar o setup primeiro
        pnpm setup >/dev/null 2>&1 || true
        
        # Recarrega a configuração
        PNPM_GLOBAL_BIN=$(pnpm config get global-bin-dir 2>/dev/null)
        
        # Se ainda falhar, força um local manual
        if [ -z "$PNPM_GLOBAL_BIN" ] || [ "$PNPM_GLOBAL_BIN" = "undefined" ]; then
             mkdir -p "$HOME/.pnpm-global"
             pnpm config set global-bin-dir "$HOME/.pnpm-global"
             PNPM_GLOBAL_BIN="$HOME/.pnpm-global"
        fi
    fi

    # ADICIONA AO PATH DA SESSÃO ATUAL (CRÍTICO)
    export PATH="$PNPM_GLOBAL_BIN:$PATH"
    log_info "Usando diretório global: $PNPM_GLOBAL_BIN"

    # Tentativa de Link
    if ! pnpm link --global; then
        log_warn "Link falhou. Tentando forçar configuração..."
        
        # Força configuração para um local padrão do sistema se o anterior falhou
        pnpm config set global-bin-dir "$HOME/Library/pnpm" 2>/dev/null || pnpm config set global-bin-dir "$HOME/.local/share/pnpm"
        PNPM_GLOBAL_BIN=$(pnpm config get global-bin-dir)
        export PATH="$PNPM_GLOBAL_BIN:$PATH"

        if pnpm link --global; then
             log_success "Link global realizado com sucesso (recovery mode)."
        else
             log_error "Falha crítica ao linkar o comando 'zero'."
             log_warn "Certifique-se de que $PNPM_GLOBAL_BIN está no seu PATH."
        fi
    else
        log_success "Comando 'zero' linkado globalmente."
    fi
}

# 7. Finalização
finish_setup() {
    echo "------------------------------------------"
    log_success "Instalação finalizada!"
    
    echo -e "Para usar o comando 'zero', talvez você precise reiniciar seu terminal ou rodar:"
    echo -e "${YELLOW}source ~/.zshrc${NC} (ou equivalente)"
    
    echo -e "\nTeste o comando agora:"
    echo -e "${BLUE}zero onboard --install-daemon${NC}"
    
    echo -e "\nSe falhar, use o caminho local:"
    echo -e "${BLUE}pnpm zero onboard --install-daemon${NC}"

    # Tentar abrir o dashboard se o gateway já estiver configurado
    if [ -f "$HOME/.zero/zero.json" ]; then
        log_info "Abrindo dashboard..."
        if [ "$(uname)" == "Darwin" ]; then
            open http://localhost:18789/control || true
        else
            xdg-open http://localhost:18789/control || true
        fi
    fi
}

# --- Execução Principal ---
check_environment
check_node
check_pnpm
check_rust
build_native_modules
install_and_build
setup_global
finish_setup
