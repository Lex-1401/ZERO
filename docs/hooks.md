---
summary: "Hooks: automação baseada em eventos para comandos e eventos de ciclo de vida"
read_when:
  - Você deseja automação baseada em eventos para /new, /reset, /stop e eventos de ciclo de vida do agente
  - Você deseja construir, instalar ou depurar hooks
---

# Hooks (Ganchos)

Os Hooks fornecem um sistema extensível baseado em eventos para automatizar ações em resposta a comandos e eventos do agente. Os hooks são descobertos automaticamente a partir de diretórios e podem ser gerenciados via comandos da CLI, de forma semelhante ao funcionamento das habilidades (skills) no ZERO.

## Orientação Geral

Hooks são pequenos scripts que rodam quando algo acontece. Existem dois tipos:

- **Hooks** (esta página): rodam dentro do Gateway quando eventos do agente são disparados, como `/new`, `/reset`, `/stop` ou eventos de ciclo de vida.
- **Webhooks**: webhooks HTTP externos que permitem que outros sistemas disparem trabalhos no ZERO. Consulte [Ganchos de Webhook](/automation/webhook) ou use `zero webhooks` para comandos auxiliares do Gmail.
  
Os hooks também podem ser empacotados dentro de plugins; consulte [Plugins](/plugin#plugin-hooks).

Usos comuns:

- Salvar um instantâneo da memória ao resetar uma sessão.
- Manter uma trilha de auditoria de comandos para depuração ou conformidade.
- Disparar automações de acompanhamento quando uma sessão começa ou termina.
- Gravar arquivos no workspace do agente ou chamar APIs externas quando eventos ocorrem.

Se você sabe escrever uma pequena função TypeScript, você sabe escrever um hook. Os hooks são descobertos automaticamente e você os ativa ou desativa via CLI.

## Visão Geral

O sistema de hooks permite que você:

- Salve o contexto da sessão na memória quando um `/new` é emitido.
- Registre todos os comandos para auditoria.
- Dispare automações personalizadas em eventos de ciclo de vida do agente.
- Estenda o comportamento do ZERO sem modificar o código principal.

## Primeiros Passos

### Hooks Integrados (Bundled)

O ZERO vem com quatro hooks integrados que são descobertos automaticamente:

- **💾 session-memory**: Salva o contexto da sessão no workspace do seu agente (padrão `~/zero/memory/`) quando você emite `/new`.
- **📝 command-logger**: Registra todos os eventos de comando em `~/.zero/logs/commands.log`.
- **🚀 boot-md**: Executa o `BOOT.md` quando o gateway inicia (requer hooks internos ativados).
- **😈 soul-evil**: Troca o conteúdo injetado do `SOUL.md` pelo `SOUL_EVIL.md` durante uma janela de purga ou por chance aleatória.

Listar hooks disponíveis:

```bash
zero hooks list
```

Ativar um hook:

```bash
zero hooks enable session-memory
```

Verificar o status dos hooks:

```bash
zero hooks check
```

Obter informações detalhadas:

```bash
zero hooks info session-memory
```

### Integração (Onboarding)

Durante a integração (`zero onboard`), você será solicitado a ativar os hooks recomendados. O assistente descobre automaticamente os hooks elegíveis e os apresenta para seleção.

## Descoberta de Hooks

Os hooks são descobertos automaticamente a partir de três diretórios (em ordem de precedência):

1. **Hooks do Workspace**: `<workspace>/hooks/` (por agente, precedência mais alta).
2. **Hooks Gerenciados**: `~/.zero/hooks/` (instalados pelo usuário, compartilhados entre workspaces).
3. **Hooks Integrados**: `<zero>/dist/hooks/bundled/` (enviados com o ZERO).

Os diretórios de hooks gerenciados podem conter um **único hook** ou um **pacote de hooks** (diretório de pacotes).

Cada hook é um diretório contendo:

```text
meu-hook/
├── HOOK.md          # Metadados + documentação
└── handler.ts       # Implementação do manipulador (handler)
```

## Pacotes de Hooks (npm/arquivos)

Pacotes de hooks são pacotes npm padrão que exportam um ou mais hooks via `zero.hooks` no `package.json`. Instale-os com:

```bash
zero hooks install <caminho-ou-especificação>
```

Exemplo de `package.json`:

```json
{
  "name": "@acme/meus-hooks",
  "version": "0.1.0",
  "zero": {
    "hooks": ["./hooks/meu-hook", "./hooks/outro-hook"]
  }
}
```

Cada entrada aponta para um diretório de hook contendo `HOOK.md` e `handler.ts` (ou `index.ts`). Os pacotes de hooks podem incluir dependências; elas serão instaladas em `~/.zero/hooks/<id>`.

## Estrutura do Hook

### Formato do HOOK.md

O arquivo `HOOK.md` contém metadados em frontmatter YAML, além de documentação em Markdown:

```markdown
---
name: meu-hook
description: "Descrição curta do que este hook faz"
homepage: https://github.com/Lex-1401/ZERO/tree/main/docs/hooks#meu-hook
metadata: {"zero":{"emoji":"🔗","events":["command:new"],"requires":{"bins":["node"]}}}
---

# Meu Hook

Documentação detalhada aqui...

## O Que Ele Faz

- Ouve comandos `/new`
- Executa alguma ação
- Registra o resultado

## Requisitos

- Node.js deve estar instalado

## Configuração

Nenhuma configuração necessária.
```

### Campos de Metadados

O objeto `metadata.zero` suporta:

- **`emoji`**: Emoji de exibição para a CLI (ex: `"💾"`)
- **`events`**: Array de eventos para ouvir (ex: `["command:new", "command:reset"]`)
- **`export`**: Exportação nomeada a ser usada (padrão é `"default"`)
- **`homepage`**: URL da documentação
- **`requires`**: Requisitos opcionais
  - **`bins`**: Binários necessários no PATH (ex: `["git", "node"]`)
  - **`anyBins`**: Pelo menos um destes binários deve estar presente
  - **`env`**: Variáveis de ambiente necessárias
  - **`config`**: Caminhos de configuração necessários (ex: `["workspace.dir"]`)
  - **`os`**: Plataformas necessárias (ex: `["darwin", "linux"]`)
- **`always`**: Ignora verificações de elegibilidade (booleano)
- **`install`**: Métodos de instalação (para hooks integrados: `[{"id":"bundled","kind":"bundled"}]`)

### Implementação do Manipulador (Handler)

O arquivo `handler.ts` exporta uma função `HookHandler`:

```typescript
import type { HookHandler } from '../../src/hooks/hooks.js';

const meuHandler: HookHandler = async (event) => {
  // Dispara apenas no comando 'new'
  if (event.type !== 'command' || event.action !== 'new') {
    return;
  }

  console.log(`[meu-hook] Novo comando disparado`);
  console.log(`  Sessão: ${event.sessionKey}`);
  console.log(`  Timestamp: ${event.timestamp.toISOString()}`);

  // Sua lógica personalizada aqui

  // Opcionalmente enviar uma mensagem ao usuário
  event.messages.push('✨ Meu hook foi executado!');
};

export default meuHandler;
```

#### Contexto do Evento

Cada evento inclui:

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway',
  action: string,              // ex: 'new', 'reset', 'stop'
  sessionKey: string,          // Identificador da sessão
  timestamp: Date,             // Quando o evento ocorreu
  messages: string[],          // Adicione mensagens aqui para enviar ao usuário
  context: {
    sessionEntry?: SessionEntry,
    sessionId?: string,
    sessionFile?: string,
    commandSource?: string,    // ex: 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    bootstrapFiles?: WorkspaceBootstrapFile[],
    cfg?: ZEROConfig
  }
}
```

## Tipos de Eventos

### Eventos de Comando

Disparados quando comandos do agente são emitidos:

- **`command`**: Todos os eventos de comando (ouvinte geral)
- **`command:new`**: Quando o comando `/new` é emitido
- **`command:reset`**: Quando o comando `/reset` é emitido
- **`command:stop`**: Quando o comando `/stop` é emitido

### Eventos do Agente

- **`agent:bootstrap`**: Antes dos arquivos de bootstrap do workspace serem injetados (hooks podem mutar `context.bootstrapFiles`)

### Eventos do Gateway

Disparados quando o gateway inicia:

- **`gateway:startup`**: Após o início dos canais e o carregamento dos hooks

### Hooks de Resultado de Ferramenta (API de Plugin)

Estes hooks não são ouvintes de fluxo de eventos; eles permitem que plugins ajustem sincronamente os resultados das ferramentas antes que o ZERO os persista.

- **`tool_result_persist`**: transforma resultados de ferramentas antes de serem gravados na transcrição da sessão. Deve ser síncrono; retorne o payload atualizado do resultado da ferramenta ou `undefined` para mantê-lo como está. Consulte [Agente: O Loop Principal](/concepts/agent-loop).

### Eventos Futuros (Planejados)

- **`session:start`**: Quando uma nova sessão começa
- **`session:end`**: Quando uma sessão termina
- **`agent:error`**: Quando um agente encontra um erro
- **`message:sent`**: Quando uma mensagem é enviada
- **`message:received`**: Quando uma mensagem é recebida

## Criando Hooks Personalizados

### 1. Escolha o Local

- **Hooks do Workspace** (`<workspace>/hooks/`): Por agente, precedência mais alta.
- **Hooks Gerenciados** (`~/.zero/hooks/`): Compartilhados entre workspaces.

### 2. Crie a Estrutura de Diretórios

```bash
mkdir -p ~/.zero/hooks/meu-hook
cd ~/.zero/hooks/meu-hook
```

### 3. Crie o HOOK.md

```markdown
---
name: meu-hook
description: "Faz algo útil"
metadata: {"zero":{"emoji":"🎯","events":["command:new"]}}
---

