---
summary: "Visão geral do registro de logs: logs em arquivo, saída no console, monitoramento via CLI e a UI de Controle"
read_when:
  - Você precisa de uma visão geral amigável para iniciantes sobre logs
  - Você deseja configurar níveis ou formatos de log
  - Você está resolvendo problemas e precisa encontrar logs rapidamente
---

# Registro de Logs

O ZERO registra logs em dois lugares:

- **Logs em arquivo** (linhas JSON) gravados pelo Gateway.
- **Saída no console** exibida em terminais e na UI de Controle.

Esta página explica onde os logs residem, como lê-los e como configurar os níveis e formatos de log.

## Onde os logs residem

Por padrão, o Gateway grava um arquivo de log rotativo em:

`/tmp/zero/zero-YYYY-MM-DD.log`

A data usa o fuso horário local do host do gateway.

Você pode substituir isso em `~/.zero/zero.json`:

```json
{
  "logging": {
    "file": "/caminho/para/zero.log"
  }
}
```

## Como ler os logs

### CLI: acompanhamento ao vivo (recomendado)

Use a CLI para acompanhar o arquivo de log do gateway via RPC:

```bash
zero logs --follow
```

Modos de saída:

- **Sessões TTY**: linhas de log estruturadas, coloridas e amigáveis.
- **Sessões não-TTY**: texto simples.
- `--json`: JSON delimitado por linhas (um evento de log por linha).
- `--plain`: força texto simples em sessões TTY.
- `--no-color`: desativa cores ANSI.

No modo JSON, a CLI emite objetos marcados com `type`:

- `meta`: metadados do fluxo (arquivo, cursor, tamanho)
- `log`: entrada de log processada
- `notice`: dicas de truncamento / rotação
- `raw`: linha de log não processada

Se o Gateway estiver inacessível, a CLI imprime uma pequena dica para executar:

```bash
zero doctor
```

### UI de Controle (web)

A aba **Registros** (Logs) da UI de Controle acompanha o mesmo arquivo usando `logs.tail`.
Consulte [/web/control-ui](/web/control-ui) para saber como abri-lo.

### Logs de canal específico

Para filtrar a atividade de um canal (WhatsApp/Telegram/etc), use:

```bash
zero channels logs --channel whatsapp
```

## Formatos de log

### Logs em arquivo (JSONL)

Cada linha no arquivo de log é um objeto JSON. A CLI e a UI de Controle analisam essas entradas para renderizar uma saída estruturada (hora, nível, subsistema, mensagem).

### Saída no console

Os logs do console são **cientes de TTY** e formatados para facilitar a leitura:

- Prefixos de subsistema (ex: `gateway/channels/whatsapp`)
- Colorização de nível (info/warn/error)
- Modo compacto ou JSON opcional

A formatação do console é controlada por `logging.consoleStyle`.

## Configurando o registro de logs

