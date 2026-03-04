---
summary: "Notas do protocolo RPC para o assistente de integração e esquema de configuração"
read_when: "Alterando as etapas do assistente de integração ou endpoints do esquema de configuração"
---

# Protocolo de Integração (Onboarding) + Configuração

Objetivo: superfícies de integração e configuração compartilhadas entre CLI, app macOS e UI Web.

## Componentes

- Motor do assistente (sessão compartilhada + prompts + estado de integração).
- A integração via CLI usa o mesmo fluxo do assistente que os clientes da UI.
- O RPC do Gateway expõe os endpoints do assistente + esquema de configuração.
- A integração do macOS usa o modelo de etapas do assistente.
- A UI Web renderiza formulários de configuração a partir de JSON Schema + dicas de UI (UI hints).

## RPC do Gateway

- `wizard.start` parâmetros: `{ mode?: "local"|"remote", workspace?: string }`
- `wizard.next` parâmetros: `{ sessionId, answer?: { stepId, value? } }`
- `wizard.cancel` parâmetros: `{ sessionId }`
- `wizard.status` parâmetros: `{ sessionId }`
- `config.schema` parâmetros: `{}`

Respostas (formato)

- Assistente (Wizard): `{ sessionId, done, step?, status?, error? }`
- Esquema de configuração: `{ schema, uiHints, version, generatedAt }`

## Dicas de UI (UI Hints)

- `uiHints` indexadas pelo caminho; metadados opcionais (label/help/group/order/advanced/sensitive/placeholder).
- Campos sensíveis renderizam como inputs de senha; sem camada de redação.
- Nós de esquema não suportados recorrem ao editor JSON bruto.

## Notas

- Este documento é o local único para rastrear refatorações de protocolo para integração/configuração.
