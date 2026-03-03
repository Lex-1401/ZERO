---
summary: "Análise de localização de canal de entrada (Telegram + WhatsApp) e campos de contexto"
read_when:
  - Adicionando ou modificando análise de localização de canal
  - Usando campos de contexto de localização em prompts de agente ou ferramentas
---

# Análise de localização de canal

O ZERO normaliza localizações compartilhadas de canais de chat em:

- texto legível anexado corpo da mensagem de entrada, e
- campos estruturados no payload de contexto de resposta automática (auto-reply).

Atualmente suportado:

- **Telegram** (pinos de localização + locais (venues) + localizações ao vivo)
- **WhatsApp** (locationMessage + liveLocationMessage)
- **Matrix** (`m.location` com `geo_uri`)

## Formatação de texto

Localizações são renderizadas como linhas amigáveis sem colchetes:

- Pino (Pin):
  - `📍 48.858844, 2.294351 ±12m`
- Local nomeado (Named place):
  - `📍 Torre Eiffel — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- Compartilhamento ao vivo (Live share):
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

Se o canal incluir uma legenda/comentário, ele é anexado na próxima linha:

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## Campos de contexto

Quando uma localização está presente, estes campos são adicionados ao `ctx`:

- `LocationLat` (número)
- `LocationLon` (número)
- `LocationAccuracy` (número, metros; opcional)
- `LocationName` (string; opcional)
- `LocationAddress` (string; opcional)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (booleano)

## Notas de canal

- **Telegram**: locais (venues) mapeiam para `LocationName/LocationAddress`; localizações ao vivo usam `live_period`.
- **WhatsApp**: `locationMessage.comment` e `liveLocationMessage.caption` são anexados como a linha de legenda.
- **Matrix**: `geo_uri` é analisado como uma localização de pino; altitude é ignorada e `LocationIsLive` é sempre falso.
