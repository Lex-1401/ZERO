---
summary: "Como funcionam os scripts de instalação (quickstart.sh + install-cli.sh), flags e automação"
read_when:
  - Você quer entender o `zero.local/quickstart.sh`
  - Você quer automatizar instalações (CI / headless)
  - Você quer instalar a partir de um checkout do GitHub
---

# Detalhes do Instalador

O ZERO fornece scripts de instalação principais:

- `https://raw.githubusercontent.com/Lex-1401/ZERO/main/quickstart.sh` — instalador "recomendado" (instalação global npm por padrão; também pode instalar a partir de um checkout do GitHub)
- `https://raw.githubusercontent.com/Lex-1401/ZERO/main/install-cli.sh` — instalador CLI amigável para não-root (instala em um prefixo com seu próprio Node)
- `https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.ps1` — instalador Windows PowerShell (npm por padrão; instalação git opcional)

Para ver as flags/comportamentos atuais, execute:

```bash
curl -fsSL https://raw.githubusercontent.com/Lex-1401/ZERO/main/quickstart.sh | bash -s -- --help
```

Ajuda para Windows (PowerShell):

```powershell
& ([scriptblock]::Create((iwr -useb https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.ps1))) -?
```

Se o instalador for concluído, mas o comando `zero` não for encontrado em um novo terminal, geralmente é um problema de PATH do Node/npm. Veja: [Instalação](/install#nodejs--npm-path-sanity).

## quickstart.sh (recomendado)

O que ele faz (alto nível):

- Detecta o SO (macOS / Linux / WSL).
- Garante Node.js **22+** (macOS via Homebrew; Linux via NodeSource).
- Escolhe o método de instalação:
  - `npm` (padrão): `npm install -g zero@latest`
  - `git`: clona/compila um checkout de código-fonte e instala um script wrapper
- No Linux: evita erros de permissão global do npm alterando o prefixo do npm para `~/.npm-global` quando necessário.
- Se estiver atualizando uma instalação existente: executa `zero doctor --non-interactive` (melhor esforço).
- Para instalações git: executa `zero doctor --non-interactive` após instalação/atualização (melhor esforço).
- Mitiga problemas de instalação nativa do `sharp` definindo `SHARP_IGNORE_GLOBAL_LIBVIPS=1` por padrão (evita compilar contra libvips do sistema).

Se você *quer* que o `sharp` vincule a um libvips instalado globalmente (ou está depurando), defina:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=0 curl -fsSL https://raw.githubusercontent.com/Lex-1401/ZERO/main/quickstart.sh | bash
```

### Descoberta / prompt de "instalação git"

Se você executar o instalador enquanto **já estiver dentro de um checkout de código-fonte ZERO** (detectado via `package.json` + `pnpm-workspace.yaml`), ele pergunta:

- atualizar e usar este checkout (`git`)
- ou migrar para a instalação global npm (`npm`)

Em contextos não interativos (sem TTY / `--no-prompt`), você deve passar `--install-method git|npm` (ou definir `ZERO_INSTALL_METHOD`), caso contrário o script sai com código `2`.

### Por que o Git é necessário

Git é necessário para o caminho `--install-method git` (clone / pull).

Para instalações `npm`, o Git *geralmente* não é necessário, mas alguns ambientes ainda acabam precisando dele (por exemplo, quando um pacote ou dependência é buscado via URL git). O instalador atualmente garante que o Git esteja presente para evitar surpresas `spawn git ENOENT` em distros limpas.

### Por que o npm encontra `EACCES` em Linux limpo

Em algumas configurações Linux (especialmente após instalar o Node via gerenciador de pacotes do sistema ou NodeSource), o prefixo global do npm aponta para um local de propriedade do root. Então `npm install -g ...` falha com erros de permissão `EACCES` / `mkdir`.

O `quickstart.sh` mitiga isso trocando o prefixo para:

- `~/.npm-global` (e adicionando-o ao `PATH` em `~/.bashrc` / `~/.zshrc` quando presente)

## install-cli.sh (instalador CLI não-root)

Este script instala o `zero` em um prefixo (padrão: `~/.zero`) e também instala um runtime Node dedicado sob esse prefixo, para que possa funcionar em máquinas onde você não quer tocar no Node/npm do sistema.

Ajuda:

```bash
curl -fsSL https://raw.githubusercontent.com/Lex-1401/ZERO/main/install-cli.sh | bash -s -- --help
```

## install.ps1 (Windows PowerShell)

O que ele faz (alto nível):

- Garante Node.js **22+** (winget/Chocolatey/Scoop ou manual).
- Escolhe o método de instalação:
  - `npm` (padrão): `npm install -g zero@latest`
  - `git`: clona/compila um checkout de código-fonte e instala um script wrapper
- Executa `zero doctor --non-interactive` em atualizações e instalações git (melhor esforço).

Exemplos:

```powershell
iwr -useb https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.ps1 | iex
```

```powershell
iwr -useb https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.ps1 | iex -InstallMethod git
```

```powershell
iwr -useb https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.ps1 | iex -InstallMethod git -GitDir "C:\\zero"
```

Variáveis de ambiente:

- `ZERO_INSTALL_METHOD=git|npm`
- `ZERO_GIT_DIR=...`

Requisito Git:

Se você escolher `-InstallMethod git` e o Git estiver faltando, o instalador imprimirá o link do Git para Windows (`https://git-scm.com/download/win`) e sairá.

Problemas comuns no Windows:

- **npm error spawn git / ENOENT**: instale o Git para Windows e reabra o PowerShell, depois execute o instalador novamente.
- **"zero" is not recognized**: sua pasta bin global do npm não está no PATH. A maioria dos sistemas usa `%AppData%\\npm`. Você também pode executar `npm config get prefix` e adicionar `\\bin` ao PATH, depois reabrir o PowerShell.
