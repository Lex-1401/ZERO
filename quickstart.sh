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

# ... (rest of checks)

# 6. Configuração Global
setup_global() {
    log_info "Configurando comando 'zero' globalmente..."

    # Define local padrao seguro se nao existir (evita erro de pnpm global não encontrado)
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
             log_warn "O link global falhou, mas a instalacao local funcionou."
             log_warn "Para usar o ZERO, voce devera usar o caminho completo."
             return 1
        fi
    # Tenta tornar persistente (melhor esforco)
    for rc in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.bash_profile"; do
        if [ -f "$rc" ] && ! grep -q "$PNPM_HOME" "$rc"; then
            echo -e "\n# ZERO - pnpm global path\nexport PNPM_HOME=\"$PNPM_HOME\"\nexport PATH=\"\$PNPM_HOME:\$PATH\"" >> "$rc"
            log_info "PATH adicionado permanentemente a $(basename "$rc")"
        fi
    done
    
    log_success "Comando 'zero' linkado globalmente."
}

# 1. Detecção de OS e Hardware
check_environment() {
    OS_TYPE="$(uname)"
    ARCH_TYPE="$(uname -m)"
    log_info "Ambiente detectado: $OS_TYPE ($ARCH_TYPE)"

    # Aviso de Root
    if [ "$EUID" -eq 0 ]; then
        log_warn "Executando como ROOT."
        log_warn "Os arquivos de configuracao (~/.zero) pertencerao ao root."
        log_warn "Se planeja rodar como usuario comum depois, voce tera problemas de permissao."
    fi

    # Verificar Memoria (Aproximado)
    if [ "$OS_TYPE" == "Darwin" ]; then
        RAM_BYTES=$(sysctl hw.memsize | awk '{print $2}')
        RAM_GB=$((RAM_BYTES / 1024 / 1024 / 1024))
    else
        RAM_GB=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo 0)
    fi

    if [ "$RAM_GB" -lt 1 ]; then
        log_warn "Atenção: Menos de 1GB de RAM detectado ($RAM_GB GB). A compilação pode falhar sem Swap."
    else
        log_success "Memoria: $RAM_GB GB detectados."
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
        npm install -g pnpm || sudo npm install -g pnpm
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

# 4.1 Verificar Ferramentas de Compilacao
check_build_tools() {
    if [ "$(uname)" == "Linux" ]; then
        MISSING_TOOLS=()
        if ! command -v cc >/dev/null 2>&1; then MISSING_TOOLS+=("build-essential/gcc"); fi
        if ! command -v make >/dev/null 2>&1; then MISSING_TOOLS+=("make"); fi
        if ! command -v python3 >/dev/null 2>&1; then MISSING_TOOLS+=("python3"); fi

        if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
            log_warn "Ferramentas de compilacao ausentes: ${MISSING_TOOLS[*]}"
            log_info "Tentando instalar dependencias de build..."
            if command -v apt-get >/dev/null 2>&1; then
                sudo apt-get update && sudo apt-get install -y build-essential python3
            elif command -v apk >/dev/null 2>&1; then
                sudo apk add build-base python3 || apk add build-base python3
            elif command -v yum >/dev/null 2>&1; then
                sudo yum groupinstall "Development Tools" -y && sudo yum install -y python3
            elif command -v dnf >/dev/null 2>&1; then
                sudo dnf groupinstall "Development Tools" -y && sudo dnf install -y python3
            fi
        else
            log_success "Ferramentas de compilacao prontas."
        fi
    fi
}

build_native_modules() {
    log_info "Verificando módulos nativos..."
    PLATFORM_ARCH="$(node -e 'console.log(`${process.platform}-${process.arch}`)')"
    if [ "$(uname)" == "Linux" ]; then
        LIBC=$(ldd --version 2>&1 | grep -q "musl" && echo "musl" || echo "gnu")
        PLATFORM_ARCH="$PLATFORM_ARCH-$LIBC"
    fi

    BINARY_NAME="ratchet.$PLATFORM_ARCH.node"
    if [ ! -f "rust-core/$BINARY_NAME" ] && [ ! -f "rust-core/ratchet.node" ]; then
        log_warn "Binário nativo para $PLATFORM_ARCH não encontrado. Compilando..."
        (cd rust-core && pnpm install && pnpm build)
        log_success "Módulo nativo compilado."
    else
        log_success "Módulo nativo pronto ($PLATFORM_ARCH)."
    fi
}

