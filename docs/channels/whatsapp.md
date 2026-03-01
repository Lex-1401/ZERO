---
summary: "Integração WhatsApp (canal web): login, inbox, respostas, mídia e operações"
read_when:
  - Trabalhando em comportamento de canal web/WhatsApp ou roteamento de inbox
---

# WhatsApp (canal web)

Status: WhatsApp Web via Baileys apenas. Gateway possui a(s) sessão(ões).

## Configuração rápida (iniciante)

1. Use um **número de telefone separado** se possível (recomendado).
2. Configure o WhatsApp em `~/.zero/zero.json`.
3. Execute `zero channels login` para escanear o código QR (Aparelhos Conectados).
4. Inicie o gateway.

Configuração mínima:

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
  },
}
```

## Objetivos

- Múltiplas contas WhatsApp (multi-conta) em um processo Gateway.
- Roteamento determinístico: respostas retornam ao WhatsApp, sem roteamento de modelo.
- Modelo vê contexto suficiente para entender respostas citadas.

## Gravações de configuração

Por padrão, o WhatsApp tem permissão para gravar atualizações de configuração acionadas por `/config set|unset` (requer `commands.config: true`).

Desative com:

```json5
{
  channels: { whatsapp: { configWrites: false } },
}
```

## Arquitetura (quem possui o quê)

- **Gateway** possui o socket Baileys e loop de inbox.
- **CLI / app macOS** falam com o gateway; sem uso direto do Baileys.
- **Active listener** é necessário para envios de saída; caso contrário o envio falha rápido.

## Obtendo um número de telefone (dois modos)

O WhatsApp requer um número móvel real para verificação. VoIP e números virtuais são geralmente bloqueados. Existem duas formas suportadas de rodar ZERO no WhatsApp:

### Número dedicado (recomendado)

Use um **número de telefone separado** para o ZERO. Melhor UX, roteamento limpo, sem peculiaridades de auto-chat. Configuração ideal: **celular Android sobressalente/velho + eSIM**. Deixe-o ligado no Wi‑Fi e energia, e vincule-o via QR.

**WhatsApp Business:** Você pode usar WhatsApp Business no mesmo dispositivo com um número diferente. Ótimo para manter seu WhatsApp pessoal separado — instale WhatsApp Business e registre o número do ZERO lá.

**Exemplo de config (número dedicado, allowlist de usuário único):**

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551234567"],
    },
  },
}
```

**Modo de emparelhamento (opcional):**
Se você quiser pairing em vez de allowlist, defina `channels.whatsapp.dmPolicy` para `pairing`. Remetentes desconhecidos recebem um código de pairing; aprove com:
`zero pairing approve whatsapp <codigo>`

### Número pessoal (fallback)

Fallback rápido: rode o ZERO no **seu próprio número**. Envie mensagem para você mesmo (WhatsApp “Mensagem para mim mesmo”) para testes para não spamar contatos. Espere ler códigos de verificação no seu telefone principal durante configuração e experimentos. **Deve ativar modo self-chat.**
Quando o assistente pedir seu número pessoal WhatsApp, insira o telefone do qual você enviará mensagem (o dono/remetente), não o número do assistente.

**Exemplo de config (número pessoal, self-chat):**

```json
{
  "whatsapp": {
    "selfChatMode": true,
    "dmPolicy": "allowlist",
    "allowFrom": ["+15551234567"]
  }
}
```

Respostas de self-chat padronizam para `[{identity.name}]` quando definido (caso contrário `[zero]`)
se `messages.responsePrefix` não estiver definido. Defina explicitamente para customizar ou desativar
o prefixo (use `""` para remover).

### Dicas para obter número

