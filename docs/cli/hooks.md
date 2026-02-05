---
summary: "Referência CLI para `zero hooks` (hooks de agente)"
read_when:
  - Você quer gerenciar hooks de agente
  - Você quer instalar ou atualizar hooks
---

# `zero hooks`

Gerencie hooks de agente (automações orientadas a evento para comandos como `/new`, `/reset`, e inicialização do gateway).

Relacionado:

- Hooks: [Hooks](/hooks)
- Hooks de Plugin: [Plugins](/plugin#plugin-hooks)

## Listar Todos os Hooks

```bash
zero hooks list
```

Lista todos os hooks descobertos de workspace, diretórios gerenciados e empacotados.

**Opções:**

- `--eligible`: Mostrar apenas hooks elegíveis (requisitos atendidos)
- `--json`: Saída como JSON
- `-v, --verbose`: Mostrar informação detalhada incluindo requisitos faltantes

**Exemplo de saída:**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Runs BOOT.md on gateway startup
  📝 command-logger ✓ - Logs all command events to a centralized audit file
  💾 session-memory ✓ - Saves session context to memory when /new command is issued
  😈 soul-evil ✓ - Swaps injected SOUL content during a purge window or by random chance
```

**Exemplo (verboso):**

```bash
zero hooks list --verbose
```

Mostra requisitos faltantes para hooks inelegíveis.

**Exemplo (JSON):**

```bash
zero hooks list --json
```

Retorna JSON estruturado para uso programático.

## Obter Informação de Hook

```bash
zero hooks info <name>
```

Mostra informações detalhadas sobre um hook específico.

**Argumentos:**

- `<name>`: Nome do hook (ex., `session-memory`)

**Opções:**

- `--json`: Saída como JSON

**Exemplo:**

```bash
zero hooks info session-memory
```

**Saída:**

```
💾 session-memory ✓ Ready

Save session context to memory when /new command is issued

Details:
  Source: zero-bundled
  Path: /path/to/zero/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/zero/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.zero.local/hooks#session-memory
  Events: command:new

Requirements:
  Config: ✓ workspace.dir
```

## Checar Elegibilidade de Hooks

```bash
zero hooks check
```

Mostra resumo do status de elegibilidade de hooks (quantos estão prontos vs. não prontos).

**Opções:**

- `--json`: Saída como JSON

**Exemplo de saída:**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## Ativar um Hook

```bash
zero hooks enable <name>
```

Ative um hook específico adicionando-o à sua config (`~/.zero/config.json`).

**Nota:** Hooks gerenciados por plugins mostram `plugin:<id>` em `zero hooks list` e
não podem ser ativados/desativados aqui. Ative/desative o plugin em vez disso.

**Argumentos:**

- `<name>`: Nome do hook (ex., `session-memory`)

**Exemplo:**

```bash
zero hooks enable session-memory
```

**Saída:**

```
✓ Enabled hook: 💾 session-memory
```

**O que faz:**

- Checa se o hook existe e é elegível
- Atualiza `hooks.internal.entries.<name>.enabled = true` na sua config
- Salva config no disco

**Após ativar:**

- Reinicie o gateway para que os hooks recarreguem (reinício do app menu bar no macOS, ou reinicie seu processo gateway em dev).

## Desativar um Hook

```bash
zero hooks disable <name>
```

Desative um hook específico atualizando sua config.

**Argumentos:**

- `<name>`: Nome do hook (ex., `command-logger`)

**Exemplo:**

```bash
zero hooks disable command-logger
```

**Saída:**

```
⏸ Disabled hook: 📝 command-logger
```

**Após desativar:**

- Reinicie o gateway para que os hooks recarreguem

## Instalar Hooks

```bash
zero hooks install <path-or-spec>
```

Instale um pacote de hook de uma pasta/arquivo local ou npm.

**O que faz:**

- Copia o pacote de hook para `~/.zero/hooks/<id>`
- Ativa os hooks instalados em `hooks.internal.entries.*`
- Registra a instalação sob `hooks.internal.installs`

**Opções:**

- `-l, --link`: Linkar um diretório local em vez de copiar (adiciona a `hooks.internal.load.extraDirs`)

**Arquivos suportados:** `.zip`, `.tgz`, `.tar.gz`, `.tar`

**Exemplos:**

```bash
# Diretório local
zero hooks install ./my-hook-pack

# Arquivo local
zero hooks install ./my-hook-pack.zip

# Pacote NPM
zero hooks install @zero/my-hook-pack

# Linkar um diretório local sem copiar
zero hooks install -l ./my-hook-pack
```

## Atualizar Hooks

```bash
zero hooks update <id>
zero hooks update --all
```

Atualize pacotes de hook instalados (apenas instalações npm).

**Opções:**

- `--all`: Atualizar todos os pacotes de hook rastreados
- `--dry-run`: Mostrar o que mudaria sem gravar

## Hooks Empacotados

### session-memory

Salva contexto de sessão na memória quando você emite `/new`.

**Ativar:**

```bash
zero hooks enable session-memory
```

**Saída:** `~/zero/memory/YYYY-MM-DD-slug.md`

**Veja:** [Documentação de session-memory](/hooks#session-memory)

### command-logger

Loga todos os eventos de comando em um arquivo de auditoria centralizado.

**Ativar:**

```bash
zero hooks enable command-logger
```

**Saída:** `~/.zero/logs/commands.log`

**Ver logs:**

```bash
# Comandos recentes
tail -n 20 ~/.zero/logs/commands.log

# Pretty-print
cat ~/.zero/logs/commands.log | jq .

# Filtrar por ação
grep '"action":"new"' ~/.zero/logs/commands.log | jq .
```

**Veja:** [Documentação de command-logger](/hooks#command-logger)

### soul-evil

Troca conteúdo injetado `SOUL.md` por `SOUL_EVIL.md` durante uma janela de purga ou por chance aleatória.

**Ativar:**

```bash
zero hooks enable soul-evil
```

**Veja:** [Hook SOUL Evil](/hooks/soul-evil)

### boot-md

Roda `BOOT.md` quando o gateway inicia (após canais iniciarem).

**Eventos**: `gateway:startup`

**Ativar**:

```bash
zero hooks enable boot-md
```

**Veja:** [documentação boot-md](/hooks#boot-md)
