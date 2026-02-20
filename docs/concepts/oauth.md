---
summary: "OAuth no ZERO: troca de tokens, armazenamento, sincronização de CLI e padrões de múltiplas contas"
read_when:
  - Você deseja entender o OAuth do ZERO de ponta a ponta
  - Você está enfrentando problemas de invalidação de token / logout
  - Você deseja reutilizar tokens OAuth do Claude Code / Codex CLI
  - Você deseja múltiplas contas ou roteamento por perfil
---
# OAuth

O ZERO suporta “autenticação por assinatura” via OAuth para provedores que o oferecem (especialmente **Anthropic (Claude Pro/Max)** e **OpenAI Codex (ChatGPT OAuth)**). Esta página explica:

- como funciona a **troca de tokens** OAuth (PKCE)
- onde os tokens são **armazenados** (e por quê)
- como **reutilizamos tokens de CLIs externas** (Claude Code / Codex CLI)
- como lidar com **múltiplas contas** (perfis + sobrescritas por sessão)

O ZERO também suporta **plugins de provedores** que oferecem seus próprios fluxos de OAuth ou chave de API. Execute-os via:

```bash
zero models auth login --provider <id>
```

## O dissipador de tokens (por que ele existe)

Os provedores de OAuth geralmente geram um **novo token de atualização (refresh token)** durante os fluxos de login/atualização. Alguns provedores (ou clientes OAuth) podem invalidar tokens de atualização antigos quando um novo é emitido para o mesmo usuário/app.

Sintoma prático:

- você faz o login via ZERO *e* via Claude Code / Codex CLI → um deles é desconectado aleatoriamente mais tarde ("logged out")

Para reduzir isso, o ZERO trata o `auth-profiles.json` como um **dissipador de tokens (token sink)**:

- o tempo de execução lê as credenciais de **um único lugar**
- podemos **sincronizar** credenciais de CLIs externas em vez de fazer um segundo login
- podemos manter múltiplos perfis e roteá-los de forma determinística

## Armazenamento (onde os tokens residem)

Os segredos são armazenados **por agente**:

- Perfis de autenticação (OAuth + chaves de API): `~/.zero/agents/<agentId>/agent/auth-profiles.json`
- Cache de tempo de execução (gerenciado automaticamente; não edite): `~/.zero/agents/<agentId>/agent/auth.json`

Arquivo legado apenas para importação (ainda suportado, mas não é o armazenamento principal):

- `~/.zero/credentials/oauth.json` (importado para `auth-profiles.json` no primeiro uso)

Todos os itens acima também respeitam `$ZERO_STATE_DIR` (sobrescrita do diretório de estado). Referência completa: [/gateway/configuration](/gateway/configuration#auth-storage-oauth--api-keys)

## Reutilizando tokens OAuth do Claude Code / Codex CLI (Recomendado)

Se você já fez login com as CLIs externas *no host do gateway*, o ZERO pode reutilizar esses tokens sem iniciar um fluxo OAuth separado:

- Claude Code: `anthropic:claude-cli`
  - macOS: Item das Chaves (Keychain) "Claude Code-credentials" (escolha "Sempre permitir" para evitar prompts do launchd)
  - Linux/Windows: `~/.claude/.credentials.json`
- Codex CLI: lê `~/.codex/auth.json` → perfil `openai-codex:codex-cli`

A sincronização ocorre quando o ZERO carrega o armazenamento de autenticação (para que ele permaneça atualizado quando as CLIs atualizarem os tokens).
No macOS, a primeira leitura pode disparar um prompt das Chaves (Keychain); execute `zero models status` em um terminal uma vez se o Gateway rodar de forma oculta (headless) e não puder acessar a entrada.

Como verificar:

```bash
zero models status
zero channels list
```

Ou em JSON:

```bash
zero channels list --json
```

## Troca de OAuth (como o login funciona)

Os fluxos de login interativos do ZERO são implementados em `@mariozechner/pi-ai` e conectados aos assistentes/comandos.

### Anthropic (Claude Pro/Max)

Estrutura do fluxo (PKCE):

1) gera verificador/desafio PKCE
2) abre `https://claude.ai/oauth/authorize?...`
3) o usuário cola `code#state`
4) troca em `https://console.anthropic.com/v1/oauth/token`
5) armazena `{ access, refresh, expires }` sob um perfil de autenticação

O caminho do assistente é `zero onboard` → escolha de autenticação `oauth` (Anthropic).

### OpenAI Codex (ChatGPT OAuth)

Estrutura do fluxo (PKCE):

1) gera verificador/desafio PKCE + `state` aleatório
2) abre `https://auth.openai.com/oauth/authorize?...`
3) tenta capturar o callback em `http://127.0.0.1:1455/auth/callback`
4) se o callback não puder ser vinculado (ou se você estiver remoto/headless), cole a URL de redirecionamento/código
5) troca em `https://auth.openai.com/oauth/token`
6) extrai o `accountId` do token de acesso e armazena `{ access, refresh, expires, accountId }`

O caminho do assistente é `zero onboard` → escolha de autenticação `openai-codex` (ou `codex-cli` para reutilizar um login existente da Codex CLI).

## Atualização (Refresh) + Expiração

Os perfis armazenam um carimbo de data/hora `expires`.

Em tempo de execução:

- se `expires` estiver no futuro → usa o token de acesso armazenado
- se expirado → atualiza (sob um bloqueio de arquivo) e sobrescreve as credenciais armazenadas

O fluxo de atualização é automático; você geralmente não precisa gerenciar os tokens manualmente.

### Sincronização bidirecional com o Claude Code

Quando o ZERO atualiza um token OAuth da Anthropic (perfil `anthropic:claude-cli`), ele **grava as novas credenciais de volta** no armazenamento do Claude Code:

- **Linux/Windows**: atualiza `~/.claude/.credentials.json`
- **macOS**: atualiza o item "Claude Code-credentials" das Chaves (Keychain)

Isso garante que ambas as ferramentas permaneçam em sincronia e nenhuma seja "desconectada" após a outra atualizar os tokens.

**Por que isso importa para agentes de longa duração:**

Os tokens OAuth da Anthropic expiram após algumas horas. Sem a sincronização bidirecional:

1. O ZERO atualiza o token → obtém um novo token de acesso
2. O Claude Code ainda tem o token antigo → é desconectado

Com a sincronização bidirecional, ambas as ferramentas sempre têm o último token válido, permitindo a operação autônoma por dias ou semanas sem intervenção manual.

## Múltiplas contas (perfis) + roteamento

Dois padrões:

### 1) Preferencial: agentes separados

Se você quiser que o “pessoal” e o “trabalho” nunca interajam, use agentes isolados (sessões + credenciais + espaço de trabalho separados):

```bash
zero agents add trabalhar
zero agents add pessoal
```

Em seguida, configure a autenticação por agente (assistente) e roteie os chats para o agente correto.

### 2) Avançado: múltiplos perfis em um único agente

O `auth-profiles.json` suporta múltiplos IDs de perfil para o mesmo provedor.

Escolha qual perfil será usado:

- globalmente via ordem de configuração (`auth.order`)
- por sessão via `/model ...@<profileId>`

Exemplo (sobrescrita de sessão):

- `/model Opus@anthropic:trabalho`

Como ver quais IDs de perfil existem:

- `zero channels list --json` (mostra `auth[]`)

Documentos relacionados:

- [/concepts/model-failover](/concepts/model-failover) (regras de rotação + cooldown)
- [/tools/slash-commands](/tools/slash-commands) (interface de comandos)
