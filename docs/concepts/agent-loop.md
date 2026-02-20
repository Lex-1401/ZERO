---
summary: "Ciclo de vida do loop do agente, streams e semântica de espera"
read_when:
  - Você precisa de um passo a passo exato do loop do agente ou dos eventos de seu ciclo de vida
---
# Loop do Agente (ZERO)

Um loop agêntico é a execução “real” completa de um agente: ingestão → montagem do contexto → inferência do modelo → execução de ferramentas → transmissão de respostas (streaming) → persistência. É o caminho oficial que transforma uma mensagem em ações e em uma resposta final, mantendo consistente o estado da sessão.

No ZERO, um loop é uma execução única e serializada por sessão que emite eventos de ciclo de vida e de stream à medida que o modelo pensa, chama ferramentas e transmite a saída. Este documento explica como esse loop autêntico é conectado de ponta a ponta.

## Pontos de entrada

- RPC do Gateway: `agent` e `agent.wait`.
- CLI: comando `agent`.

## Como funciona (visão de alto nível)

1) O RPC `agent` valida os parâmetros, resolve a sessão (sessionKey/sessionId), persiste os metadados da sessão e retorna imediatamente `{ runId, acceptedAt }`.
2) O `agentCommand` executa o agente:
   - resolve o modelo + padrões de pensamento (thinking)/detalhamento (verbose).
   - carrega o snapshot das habilidades (skills).
   - chama `runEmbeddedPiAgent` (tempo de execução do pi-agent-core).
   - emite **fim/erro de ciclo de vida** se o loop embutido não emitir um.
3) `runEmbeddedPiAgent`:
   - serializa as execuções via filas globais + por sessão.
   - resolve o modelo + perfil de autenticação e constrói a sessão pi.
   - subscreve aos eventos pi e transmite deltas de assistente/ferramenta.
   - impõe timeout -> aborta a execução se excedido.
   - retorna os payloads + metadados de uso.
