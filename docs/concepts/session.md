---
summary: "Regras de gerenciamento de sessão, chaves e persistência para chats"
read_when:
  - Modificando o tratamento de sessão ou armazenamento
---
# Gerenciamento de Sessão

O ZERO trata **uma sessão de chat direto por agente** como primária. Chats diretos são recolhidos para `agent:<agentId>:<mainKey>` (padrão `main`), enquanto chats de grupo/canal recebem suas próprias chaves. O `session.mainKey` é respeitado.

Use `session.dmScope` para controlar como as **mensagens diretas (DMs)** são agrupadas:

- `main` (padrão): todas as DMs compartilham a sessão principal para continuidade.
- `per-peer`: isola pelo ID do remetente entre os canais.
- `per-channel-peer`: isola por canal + remetente (recomendado para caixas de entrada de múltiplos usuários).

Use `session.identityLinks` para mapear IDs de pares prefixados pelo provedor para uma identidade canônica, para que a mesma pessoa compartilhe uma sessão de DM entre canais ao usar `per-peer` ou `per-channel-peer`.

## O Gateway é a fonte da verdade

Todo o estado da sessão é **propriedade do gateway** (o ZERO “mestre”). Clientes de UI (app macOS, WebChat, etc.) devem consultar o gateway para obter listas de sessões e contagem de tokens em vez de ler arquivos locais.

- No **modo remoto**, o armazenamento de sessão que importa reside no host do gateway remoto, não no seu Mac.
- As contagens de tokens mostradas nas UIs vêm dos campos de armazenamento do gateway (`inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`). Os clientes não analisam transcrições JSONL para “corrigir” os totais.

## Onde o estado reside

- No **host do gateway**:
  - Arquivo de armazenamento: `~/.zero/agents/<agentId>/sessions/sessions.json` (por agente).
- Transcrições: `~/.zero/agents/<agentId>/sessions/<SessionId>.jsonl` (sessões de tópicos do Telegram usam `.../<SessionId>-topic-<threadId>.jsonl`).
- O armazenamento é um mapa `sessionKey -> { sessionId, updatedAt, ... }`. Deletar entradas é seguro; elas são recriadas sob demanda.
- Entradas de grupo podem incluir `displayName`, `channel`, `subject`, `room` e `space` para rotular as sessões nas UIs.
- Entradas de sessão incluem metadados de `origin` (rótulo + dicas de roteamento) para que as UIs possam explicar de onde veio uma sessão.
- O ZERO **não** lê pastas de sessão legadas do Pi/Tau.

## Poda de sessão (Session pruning)

O ZERO remove **resultados de ferramentas antigos** do contexto em memória logo antes das chamadas ao LLM por padrão. Isso **não** reescreve o histórico JSONL. Veja [/concepts/session-pruning](/concepts/session-pruning).

## Limpeza de memória pré-compactação

Quando uma sessão se aproxima da auto-compactação, o ZERO pode executar um turno de **limpeza de memória silenciosa** que lembra o modelo de escrever notas duráveis no disco. Isso só funciona quando o espaço de trabalho é gravável. Veja [Memória](/concepts/memory) e [Compactação](/concepts/compaction).

## Mapeamento de transportes → chaves de sessão

- Chats diretos seguem `session.dmScope` (padrão `main`).
  - `main`: `agent:<agentId>:<mainKey>` (continuidade entre dispositivos/canais).
    - Múltiplos números de telefone e canais podem mapear para a mesma chave principal do agente; eles agem como transportes para uma única conversa.
  - `per-peer`: `agent:<agentId>:dm:<peerId>`.
  - `per-channel-peer`: `agent:<agentId>:<channel>:dm:<peerId>`.
  - Se `session.identityLinks` corresponder a um ID de par prefixado pelo provedor (por exemplo, `telegram:123`), a chave canônica substitui o `<peerId>` para que a mesma pessoa compartilhe uma sessão entre canais.
- Chats de grupo isolam o estado: `agent:<agentId>:<channel>:group:<id>` (salas/canais usam `agent:<agentId>:<channel>:channel:<id>`).
  - Tópicos de fórum do Telegram anexam `:topic:<threadId>` ao ID do grupo para isolamento.
  - Chaves `group:<id>` legadas ainda são reconhecidas para migração.
- Contextos de entrada ainda podem usar `group:<id>`; o canal é inferido a partir do `Provider` e normalizado para a forma canônica `agent:<agentId>:<channel>:group:<id>`.
- Outras fontes:
  - Tarefas Cron: `cron:<job.id>`
  - Webhooks: `hook:<uuid>` (a menos que definido explicitamente pelo hook)
  - Execuções de nós (Nodes): `node-<nodeId>`

## Ciclo de vida

