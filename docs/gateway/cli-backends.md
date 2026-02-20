---
summary: "Backends de CLI: alternativa apenas de texto via CLIs locais de IA"
read_when:
  - Você deseja um fallback confiável quando os provedores de API falham
  - Você está executando a CLI do Claude Code ou outras CLIs de IA locais e deseja reutilizá-las
  - Você precisa de um caminho apenas de texto e sem ferramentas, mas que ainda suporte sessões e imagens
---
# Backends de CLI (tempo de execução de fallback)

O ZERO pode executar **CLIs de IA locais** como um **fallback apenas de texto** quando os provedores de API estão fora do ar, limitados por taxa ou apresentando instabilidade temporária. Isso é intencionalmente conservador:

- **Ferramentas estão desativadas** (sem chamadas de ferramentas).
- **Entrada de texto → Saída de texto** (confiável).
- **Sessões são suportadas** (para que as interações de acompanhamento permaneçam coerentes).
- **Imagens podem ser passadas** se a CLI aceitar caminhos de imagem.

Isto foi projetado como uma **rede de segurança** em vez de um caminho primário. Use-o quando desejar respostas de texto que "sempre funcionam" sem depender de APIs externas.

## Início rápido para iniciantes

Você pode usar a CLI do Claude Code **sem qualquer configuração** (o ZERO traz um padrão integrado):

```bash
zero agent --message "oi" --model claude-cli/opus-4.5
```

A CLI do Codex também funciona de imediato:

```bash
zero agent --message "oi" --model codex-cli/gpt-5.2-codex
```

Se o seu gateway rodar sob o launchd/systemd e o PATH for mínimo, adicione apenas o caminho do comando:

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude"
        }
      }
    }
  }
}
```

Isso é tudo. Sem chaves, sem necessidade de configuração extra de autenticação além da própria CLI.

## Usando como fallback

Adicione um backend de CLI à sua lista de fallbacks para que ele só rode quando os modelos primários falharem:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: [
          "claude-cli/opus-4.5"
        ]
      },
      models: {
        "anthropic/claude-opus-4-5": { alias: "Opus" },
        "claude-cli/opus-4.5": {}
      }
    }
  }
}
```

Notas:

- Se você usar `agents.defaults.models` (lista de permissões), deve incluir `claude-cli/...`.
- Se o provedor primário falhar (autenticação, limite de taxa, tempo limite), o ZERO tentará o backend de CLI em seguida.

## Visão geral da configuração

Todos os backends de CLI residem em:

```text
agents.defaults.cliBackends
```

Cada entrada é indexada por um **ID de provedor** (ex: `claude-cli`, `minha-cli`). O ID do provedor torna-se o lado esquerdo da sua referência de modelo:

```text
<provedor>/<modelo>
```

### Exemplo de configuração

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude"
        },
        "minha-cli": {
          command: "minha-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-5": "opus",
            "claude-sonnet-4-5": "sonnet"
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          serialize: true
        }
      }
    }
  }
}
```

## Como funciona

1) **Seleciona um backend** com base no prefixo do provedor (`claude-cli/...`).
2) **Constrói um prompt de sistema** usando o mesmo prompt do ZERO + contexto do espaço de trabalho.
3) **Executa a CLI** com um ID de sessão (se suportado) para que o histórico permaneça consistente.
4) **Analisa a saída** (JSON ou texto simples) e retorna o texto final.
5) **Persiste os IDs de sessão** por backend, para que os acompanhamentos reutilizem a mesma sessão da CLI.

## Sessões

- Se a CLI suportar sessões, defina `sessionArg` (ex: `--session-id`) ou `sessionArgs` (espaço reservado `{sessionId}`) quando o ID precisar ser inserido em múltiplas flags.
- Se a CLI usar um **subcomando de retomada (resume)** com flags diferentes, defina `resumeArgs` (substitui `args` ao retomar) e, opcionalmente, `resumeOutput` (para retomadas que não sejam em JSON).
- `sessionMode`:
  - `always`: sempre envia um ID de sessão (novo UUID se nenhum estiver armazenado).
  - `existing`: só envia um ID de sessão se um já foi armazenado anteriormente.
  - `none`: nunca envia um ID de sessão.

## Imagens (Passagem direta)

Se a sua CLI aceitar caminhos de imagem, defina `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

O ZERO gravará as imagens base64 em arquivos temporários. Se `imageArg` estiver definido, esses caminhos serão passados como argumentos da CLI. Se `imageArg` estiver ausente, o ZERO anexará os caminhos dos arquivos ao prompt (injeção de caminho), o que é suficiente para CLIs que carregam automaticamente arquivos locais a partir de caminhos simples (comportamento da CLI de Claude Code).

## Entradas / Saídas

- `output: "json"` (padrão) tenta analisar o JSON e extrair o texto + ID da sessão.
- `output: "jsonl"` analisa streams JSONL (Codex CLI `--json`) e extrair a última mensagem do agente mais o `thread_id` quando presente.
- `output: "text"` trata o stdout como a resposta final.

Modos de entrada:

- `input: "arg"` (padrão) passa o prompt como o último argumento da CLI.
- `input: "stdin"` envia o prompt via stdin.
- Se o prompt for muito longo e `maxPromptArgChars` estiver definido, o stdin será usado.

## Padrões integrados (Built-in)

O ZERO traz um padrão para o `claude-cli`:

- `command: "claude"`
- `args: ["-p", "--output-format", "json", "--dangerously-skip-permissions"]`
- `resumeArgs: ["-p", "--output-format", "json", "--dangerously-skip-permissions", "--resume", "{sessionId}"]`
- `modelArg: "--model"`
- `systemPromptArg: "--append-system-prompt"`
- `sessionArg: "--session-id"`
- `systemPromptWhen: "first"`
- `sessionMode: "always"`

O ZERO também traz um padrão para o `codex-cli`:

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

Sobrescreva apenas se necessário (comum: caminho absoluto do `command`).

## Limitações

- **Sem ferramentas do ZERO** (o backend da CLI nunca recebe chamadas de ferramentas). Algumas CLIs ainda podem executar seu próprio conjunto de ferramentas de agente.
- **Sem transmissão (streaming)** (a saída da CLI é coletada e depois retornada).
- **Saídas estruturadas** dependem do formato JSON da CLI.
- **Sessões da CLI do Codex** são retomadas via saída de texto (sem JSONL), o que é menos estruturado do que a execução inicial com `--json`. As sessões do ZERO continuam funcionando normalmente.

## Solução de problemas

- **CLI não encontrada**: defina o `command` com o caminho completo.
- **Nome do modelo errado**: use `modelAliases` para mapear `provedor/modelo` → modelo da CLI.
- **Sem continuidade de sessão**: certifique-se de que o `sessionArg` esteja definido e o `sessionMode` não seja `none` (a CLI do Codex atualmente não consegue retomar com saída JSON).
- **Imagens ignoradas**: defina o `imageArg` (e verifique se a CLI suporta caminhos de arquivo).