# Meu Hook Personalizado

Este hook faz algo útil quando você emite `/new`.
```

### 4. Crie o handler.ts

```typescript
import type { HookHandler } from '../../src/hooks/hooks.js';

const handler: HookHandler = async (event) => {
  if (event.type !== 'command' || event.action !== 'new') {
    return;
  }

  console.log('[meu-hook] Executando!');
  // Sua lógica aqui
};

export default handler;
```

### 5. Ativar e Testar

```bash
# Verifique se o hook foi descoberto
zero hooks list

# Ative-o
zero hooks enable meu-hook

# Reinicie seu processo do gateway (reinicie o app na barra de menu no macOS ou seu processo dev)

# Dispare o evento
# Envie /new via seu canal de mensagens
```

## Configuração

### Novo Formato de Configuração (Recomendado)

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "command-logger": { "enabled": false }
      }
    }
  }
}
```

### Configuração por Hook

Os hooks podem ter configurações personalizadas:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "meu-hook": {
          "enabled": true,
          "env": {
            "MINHA_VAR_PERSONALIZADA": "valor"
          }
        }
      }
    }
  }
}
```

### Diretórios Extras

Carregar hooks de diretórios adicionais:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "load": {
        "extraDirs": ["/caminho/para/mais/hooks"]
      }
    }
  }
}
```