4) `subscribeEmbeddedPiSession` conecta os eventos do pi-agent-core ao stream `agent` do ZERO:
   - eventos de ferramenta => `stream: "tool"`
   - deltas do assistente => `stream: "assistant"`
   - eventos de ciclo de vida => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5) `agent.wait` usa `waitForAgentJob`:
   - aguarda pelo **fim/erro de ciclo de vida** para o `runId`.
   - retorna `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## Enfileiramento + concorrência

- As execuções são serializadas por chave de sessão (raia da sessão) e, opcionalmente, através de uma raia global.
- Isso evita conflitos de ferramentas/sessão (races) e mantém consistente o histórico da sessão.
- Canais de mensagens podem escolher modos de enfileiramento (collect/steer/followup) que alimentam esse sistema de raias. Veja [Fila de Comandos](/concepts/queue).

## Sessão + preparação do espaço de trabalho

- O espaço de trabalho é resolvido e criado; execuções em sandbox podem ser redirecionadas para uma raiz de espaço de trabalho em sandbox.
- As habilidades são carregadas (ou reutilizadas de um snapshot) e injetadas no ambiente e no prompt.
- Arquivos de inicialização/contexto são resolvidos e injetados no relatório do prompt do sistema.
- Um bloqueio de gravação de sessão é adquirido; o `SessionManager` é aberto e preparado antes do streaming.

## Montagem do prompt + prompt do sistema

- O prompt do sistema é construído a partir do prompt base do ZERO, prompt das habilidades, contexto de inicialização e sobrescritas por execução.
- Limites específicos do modelo e tokens de reserva de compactação são impostos.
- Veja [Prompt do sistema](/concepts/system-prompt) para o que o modelo vê.

## Pontos de gancho (Hooks - onde você pode interceptar)

O ZERO possui dois sistemas de ganchos:

- **Ganchos internos** (Ganchos do Gateway): scripts orientados a eventos para comandos e eventos de ciclo de vida.
- **Ganchos de plugin**: pontos de extensão dentro do ciclo de vida do agente/ferramenta e do pipeline do gateway.

### Ganchos internos (Ganchos do Gateway)

- **`agent:bootstrap`**: executado durante a construção dos arquivos de inicialização antes da finalização do prompt do sistema. Use isso para adicionar/remover arquivos de contexto de inicialização.
- **Ganchos de comando**: `/new`, `/reset`, `/stop` e outros eventos de comando (veja o documento de Ganchos).

Veja [Ganchos](/hooks) para configuração e exemplos.

### Ganchos de plugin (ciclo de vida do agente + gateway)

Estes rodam dentro do loop do agente ou do pipeline do gateway:

- **`before_agent_start`**: injeta contexto ou sobrescreve o prompt do sistema antes do início da execução.
- **`agent_end`**: inspeciona a lista final de mensagens e metadados da execução após a conclusão.
- **`before_compaction` / `after_compaction`**: observa ou anota os ciclos de compactação.
- **`before_tool_call` / `after_tool_call`**: intercepta parâmetros/resultados de ferramentas.
- **`tool_result_persist`**: transforma de forma síncrona os resultados das ferramentas antes que sejam gravados na transcrição da sessão.
- **`message_received` / `message_sending` / `message_sent`**: ganchos de mensagens de entrada e saída.
- **`session_start` / `session_end`**: limites do ciclo de vida da sessão.
- **`gateway_start` / `gateway_stop`**: eventos do ciclo de vida do gateway.

Veja [Plugins](/plugin#plugin-hooks) para a API de ganchos e detalhes de registro.

## Streaming + respostas parciais

- Deltas de assistente são transmitidos do pi-agent-core e emitidos como eventos `assistant`.
- O streaming de blocos pode emitir respostas parciais tanto em `text_end` quanto em `message_end`.
- O streaming de raciocínio pode ser emitido como um stream separado ou como respostas em blocos.
- Veja [Streaming](/concepts/streaming) para detalhes de divisão (chunking) e comportamento de resposta em blocos.

## Execução de ferramentas + ferramentas de mensagens

- Eventos de início/atualização/término de ferramentas são emitidos no stream `tool`.
- Os resultados das ferramentas são higienizados (sanitized) para tamanho e payloads de imagem antes de serem registrados/emitidos.
- Os envios de ferramentas de mensagens são rastreados para suprimir confirmações duplicadas do assistente.

## Formatação de respostas + supressão

- Os payloads finais são montados a partir de:
  - texto do assistente (e raciocínio opcional)
  - resumos de ferramentas inline (quando detalhado + permitido)
  - texto de erro do assistente quando o modelo falha
- `NO_REPLY` é tratado como um token silencioso e filtrado dos payloads de saída.
- Duplicatas de ferramentas de mensagens são removidas da lista de payloads final.
- Se não restarem payloads renderizáveis e uma ferramenta tiver falhado, uma resposta de erro de ferramenta reserva (fallback) será emitida (a menos que uma ferramenta de mensagens já tenha enviado uma resposta visível ao usuário).

## Compactação + tentativas (retries)

- A auto-compactação emite eventos de stream `compaction` e pode acionar uma tentativa.
- Na tentativa, os buffers em memória e os resumos de ferramentas são resetados para evitar saídas duplicadas.
- Veja [Compactação](/concepts/compaction) para o pipeline de compactação.

## Streams de eventos (hoje)

- `lifecycle`: emitido por `subscribeEmbeddedPiSession` (e como reserva por `agentCommand`)
- `assistant`: deltas transmitidos do pi-agent-core
- `tool`: eventos de ferramentas transmitidos do pi-agent-core

## Tratamento de canais de chat

- Deltas de assistente são armazenados em buffer em mensagens `delta` do chat.
- Um `final` do chat é emitido no **fim/erro do ciclo de vida**.

## Timeouts

- Padrão do `agent.wait`: 30s (apenas o tempo de espera). O parâmetro `timeoutMs` sobrescreve.
- Tempo de execução do agente: `agents.defaults.timeoutSeconds` padrão 600s; imposto no timer de aborto do `runEmbeddedPiAgent`.

## Onde as coisas podem terminar antecipadamente

- Timeout do agente (aborto)
- AbortSignal (cancelamento)
- Desconexão do Gateway ou timeout do RPC
- Timeout do `agent.wait` (apenas espera, não interrompe o agente)
