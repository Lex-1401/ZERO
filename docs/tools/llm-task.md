---
summary: "Tarefas LLM somente JSON para fluxos de trabalho (ferramenta plugin opcional)"
read_when:
  - Você quer uma etapa LLM somente JSON dentro de fluxos de trabalho
  - Você precisa de saída LLM validada por esquema para automação
---

# LLM Task

`llm-task` é uma **ferramenta de plugin opcional** que executa uma tarefa LLM somente JSON e
retorna saída estruturada (opcionalmente validada contra JSON Schema).

Isso é ideal para motores de fluxo de trabalho como o VOID: você pode adicionar uma única etapa LLM
sem escrever código ZERO personalizado para cada fluxo de trabalho.

## Habilitar o plugin

1) Habilite o plugin:

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

1) Adicione a ferramenta à lista de permissão (ela é registrada com `optional: true`):

```json
{
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

## Configuração (opcional)

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.2",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.2"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` é uma lista de permissão de strings `provider/model`. Se definida, qualquer requisição
fora da lista é rejeitada.

## Parâmetros da ferramenta

- `prompt` (string, obrigatório)
- `input` (qualquer, opcional)
- `schema` (objeto, JSON Schema opcional)
- `provider` (string, opcional)
- `model` (string, opcional)
- `authProfileId` (string, opcional)
- `temperature` (número, opcional)
- `maxTokens` (número, opcional)
- `timeoutMs` (número, opcional)

## Saída

Retorna `details.json` contendo o JSON analisado (e valida contra `schema` quando fornecido).

## Exemplo: etapa de fluxo de trabalho VOID

```void
zero.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
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

## Notas de segurança

- A ferramenta é **somente JSON** e instrui o modelo a produzir apenas JSON (sem cercas de código, sem comentários).
- Nenhuma ferramenta é exposta ao modelo para esta execução.
- Trate a saída como não confiável a menos que você valide com `schema`.
- Coloque aprovações antes de qualquer etapa de efeito colateral (send, post, exec).
