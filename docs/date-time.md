---
summary: "Manuseio de data e hora em envelopes, prompts, ferramentas e conectores"
read_when:
  - Você está alterando como os carimbos de data/hora (timestamps) são exibidos para o modelo ou usuários
  - Você está depurando a formatação de hora em mensagens ou na saída do prompt do sistema
---

# Data e Hora

O ZERO utiliza como padrão a **hora local do host para carimbos de data/hora de transporte** e o **fuso horário do usuário apenas no prompt do sistema**. Os carimbos de data/hora do provedor são preservados para que as ferramentas mantenham sua semântica nativa (a hora atual está disponível via `session_status`).

## Envelopes de mensagem (local por padrão)

Mensagens de entrada são envolvidas com um carimbo de data/hora (precisão de minuto):

```text
[Provider ... 2026-01-05 16:26 PST] texto da mensagem
```

Este carimbo de data/hora do envelope é **local do host por padrão**, independentemente do fuso horário do provedor.

Você pode substituir este comportamento em `~/.zero/zero.json`:

```json5
{
  "agents": {
    "defaults": {
      "envelopeTimezone": "local", // "utc" | "local" | "user" | fuso horário IANA
      "envelopeTimestamp": "on", // "on" | "off"
      "envelopeElapsed": "on" // "on" | "off"
    }
  }
}
```

- `envelopeTimezone: "utc"` usa UTC.
- `envelopeTimezone: "local"` usa o fuso horário do host.
- `envelopeTimezone: "user"` usa `agents.defaults.userTimezone` (recorre ao fuso horário do host se não definido).
- Use um fuso horário IANA explícito (ex: `"America/Sao_Paulo"`) para uma zona fixa.
- `envelopeTimestamp: "off"` remove os carimbos de data/hora absolutos dos cabeçalhos do envelope.
- `envelopeElapsed: "off"` remove os sufixos de tempo decorrido (o estilo `+2m`).

### Exemplos

**Local (padrão):**

```text
[WhatsApp +5511 2026-01-18 00:19 BRT] olá
```

**Fuso horário do usuário:**

```text
[WhatsApp +5511 2026-01-18 00:19 BRT] olá
```

**Tempo decorrido ativado:**

```text
[WhatsApp +5511 +30s 2026-01-18T05:19Z] acompanhamento
```

## Prompt do sistema: Data e Hora Atual

Se o fuso horário do usuário for conhecido, o prompt do sistema incluirá uma seção dedicada de **Data e Hora Atual** com **apenas o fuso horário** (sem relógio/formato de hora) para manter o cache do prompt estável:

```text
Time zone: America/Sao_Paulo
```

Quando o agente precisa da hora atual, utilize a ferramenta `session_status`; o cartão de status inclui uma linha com o carimbo de data/hora.

## Linhas de eventos do sistema (local por padrão)

Eventos do sistema enfileirados inseridos no contexto do agente são prefixados com um carimbo de data/hora usando a mesma seleção de fuso horário dos envelopes de mensagem (padrão: local do host).

```text
System: [2026-01-12 12:19:17 BRT] Modelo alternado.
```

### Configurar fuso horário do usuário + formato

```json5
{
  "agents": {
    "defaults": {
      "userTimezone": "America/Sao_Paulo",
      "timeFormat": "auto" // auto | 12 | 24
    }
  }
}
```

- `userTimezone` define o **fuso horário local do usuário** para o contexto do prompt.
- `timeFormat` controla a exibição de **12h/24h** no prompt. `auto` segue as preferências do sistema operacional.

## Detecção do formato de hora (auto)

Quando `timeFormat: "auto"`, o ZERO inspeciona a preferência do SO (macOS/Windows) e recorre à formatação de localidade (locale). O valor detectado é **armazenado em cache por processo** para evitar chamadas de sistema repetidas.

## Payloads de ferramentas + conectores (hora nativa do provedor + campos normalizados)

As ferramentas de canal retornam **carimbos de data/hora nativos do provedor** e adicionam campos normalizados para consistência:

- `timestampMs`: milissegundos desde a época (UTC).
- `timestampUtc`: string UTC ISO 8601.

Os campos originais do provedor são preservados para que nada seja perdido.

- Slack: strings tipo epoch da API.
- Discord: carimbos de data/hora ISO UTC.
- Telegram/WhatsApp: carimbos numéricos/ISO específicos do provedor.

Se você precisar da hora local, converta-a posteriormente usando o fuso horário conhecido.

## Documentos relacionados

- [Prompt do Sistema](/concepts/system-prompt)
- [Fuso Horário](/concepts/timezone)
- [Mensagens](/concepts/messages)