### Formato de Configuração Legado (Ainda suportado)

O formato antigo ainda funciona para compatibilidade:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/meu-handler.ts",
          "export": "default"
        }
      ]
    }
  }
}
```

**Migração**: Use o novo sistema baseado em descoberta para novos hooks. Os manipuladores legados são carregados após os hooks baseados em diretório.

## Comandos da CLI

### Listar Hooks

```bash
# Listar todos os hooks
zero hooks list

# Mostrar apenas hooks elegíveis
zero hooks list --eligible

# Saída detalhada (mostra requisitos ausentes)
zero hooks list --verbose

# Saída em JSON
zero hooks list --json
```

### Informações do Hook

```bash
# Mostrar informações detalhadas sobre um hook
zero hooks info session-memory

# Saída em JSON
zero hooks info session-memory --json
```

### Verificar Elegibilidade

```bash
# Mostrar resumo de elegibilidade
zero hooks check

# Saída em JSON
zero hooks check --json
```

### Ativar/Desativar

```bash
# Ativar um hook
zero hooks enable session-memory

# Desativar um hook
zero hooks disable command-logger
```

## Hooks Integrados (Bundled)

### session-memory

Salva o contexto da sessão na memória quando você emite `/new`.

**Eventos**: `command:new`

**Requisitos**: `workspace.dir` deve estar configurado.

**Saída**: `<workspace>/memory/YYYY-MM-DD-slug.md` (padrão é `~/zero`).

**O que ele faz**:

1. Usa a entrada da sessão pré-reset para localizar a transcrição correta.
2. Extrai as últimas 15 linhas da conversa.
3. Usa LLM para gerar um "slug" descritivo para o nome do arquivo.
4. Salva os metadados da sessão em um arquivo de memória datado.

**Exemplo de saída**:

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**Exemplos de nomes de arquivo**:

- `2026-01-16-proposta-fornecedor.md`
- `2026-01-16-design-da-api.md`
- `2026-01-16-1430.md` (timestamp de fallback se a geração do slug falhar).

**Ativar**:

```bash
zero hooks enable session-memory
```

### command-logger

Registra todos os eventos de comando em um arquivo de auditoria centralizado.

**Eventos**: `command`

**Requisitos**: Nenhum.

**Saída**: `~/.zero/logs/commands.log`

**O que ele faz**:

1. Captura detalhes do evento (ação do comando, timestamp, chave da sessão, ID do remetente, fonte).
2. Adiciona ao arquivo de log no formato JSONL.
3. Roda silenciosamente em segundo plano.

**Exemplo de entradas de log**:

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+5511999999999","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"usuario@exemplo.com","source":"whatsapp"}
```

