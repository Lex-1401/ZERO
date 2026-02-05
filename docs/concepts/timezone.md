---
summary: "Tratamento de fuso horário (timezone) para agentes, envelopes e prompts"
read_when:
  - Você precisa entender como os carimbos de data/hora (timestamps) são normalizados para o modelo
  - Configurando o fuso horário do usuário para prompts do sistema
---

# Fusos Horários (Timezones)

O ZERO padroniza os carimbos de data/hora (timestamps) para que o modelo veja um **único tempo de referência**.

## Envelopes de mensagem (local por padrão)

As mensagens de entrada são envolvidas em um envelope como:

```text
[Provedor ... 2026-01-05 16:26 PST] texto da mensagem
```

O timestamp no envelope é **local do host por padrão**, com precisão de minutos.

Você pode sobrescrever isso com:

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | fuso horário IANA
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on" // "on" | "off"
    }
  }
}
```

- `envelopeTimezone: "utc"` usa o UTC.
- `envelopeTimezone: "user"` usa a configuração `agents.defaults.userTimezone` (volta para o fuso horário do host se não definido).
- Use um fuso horário IANA explícito (por exemplo, `"Europe/Vienna"`) para um deslocamento fixo.
- `envelopeTimestamp: "off"` remove os timestamps absolutos dos cabeçalhos do envelope.
- `envelopeElapsed: "off"` remove os sufixos de tempo decorrido (o estilo `+2m`).

### Exemplos

**Local (padrão):**

```text
[Signal Alice +1555 2026-01-18 00:19 PST] olá
```

**Fuso horário fixo:**

```text
[Signal Alice +1555 2026-01-18 06:19 GMT+1] olá
```

**Tempo decorrido:**

```text
[Signal Alice +1555 +2m 2026-01-18T05:19Z] acompanhamento
```

## Payloads de ferramentas (dados brutos do provedor + campos normalizados)

As chamadas de ferramentas (`channels.discord.readMessages`, `channels.slack.readMessages`, etc.) retornam **timestamps brutos do provedor**. Também anexamos campos normalizados para consistência:

- `timestampMs` (milissegundos da época UTC).
- `timestampUtc` (string UTC ISO 8601).

Os campos brutos do provedor são preservados.

## Fuso horário do usuário para o prompt do sistema

Defina `agents.defaults.userTimezone` para informar ao modelo o fuso horário local do usuário. Se não estiver definido, o ZERO resolve o **fuso horário do host em tempo de execução** (sem gravação na configuração).

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } }
}
```

O prompt do sistema inclui:

- Seção `Data e Hora Atual` com a hora local e o fuso horário.
- `Formato de hora: 12 horas` ou `24 horas`.

Você pode controlar o formato do prompt com `agents.defaults.timeFormat` (`auto` | `12` | `24`).

Veja [Data e Hora](/date-time) para o comportamento completo e exemplos.
