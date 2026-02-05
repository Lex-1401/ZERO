---
summary: "Guia para iniciantes: do zero à primeira mensagem (wizard, autenticação, canais, pareamento)"
read_when:
  - Primeira configuração do zero
  - Você quer o caminho mais rápido desde a instalação → integração → primeira mensagem
---

# Primeiros Passos

Objetivo: ir do **zero** → **primeiro chat funcional** (com padrões sensatos) o mais rápido possível.

Caminho recomendado: use o **assistente de integração da CLI** (`zero onboard`). Ele configura:

- modelo/autenticação (OAuth recomendado)
- configurações do gateway
- canais (WhatsApp/Telegram/Discord/Mattermost (plugin)/...)
- padrões de pareamento (DMs seguras)
- bootstrap do espaço de trabalho + habilidades
- serviço de segundo plano opcional

Para páginas de referência mais profundas, pule para: [Assistente](/start/wizard), [Configuração](/start/setup), [Pareamento](/start/pairing), [Segurança](/gateway/security).

Nota sobre Sandbox: `agents.defaults.sandbox.mode: "non-main"` usa `session.mainKey` (padrão `"main"`),
então sessões de grupo/canal são isoladas. Se você quer que o agente principal sempre
seja executado no host, defina uma sobreposição explícita por agente:

```json
{
  "routing": {
    "agents": {
      "main": {
        "workspace": "~/zero",
        "sandbox": { "mode": "off" }
      }
    }
  }
}
```

## 0) Pré-requisitos

- Node `>=22`
- `pnpm` (opcional; recomendado se você construir a partir do código-fonte)
- **Recomendado:** Chave de API do Brave Search para busca na web. Caminho mais fácil:
  `zero configure --section web` (armazena `tools.web.search.apiKey`).
  Veja [Ferramentas Web](/tools/web).

macOS: se você planeja construir os aplicativos, instale Xcode / CLT. Apenas para a CLI + gateway, o Node é suficiente.
Windows: use **WSL2** (Ubuntu recomendado). O WSL2 é fortemente recomendado; o Windows nativo não foi testado, é mais problemático e tem pior compatibilidade com ferramentas. Instale o WSL2 primeiro e depois execute os passos do Linux dentro do WSL. Veja [Windows (WSL2)](/platforms/windows).

## 1) Instale a CLI (recomendado)

```bash
curl -fsSL https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.sh | bash
```

Opções do instalador (método de instalação, não interativo, a partir do GitHub): [Instalação](/install).

Windows (PowerShell):

```powershell
iwr -useb https://raw.githubusercontent.com/Lex-1401/ZERO/main/install.ps1 | iex
```

Alternativa (instalação global):

```bash
npm install -g zero@latest
```

```bash
pnpm add -g zero@latest
```

## 2) Execute o assistente de integração (e instale o serviço)

```bash
zero onboard --install-daemon
```

O que você escolherá:

- Gateway **Local vs Remoto**
- **Autenticação**: Assinatura OpenAI Code (Codex) (OAuth) ou chaves de API. Para Anthropic, recomendamos uma chave de API; `claude setup-token` também é suportado.
- **Provedores**: Login via QR do WhatsApp, tokens de bot do Telegram/Discord, tokens de plugin do Mattermost, etc.
- **Daemon**: instalação em segundo plano (launchd/systemd; WSL2 usa systemd)
  - **Runtime**: Node (recomendado; necessário para WhatsApp/Telegram). Bun **não é recomendado**.
- **Token do Gateway**: o assistente gera um por padrão (mesmo em loopback) e o armazena em `gateway.auth.token`.

Doc do assistente: [Assistente](/start/wizard)

### Autenticação: onde ela reside (importante)

- **Caminho recomendado para Anthropic:** defina uma chave de API (o assistente pode armazená-la para uso do serviço). `claude setup-token` também é suportado se você quiser reutilizar as credenciais do Claude Code.

