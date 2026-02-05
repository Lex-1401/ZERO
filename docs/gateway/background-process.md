---
summary: "Execução em segundo plano (background) e gerenciamento de processos"
read_when:
  - Adicionando ou modificando o comportamento da execução em segundo plano
  - Depurando tarefas de execução de longa duração
---

# Execução em Segundo Plano + Ferramenta de Processo

O ZERO executa comandos de shell por meio da ferramenta `exec` e mantém tarefas de longa duração em memória. A ferramenta `process` gerencia essas sessões em segundo plano.

## Ferramenta `exec`

Parâmetros principais:

- `command` (obrigatório).
- `yieldMs` (padrão 10000): entra automaticamente em segundo plano após esse atraso.
- `background` (bool): entra em segundo plano imediatamente.
- `timeout` (segundos, padrão 1800): encerra o processo após esse tempo limite.
- `elevated` (bool): executa no host se o modo elevado estiver habilitado/permitido.
- Precisa de um TTY real? Defina `pty: true`.
- `workdir`, `env`.

Comportamento:

- Execuções em primeiro plano (foreground) retornam a saída diretamente.
- Quando em segundo plano (explícito ou por tempo limite), a ferramenta retorna `status: "running"` + `sessionId` e um pequeno trecho final da saída (tail).
- A saída é mantida em memória até que a sessão seja consultada (polled) ou limpa.
- Se a ferramenta `process` não estiver permitida, o `exec` roda de forma síncrona e ignora o `yieldMs`/`background`.

## Conexão de processos filhos (Child process bridging)

Ao iniciar processos filhos de longa duração fora das ferramentas exec/process (por exemplo, reinicializações de CLI ou auxiliares do gateway), anexe o auxiliar de conexão de processo filho para que os sinais de encerramento sejam encaminhados e os ouvintes (listeners) sejam desconectados na saída ou erro. Isso evita processos órfãos no systemd e mantém o comportamento de desligamento consistente em todas as plataformas.

Sobrescritas de ambiente:

- `PI_BASH_YIELD_MS`: rendimento (yield) padrão (ms).
- `PI_BASH_MAX_OUTPUT_CHARS`: limite de saída em memória (caracteres).
- `ZERO_BASH_PENDING_MAX_OUTPUT_CHARS`: limite de stdout/stderr pendente por stream (caracteres).
- `PI_BASH_JOB_TTL_MS`: TTL para sessões finalizadas (ms, limitado entre 1m e 3h).

Configuração (preferencial):

- `tools.exec.backgroundMs` (padrão 10000).
- `tools.exec.timeoutSec` (padrão 1800).
- `tools.exec.cleanupMs` (padrão 1800000).
- `tools.exec.notifyOnExit` (padrão true): enfileira um evento do sistema + solicita um batimento cardíaco (heartbeat) quando um `exec` em segundo plano encerra.

## Ferramenta `process`

Ações:

- `list`: sessões em execução + finalizadas.
- `poll`: drena a nova saída de uma sessão (também reporta o status de saída).
- `log`: lê a saída agregada (suporta `offset` + `limit`).
- `write`: envia stdin (`data`, opcionalmente `eof`).
- `kill`: encerra uma sessão em segundo plano.
- `clear`: remove uma sessão finalizada da memória.
- `remove`: encerra se estiver rodando, caso contrário, limpa se finalizada.

Notas:

- Apenas sessões em segundo plano são listadas/persistidas em memória.
- As sessões são perdidas na reinicialização do processo (sem persistência em disco).
- Os logs das sessões só são salvos no histórico do chat se você executar `process poll/log` e o resultado da ferramenta for registrado.
- O `process` é escopado por agente; ele só vê as sessões iniciadas por esse agente.
- `process list` inclui um `name` derivado (verbo de comando + alvo) para varreduras rápidas.
- `process log` usa `offset`/`limit` baseados em linhas (omita o `offset` para pegar as últimas N linhas).

## Exemplos

Executar uma tarefa longa e consultar depois:

```json
{"tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000}
```

```json
{"tool": "process", "action": "poll", "sessionId": "<id>"}
```

Iniciar imediatamente em segundo plano:

```json
{"tool": "exec", "command": "npm run build", "background": true}
```

Enviar entrada padrão (stdin):

```json
{"tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n"}
```
