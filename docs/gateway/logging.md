---
summary: "Superfícies de log, logs em arquivo, estilos de log WS e formatação de console"
read_when:
  - Alterando a saída ou os formatos de log
  - Depurando a saída da CLI ou do gateway
---

# Registro de Logs (Logging)

Para uma visão geral voltada ao usuário (CLI + Control UI + configuração), consulte [/logging](/logging).

O ZERO possui duas "superfícies" de log:

- **Saída do console** (o que você vê no terminal / Debug UI).
- **Logs em arquivo** (JSON lines) gravados pelo logger do gateway.

## Logger baseado em arquivo

- O arquivo de log rotativo padrão fica em `/tmp/zero/` (um arquivo por dia): `zero-YYYY-MM-DD.log`
  - A data utiliza o fuso horário local do host do gateway.
- O caminho e o nível do arquivo de log podem ser configurados via `~/.zero/zero.json`:
  - `logging.file`
  - `logging.level`

O formato do arquivo é um objeto JSON por linha.

A aba de Logs da Control UI acompanha (tails) este arquivo via gateway (`logs.tail`).
A CLI pode fazer o mesmo:

```bash
zero logs --follow
```

### Verbose vs. níveis de log

- **Logs em arquivo** são controlados exclusivamente por `logging.level`.
- `--verbose` afeta apenas a **verbosidade do console** (e o estilo de log WS); ele **não** aumenta o nível do log em arquivo.
- Para capturar detalhes de verbosidade apenas nos logs em arquivo, defina `logging.level` como `debug` ou `trace`.

## Captura de console

A CLI captura `console.log/info/warn/error/debug/trace` e os grava nos logs em arquivo, enquanto continua imprimindo no stdout/stderr.

Você pode ajustar a verbosidade do console de forma independente via:

- `logging.consoleLevel` (padrão `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Redação (ocultação) de resumo de ferramentas

Resumos de ferramentas verbosos (ex: `🛠️ Exec: ...`) podem mascarar tokens sensíveis antes que cheguem ao fluxo do console. Isso é **apenas para ferramentas** e não altera os logs em arquivo.

- `logging.redactSensitive`: `off` | `tools` (padrão: `tools`)
- `logging.redactPatterns`: array de strings regex (sobrescreve os padrões)
  - Use strings regex puras (auto `gi`), ou `/pattern/flags` se precisar de flags personalizadas.
  - As correspondências são mascaradas mantendo os primeiros 6 + os últimos 4 caracteres (comprimento >= 18), caso contrário, `***`.
  - Os padrões padrão cobrem atribuições de chaves comuns, flags de CLI, campos JSON, cabeçalhos bearer, blocos PEM e prefixos de tokens populares.

## Logs do WebSocket do Gateway

O gateway imprime logs do protocolo WebSocket em dois modos:

- **Modo normal (sem `--verbose`)**: apenas resultados RPC "interessantes" são impressos:
  - erros (`ok=false`)
  - chamadas lentas (limiar padrão: `>= 50ms`)
  - erros de processamento (parse errors)
- **Modo verboso (`--verbose`)**: imprime todo o tráfego de requisição/resposta WS.

### Estilo de log WS

O `zero gateway` suporta uma chave de estilo por gateway:

- `--ws-log auto` (padrão): o modo normal é otimizado; o modo verboso usa saída compacta
- `--ws-log compact`: saída compacta (par requisição/resposta) quando em modo verboso
- `--ws-log full`: saída completa por quadro quando em modo verboso
- `--compact`: alias para `--ws-log compact`

Exemplos:

```bash
# otimizado (apenas erros/lentidão)
zero gateway

# mostra todo o tráfego WS (pareado)
zero gateway --verbose --ws-log compact

# mostra todo o tráfego WS (metadados completos)
zero gateway --verbose --ws-log full
```

## Formatação do console (logs de subsistema)

O formatador do console é **ciente de TTY** e imprime linhas consistentes e prefixadas.
Os loggers de subsistema mantêm a saída agrupada e fácil de escanear.

Comportamento:

- **Prefixos de subsistema** em cada linha (ex: `[gateway]`, `[canvas]`, `[tailscale]`)
- **Cores por subsistema** (estáveis por subsistema), além de coloração por nível
- **Coloração quando a saída é um TTY ou o ambiente parece ser um terminal rico** (`TERM`/`COLORTERM`/`TERM_PROGRAM`), respeita `NO_COLOR`
- **Prefixos de subsistema encurtados**: remove `gateway/` + `channels/` iniciais, mantém os últimos 2 segmentos (ex: `whatsapp/outbound`)
- **Sub-loggers por subsistema** (prefixo automático + campo estruturado `{ subsystem }`)
- **`logRaw()`** para saída de QR/UX (sem prefixo, sem formatação)
- **Estilos de console** (ex: `pretty | compact | json`)
- **Nível de log do console** separado do nível de log do arquivo (o arquivo mantém todos os detalhes quando `logging.level` é definido como `debug`/`trace`)
- **Corpos de mensagens do WhatsApp** são registrados como `debug` (use `--verbose` para visualizá-los)

Isso mantém os logs em arquivo existentes estáveis, enquanto torna a saída interativa fácil de acompanhar.
