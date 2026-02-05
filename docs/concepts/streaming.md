---
summary: "Comportamento de streaming + divisão (chunking) - respostas em blocos, streaming de rascunhos, limites"
read_when:
  - Explicando como o streaming ou a divisão (chunking) funciona nos canais
  - Alterando o streaming de blocos ou o comportamento de divisão do canal
  - Depurando respostas de blocos duplicadas/antecipadas ou streaming de rascunhos
---
# Streaming + divisão (chunking)

O ZERO possui duas camadas de “streaming” separadas:

- **Streaming de blocos (canais):** emite **blocos** completos enquanto o assistente escreve. Estas são mensagens normais do canal (não deltas de tokens).
- **Streaming de tokens (apenas Telegram):** atualiza um **balão de rascunho (draft bubble)** com texto parcial durante a geração; a mensagem final é enviada ao término.

Hoje **não há streaming de tokens real** para mensagens de canais externos. O streaming de rascunho do Telegram é a única superfície de stream parcial.

## Streaming de blocos (mensagens de canal)

O streaming de blocos envia a saída do assistente em partes conforme disponibilizadas.

```text
Saída do modelo
  └─ text_delta/eventos
       ├─ (blockStreamingBreak=text_end)
       │    └─ divisor (chunker) emite blocos conforme o buffer cresce
       └─ (blockStreamingBreak=message_end)
            └─ divisor (chunker) libera ao final da mensagem (message_end)
                   └─ envio pelo canal (respostas em blocos)
```

Legenda:

- `text_delta/eventos`: eventos de stream do modelo (podem ser escassos para modelos que não suportam streaming).
- `divisor (chunker)`: `EmbeddedBlockChunker` aplicando limites mín/máx + preferência de quebra.
- `envio pelo canal`: mensagens de saída reais (respostas em blocos).

**Controles:**

- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"` (padrão off).
- Sobrescritas por canal: `*.blockStreaming` (e variantes por conta) para forçar `"on"`/`"off"` por canal.
- `agents.defaults.blockStreamingBreak`: `"text_end"` ou `"message_end"`.
- `agents.defaults.blockStreamingChunk`: `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce`: `{ minChars?, maxChars?, idleMs? }` (mescla blocos transmitidos antes do envio).
- Limite máximo do canal: `*.textChunkLimit` (ex: `channels.whatsapp.textChunkLimit`).
- Modo de divisão do canal: `*.chunkMode` (`length` é o padrão; `newline` divide em linhas em branco (limites de parágrafo) antes da divisão por tamanho).
- Limite suave do Discord: `channels.discord.maxLinesPerMessage` (padrão 17) divide respostas altas para evitar cortes na interface.

**Semântica de limites:**

- `text_end`: envia blocos assim que o divisor emite; limpa o buffer em cada `text_end`.
- `message_end`: aguarda até que a mensagem do assistente termine e então envia a saída em buffer.

O modo `message_end` ainda usa o divisor se o texto em buffer exceder o `maxChars`, podendo emitir múltiplas partes ao final.

## Algoritmo de divisão (limites baixo/alto)

A divisão de blocos é implementada pelo `EmbeddedBlockChunker`:

- **Limite baixo:** não emite até que o buffer seja `>= minChars` (a menos que forçado).
- **Limite alto:** prefere quebras antes de `maxChars`; se forçado, divide em `maxChars`.
- **Preferência de quebra:** `paragraph` (parágrafo) → `newline` (nova linha) → `sentence` (frase) → `whitespace` (espaço em branco) → quebra brusca.
- **Cercas de código (fenced code):** nunca divide dentro de cercas; quando forçado em `maxChars`, fecha e reabre a cerca para manter o Markdown válido.

O `maxChars` é limitado pelo `textChunkLimit` do canal, garantindo que os limites por canal não sejam excedidos.

## Coalescência (mesclar blocos transmitidos)