- Política de reset: as sessões são reutilizadas até expirarem, e a expiração é avaliada na próxima mensagem de entrada.
- Reset diário: o padrão é **4:00 AM horário local no host do gateway**. Uma sessão é considerada obsoleta quando sua última atualização é anterior ao horário de reset diário mais recente.
- Reset por inatividade (opcional): `idleMinutes` adiciona uma janela de inatividade deslizante. Quando ambos os resets (diário e por inatividade) estão configurados, **o que expirar primeiro** força uma nova sessão.
- Legado apenas por inatividade: se você definir `session.idleMinutes` sem qualquer configuração de `session.reset`/`resetByType`, o ZERO permanece no modo apenas de inatividade para compatibilidade com versões anteriores.
- Sobrescritas por tipo (opcional): `resetByType` permite sobrescrever a política para sessões `dm`, `group` e `thread` (thread = threads do Slack/Discord, tópicos do Telegram, threads do Matrix quando fornecidos pelo conector).
- Sobrescritas por canal (opcional): `resetByChannel` sobrescreve a política de reset para um canal (aplica-se a todos os tipos de sessão para aquele canal e tem precedência sobre `reset`/`resetByType`).
- Gatilhos de reset: `/new` ou `/reset` exatos (além de quaisquer extras em `resetTriggers`) iniciam um novo ID de sessão e passam o restante da mensagem adiante. `/new <modelo>` aceita um alias de modelo, `provedor/modelo` ou nome do provedor (correspondência aproximada) para definir o novo modelo da sessão. Se `/new` ou `/reset` for enviado sozinho, o ZERO executa um pequeno turno de saudação ("olá") para confirmar o reset.
- Reset manual: delete chaves específicas do armazenamento ou remova a transcrição JSONL; a próxima mensagem as recriará.
- Tarefas cron isoladas sempre geram um novo `sessionId` por execução (sem reutilização por inatividade).

## Política de envio (Send policy, opcional)

Bloqueia a entrega para tipos de sessão específicos sem listar IDs individuais.

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
        { action: "deny", match: { keyPrefix: "cron:" } }
      ],
      default: "allow"
    }
  }
}
```

Sobrescrita em tempo de execução (apenas proprietário):

- `/send on` → permitir para esta sessão
- `/send off` → negar para esta sessão
- `/send inherit` → limpar sobrescrita e usar regras de configuração
Envie estas mensagens sozinhas para que sejam registradas.

## Configuração (exemplo de renomeação opcional)

```json5
// ~/.zero/zero.json
{
  session: {
    scope: "per-sender",      // manter as chaves de grupo separadas
    dmScope: "main",          // continuidade de DM (defina per-channel-peer para caixas de entrada compartilhadas)
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"]
    },
    reset: {
      // Padrões: mode=daily, atHour=4 (horário local do host do gateway).
      // Se você também definir idleMinutes, o que expirar primeiro vence.
      mode: "daily",
      atHour: 4,
      idleMinutes: 120
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      dm: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 }
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 }
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.zero/agents/{agentId}/sessions/sessions.json",
    mainKey: "main",
  }
}
```

## Inspecionando

- `zero status` — mostra o caminho do armazenamento e as sessões recentes.
- `zero sessions --json` — despeja todas as entradas (filtre com `--active <minutos>`).
- `zero gateway call sessions.list --params '{}'` — busca as sessões do gateway em execução (use `--url`/`--token` para acesso ao gateway remoto).
- Envie `/status` como uma mensagem avulsa no chat para ver se o agente está acessível, quanto do contexto da sessão está sendo usado, as opções atuais de pensamento (thinking)/detalhamento (verbose) e quando as suas credenciais do WhatsApp web foram atualizadas pela última vez.
- Envie `/context list` ou `/context detail` para ver o que está no prompt do sistema e nos arquivos injetados do espaço de trabalho (e os maiores contribuintes de contexto).
- Envie `/stop` como uma mensagem avulsa para abortar a execução atual, limpar os acompanhamentos (followups) enfileirados para aquela sessão e parar qualquer execução de sub-agente originada dela (a resposta inclui a contagem de execuções paradas).
- Envie `/compact` (instruções opcionais) como uma mensagem avulsa para resumir o contexto antigo e liberar espaço na janela. Veja [/concepts/compaction](/concepts/compaction).
- As transcrições JSONL podem ser abertas diretamente para revisar os turnos completos.

## Dicas

- Mantenha a chave primária dedicada ao tráfego 1:1; deixe que os grupos mantenham suas próprias chaves.
- Ao automatizar a limpeza, delete chaves individuais em vez de todo o armazenamento para preservar o contexto em outros lugares.

## Metadados de origem da sessão (Session origin metadata)

Cada entrada de sessão registra de onde veio (melhor esforço) em `origin`:

- `label`: rótulo humano (resolvido a partir do rótulo da conversa + assunto do grupo/canal)
- `provider`: ID do canal normalizado (incluindo extensões)
- `from`/`to`: IDs de roteamento brutos do pacote de entrada
- `accountId`: ID da conta do provedor (quando multi-conta)
- `threadId`: ID da thread/tópico quando o canal suporta
Os campos de origem são preenchidos para mensagens diretas, canais e grupos. Se um conector atualizar apenas o roteamento de entrega (por exemplo, para manter uma sessão principal de DM atualizada), ele ainda deve fornecer o contexto de entrada para que a sessão mantenha seus metadados explicativos. Extensões podem fazer isso enviando `ConversationLabel`, `GroupSubject`, `GroupChannel`, `GroupSpace` e `SenderName` no contexto de entrada e chamando `recordSessionMetaFromInbound` (ou passando o mesmo contexto para `updateLastRoute`).
