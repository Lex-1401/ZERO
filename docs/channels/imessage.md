---
summary: "Suporte iMessage via imsg (JSON-RPC sobre stdio), configuração e roteamento chat_id"
read_when:
  - Configurando suporte iMessage
  - Depurando envio/recebimento iMessage
---

# iMessage (imsg)

Status: integração CLI externa. Gateway inicia `imsg rpc` (JSON-RPC sobre stdio).

## Configuração rápida (iniciante)

1) Garanta que o Mensagens esteja logado neste Mac.
2) Instale `imsg`:
   - `brew install steipete/tap/imsg`
3) Configure o ZERO com `channels.imessage.cliPath` e `channels.imessage.dbPath`.
4) Inicie o gateway e aprove quaisquer solicitações do macOS (Automação + Acesso Total ao Disco).

Configuração mínima:

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<voce>/Library/Messages/chat.db"
    }
  }
}
```

## O que é

- Canal iMessage apoiado pelo `imsg` no macOS.
- Roteamento determinístico: respostas sempre voltam para o iMessage.
- DMs compartilham a sessão principal do agente; grupos são isolados (`agent:<agentId>:imessage:group:<chat_id>`).
- Se uma thread multi-participante chegar com `is_group=false`, você ainda pode isolá-la por `chat_id` usando `channels.imessage.groups` (veja "Threads tipo-grupo" abaixo).

## Gravações de configuração

Por padrão, o iMessage tem permissão para gravar atualizações de configuração acionadas por `/config set|unset` (requer `commands.config: true`).

Desative com:

```json5
{
  channels: { imessage: { configWrites: false } }
}
```

## Requisitos

- macOS com Mensagens logado.
- Acesso Total ao Disco para ZERO + `imsg` (acesso ao DB de Mensagens).
- Permissão de automação ao enviar.
- `channels.imessage.cliPath` pode apontar para qualquer comando que faça proxy de stdin/stdout (por exemplo, um script wrapper que faz SSH para outro Mac e roda `imsg rpc`).

## Configuração (caminho rápido)

1) Garanta que o Mensagens esteja logado neste Mac.
2) Configure iMessage e inicie o gateway.

### Usuário macOS dedicado para bot (para identidade isolada)

Se você quer que o bot envie de uma **identidade iMessage separada** (e mantenha seu Mensagens pessoal limpo), use um Apple ID dedicado + um usuário macOS dedicado.

1) Crie um Apple ID dedicado (exemplo: `meu-bot-legal@icloud.com`).
   - A Apple pode exigir um número de telefone para verificação / 2FA.
2) Crie um usuário macOS (exemplo: `zeroshome`) e faça login nele.
3) Abra o Mensagens nesse usuário macOS e faça login no iMessage usando o Apple ID do bot.
4) Habilite Login Remoto (Definições do Sistema → Geral → Compartilhamento → Login Remoto).
5) Instale `imsg`:
   - `brew install steipete/tap/imsg`
6) Configure SSH para que `ssh <usuario-macos-bot>@localhost true` funcione sem senha.
7) Aponte `channels.imessage.accounts.bot.cliPath` para um wrapper SSH que roda `imsg` como o usuário bot.

Nota de primeira execução: enviar/receber pode exigir aprovações de GUI (Automação + Acesso Total ao Disco) no *usuário macOS do bot*. Se `imsg rpc` parecer travado ou sair, faça login nesse usuário (Compartilhamento de Tela ajuda), rode um `imsg chats --limit 1` / `imsg send ...` único, aprove as solicitações, depois tente novamente.

Exemplo de wrapper (`chmod +x`). Substitua `<usuario-macos-bot>` com seu nome de usuário macOS real:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Execute um SSH interativo uma vez primeiro para aceitar chaves de host:
#   ssh <usuario-macos-bot>@localhost true
exec /usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=5 -T <usuario-macos-bot>@localhost \
  "/usr/local/bin/imsg" "$@"
```