- **eSIM Local** da operadora móvel do seu país (mais confiável)
  - Áustria: [hot.at](https://www.hot.at)
  - Reino Unido: [giffgaff](https://www.giffgaff.com) — SIM grátis, sem contrato
- **SIM Pré-pago** — barato, só precisa receber um SMS para verificação

**Evite:** TextNow, Google Voice, maioria dos serviços "SMS grátis" — WhatsApp bloqueia estes agressivamente.

**Dica:** O número só precisa receber um SMS de verificação. Depois disso, sessões WhatsApp Web persistem via `creds.json`.

## Por que não Twilio?

- Builds iniciais do ZERO suportavam a integração WhatsApp Business do Twilio.
- Números WhatsApp Business são um ajuste ruim para um assistente pessoal.
- Meta impõe uma janela de resposta de 24 horas; se você não respondeu nas últimas 24 horas, o número comercial não pode iniciar novas mensagens.
- Uso de alto volume ou "falador" aciona bloqueio agressivo, porque contas comerciais não são destinadas a enviar dezenas de mensagens de assistente pessoal.
- Resultado: entrega não confiável e bloqueios frequentes, então o suporte foi removido.

## Login + credenciais

- Comando de Login: `zero channels login` (QR via Aparelhos Conectados).
- Login multi-conta: `zero channels login --account <id>` (`<id>` = `accountId`).
- Conta padrão (quando `--account` é omitido): `default` se presente, caso contrário o primeiro id de conta configurado (ordenado).
- Credenciais armazenadas em `~/.zero/credentials/whatsapp/<accountId>/creds.json`.
- Cópia de backup em `creds.json.bak` (restaurada na corrupção).
- Compatibilidade legada: instalações mais antigas armazenavam arquivos Baileys diretamente em `~/.zero/credentials/`.
- Logout: `zero channels logout` (ou `--account <id>`) deleta estado de auth WhatsApp (mas mantém `oauth.json` compartilhado).
- Socket desconectado => erro instrui re-vincular.

## Fluxo de entrada (DM + grupo)

- Eventos WhatsApp vêm de `messages.upsert` (Baileys).
- Ouvintes de inbox são desconectados no desligamento para evitar acumular manipuladores de evento em testes/reinicializações.
- Chats de status/transmissão são ignorados.
- Chats diretos usam E.164; grupos usam JID de grupo.
- **Política de DM**: `channels.whatsapp.dmPolicy` controla acesso a chat direto (padrão: `pairing`).
  - Pairing: remetentes desconhecidos recebem um código de emparelhamento (aprove via `zero pairing approve whatsapp <codigo>`; códigos expiram após 1 hora).
  - Open: requer `channels.whatsapp.allowFrom` incluir `"*"`.
  - Self messages são sempre permitidas; “modo self-chat” ainda requer `channels.whatsapp.allowFrom` incluir seu próprio número.

### Modo número-pessoal (fallback)

Se você rodar ZERO no seu **número pessoal WhatsApp**, ative `channels.whatsapp.selfChatMode` (veja exemplo acima).

Comportamento:

- DMs de saída nunca acionam respostas de emparelhamento (evita spam para contatos).
- Remetentes desconhecidos de entrada ainda seguem `channels.whatsapp.dmPolicy`.
- Modo self-chat (allowFrom inclui seu número) evita recibos de leitura automáticos e ignora JIDs de menção.
- Recibos de leitura enviados para DMs não-self-chat.

## Recibos de leitura

Por padrão, o gateway marca mensagens de entrada do WhatsApp como lidas (tiques azuis) assim que são aceitas.

Desative globalmente:

```json5
{
  channels: { whatsapp: { sendReadReceipts: false } },
}
```

Desative por conta:

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        pessoal: { sendReadReceipts: false },
      },
    },
  },
}
```

Notas:

- Modo self-chat sempre pula recibos de leitura.

## WhatsApp FAQ: enviando mensagens + emparelhamento

**O ZERO vai mandar mensagem para contatos aleatórios quando eu vincular o WhatsApp?**
Não. A política padrão de DM é **pairing** (emparelhamento), então remetentes desconhecidos recebem apenas um código de emparelhamento e a mensagem deles **não é processada**. O ZERO só responde a chats que recebe, ou a envios que você dispara explicitamente (agente/CLI).

**Como funciona o emparelhamento no WhatsApp?**
Emparelhamento é um portão DM para remetentes desconhecidos:

- Primeira DM de um novo remetente retorna um código curto (mensagem não é processada).
- Aprove com: `zero pairing approve whatsapp <codigo>` (liste com `zero pairing list whatsapp`).
- Códigos expiram após 1 hora; requisições pendentes são limitadas a 3 por canal.

**Várias pessoas podem usar ZEROs diferentes em um número WhatsApp?**
Sim, roteando cada remetente para um agente diferente via `bindings` (peer `kind: "dm"`, remetente E.164 como `+15551234567`). Respostas ainda vêm da **mesma conta WhatsApp**, e chats diretos colapsam para a sessão principal de cada agente, então use **um agente por pessoa**. Controle de acesso DM (`dmPolicy`/`allowFrom`) é global por conta WhatsApp. Veja [Roteamento Multi-Agente](/concepts/multi-agent).

**Por que você pede meu número de telefone no assistente?**
O assistente o usa para definir seu **allowlist/dono** para que suas próprias DMs sejam permitidas. Não é usado para envio automático. Se você rodar no seu número pessoal WhatsApp, use esse mesmo número e ative `channels.whatsapp.selfChatMode`.

## Normalização de mensagem (o que o modelo vê)

- `Body` é o corpo da mensagem atual com envelope.
- Contexto de resposta citada é **sempre anexado**:

  ```
  [Replying to +1555 id:ABC123]
  <texto citado ou <media:...>>
  [/Replying]
  ```

- Metadados de resposta também definidos:
  - `ReplyToId` = stanzaId
  - `ReplyToBody` = corpo citado ou placeholder de mídia
  - `ReplyToSender` = E.164 quando conhecido
- Mensagens de entrada somente mídia usam placeholders:
  - `<media:image|video|audio|document|sticker>`

## Grupos

- Grupos mapeiam para sessões `agent:<agentId>:whatsapp:group:<jid>`.
- Política de grupo: `channels.whatsapp.groupPolicy = open|disabled|allowlist` (padrão `allowlist`).
- Modos de ativação:
  - `mention` (padrão): requer @menção ou correspondência regex.
  - `always`: sempre aciona.
- `/activation mention|always` é apenas para dono e deve ser enviado como uma mensagem autônoma.
- Dono = `channels.whatsapp.allowFrom` (ou self E.164 se não definido).
- **Injeção de histórico** (somente pendente):
  - Mensagens recentes _não processadas_ (padrão 50) inseridas sob:
    `[Chat messages since your last reply - for context]` (mensagens já na sessão não são re-injetadas)
  - Mensagem atual sob:
    `[Current message - respond to this]`
  - Sufixo de remetente anexado: `[from: Nome (+E164)]`
- Metadados de grupo cacheados 5 min (assunto + participantes).

## Entrega de resposta (threading)

- WhatsApp Web envia mensagens padrão (sem threading de resposta citada no gateway atual).
- Tags de resposta são ignoradas neste canal.

## Reações de reconhecimento (auto-reação ao receber)

O WhatsApp pode enviar automaticamente reações de emoji para mensagens recebidas imediatamente após o recebimento, antes que o bot gere uma resposta. Isso fornece feedback instantâneo aos usuários de que a mensagem foi recebida.

**Configuração:**

```json
{
  "whatsapp": {
    "ackReaction": {
      "emoji": "👀",
      "direct": true,
      "group": "mentions"
    }
  }
}
```

**Opções:**

- `emoji` (string): Emoji para usar para reconhecimento (ex., "👀", "✅", "📨"). Vazio ou omitido = recurso desativado.
- `direct` (boolean, padrão: `true`): Enviar reações em chats diretos/DM.
- `group` (string, padrão: `"mentions"`): Comportamento de chat de grupo:
  - `"always"`: Reagir a todas as mensagens de grupo (mesmo sem @menção)
  - `"mentions"`: Reagir apenas quando bot for @mencionado
  - `"never"`: Nunca reagir em grupos

**Sobrescrita por conta:**

```json
{
  "whatsapp": {
    "accounts": {
      "trabalho": {
        "ackReaction": {
          "emoji": "✅",
          "direct": false,
          "group": "always"
        }
      }
    }
  }
}
```

**Notas de comportamento:**

- Reações são enviadas **imediatamente** após recebimento da mensagem, antes de indicadores de digitação ou respostas do bot.
- Em grupos com `requireMention: false` (ativação: always), `group: "mentions"` reagirá a todas as mensagens (não apenas @menções).
- Disparar e esquecer: falhas de reação são logadas mas não impedem o bot de responder.
- JID do participante é automaticamente incluído para reações de grupo.
- WhatsApp ignora `messages.ackReaction`; use `channels.whatsapp.ackReaction` em vez disso.

## Ferramenta de agente (reações)

- Ferramenta: `whatsapp` com ação `react` (`chatJid`, `messageId`, `emoji`, opcional `remove`).
- Opcional: `participant` (remetente de grupo), `fromMe` (reagindo à sua própria mensagem), `accountId` (multi-conta).
- Semântica de remoção de reação: veja [/tools/reactions](/tools/reactions).
- Bloqueio por ferramenta: `channels.whatsapp.actions.reactions` (padrão: ativado).

## Limites

- Texto de saída é fragmentado para `channels.whatsapp.textChunkLimit` (padrão 4000).
- Fragmentação por nova linha opcional: defina `channels.whatsapp.chunkMode="newline"` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- Salvos de mídia de entrada são limitados por `channels.whatsapp.mediaMaxMb` (padrão 50 MB).
- Itens de mídia de saída são limitados por `agents.defaults.mediaMaxMb` (padrão 5 MB).

## Envio de saída (texto + mídia)

- Usa ouvinte web ativo; erro se gateway não estiver rodando.
- Fragmentação de texto: 4k máx por mensagem (configurável via `channels.whatsapp.textChunkLimit`, opcional `channels.whatsapp.chunkMode`).
- Mídia:
  - Imagem/vídeo/áudio/documento suportados.
  - Áudio enviado como PTT; `audio/ogg` => `audio/ogg; codecs=opus`.
  - Legenda apenas no primeiro item de mídia.
  - Busca de mídia suporta HTTP(S) e caminhos locais.
  - GIFs animados: WhatsApp espera MP4 com `gifPlayback: true` para loop inline.
    - CLI: `zero message send --media <mp4> --gif-playback`
    - Gateway: params `send` incluem `gifPlayback: true`

## Notas de voz (áudio PTT)

O WhatsApp envia áudio como **notas de voz** (balão PTT).

- Melhores resultados: OGG/Opus. ZERO reescreve `audio/ogg` para `audio/ogg; codecs=opus`.
- `[[audio_as_voice]]` é ignorado para WhatsApp (áudio já é enviado como nota de voz).

## Limites de mídia + otimização

- Cap de saída padrão: 5 MB (por item de mídia).
- Sobrescrita: `agents.defaults.mediaMaxMb`.
- Imagens são auto-otimizadas para JPEG sob o cap (redimensionar + varredura de qualidade).
- Mídia muito grande => erro; resposta de mídia reverte para aviso de texto.

## Heartbeats

- **Gateway heartbeat** loga saúde da conexão (`web.heartbeatSeconds`, padrão 60s).
- **Agent heartbeat** pode ser configurado por agente (`agents.list[].heartbeat`) ou globalmente
  via `agents.defaults.heartbeat` (fallback quando nenhuma entrada por agente está definida).
  - Usa o prompt de heartbeat configurado (padrão: `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`) + `HEARTBEAT_OK` comportamento de pular.
  - Entrega padroniza para o último canal usado (ou alvo configurado).

## Comportamento de reconexão

- Política de backoff: `web.reconnect`:
  - `initialMs`, `maxMs`, `factor`, `jitter`, `maxAttempts`.
- Se maxAttempts alcançado, monitoramento web para (degradado).
- Desconectado => para e exige re-vincular.

## Mapa rápido de configuração

- `channels.whatsapp.dmPolicy` (Política DM: pairing/allowlist/open/disabled).
- `channels.whatsapp.selfChatMode` (configuração mesmo-telefone; bot usa seu número pessoal WhatsApp).
- `channels.whatsapp.allowFrom` (allowlist de DM). WhatsApp usa números de telefone E.164 (sem nomes de usuário).
- `channels.whatsapp.mediaMaxMb` (cap de salvamento de mídia de entrada).
- `channels.whatsapp.ackReaction` (auto-reação ao receber mensagem: `{emoji, direct, group}`).
- `channels.whatsapp.accounts.<accountId>.*` (configurações por conta + opcional `authDir`).
- `channels.whatsapp.accounts.<accountId>.mediaMaxMb` (cap de mídia de entrada por conta).
- `channels.whatsapp.accounts.<accountId>.ackReaction` (sobrescrita de reação de ack por conta).
- `channels.whatsapp.groupAllowFrom` (allowlist de remetente de grupo).
- `channels.whatsapp.groupPolicy` (política de grupo).
- `channels.whatsapp.historyLimit` / `channels.whatsapp.accounts.<accountId>.historyLimit` (contexto de histórico de grupo; `0` desabilita).
- `channels.whatsapp.dmHistoryLimit` (limite de histórico DM em turnos de usuário). Sobrescritas por usuário: `channels.whatsapp.dms["<phone>"].historyLimit`.
- `channels.whatsapp.groups` (allowlist de grupo + padrões de bloqueio de menção; use `"*"` para permitir todos)
- `channels.whatsapp.actions.reactions` (bloquear reações de ferramenta WhatsApp).
- `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`)
- `messages.groupChat.historyLimit`
- `channels.whatsapp.messagePrefix` (prefixo de entrada; por conta: `channels.whatsapp.accounts.<accountId>.messagePrefix`; depreciado: `messages.messagePrefix`)
- `messages.responsePrefix` (prefixo de saída)
- `agents.defaults.mediaMaxMb`
- `agents.defaults.heartbeat.every`
- `agents.defaults.heartbeat.model` (sobrescrita opcional)
- `agents.defaults.heartbeat.target`
- `agents.defaults.heartbeat.to`
- `agents.defaults.heartbeat.session`
- `agents.list[].heartbeat.*` (sobrescritas por agente)
- `session.*` (scope, idle, store, mainKey)
- `web.enabled` (desativar inicialização de canal quando false)
- `web.heartbeatSeconds`
- `web.reconnect.*`

## Logs + solução de problemas

- Subsistemas: `whatsapp/inbound`, `whatsapp/outbound`, `web-heartbeat`, `web-reconnect`.
- Arquivo de log: `/tmp/zero/zero-YYYY-MM-DD.log` (configurável).
- Guia de solução de problemas: [Solução de problemas de Gateway](/gateway/troubleshooting).

## Solução de problemas (rápida)

**Não vinculado / login QR necessário**

- Sintoma: `channels status` mostra `linked: false` ou avisa “Not linked”.
- Correção: execute `zero channels login` no host do gateway e escaneie o QR (WhatsApp → Configurações → Aparelhos Conectados).

**Vinculado mas desconectado / loop de reconexão**

- Sintoma: `channels status` mostra `running, disconnected` ou avisa “Linked but disconnected”.
- Correção: `zero doctor` (ou reinicie o gateway). Se persistir, revincule via `channels login` e inspecione `zero logs --follow`.

**Runtime Bun**

- Bun **não é recomendado**. WhatsApp (Baileys) e Telegram são instáveis no Bun.
  Rode o gateway com **Node**. (Veja nota de runtime em Getting Started.)
