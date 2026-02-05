---
summary: "Suporte Signal via signal-cli (JSON-RPC + SSE), configuração e modelo de número"
read_when:
  - Configurando suporte Signal
  - Depurando envio/recebimento Signal
---

# Signal (signal-cli)

Status: integração CLI externa. Gateway se comunica com `signal-cli` via HTTP JSON-RPC + SSE.

## Configuração rápida (iniciante)

1) Use um **número Signal separado** para o bot (recomendado).
2) Instale `signal-cli` (Java necessário).
3) Vincule o dispositivo do bot e inicie o daemon:
   - `signal-cli link -n "ZERO"`
4) Configure o ZERO e inicie o gateway.

Configuração mínima:

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"]
    }
  }
}
```

## O que é

- Canal Signal via `signal-cli` (não libsignal embutido).
- Roteamento determinístico: respostas sempre voltam para o Signal.
- DMs compartilham a sessão principal do agente; grupos são isolados (`agent:<agentId>:signal:group:<groupId>`).

## Gravações de configuração

Por padrão, o Signal tem permissão para gravar atualizações de configuração acionadas por `/config set|unset` (requer `commands.config: true`).

Desative com:

```json5
{
  channels: { signal: { configWrites: false } }
}
```

## O modelo de número (importante)

- O gateway conecta a um **dispositivo Signal** (a conta `signal-cli`).
- Se você rodar o bot na **sua conta Signal pessoal**, ele ignorará suas próprias mensagens (proteção contra loop).
- Para "Eu envio texto pro bot e ele responde", use um **número de bot separado**.

## Configuração (caminho rápido)

1) Instale `signal-cli` (Java necessário).
2) Vincule uma conta de bot:
   - `signal-cli link -n "ZERO"` depois escaneie o QR no Signal.
3) Configure Signal e inicie o gateway.

Exemplo:

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"]
    }
  }
}
```

Suporte multi-conta: use `channels.signal.accounts` com config por conta e `name` opcional. Veja [`gateway/configuration`](/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) para o padrão compartilhado.

## Modo daemon externo (httpUrl)

Se você quer gerenciar o `signal-cli` você mesmo (cold starts de JVM lentos, init de container, ou CPUs compartilhadas), execute o daemon separadamente e aponte o ZERO para ele:

```json5
{
  channels: {
    signal: {
      httpUrl: "http://127.0.0.1:8080",
      autoStart: false
    }
  }
}
```

Isso pula o auto-spawn e a espera de inicialização dentro do ZERO. Para inícios lentos ao usar auto-spawn, defina `channels.signal.startupTimeoutMs`.

## Controle de acesso (DMs + grupos)

DMs:

- Padrão: `channels.signal.dmPolicy = "pairing"`.
- Remetentes desconhecidos recebem um código de emparelhamento; mensagens são ignoradas até serem aprovadas (códigos expiram após 1 hora).
- Aprove via:
  - `zero pairing list signal`
  - `zero pairing approve signal <CODIGO>`
- Emparelhamento é a troca de token padrão para DMs Signal. Detalhes: [Emparelhamento](/start/pairing)
- Remetentes apenas UUID (de `sourceUuid`) são armazenados como `uuid:<id>` em `channels.signal.allowFrom`.

Grupos:

- `channels.signal.groupPolicy = open | allowlist | disabled`.
- `channels.signal.groupAllowFrom` controla quem pode acionar em grupos quando `allowlist` está definido.

## Como funciona (comportamento)

- `signal-cli` roda como um daemon; o gateway lê eventos via SSE.
- Mensagens de entrada são normalizadas no envelope de canal compartilhado.
- Respostas sempre roteiam de volta para o mesmo número ou grupo.

## Mídia + limites

- Texto de saída é fragmentado para `channels.signal.textChunkLimit` (padrão 4000).
- Fragmentação por nova linha opcional: defina `channels.signal.chunkMode="newline"` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- Anexos suportados (base64 buscado do `signal-cli`).
- Limite de mídia padrão: `channels.signal.mediaMaxMb` (padrão 8).
- Use `channels.signal.ignoreAttachments` para pular download de mídia.
- Contexto de histórico de grupo usa `channels.signal.historyLimit` (ou `channels.signal.accounts.*.historyLimit`), revertendo para `messages.groupChat.historyLimit`. Defina `0` para desativar (padrão 50).

