---
summary: "Envio de enquetes (polls) via gateway + CLI"
read_when:
  - Adicionando ou modificando o suporte a enquetes
  - Depurando envios de enquetes pela CLI ou gateway
---
# Enquetes (Polls)

## Canais suportados

- WhatsApp (canal web)
- Discord
- MS Teams (Adaptive Cards)

## CLI

```bash
# WhatsApp
zero message poll --target +15555550123 \
  --poll-question "Almoço hoje?" --poll-option "Sim" --poll-option "Não" --poll-option "Talvez"
zero message poll --target 123456789@g.us \
  --poll-question "Horário da reunião?" --poll-option "10am" --poll-option "2pm" --poll-option "4pm" --poll-multi

# Discord
zero message poll --channel discord --target channel:123456789 \
  --poll-question "Lanche?" --poll-option "Pizza" --poll-option "Sushi"
zero message poll --channel discord --target channel:123456789 \
  --poll-question "Plano?" --poll-option "A" --poll-option "B" --poll-duration-hours 48

# MS Teams
zero message poll --channel msteams --target conversation:19:abc@thread.tacv2 \
  --poll-question "Almoço?" --poll-option "Pizza" --poll-option "Sushi"
```

Opções:

- `--channel`: `whatsapp` (padrão), `discord` ou `msteams`
- `--poll-multi`: permite selecionar múltiplas opções
- `--poll-duration-hours`: apenas para Discord (padrão 24 quando omitido)

## Gateway RPC

Método: `poll`

Parâmetros:

- `to` (string, obrigatório)
- `question` (string, obrigatório)
- `options` (string[], obrigatório)
- `maxSelections` (number, opcional)
- `durationHours` (number, opcional)
- `channel` (string, opcional, padrão: `whatsapp`)
- `idempotencyKey` (string, obrigatório)

## Diferenças entre os canais

- WhatsApp: 2-12 opções, `maxSelections` deve estar dentro da contagem de opções, ignora `durationHours`.
- Discord: 2-10 opções, `durationHours` limitado a 1-768 horas (padrão 24). `maxSelections > 1` habilita multi-seleção; o Discord não suporta uma contagem estrita de seleção.
- MS Teams: Enquetes via Adaptive Card (gerenciadas pelo ZERO). Não há API de enquete nativa; `durationHours` é ignorado.

## Ferramenta de Agente (Message)

Use a ferramenta `message` com a ação `poll` (`to`, `pollQuestion`, `pollOption`, opcional `pollMulti`, `pollDurationHours`, `channel`).

Nota: O Discord não possui um modo “escolha exatamente N”; `pollMulti` mapeia para multi-seleção.
As enquetes do Teams são renderizadas como Adaptive Cards e exigem que o gateway permaneça online para registrar os votos em `~/.zero/msteams-polls.json`.