fix_workspace_config() {
    log_info "Verificando integridade do workspace..."
    if [ ! -f "pnpm-workspace.yaml" ]; then
        cat > pnpm-workspace.yaml <<EOF
packages:
  - .
  - ui
  - rust-core
  - channels
  - extensions/*
EOF
        log_success "pnpm-workspace.yaml criado."
    fi

    if [ -f "rust-core/package.json" ]; then
        node -e '
        try {
            const fs = require("fs"); 
            const p = "rust-core/package.json"; 
            const j = JSON.parse(fs.readFileSync(p, "utf8")); 
            if (j.scripts && Object.keys(j.scripts).length > 0) {
                j.scripts = {}; 
                fs.writeFileSync(p, JSON.stringify(j, null, 2));
                console.log("cleaned");
            }
        } catch (e) { process.exit(0); }
        ' >/dev/null 2>&1
    fi
}

install_and_build() {
    fix_workspace_config
    echo "------------------------------------------"
    log_info "Instalando dependências do ZERO..."
    if ! pnpm install --no-frozen-lockfile; then
        log_error "Falha na instalação. Limpando cache e tentando novamente..."
        pnpm store prune
        if ! pnpm install --no-frozen-lockfile; then
            log_error "Falha critica na instalacao."
            exit 1
        fi
    fi

    log_info "Construindo Interface Altair..."
    if ! pnpm ui:build; then
        log_error "Falha na construção da UI. Verifique se o Vite está acessível."
        exit 1
    fi

    log_info "Construindo Núcleo..."
    if ! pnpm build; then
         log_error "Falha na construção do projeto."
         exit 1
    fi
}

setup_global() {
    log_info "Configurando comando 'zero' globalmente..."
    
    # 1. Definir PNPM_HOME padrão se não existir
    if [ -z "$PNPM_HOME" ]; then
        export PNPM_HOME="$HOME/.local/share/pnpm"
        mkdir -p "$PNPM_HOME"
    fi
    
    # 2. Configurar pnpm para usar este diretório
    pnpm config set global-bin-dir "$PNPM_HOME" 2>/dev/null || true
    
    # 3. Garantir que está no PATH da sessão
    case ":$PATH:" in
        *":$PNPM_HOME:"*) ;;
        *) export PATH="$PNPM_HOME:$PATH" ;;
    esac

    # 4. Tentar pnpm setup (resolve shells)
    pnpm setup >/dev/null 2>&1 || true

    # 5. Linkar
    log_info "Executando pnpm link --global..."
    if ! pnpm link --global; then
        log_warn "Link global falhou (possivel problema de permissao)."
        log_info "Tentando fallback manual..."
        # Tenta criar um alias ou link simbolico manual se possível
        mkdir -p "$PNPM_HOME"
        ln -sf "$(pwd)/dist/index.js" "$PNPM_HOME/zero" 2>/dev/null || true
    fi

    # 6. Persistência de PATH
    for rc in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.bash_profile"; do
        if [ -f "$rc" ] && ! grep -q "PNPM_HOME" "$rc"; then
            echo -e "\n# pnpm\nexport PNPM_HOME=\"$PNPM_HOME\"\nexport PATH=\"\$PNPM_HOME:\$PATH\"" >> "$rc"
            log_info "PATH adicionado a $(basename "$rc")"
        fi
    done
}

finish_setup() {
    echo "------------------------------------------"
    log_success "Instalação concluída com sucesso!"
    
    # Detectar ambiente Docker
    IS_CONTAINER=0
    if [ -f "/.dockerenv" ] || grep -q "docker" /proc/1/cgroup 2>/dev/null; then
        IS_CONTAINER=1
    fi

    echo -e "\nPara começar:"
    if [ "$IS_CONTAINER" -eq 1 ]; then
        echo -e "  ${BLUE}zero onboard${NC}"
    else
        echo -e "  ${BLUE}zero onboard --install-daemon${NC}"
    fi
    
    echo -e "\nSe o comando 'zero' não for encontrado, execute: ${YELLOW}source ~/.$(basename $SHELL)rc${NC}"
    
    if [ -f "$HOME/.zero/zero.json" ]; then
        log_info "Dica: Use 'zero start' para rodar o sistema."
    fi
}

# --- Ciclo de Vida ---
check_environment
check_node
check_pnpm
check_rust
check_build_tools
build_native_modules
install_and_build
setup_global
finish_setup
