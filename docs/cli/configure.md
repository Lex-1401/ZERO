---
summary: "Referência CLI para `zero configure` (prompts de configuração interativa)"
read_when:
  - Você quer ajustar credenciais, dispositivos, ou padrões de agente interativamente
---

# `zero configure`

Prompt interativo para configurar credenciais, dispositivos e padrões de agente.

Nota: A seção **Model** agora inclui uma seleção múltipla para a allowlist `agents.defaults.models` (o que aparece em `/model` e no seletor de modelo).

Dica: `zero config` sem um subcomando abre o mesmo assistente. Use `zero config get|set|unset` para edições não-interativas.

Relacionado:

- Referência de configuração do Gateway: [Configuration](/gateway/configuration)
- CLI Config: [Config](/cli/config)

Notas:

- Escolher onde o Gateway roda sempre atualiza `gateway.mode`. Você pode selecionar "Continuar" sem outras seções se isso for tudo o que precisa.
- Serviços orientados a canal (Slack/Discord/Matrix/Microsoft Teams) pedem allowlists de canal/sala durante o setup. Você pode inserir nomes ou IDs; o assistente resolve nomes para IDs quando possível.

## Exemplos

```bash
zero configure
zero configure --section models --section channels
```