Configuração de exemplo:

```json5
{
  channels: {
    imessage: {
      enabled: true,
      accounts: {
        bot: {
          name: "Bot",
          enabled: true,
          cliPath: "/caminho/para/imsg-bot",
          dbPath: "/Users/<usuario-macos-bot>/Library/Messages/chat.db"
        }
      }
    }
  }
}
```

Para configurações de conta única, use opções planas (`channels.imessage.cliPath`, `channels.imessage.dbPath`) em vez do mapa `accounts`.

### Variante Remota/SSH (opcional)

Se você quer iMessage em outro Mac, defina `channels.imessage.cliPath` para um wrapper que roda `imsg` no host macOS remoto via SSH. O ZERO só precisa de stdio.

Exemplo de wrapper:

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

**Anexos remotos:** Quando `cliPath` aponta para um host remoto via SSH, caminhos de anexo no banco de dados de Mensagens referenciam arquivos na máquina remota. O ZERO busca isso automaticamente via SCP se você definir `channels.imessage.remoteHost`:

```json5
{
  channels: {
    imessage: {
      cliPath: "~/imsg-ssh",                     // Wrapper SSH para Mac remoto
      remoteHost: "user@gateway-host",           // para transferência de arquivo SCP
      includeAttachments: true
    }
  }
}
```

Se `remoteHost` não for definido, o ZERO tenta detectá-lo automaticamente analisando o comando SSH no seu script wrapper. Configuração explícita é recomendada para confiabilidade.

#### Mac Remoto via Tailscale (exemplo)

Se o Gateway roda em um host/VM Linux mas o iMessage deve rodar em um Mac, Tailscale é a ponte mais simples: o Gateway fala com o Mac pela tailnet, roda `imsg` via SSH, e faz SCP dos anexos de volta.

Arquitetura:

```text
┌──────────────────────────────┐          SSH (imsg rpc)          ┌──────────────────────────┐
│ Gateway host (Linux/VM)      │──────────────────────────────────▶│ Mac com Mensagens + imsg │
│ - zero gateway           │          SCP (anexos)            │ - Mensagens logado       │
│ - channels.imessage.cliPath  │◀──────────────────────────────────│ - Login Remoto habilitado│
└──────────────────────────────┘                                   └──────────────────────────┘
              ▲
              │ Tailscale tailnet (hostname ou 100.x.y.z)
              ▼
        user@gateway-host
```

Exemplo de configuração concreta (hostname Tailscale):

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.zero/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db"
    }
  }
}
```

Exemplo de wrapper (`~/.zero/scripts/imsg-ssh`):

```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

Notas:

- Garanta que o Mac esteja logado no Mensagens, e Login Remoto habilitado.
- Use chaves SSH para que `ssh bot@mac-mini.tailnet-1234.ts.net` funcione sem prompts.
- `remoteHost` deve corresponder ao alvo SSH para que o SCP possa buscar anexos.

Suporte multi-conta: use `channels.imessage.accounts` com config por conta e `name` opcional. Veja [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) para o padrão compartilhado. Não faça commit de `~/.zero/zero.json` (ele frequentemente contém tokens).

## Controle de acesso (DMs + grupos)

DMs:

- Padrão: `channels.imessage.dmPolicy = "pairing"`.
- Remetentes desconhecidos recebem um código de emparelhamento; mensagens são ignoradas até serem aprovadas (códigos expiram após 1 hora).
- Aprove via:
  - `zero pairing list imessage`
  - `zero pairing approve imessage <CODIGO>`
- Emparelhamento é a troca de token padrão para DMs iMessage. Detalhes: [Emparelhamento](/start/pairing)

Grupos:

- `channels.imessage.groupPolicy = open | allowlist | disabled`.
- `channels.imessage.groupAllowFrom` controla quem pode acionar em grupos quando `allowlist` está definido.
- Bloqueio por menção usa `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`) porque o iMessage não tem metadados de menção nativos.
- Sobrescrita multi-agente: defina padrões por agente em `agents.list[].groupChat.mentionPatterns`.

