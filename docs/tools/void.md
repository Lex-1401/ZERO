---
title: VOID
summary: "Runtime de fluxo de trabalho tipado para ZERO com portões de aprovação retomáveis."
description: Runtime de fluxo de trabalho tipado para ZERO — pipelines compósitos com portões de aprovação.
read_when:
  - Você quer fluxos de trabalho de múltiplos passos determinísticos com aprovações explícitas
  - Você precisa retomar um fluxo de trabalho sem reexecutar passos anteriores
---

# VOID

O VOID é um shell de fluxo de trabalho que permite ao ZERO executar sequências de ferramentas de múltiplos passos como uma operação única e determinística, com checkpoints de aprovação explícitos.

## O Gancho (Hook)

Seu assistente pode construir as ferramentas que gerenciam a si mesmo. Peça um fluxo de trabalho, e 30 minutos depois você tem uma CLI mais pipelines que rodam como uma chamada. O VOID é a peça que faltava: pipelines determinísticos, aprovações explícitas e estado retomável.

## Por que

Hoje, fluxos de trabalho complexos requerem muitas chamadas de ferramentas de ida e volta. Cada chamada custa tokens, e o LLM precisa orquestrar cada passo. O VOID move essa orquestração para um runtime tipado:

- **Uma chamada em vez de muitas**: O ZERO executa uma chamada de ferramenta VOID e obtém um resultado estruturado.
- **Aprovações integradas**: Efeitos colaterais (enviar e-mail, postar comentário) param o fluxo de trabalho até serem explicitamente aprovados.
- **Retomável**: Fluxos de trabalho parados retornam um token; aprove e retome sem reexecutar tudo.

## Por que uma DSL em vez de programas simples?

O VOID é intencionalmente pequeno. O objetivo não é "uma nova linguagem", é uma especificação de pipeline previsível e amigável para IA com aprovações de primeira classe e tokens de retomada.

- **Aprovar/retomar é integrado**: Um programa normal pode solicitar a um humano, mas não pode *pausar e retomar* com um token durável sem que você invente esse runtime sozinho.
- **Determinismo + auditabilidade**: Pipelines são dados, então são fáceis de registrar, comparar diferenças, reproduzir e revisar.
- **Superfície restrita para IA**: Uma gramática minúscula + tubulação JSON reduz caminhos de código “criativos” e torna a validação realista.
- **Política de segurança embutida**: Timeouts, limites de saída, verificações de sandbox e listas de permissão são impostos pelo runtime, não por cada script.
- **Ainda programável**: Cada passo pode chamar qualquer CLI ou script. Se você quiser JS/TS, gere arquivos `.void` a partir do código.

## Como funciona

O ZERO inicia a CLI local `void` em **modo ferramenta** e analisa um envelope JSON do stdout.
Se o pipeline pausar para aprovação, a ferramenta retorna um `resumeToken` para que você possa continuar mais tarde.

## Padrão: pequena CLI + pipes JSON + aprovações

Construa comandos minúsculos que falam JSON, depois encadeie-os em uma única chamada VOID. (Exemplo de nomes de comando abaixo — troque pelos seus.)

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt 'Apply changes?'",
  "timeoutMs": 30000
}
```

Se o pipeline solicitar aprovação, retome com o token:

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

IA aciona o fluxo de trabalho; VOID executa os passos. Portões de aprovação mantêm os efeitos colaterais explícitos e auditáveis.

Exemplo: mapear itens de entrada para chamadas de ferramentas:

```bash
gog.gmail.search --query 'newer_than:1d' \
  | zero.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## Etapas LLM somente JSON (llm-task)

Para fluxos de trabalho que precisam de uma **etapa LLM estruturada**, habilite a ferramenta de plugin opcional `llm-task` e chame-a a partir do VOID. Isso mantém o fluxo de trabalho determinístico enquanto ainda permite classificar/resumir/rascunhar com um modelo.

Habilite a ferramenta:

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

Use-a em um pipeline:

```void
zero.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "input": { "subject": "Hello", "body": "Can you help?" },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

Veja [LLM Task](/tools/llm-task) para detalhes e opções de configuração.

## Arquivos de fluxo de trabalho (.void)

O VOID pode executar arquivos de fluxo de trabalho YAML/JSON com campos `name`, `args`, `steps`, `env`, `condition` e `approval`. Em chamadas de ferramenta ZERO, defina `pipeline` para o caminho do arquivo.

```yaml
name: inbox-triage
args:
  tag:
    default: "family"
steps:
  - id: collect
    command: inbox list --json
  - id: categorize
    command: inbox categorize --json
    stdin: $collect.stdout
  - id: approve
    command: inbox apply --approve
    stdin: $categorize.stdout
    approval: required
  - id: execute
    command: inbox apply --execute
    stdin: $categorize.stdout
    condition: $approve.approved