## Digitação + recibos de leitura

- **Indicadores de digitação**: ZERO envia sinais de digitação via `signal-cli sendTyping` e os atualiza enquanto uma resposta está rodando.
- **Recibos de leitura**: quando `channels.signal.sendReadReceipts` é true, ZERO encaminha recibos de leitura para DMs permitidas.
- Signal-cli não expõe recibos de leitura para grupos.

## Reações (ferramenta de mensagem)

- Use `message action=react` com `channel=signal`.
- Alvos: remetente E.164 ou UUID (use `uuid:<id>` da saída de emparelhamento; UUID puro funciona também).
- `messageId` é o timestamp Signal para a mensagem a qual você está reagindo.
- Reações de grupo requerem `targetAuthor` ou `targetAuthorUuid`.

Exemplos:

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

Config:

- `channels.signal.actions.reactions`: ativar/desativar ações de reação (padrão true).
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`.
  - `off`/`ack` desativa reações do agente (ferramenta de mensagem `react` dará erro).
  - `minimal`/`extensive` ativa reações do agente e define o nível de orientação.
- Sobrescritas por conta: `channels.signal.accounts.<id>.actions.reactions`, `channels.signal.accounts.<id>.reactionLevel`.

## Alvos de entrega (CLI/cron)

- DMs: `signal:+15551234567` (ou E.164 simples).
- DMs UUID: `uuid:<id>` (ou UUID puro).
- Grupos: `signal:group:<groupId>`.
- Nomes de usuário: `username:<nome>` (se suportado pela sua conta Signal).

## Referência de configuração (Signal)

Configuração completa: [Configuração](/gateway/configuration)

Opções do provedor:

- `channels.signal.enabled`: ativar/desativar inicialização do canal.
- `channels.signal.account`: E.164 para a conta do bot.
- `channels.signal.cliPath`: caminho para `signal-cli`.
- `channels.signal.httpUrl`: URL completa do daemon (sobrescreve host/porta).
- `channels.signal.httpHost`, `channels.signal.httpPort`: bind do daemon (padrão 127.0.0.1:8080).
- `channels.signal.autoStart`: auto-spawn do daemon (padrão true se `httpUrl` não definido).
- `channels.signal.startupTimeoutMs`: timeout de espera de inicialização em ms (limite 120000).
- `channels.signal.receiveMode`: `on-start | manual`.
- `channels.signal.ignoreAttachments`: pular downloads de anexo.
- `channels.signal.ignoreStories`: ignorar stories do daemon.
- `channels.signal.sendReadReceipts`: encaminhar recibos de leitura.
- `channels.signal.dmPolicy`: `pairing | allowlist | open | disabled` (padrão: pairing).
- `channels.signal.allowFrom`: allowlist de DM (E.164 ou `uuid:<id>`). `open` requer `"*"`. Signal não tem nomes de usuário; use ids de telefone/UUID.
- `channels.signal.groupPolicy`: `open | allowlist | disabled` (padrão: allowlist).
- `channels.signal.groupAllowFrom`: allowlist de remetente de grupo.
- `channels.signal.historyLimit`: máx mensagens de grupo para incluir como contexto (0 desabilita).
- `channels.signal.dmHistoryLimit`: limite de histórico DM em turnos de usuário. Sobrescritas por usuário: `channels.signal.dms["<phone_or_uuid>"].historyLimit`.
- `channels.signal.textChunkLimit`: tamanho de fragmento de saída (chars).
- `channels.signal.chunkMode`: `length` (padrão) ou `newline` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- `channels.signal.mediaMaxMb`: limite de mídia de entrada/saída (MB).

Opções globais relacionadas:

- `agents.list[].groupChat.mentionPatterns` (Signal não suporta menções nativas).
- `messages.groupChat.mentionPatterns` (fallback global).
- `messages.responsePrefix`.