## Como funciona (comportamento)

- `imsg` faz streaming de eventos de mensagem; o gateway os normaliza no envelope de canal compartilhado.
- Respostas sempre roteiam de volta para o mesmo id de chat ou handle.

## Threads tipo-grupo (`is_group=false`)

Algumas threads do iMessage podem ter múltiplos participantes mas ainda chegar com `is_group=false` dependendo de como o Mensagens armazena o identificador do chat.

Se você configurar explicitamente um `chat_id` sob `channels.imessage.groups`, o ZERO trata essa thread como um "grupo" para:

- isolamento de sessão (chave de sessão `agent:<agentId>:imessage:group:<chat_id>` separada)
- comportamento de allowlist de grupo / bloqueio por menção

Exemplo:

```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "42": { "requireMention": false }
      }
    }
  }
}
```

Isso é útil quando você quer uma personalidade/modelo isolado para uma thread específica (veja [Roteamento multi-agente](/concepts/multi-agent)). Para isolamento de sistema de arquivos, veja [Sandboxing](/gateway/sandboxing).

## Mídia + limites

- Ingestão de anexo opcional via `channels.imessage.includeAttachments`.
- Limite de mídia via `channels.imessage.mediaMaxMb`.

## Limites

- Texto de saída é fragmentado para `channels.imessage.textChunkLimit` (padrão 4000).
- Fragmentação por nova linha opcional: defina `channels.imessage.chunkMode="newline"` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- Uploads de mídia são limitados por `channels.imessage.mediaMaxMb` (padrão 16).

## Endereçamento / alvos de entrega

Prefira `chat_id` para roteamento estável:

- `chat_id:123` (preferido)
- `chat_guid:...`
- `chat_identifier:...`
- alças diretas: `imessage:+1555` / `sms:+1555` / `user@example.com`

Listar chats:

```bash
imsg chats --limit 20
```

## Referência de configuração (iMessage)

Configuração completa: [Configuração](/gateway/configuration)

Opções do provedor:

- `channels.imessage.enabled`: ativar/desativar inicialização do canal.
- `channels.imessage.cliPath`: caminho para `imsg`.
- `channels.imessage.dbPath`: caminho do DB de Mensagens.
- `channels.imessage.remoteHost`: host SSH para transferência de anexo SCP quando `cliPath` aponta para um Mac remoto (ex., `user@gateway-host`). Auto-detectado do wrapper SSH se não definido.
- `channels.imessage.service`: `imessage | sms | auto`.
- `channels.imessage.region`: região SMS.
- `channels.imessage.dmPolicy`: `pairing | allowlist | open | disabled` (padrão: pairing).
- `channels.imessage.allowFrom`: allowlist de DM (alças, emails, números E.164, ou `chat_id:*`). `open` requer `"*"`. iMessage não tem nomes de usuário; use alças ou alvos de chat.
- `channels.imessage.groupPolicy`: `open | allowlist | disabled` (padrão: allowlist).
- `channels.imessage.groupAllowFrom`: allowlist de remetente de grupo.
- `channels.imessage.historyLimit` / `channels.imessage.accounts.*.historyLimit`: máx mensagens de grupo para incluir como contexto (0 desabilita).
- `channels.imessage.dmHistoryLimit`: limite de histórico DM em turnos de usuário. Sobrescritas por usuário: `channels.imessage.dms["<handle>"].historyLimit`.
- `channels.imessage.groups`: padrões por grupo + allowlist (use `"*"` para padrões globais).
- `channels.imessage.includeAttachments`: ingerir anexos no contexto.
- `channels.imessage.mediaMaxMb`: limite de mídia de entrada/saída (MB).
- `channels.imessage.textChunkLimit`: tamanho de fragmento de saída (chars).
- `channels.imessage.chunkMode`: `length` (padrão) ou `newline` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.

Opções globais relacionadas:

- `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.