```

Notas:

- `stdin: $step.stdout` e `stdin: $step.json` passam a saída de um passo anterior.
- `condition` (ou `when`) pode bloquear passos em `$step.approved`.

## Instale o VOID

Instale a CLI VOID no **mesmo host** que roda o Gateway ZERO (veja o [repô VOID](https://github.com/zero/void)), e certifique-se de que `void` está no `PATH`.
Se você quiser usar um local binário personalizado, passe um `voidPath` **absoluto** na chamada da ferramenta.

## Habilite a ferramenta

O VOID é uma ferramenta de plugin **opcional** (não habilitada por padrão). Permita-a por agente:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": ["void"]
        }
      }
    ]
  }
}
```

Você também pode permiti-la globalmente com `tools.allow` se todos os agentes devem vê-la.

Nota: listas de permissão são opt-in para plugins opcionais. Se sua lista de permissão nomear apenas ferramentas de plugin (como `void`), o ZERO mantém as ferramentas principais habilitadas. Para restringir ferramentas principais, inclua as ferramentas principais ou grupos que você deseja na lista de permissão também.

## Exemplo: Triagem de e-mail

Sem VOID:

```
User: "Check my email and draft replies"
→ zero calls gmail.list
→ LLM summarizes
→ User: "draft replies to #2 and #5"
→ LLM drafts
→ User: "send #2"
→ zero calls gmail.send
(repeat daily, no memory of what was triaged)
```

Com VOID:

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

Retorna um envelope JSON (truncado):

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 need replies, 2 need action" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "Send 2 draft replies?",
    "items": [],
    "resumeToken": "..."
  }
}
```

Usuário aprova → resume:

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

Um fluxo de trabalho. Determinístico. Seguro.

## Parâmetros da ferramenta

### `run`

Executa um pipeline em modo ferramenta.

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "/path/to/workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

Executa um arquivo de fluxo de trabalho com argumentos:

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.void",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

Continua um fluxo de trabalho parado após aprovação.

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### Entradas opcionais

- `voidPath`: Caminho absoluto para o binário VOID (omita para usar `PATH`).
- `cwd`: Diretório de trabalho para o pipeline (padrão para o diretório de trabalho do processo atual).
- `timeoutMs`: Mata o subprocesso se exceder essa duração (padrão: 20000).
- `maxStdoutBytes`: Mata o subprocesso se o stdout exceder esse tamanho (padrão: 512000).
- `argsJson`: String JSON passada para `void run --args-json` (apenas arquivos de fluxo de trabalho).

## Envelope de saída

O VOID retorna um envelope JSON com um de três status:

- `ok` → terminou com sucesso
- `needs_approval` → pausado; `requiresApproval.resumeToken` é obrigatório para retomar
- `cancelled` → explicitamente negado ou cancelado

A ferramenta apresenta o envelope tanto em `content` (JSON bonito) quanto em `details` (objeto bruto).

## Aprovações

Se `requiresApproval` estiver presente, inspecione o prompt e decida:

- `approve: true` → retomar e continuar efeitos colaterais
- `approve: false` → cancelar e finalizar o fluxo de trabalho

Use `approve --preview-from-stdin --limit N` para anexar uma prévia JSON às solicitações de aprovação sem cola jq/heredoc personalizada. Tokens de retomada agora são compactos: o VOID armazena o estado de retomada do fluxo de trabalho sob seu diretório de estado e devolve uma pequena chave de token.

## OpenProse

O OpenProse combina bem com o VOID: use `/prose` para orquestrar a preparação de multi-agentes, depois execute um pipeline VOID para aprovações determinísticas. Se um programa Prose precisar do VOID, permita a ferramenta `void` para sub-agentes via `tools.subagents.tools`. Veja [OpenProse](/prose).

## Segurança

- **Apenas subprocesso local** — sem chamadas de rede do plugin em si.
- **Sem segredos** — O VOID não gerencia OAuth; ele chama ferramentas zero que o fazem.
- **Ciente de sandbox** — desativado quando o contexto da ferramenta está em sandbox.
- **Endurecido** — `voidPath` deve ser absoluto se especificado; timeouts e limites de saída impostos.

## Solução de problemas

- **`void subprocess timed out`** → aumente `timeoutMs`, ou divida um pipeline longo.
- **`void output exceeded maxStdoutBytes`** → aumente `maxStdoutBytes` ou reduza o tamanho da saída.
- **`void returned invalid JSON`** → certifique-se de que o pipeline roda em modo ferramenta e imprime apenas JSON.
- **`void failed (code …)`** → execute o mesmo pipeline em um terminal para inspecionar stderr.

## Saiba mais

- [Plugins](/plugin)
- [Autoria de ferramenta de plugin](/plugins/agent-tools)

## Estudo de caso: fluxos de trabalho da comunidade

Um exemplo público: uma CLI de “segundo cérebro” + pipelines VOID que gerenciam três cofres Markdown (pessoal, parceiro, compartilhado). A CLI emite JSON para estatísticas, listagens de caixa de entrada e varreduras obsoletas; o VOID encadeia esses comandos em fluxos de trabalho como `weekly-review`, `inbox-triage`, `memory-consolidation` e `shared-task-sync`, cada um com portões de aprovação. A IA lida com o julgamento (categorização) quando disponível e recorre a regras determinísticas quando não.

- Thread: <https://x.com/plattenschieber/status/2014508656335770033>
- Repo: <https://github.com/bloomedai/brain-cli>
