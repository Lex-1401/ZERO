---
summary: "Ferramentas de depuração: modo watch, streams de modelo bruto e rastreamento de vazamento de raciocínio"
read_when:
  - Você precisa inspecionar a saída bruta do modelo para verificar vazamentos de raciocínio
  - Você deseja executar o Gateway em modo watch enquanto itera no código
  - Você precisa de um fluxo de trabalho de depuração repetível
---

# Depuração (Debugging)

Esta página cobre utilitários de depuração para saídas de fluxo (streaming), especialmente quando um provedor mistura raciocínio (reasoning) com texto normal.

## Substituições de depuração em tempo de execução

Use `/debug` no chat para definir substituições de configuração **apenas em tempo de execução** (na memória, não no disco). O `/debug` fica desativado por padrão; ative com `commands.debug: true`. Isso é útil quando você precisa alternar configurações obscuras sem editar o arquivo `zero.json`.

Exemplos:

```text
/debug show
/debug set messages.responsePrefix="[zero]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` limpa todas as substituições e retorna à configuração gravada no disco.

## Modo Watch do Gateway

Para uma iteração rápida, execute o gateway sob o observador de arquivos (file watcher):

```bash
pnpm gateway:watch --force
```

Isso mapeia para:

```bash
tsx watch src/entry.ts gateway --force
```

Quaisquer sinalizadores (flags) da CLI do gateway adicionados após `gateway:watch` serão repassados em cada reinicialização.

## Perfil de Desenvolvimento + Gateway Dev (--dev)

Use o perfil de desenvolvimento para isolar o estado e iniciar uma configuração segura e descartável para depuração. Existem **dois** sinalizadores `--dev`:

- **`--dev` Global (perfil):** isola o estado sob `~/.zero-dev` e define a porta padrão do gateway como `19001` (as portas derivadas mudam junto com ela).
- **`gateway --dev`:** instrui o Gateway a criar automaticamente uma configuração padrão + workspace quando estiverem ausentes (e ignorar o arquivo `BOOTSTRAP.md`).

Fluxo recomendado (perfil dev + bootstrap dev):

```bash
pnpm gateway:dev
ZERO_PROFILE=dev zero tui
```

Se você ainda não tiver uma instalação global, execute a CLI via `pnpm zero ...`.

O que isso faz:

1) **Isolamento de perfil** (`--dev` global)
   - `ZERO_PROFILE=dev`
   - `ZERO_STATE_DIR=~/.zero-dev`
   - `ZERO_CONFIG_PATH=~/.zero-dev/zero.json`
   - `ZERO_GATEWAY_PORT=19001` (o navegador/canvas muda de acordo)

2) **Bootstrap de Desenvolvimento** (`gateway --dev`)
   - Grava uma configuração mínima se estiver ausente (`gateway.mode=local`, vincula ao loopback).
   - Define `agent.workspace` como o workspace de desenvolvimento.
   - Define `agent.skipBootstrap=true` (ignora o `BOOTSTRAP.md`).
   - Semeia os arquivos do workspace se estiverem ausentes:
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Identidade padrão: **C3‑PO** (droide de protocolo).
   - Ignora provedores de canais no modo dev (`ZERO_SKIP_CHANNELS=1`).

Fluxo de reinicialização (começo limpo):

```bash
pnpm gateway:dev:reset
```

Nota: `--dev` é um sinalizador de perfil **global** e pode ser "engolido" por alguns executores. Se precisar ser explícito, use a forma de variável de ambiente:

```bash
ZERO_PROFILE=dev zero gateway --dev --reset
```

`--reset` apaga as configurações, credenciais, sessões e o workspace dev (usando `trash`, não `rm`), recriando então a configuração padrão de desenvolvimento.

Dica: se um gateway que não é dev já estiver rodando (via launchd/systemd), pare-o primeiro:

```bash
zero gateway stop
```

## Registro de Stream Bruto (ZERO)

O ZERO pode registrar o **fluxo bruto do assistente** antes de qualquer filtragem ou formatação. Esta é a melhor maneira de ver se o raciocínio está chegando como deltas de texto simples (ou como blocos de pensamento separados).

Ative via CLI:

```bash
pnpm gateway:watch --force --raw-stream
```

Substituição opcional do caminho:

```bash
pnpm gateway:watch --force --raw-stream --raw-stream-path ~/.zero/logs/raw-stream.jsonl
```

Variáveis de ambiente equivalentes:

```bash
ZERO_RAW_STREAM=1
ZERO_RAW_STREAM_PATH=~/.zero/logs/raw-stream.jsonl
```

Arquivo padrão:

`~/.zero/logs/raw-stream.jsonl`

## Registro de Chunks Brutos (pi-mono)

Para capturar **chunks brutos compatíveis com OpenAI** antes de serem processados em blocos, o pi-mono expõe um registrador separado:

```bash
PI_RAW_STREAM=1
```

Caminho opcional:

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

Arquivo padrão:

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> Nota: isso é emitido apenas por processos que usam o provedor
> `openai-completions` do pi‑mono.

## Notas de Segurança

- Os logs de stream bruto podem incluir prompts completos, saídas de ferramentas e dados do usuário.
- Mantenha os logs locais e exclua-os após a depuração.
- Se você compartilhar os logs, limpe segredos e informações de identificação pessoal (PII) primeiro.