- Credenciais OAuth (importação legada): `~/.zero/credentials/oauth.json`
- Perfis de autenticação (OAuth + Chaves de API): `~/.zero/agents/<agentId>/agent/auth-profiles.json`

Dica para headless/servidor: faça o OAuth em uma máquina normal primeiro e depois copie o `oauth.json` para o host do gateway.

## 3) Inicie o Gateway

Se você instalou o serviço durante a integração, o Gateway já deve estar rodando:

```bash
zero gateway status
```

Execução manual (primeiro plano):

```bash
zero gateway --port 18789 --verbose
```

Dashboard (loopback local): `http://127.0.0.1:18789/`
Se um token estiver configurado, cole-o nas configurações da UI de Controle (armazenado como `connect.params.auth.token`).

⚠️ **Aviso sobre Bun (WhatsApp + Telegram):** O Bun tem problemas conhecidos com esses
canais. Se você usa WhatsApp ou Telegram, execute o Gateway com **Node**.

## 3.5) Verificação rápida (2 min)

```bash
zero status
zero health
```

## 4) Pareie + conecte sua primeira superfície de chat

### WhatsApp (Login via QR)

```bash
zero channels login
```

Escaneie via WhatsApp → Configurações → Aparelhos Conectados.

Doc do WhatsApp: [WhatsApp](/channels/whatsapp)

### Telegram / Discord / outros

O assistente pode gravar tokens/configurações para você. Se preferir configuração manual, comece por:

- Telegram: [Telegram](/channels/telegram)
- Discord: [Discord](/channels/discord)
- Mattermost (plugin): [Mattermost](/channels/mattermost)

**Dica de DM no Telegram:** sua primeira DM retorna um código de pareamento. Aprove-o (veja o próximo passo) ou o bot não responderá.

## 5) Segurança de DM (aprovações de pareamento)

Postura padrão: DMs desconhecidas recebem um código curto e as mensagens não são processadas até serem aprovadas.
Se sua primeira DM não receber resposta, aprove o pareamento:

```bash
zero pairing list whatsapp
zero pairing approve whatsapp <code>
```

Doc de Pareamento: [Pareamento](/start/pairing)

## A partir do código-fonte (desenvolvimento)

Se você estiver modificando o próprio ZERO, execute a partir do código-fonte:

```bash
git clone https://github.com/zero/zero.git
cd zero
pnpm install
pnpm ui:build # instala dependências da UI automaticamente na primeira execução
pnpm build
zero onboard --install-daemon
```

Se você ainda não tem uma instalação global, execute o passo de integração via `pnpm zero ...` a partir do repositório.

Gateway (a partir deste repositório):

```bash
node dist/entry.js gateway --port 18789 --verbose
```

## 7) Verificação de ponta a ponta

Em um novo terminal, envie uma mensagem de teste:

```bash
zero message send --target +15555550123 --message "Olá do ZERO"
```

Se `zero health` mostrar “no auth configured”, volte ao assistente e configure a autenticação OAuth/chave — o agente não poderá responder sem isso.

Dica: `zero status --all` é o melhor relatório de depuração somente leitura e colável.
Provas de saúde: `zero health` (ou `zero status --deep`) solicita ao gateway em execução um instantâneo de saúde.

## Próximos passos (opcionais, mas ótimos)

- App da barra de menu do macOS + despertar por voz: [App para macOS](/platforms/macos)
- Nós iOS/Android (Canvas/câmera/voz): [Nós](/nodes)
- Acesso remoto (túnel SSH / Tailscale Serve): [Acesso remoto](/gateway/remote) e [Tailscale](/gateway/tailscale)
- Configurações sempre ativas / VPN: [Acesso remoto](/gateway/remote), [exe.dev](/platforms/exe-dev), [Hetzner](/platforms/hetzner), [macOS remoto](/platforms/mac/remote)