**Visualizar logs**:

```bash
# Ver comandos recentes
tail -n 20 ~/.zero/logs/commands.log

# Visualização formatada com jq
cat ~/.zero/logs/commands.log | jq .

# Filtrar por ação
grep '"action":"new"' ~/.zero/logs/commands.log | jq .
```

**Ativar**:

```bash
zero hooks enable command-logger
```

### soul-evil

Troca o conteúdo injetado do `SOUL.md` pelo `SOUL_EVIL.md` durante uma janela de purga ou por chance aleatória.

**Eventos**: `agent:bootstrap`

**Documentação**: [Soul Evil Hook](/hooks/soul-evil)

**Saída**: Nenhum arquivo gravado; as trocas acontecem apenas na memória.

**Ativar**:

```bash
zero hooks enable soul-evil
```

### boot-md

Executa o `BOOT.md` quando o gateway inicia (após o início dos canais).
Os hooks internos devem estar ativados para que isso funcione.

**Eventos**: `gateway:startup`

**Requisitos**: `workspace.dir` deve estar configurado.

**O que ele faz**:

1. Lê o `BOOT.md` do seu workspace.
2. Executa as instruções via executor do agente.
3. Envia quaisquer mensagens de saída solicitadas via ferramenta de mensagem.

**Ativar**:

```bash
zero hooks enable boot-md
```

## Melhores Práticas

### Mantenha os Manipuladores Rápidos

Os hooks rodam durante o processamento de comandos. Mantenha-os leves:

```typescript
// ✓ Bom - trabalho assíncrono, retorna imediatamente
const handler: HookHandler = async (event) => {
  void processarEmSegundoPlano(event); // Executa e esquece
};

// ✗ Ruim - bloqueia o processamento do comando
const handler: HookHandler = async (event) => {
  await consultaLentaNoBanco(event);
  await chamadaDeAPIAindaMaisLenta(event);
};
```

### Lide com Erros Graciosamente

Sempre envolva operações arriscadas:

```typescript
const handler: HookHandler = async (event) => {
  try {
    await operacaoArriscada(event);
  } catch (err) {
    console.error('[meu-handler] Falhou:', err instanceof Error ? err.message : String(err));
    // Não lance erro - deixe outros manipuladores rodarem
  }
};
```

### Filtre Eventos Cedo

Retorne imediatamente se o evento não for relevante:

```typescript
const handler: HookHandler = async (event) => {
  // Apenas lida com comandos 'new'
  if (event.type !== 'command' || event.action !== 'new') {
    return;
  }

  // Sua lógica aqui
};
```

### Use Chaves de Evento Específicas

Especifique eventos exatos nos metadados quando possível:

```yaml
metadata: {"zero":{"events":["command:new"]}}  # Específico
```

Em vez de:

```yaml
metadata: {"zero":{"events":["command"]}}      # Geral - gera mais overhead
```

## Depuração (Debugging)

### Ativar Log de Hooks

O gateway registra o carregamento de hooks na inicialização:

```text
Registered hook: session-memory -> command:new
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### Verficar Descoberta

Listar todos os hooks descobertos:

```bash
zero hooks list --verbose
```

### Verificar Registro

No seu manipulador, registre quando ele for chamado:

```typescript
const handler: HookHandler = async (event) => {
  console.log('[meu-handler] Disparado:', event.type, event.action);
  // Sua lógica
};
```

### Verificar Elegibilidade

Veja por que um hook não é elegível:

```bash
zero hooks info meu-hook
```

Procure por requisitos ausentes na saída.

## Testes

### Logs do Gateway

Monitore os logs do gateway para ver a execução dos hooks:

```bash
# macOS
./scripts/clawlog.sh -f

# Outras plataformas
tail -f ~/.zero/gateway.log
```

### Testar Hooks Diretamente

Teste seus manipuladores isoladamente:

```typescript
import { test } from 'vitest';
import { createHookEvent } from './src/hooks/hooks.js';
import meuHandler from './hooks/meu-hook/handler.js';