Quando o streaming de blocos está habilitado, o ZERO pode **mesclar partes de blocos consecutivas** antes de enviá-las. Isso reduz o "spam de linha única" enquanto ainda fornece uma saída progressiva.

- A coalescência aguarda **intervalos de inatividade** (`idleMs`) antes de liberar o envio.
- Os buffers são limitados por `maxChars` e serão liberados se excederem esse valor.
- `minChars` evita o envio de fragmentos minúsculos até que texto suficiente seja acumulado (a liberação final sempre envia o texto restante).
- O caractere de junção deriva de `blockStreamingChunk.breakPreference` (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → espaço).
- Sobrescritas por canal estão disponíveis via `*.blockStreamingCoalesce` (incluindo configurações por conta).
- O `minChars` padrão de coalescência é aumentado para 1500 para Signal/Slack/Discord, a menos que sobrescrito.

## Pacing (ritmo) humano entre blocos

Quando o streaming de blocos está habilitado, você pode adicionar uma **pausa aleatória** entre as respostas dos blocos (após o primeiro bloco). Isso faz com que as respostas com múltiplos balões pareçam mais naturais.

- Configuração: `agents.defaults.humanDelay` (sobrescrita por agente via `agents.list[].humanDelay`).
- Modos: `off` (padrão), `natural` (800–2500ms), `custom` (`minMs`/`maxMs`).
- Aplica-se apenas a **respostas de blocos**, não a respostas finais ou resumos de ferramentas.

## “Partes do stream ou tudo ao final”

Isso se mapeia para:

- **Partes do stream (Stream chunks):** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (emite conforme avança). Canais que não sejam o Telegram também precisam de `*.blockStreaming: true`.
- **Stream de tudo ao final:** `blockStreamingBreak: "message_end"` (libera uma única vez, possivelmente em várias partes se muito longo).
- **Sem streaming de blocos:** `blockStreamingDefault: "off"` (apenas a resposta final).

**Nota do canal:** Para canais que não sejam o Telegram, o streaming de blocos fica **desativado, a menos que** `*.blockStreaming` seja explicitamente definido como `true`. O Telegram pode transmitir rascunhos (`channels.telegram.streamMode`) sem respostas de blocos.

Lembrete de localização da configuração: os padrões `blockStreaming*` vivem sob `agents.defaults`, não na raiz da configuração.

## Streaming de rascunhos do Telegram (tipo token)

O Telegram é o único canal com streaming de rascunhos:

- Usa o `sendMessageDraft` da API de Bot em **chats privados com tópicos**.
- `channels.telegram.streamMode: "partial" | "block" | "off"`.
  - `partial`: rascunho atualiza com o texto mais recente do stream.
  - `block`: rascunho atualiza em blocos divididos (mesmas regras do divisor).
  - `off`: sem streaming de rascunho.
- Configuração de rascunho (apenas para `streamMode: "block"`): `channels.telegram.draftChunk` (padrões: `minChars: 200`, `maxChars: 800`).
- O streaming de rascunho é separado do streaming de blocos; as respostas de blocos ficam desativadas por padrão e só são habilitadas por `*.blockStreaming: true` em canais que não sejam o Telegram.
- A resposta final ainda é uma mensagem normal.
- O comando `/reasoning stream` escreve o raciocínio no balão de rascunho (apenas Telegram).

Quando o streaming de rascunho está ativo, o ZERO desativa o streaming de blocos para aquela resposta para evitar streaming duplo.

```text
Telegram (privado + tópicos)
  └─ sendMessageDraft (balão de rascunho)
       ├─ streamMode=partial → atualiza o texto mais recente
       └─ streamMode=block   → divisor atualiza o rascunho
  └─ resposta final → mensagem normal
```

Legenda:

- `sendMessageDraft`: balão de rascunho do Telegram (não é uma mensagem real).
- `resposta final`: envio normal de mensagem no Telegram.
