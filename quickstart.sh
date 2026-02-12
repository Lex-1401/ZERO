#!/bin/bash
# ∅ ZERO — Instalador Rápido Inteligente
# Este script automatiza a instalação, resolve dependências e lança o sistema.

set -euo pipefail

# Garantir UTF-8 e seguranca de rede
export LC_ALL=C.UTF-8
export LANG=C.UTF-8
export CURL_SECURE_FLAGS="-fsSL"

# MEDIUM-002: Detectar se sudo é necessário (evitar CWE-250)
if [ "${EUID:-$(id -u)}" -eq 0 ]; then
    SUDO=""
else
    SUDO="sudo"
fi

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
# 0. Auditoria: Funcao setup_global removida daqui (redundancia eliminada).


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
        log_warn "Node.js não encontrado. Instalando via NVM (Protocolo Seguro)..."
        NVM_VERSION="v0.40.1"
        NVM_INSTALLER="$(mktemp)"
        curl $CURL_SECURE_FLAGS "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" -o "$NVM_INSTALLER"
        if [ ! -s "$NVM_INSTALLER" ]; then
            log_error "Falha ao baixar instalador do NVM. Arquivo vazio ou corrompido."
            rm -f "$NVM_INSTALLER"
            exit 1
        fi
        bash "$NVM_INSTALLER"
        rm -f "$NVM_INSTALLER"
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 22
        nvm use 22
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2)
        MAJOR_VER=${NODE_VERSION%%.*}
        if [ "$MAJOR_VER" -lt 22 ]; then
            log_error "Node.js versao $NODE_VERSION detectada. O ZERO requer versao 22 ou superior."
            exit 1
        fi
        log_success "Node.js $(node -v) pronto."
    fi
}

# 2.1 Verificar GIT (Essencial para Workspace)
check_git() {
    if ! command -v git >/dev/null 2>&1; then
        log_warn "GIT nao encontrado. Tentando instalar..."
        if [ "$(uname)" == "Linux" ]; then
            if command -v apt-get >/dev/null 2>&1; then
                $SUDO apt-get update && $SUDO apt-get install -y git || log_error "Falha ao instalar GIT via apt-get."
            elif command -v dnf >/dev/null 2>&1; then
                $SUDO dnf install -y git || log_error "Falha ao instalar GIT via dnf."
            elif command -v yum >/dev/null 2>&1; then
                $SUDO yum install -y git || log_error "Falha ao instalar GIT via yum."
            elif command -v apk >/dev/null 2>&1; then
                $SUDO apk add --no-cache git || log_error "Falha ao instalar GIT via apk."
            elif command -v pacman >/dev/null 2>&1; then
                $SUDO pacman -S --noconfirm git || log_error "Falha ao instalar GIT via pacman."
            else
                log_error "Nenhum gerenciador de pacotes suportado encontrado. Instale o GIT manualmente."
                exit 1
            fi
        else
            log_error "GIT ausente. Por favor, instale o GIT antes de prosseguir."
            exit 1
        fi
    fi
    log_success "GIT pronto."
}


# 3. Gerenciador de Pacotes (pnpm)
check_pnpm() {
    if ! command -v pnpm >/dev/null 2>&1; then
        log_info "Instalando pnpm globalmente..."
        npm install -g pnpm || $SUDO npm install -g pnpm
    else
        log_success "pnpm detectado."
    fi
}

# 4. Rust & Native Modules
check_rust() {
    if ! command -v cargo >/dev/null 2>&1; then
        log_warn "Rust não encontrado. Instalando via rustup (HTTPS TLS 1.2+)..."
        RUSTUP_INSTALLER="$(mktemp)"
        curl --proto '=https' --tlsv1.2 $CURL_SECURE_FLAGS https://sh.rustup.rs -o "$RUSTUP_INSTALLER"
        if [ ! -s "$RUSTUP_INSTALLER" ]; then
            log_error "Falha ao baixar instalador do Rust. Arquivo vazio ou corrompido."
            rm -f "$RUSTUP_INSTALLER"
            exit 1
        fi
        sh "$RUSTUP_INSTALLER" -y
        rm -f "$RUSTUP_INSTALLER"
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
                $SUDO apt-get update && $SUDO apt-get install -y build-essential python3
            elif command -v apk >/dev/null 2>&1; then
                $SUDO apk add build-base python3 || apk add build-base python3
            elif command -v yum >/dev/null 2>&1; then
                $SUDO yum groupinstall "Development Tools" -y && $SUDO yum install -y python3
            elif command -v dnf >/dev/null 2>&1; then
                $SUDO dnf groupinstall "Development Tools" -y && $SUDO dnf install -y python3
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
check_git
check_node
check_pnpm
check_rust
check_build_tools
build_native_modules
install_and_build
setup_global
finish_setup