test('meu handler funciona', async () => {
  const event = createHookEvent('command', 'new', 'test-session', {
    foo: 'bar'
  });

  await meuHandler(event);

  // Verifique os efeitos colaterais
});
```

## Arquitetura

### Componentes Principais

- **`src/hooks/types.ts`**: Definições de tipos.
- **`src/hooks/workspace.ts`**: Escaneamento de diretórios e carregamento.
- **`src/hooks/frontmatter.ts`**: Análise de metadados do HOOK.md.
- **`src/hooks/config.ts`**: Verificação de elegibilidade.
- **`src/hooks/hooks-status.ts`**: Relatório de status.
- **`src/hooks/loader.ts`**: Carregador de módulo dinâmico.
- **`src/cli/hooks-cli.ts`**: Comandos da CLI.
- **`src/gateway/server-startup.ts`**: Carrega hooks ao iniciar o gateway.
- **`src/auto-reply/reply/commands-core.ts`**: Dispara eventos de comando.

### Fluxo de Descoberta

```text
Início do Gateway
    ↓
Escanear diretórios (workspace → managed → bundled)
    ↓
Analisar arquivos HOOK.md
    ↓
Verificar elegibilidade (binários, env, config, os)
    ↓
Carregar manipuladores de hooks elegíveis
    ↓
Registrar manipuladores para eventos
```

### Fluxo de Evento

```text
Usuário envia /new
    ↓
Validação do comando
    ↓
Criar evento de hook
    ↓
Disparar hook (todos os manipuladores registrados)
    ↓
Processamento do comando continua
    ↓
Reset da sessão
```

## Resolução de Problemas

### Hook Não Descoberto

1. Verifique a estrutura de diretórios:

   ```bash
   ls -la ~/.zero/hooks/meu-hook/
   # Deve mostrar: HOOK.md, handler.ts
   ```

2. Verifique o formato do HOOK.md:

   ```bash
   cat ~/.zero/hooks/meu-hook/HOOK.md
   # Deve ter frontmatter YAML com name e metadata
   ```

3. Liste todos os hooks descobertos:

   ```bash
   zero hooks list
   ```

### Hook Não Elegível

Verifique os requisitos:

```bash
zero hooks info meu-hook
```

Procure por itens ausentes:

- Binários (verifique o PATH)
- Variáveis de ambiente
- Valores de configuração
- Compatibilidade de SO

### Hook Não Executa

1. Verifique se o hook está ativado:

   ```bash
   zero hooks list
   # Deve mostrar ✓ ao lado dos hooks ativados
   ```

2. Reinicie seu processo do gateway para que os hooks sejam recarregados.

3. Verifique os logs do gateway por erros:

   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### Erros no Manipulador

Verifique erros de TypeScript ou importação:

```bash
# Testar importação diretamente
node -e "import('./path/to/handler.ts').then(console.log)"
```

## Guia de Migração

### Da Configuração Legada para Descoberta

**Antes**:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/meu-handler.ts"
        }
      ]
    }
  }
}
```

**Depois**:

1. Crie o diretório do hook:

   ```bash
   mkdir -p ~/.zero/hooks/meu-hook
   mv ./hooks/handlers/meu-handler.ts ~/.zero/hooks/meu-hook/handler.ts
   ```

2. Crie o HOOK.md:

   ```markdown
   ---
   name: meu-hook
   description: "Meu hook personalizado"
   metadata: {"zero":{"emoji":"🎯","events":["command:new"]}}
   ---

   # Meu Hook

   Faz algo útil.
   ```

3. Atualize a configuração:

   ```json
   {
     "hooks": {
       "internal": {
         "enabled": true,
         "entries": {
           "meu-hook": { "enabled": true }
         }
       }
     }
   }
   ```

4. Verifique e reinicie seu processo do gateway:

   ```bash
   zero hooks list
   # Deve mostrar: 🎯 meu-hook ✓
   ```

**Benefícios da migração**:

- Descoberta automática.
- Gestão via CLI.
- Verificação de elegibilidade.
- Melhor documentação.
- Estrutura consistente.

## Veja Também

- [Referência da CLI: hooks](/cli/hooks)
- [README de Hooks Integrados](https://github.com/zero/zero/tree/main/src/hooks/bundled)
- [Ganchos de Webhook](/automation/webhook)
- [Configuração](/gateway/configuration#hooks)
