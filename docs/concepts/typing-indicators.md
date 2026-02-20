---
summary: "Quando o ZERO mostra indicadores de digitação e como ajustá-los"
read_when:
  - Alterando o comportamento ou os padrões dos indicadores de digitação
---
# Indicadores de digitação

Indicadores de digitação são enviados ao canal de chat enquanto uma execução do agente está ativa. Use `agents.defaults.typingMode` para controlar **quando** a digitação começa e `typingIntervalSeconds` para controlar a **frequência** com que ela é atualizada.

## Padrões

Quando `agents.defaults.typingMode` não está definido, o ZERO mantém o comportamento legado:

- **Chats diretos**: a digitação começa imediatamente assim que o loop do modelo se inicia.
- **Chats de grupo com menção**: a digitação começa imediatamente.
- **Chats de grupo sem menção**: a digitação começa apenas quando o texto da mensagem começa a ser transmitido (streaming).
- **Execuções de batimento cardíaco (Heartbeat)**: a digitação fica desativada.

## Modos

Defina `agents.defaults.typingMode` como um dos seguintes:

- `never` — nunca mostra indicador de digitação.
- `instant` — começa a digitar **assim que o loop do modelo se inicia**, mesmo que a execução retorne posteriormente apenas o token de resposta silenciosa.
- `thinking` — começa a digitar no **primeiro delta de raciocínio** (exige `reasoningLevel: "stream"` para a execução).
- `message` — começa a digitar no **primeiro delta de texto não silencioso** (ignora o token silencioso `NO_REPLY`).

Ordem de “quão cedo ele dispara”:
`never` → `message` → `thinking` → `instant`

## Configuração

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6
  }
}
```

Você pode sobrescrever o modo ou a cadência por sessão:

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4
  }
}
```

## Notas

- O modo `message` não mostrará que o bot está digitando em respostas apenas silenciosas (ex: o token `NO_REPLY` usado para suprimir a saída).
- O modo `thinking` só dispara se a execução transmitir o raciocínio (`reasoningLevel: "stream"`). Se o modelo não emitir deltas de raciocínio, a digitação não começará.
- Batimentos cardíacos (heartbeats) nunca mostram digitação, independentemente do modo.
- `typingIntervalSeconds` controla a **cadência de atualização**, não o momento de início. O padrão é 6 segundos.
