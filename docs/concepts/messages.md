---
summary: "Fluxo de mensagens, sessões, enfileiramento e visibilidade do raciocínio"
read_when:
  - Explicando como as mensagens de entrada se tornam respostas
  - Esclarecendo sessões, modos de enfileiramento ou comportamento de streaming
  - Documentando a visibilidade do raciocínio e as implicações de uso
---
# Mensagens

Esta página mostra como o ZERO lida com mensagens de entrada, sessões, enfileiramento, streaming e visibilidade do raciocínio.

## Fluxo de mensagens (alto nível)

```text
Mensagem de entrada
  -> roteamento/vínculos (bindings) -> chave de sessão
  -> fila (se uma execução estiver ativa)
  -> execução do agente (streaming + ferramentas)
  -> respostas de saída (limites do canal + divisão/chunking)
```

As principais opções residem na configuração:

- `messages.*` para prefixos, enfileiramento e comportamento de grupo.
- `agents.defaults.*` para padrões de streaming de blocos e divisão (chunking).
- Sobrescritas por canal (`channels.whatsapp.*`, `channels.telegram.*`, etc.) para limites e alternâncias de streaming.

Veja [Configuração](/gateway/configuration) para o esquema completo.

## Eliminação de duplicatas de entrada (Dedupe)

Os canais podem entregar a mesma mensagem novamente após reconexões. O ZERO mantém um cache de curta duração por ID de canal/conta/par/sessão/mensagem para que entregas duplicadas não acionem outra execução do agente.

## Agrupamento de entrada (Debouncing)

Mensagens consecutivas rápidas do **mesmo remetente** podem ser agrupadas em um único turno do agente via `messages.inbound`. O agrupamento é escopado por canal + conversa e utiliza a mensagem mais recente para encadeamento/IDs de resposta.

Configuração (padrão global + sobrescritas por canal):

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500
      }
    }
  }
}
```

Notas:

- O agrupamento se aplica a mensagens **apenas de texto**; mídia/anexos são liberados imediatamente.
- Comandos de controle ignoram o agrupamento para que permaneçam independentes.

## Sessões e dispositivos

As sessões são de propriedade do gateway, não dos clientes.

- Chats diretos são recolhidos na chave de sessão principal do agente.
- Grupos/canais recebem suas próprias chaves de sessão.
- O armazenamento da sessão e as transcrições residem no host do gateway.

Múltiplos dispositivos/canais podem mapear para a mesma sessão, mas o histórico não é totalmente sincronizado de volta para cada cliente. Recomendação: use um dispositivo principal para conversas longas para evitar contextos divergentes. O Control UI e o TUI sempre mostram a transcrição da sessão baseada no gateway, portanto, são a fonte da verdade.

Detalhes: [Gerenciamento de sessão](/concepts/session).

## Corpos de entrada e contexto de histórico

O ZERO separa o **corpo do prompt** do **corpo do comando**:

- `Body`: texto do prompt enviado ao agente. Isso pode incluir envelopes do canal e invólucros de histórico opcionais.
- `CommandBody`: texto bruto do usuário para análise de diretiva/comando.
- `RawBody`: alias legado para `CommandBody` (mantido por compatibilidade).

Quando um canal fornece histórico, ele usa um invólucro compartilhado:

- `[Mensagens de chat desde sua última resposta - para contexto]`
- `[Mensagem atual - responda a esta]`

Para **chats que não são diretos** (grupos/canais/salas), o **corpo da mensagem atual** é prefixado com o rótulo do remetente (mesmo estilo usado para entradas de histórico). Isso mantém as mensagens em tempo real e as mensagens enfileiradas/históricas consistentes no prompt do agente.

Os buffers de histórico são **apenas pendentes**: eles incluem mensagens de grupo que *não* acionaram uma execução (por exemplo, mensagens controladas por menção) e **excluem** mensagens que já estão na transcrição da sessão.

A remoção de diretivas aplica-se apenas à seção da **mensagem atual**, para que o histórico permaneça intacto. Canais que envolvem o histórico devem definir `CommandBody` (ou `RawBody`) como o texto original da mensagem e manter `Body` como o prompt combinado. Os buffers de histórico são configuráveis via `messages.groupChat.historyLimit` (padrão global) e sobrescritas por canal, como `channels.slack.historyLimit` ou `channels.telegram.accounts.<id>.historyLimit` (defina `0` para desativar).

## Enfileiramento e acompanhamentos (Followups)

Se uma execução já estiver ativa, as mensagens de entrada podem ser enfileiradas, direcionadas para a execução atual ou coletadas para um turno de acompanhamento.

- Configure via `messages.queue` (e `messages.queue.byChannel`).
- Modos: `interrupt` (interromper), `steer` (direcionar), `followup` (acompanhamento), `collect` (coletar), além de variantes de backlog.

Detalhes: [Enfileiramento](/concepts/queue).

## Streaming, divisões (chunking) e processamento em lote (batching)

O streaming de blocos envia respostas parciais conforme o modelo produz blocos de texto. A divisão (chunking) respeita os limites de texto do canal e evita dividir o código em cercas (fenced code).

Configurações principais:

- `agents.defaults.blockStreamingDefault` (`on|off`, padrão off)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (processamento em lote baseado em inatividade)
- `agents.defaults.humanDelay` (pausa semelhante à humana entre as respostas dos blocos)
- Sobrescritas por canal: `*.blockStreaming` e `*.blockStreamingCoalesce` (canais que não sejam o Telegram exigem explicitamente `*.blockStreaming: true`)

Detalhes: [Streaming + divisões (chunking)](/concepts/streaming).

## Visibilidade do raciocínio e tokens

O ZERO pode expor ou ocultar o raciocínio do modelo:

- `/reasoning on|off|stream` controla a visibilidade.
- O conteúdo do raciocínio ainda conta para o uso de tokens quando produzido pelo modelo.
- O Telegram suporta o fluxo de raciocínio no balão de rascunho.

Detalhes: [Diretivas de pensamento + raciocínio](/tools/thinking) e [Uso de tokens](/token-use).

## Prefixos, encadeamento e respostas

A formatação da mensagem de saída é centralizada em `messages`:

- `messages.responsePrefix` (prefixo de saída) e `channels.whatsapp.messagePrefix` (prefixo de entrada do WhatsApp)
- Encadeamento de respostas via `replyToMode` e padrões por canal.

Detalhes: [Configuração](/gateway/configuration#messages) e documentos dos canais.