Toda a configuração de logs reside sob `logging` em `~/.zero/zero.json`.

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/zero/zero-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": [
      "sk-.*"
    ]
  }
}
```

### Níveis de log

- `logging.level`: nível dos **logs em arquivo** (JSONL).
- `logging.consoleLevel`: nível de verbosidade do **console**.

`--verbose` afeta apenas a saída do console; não altera os níveis de log do arquivo.

### Estilos de console

`logging.consoleStyle`:

- `pretty`: amigável para humanos, colorido, com carimbos de data/hora.
- `compact`: saída mais densa (ideal para sessões longas).
- `json`: JSON por linha (para processadores de log).

### Redação

Os resumos de ferramentas podem redigir tokens sensíveis antes de chegarem ao console:

- `logging.redactSensitive`: `off` | `tools` (padrão: `tools`)
- `logging.redactPatterns`: lista de strings regex para substituir o conjunto padrão

A redação afeta **apenas a saída do console** e não altera os logs em arquivo.

## Diagnósticos + OpenTelemetry

Os diagnósticos são eventos estruturados e legíveis por máquina para execuções de modelos **e** telemetria de fluxo de mensagens (webhooks, enfileiramento, estado da sessão). Eles **não** substituem os logs; existem para alimentar métricas, rastreamentos e outros exportadores.

Os eventos de diagnóstico são emitidos no processo, mas os exportadores só se conectam quando os diagnósticos + o plugin do exportador estão ativados.

### OpenTelemetry vs OTLP

- **OpenTelemetry (OTel)**: o modelo de dados + SDKs para rastreamentos (traces), métricas e logs.
- **OTLP**: o protocolo de conexão usado para exportar dados OTel para um coletor/backend (servidor de análise).
- O ZERO exporta via **OTLP/HTTP (protobuf)** atualmente.

### Sinais exportados

- **Métricas**: contadores + histogramas (uso de tokens, fluxo de mensagens, enfileiramento).
- **Tratamentos (Traces)**: intervalos (spans) para uso de modelos + processamento de webhooks/mensagens.
- **Logs**: exportados via OTLP quando `diagnostics.otel.logs` está ativado. O volume de logs pode ser alto; considere o `logging.level` e os filtros do exportador.

### Catálogo de eventos de diagnóstico

Uso do modelo:

- `model.usage`: tokens, custo, duração, contexto, provedor/modelo/canal, IDs de sessão.

Fluxo de mensagens:

- `webhook.received`: ingresso de webhook por canal.
- `webhook.processed`: webhook tratado + duração.
- `webhook.error`: erros do manipulador de webhook.
- `message.queued`: mensagem enfileirada para processamento.
- `message.processed`: resultado + duração + erro opcional.

Fila + sessão:

- `queue.lane.enqueue`: enfileiramento na via da fila de comandos + profundidade.
- `queue.lane.dequeue`: desenfileiramento na via da fila de comandos + tempo de espera.
- `session.state`: transição de estado da sessão + motivo.
- `session.stuck`: aviso de sessão travada + idade.
- `run.attempt`: metadados de tentativa/repetição de execução.
- `diagnostic.heartbeat`: contadores agregados (webhooks/fila/sessão).

### Ativar diagnósticos (sem exportador)

Use isto se desejar eventos de diagnóstico disponíveis para plugins ou destinos personalizados:

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### Sinalizadores de diagnóstico (logs direcionados)

Use sinalizadores (flags) para ligar logs de depuração extras e direcionados sem aumentar o `logging.level` global. Os sinalizadores não diferenciam maiúsculas de minúsculas e suportam curingas (ex: `telegram.*` ou `*`).

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Substituição via variável de ambiente (uso único):

```text
ZERO_DIAGNOSTICS=telegram.http,telegram.payload
```

Notas:

- Os logs de sinalizadores vão para o arquivo de log padrão (o mesmo de `logging.file`).
- A saída ainda é redigida de acordo com `logging.redactSensitive`.
- Guia completo: [/diagnostics/flags](/diagnostics/flags).

### Exportar para OpenTelemetry

Os diagnósticos podem ser exportados via plugin `diagnostics-otel` (OTLP/HTTP). Isso funciona com qualquer coletor/backend OpenTelemetry que aceite OTLP/HTTP.

```json
{
  "plugins": {
    "allow": ["diagnostics-otel"],
    "entries": {
      "diagnostics-otel": {
        "enabled": true
      }
    }
  },
  "diagnostics": {
    "enabled": true,
    "otel": {
      "enabled": true,
      "endpoint": "http://otel-collector:4318",
      "protocol": "http/protobuf",
      "serviceName": "zero-gateway",
      "traces": true,
      "metrics": true,
      "logs": true,
      "sampleRate": 0.2,
      "flushIntervalMs": 60000
    }
  }
}
```

Notas:

- Você também pode ativar o plugin com `zero plugins enable diagnostics-otel`.
- O `protocol` atualmente suporta apenas `http/protobuf`. `grpc` é ignorado.
- As métricas incluem uso de tokens, custo, tamanho do contexto, duração da execução e contadores/histogramas de fluxo de mensagens (webhooks, enfileiramento, estado da sessão, profundidade/espera da fila).
- Rastreamentos (traces) e métricas podem ser alternados com `traces` / `metrics` (padrão: ligado). Os rastreamentos incluem intervalos de uso do modelo mais intervalos de processamento de webhooks/mensagens quando ativados.
- Configure `headers` quando seu coletor exigir autenticação.
- Variáveis de ambiente suportadas: `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_PROTOCOL`.

### Métricas exportadas (nomes + tipos)

Uso do modelo:

- `zero.tokens` (contador, atributos: `zero.token`, `zero.channel`, `zero.provider`, `zero.model`)
- `zero.cost.usd` (contador, atributos: `zero.channel`, `zero.provider`, `zero.model`)
- `zero.run.duration_ms` (histograma, atributos: `zero.channel`, `zero.provider`, `zero.model`)
- `zero.context.tokens` (histograma, atributos: `zero.context`, `zero.channel`, `zero.provider`, `zero.model`)

Fluxo de mensagens:

- `zero.webhook.received` (contador, atributos: `zero.channel`, `zero.webhook`)
- `zero.webhook.error` (contador, atributos: `zero.channel`, `zero.webhook`)
- `zero.webhook.duration_ms` (histograma, atributos: `zero.channel`, `zero.webhook`)
- `zero.message.queued` (contador, atributos: `zero.channel`, `zero.source`)
- `zero.message.processed` (contador, atributos: `zero.channel`, `zero.outcome`)
- `zero.message.duration_ms` (histograma, atributos: `zero.channel`, `zero.outcome`)

Filas + sessões:

- `zero.queue.lane.enqueue` (contador, atributos: `zero.lane`)
- `zero.queue.lane.dequeue` (contador, atributos: `zero.lane`)
- `zero.queue.depth` (histograma, atributos: `zero.lane` ou `zero.channel=heartbeat`)
- `zero.queue.wait_ms` (histograma, atributos: `zero.lane`)
- `zero.session.state` (contador, atributos: `zero.state`, `zero.reason`)
- `zero.session.stuck` (contador, atributos: `zero.state`)
- `zero.session.stuck_age_ms` (histograma, atributos: `zero.state`)
- `zero.run.attempt` (contador, atributos: `zero.attempt`)

### Intervalos (spans) exportados (nomes + atributos principais)

- `zero.model.usage`
  - `zero.channel`, `zero.provider`, `zero.model`
  - `zero.sessionKey`, `zero.sessionId`
  - `zero.tokens.*` (input/output/cache_read/cache_write/total)
- `zero.webhook.processed`
  - `zero.channel`, `zero.webhook`, `zero.chatId`
- `zero.webhook.error`
  - `zero.channel`, `zero.webhook`, `zero.chatId`, `zero.error`
- `zero.message.processed`
  - `zero.channel`, `zero.outcome`, `zero.chatId`, `zero.messageId`, `zero.sessionKey`, `zero.sessionId`, `zero.reason`
- `zero.session.stuck`
  - `zero.state`, `zero.ageMs`, `zero.queueDepth`, `zero.sessionKey`, `zero.sessionId`

### Amostragem + limpeza (flushing)

- Amostragem de rastreamento: `diagnostics.otel.sampleRate` (0.0–1.0, apenas intervalos raiz).
- Intervalo de exportação de métricas: `diagnostics.otel.flushIntervalMs` (mínimo 1000ms).

### Notas de protocolo

- Endpoints OTLP/HTTP podem ser definidos via `diagnostics.otel.endpoint` ou `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Se o endpoint já contiver `/v1/traces` ou `/v1/metrics`, ele será usado como está.
- Se o endpoint já contiver `/v1/logs`, ele será usado como está para logs.
- `diagnostics.otel.logs` ativa a exportação de log OTLP para a saída principal do logger.

### Comportamento de exportação de log

- Os logs OTLP usam os mesmos registros estruturados gravados em `logging.file`.
- Respeitam o `logging.level` (nível de log do arquivo). A redação do console **não** se aplica aos logs OTLP.
- Instalações de alto volume devem preferir a amostragem/filtragem do coletor OTLP.

## Dicas para resolução de problemas

- **Gateway não acessível?** Execute `zero doctor` primeiro.
- **Logs vazios?** Verifique se o Gateway está rodando e gravando no caminho do arquivo definido em `logging.file`.
- **Precisa de mais detalhes?** Ajuste `logging.level` para `debug` ou `trace` e tente novamente.
