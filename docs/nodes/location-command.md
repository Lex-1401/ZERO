---
summary: "Comando de localização para nós (location.get), modos de permissão e comportamento em segundo plano"
read_when:
  - Adicionando suporte a nó de localização ou UI de permissões
  - Projetando fluxos de localização em segundo plano + push
---
# Comando de Localização (Nós)

## TL;DR

- `location.get` é um comando de nó (via `node.invoke`).
- Desativado por padrão.
- As configurações usam um seletor: Desativado (Off) / Durante o Uso (While Using) / Sempre (Always).
- Alternância (toggle) separada: Localização Precisa.

## Por que um seletor (e não apenas uma chave)

As permissões do SO são multinível. Podemos expor um seletor no app, mas o SO ainda decide a concessão real.

- iOS/macOS: o usuário pode escolher **Durante o Uso** ou **Sempre** nos prompts do sistema/Ajustes. O app pode solicitar o upgrade, mas o SO pode exigir os Ajustes.
- Android: a localização em segundo plano é uma permissão separada; no Android 10+ muitas vezes exige um fluxo nos Ajustes.
- A localização precisa é uma concessão separada (iOS 14+ “Precisa”, Android “fina” vs “grossa”).

O seletor na UI impulsiona o nosso modo solicitado; a concessão real reside nas configurações do SO.

## Modelo de configurações

Por dispositivo de nó:

- `location.enabledMode`: `off | whileUsing | always`
- `location.preciseEnabled`: bool

Comportamento da UI:

- Selecionar `whileUsing` solicita permissão de primeiro plano (foreground).
- Selecionar `always` garante primeiro o `whileUsing`, depois solicita segundo plano (ou envia o usuário para os Ajustes, se necessário).
- Se o SO negar o nível solicitado, reverte para o nível mais alto concedido e mostra o status.

## Mapa de permissões (node.permissions)

Opcional. O nó macOS relata `location` via mapa de permissões; iOS/Android podem omiti-lo.

## Comando: `location.get`

Chamado via `node.invoke`.

Parâmetros (sugeridos):

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

Payload de resposta:

```json
{
  "lat": 48.20849,
  "lon": 16.37208,
  "accuracyMeters": 12.5,
  "altitudeMeters": 182.0,
  "speedMps": 0.0,
  "headingDeg": 270.0,
  "timestamp": "2026-01-03T12:34:56.000Z",
  "isPrecise": true,
  "source": "gps|wifi|cell|unknown"
}
```

Erros (códigos estáveis):

- `LOCATION_DISABLED`: o seletor está desligado.
- `LOCATION_PERMISSION_REQUIRED`: falta permissão para o modo solicitado.
- `LOCATION_BACKGROUND_UNAVAILABLE`: o app está em segundo plano, mas apenas Durante o Uso é permitido.
- `LOCATION_TIMEOUT`: nenhuma localização obtida a tempo.
- `LOCATION_UNAVAILABLE`: falha do sistema / nenhum provedor.

## Comportamento em segundo plano (futuro)

Objetivo: o modelo pode solicitar localização mesmo quando o nó estiver em segundo plano, mas apenas quando:

- O usuário selecionou **Sempre**.
- O SO concede localização em segundo plano.
- O app tem permissão para rodar em segundo plano para localização (modo de segundo plano do iOS / serviço de primeiro plano do Android ou permissão especial).

Fluxo acionado por push (futuro):

1) O Gateway envia um push para o nó (silent push ou dados FCM).
2) O nó acorda brevemente e solicita a localização do dispositivo.
3) O nó encaminha o payload para o Gateway.

Notas:

- iOS: Permissão Sempre + modo de localização em segundo plano exigidos. O silent push pode ser limitado (throttled); espere falhas intermitentes.
- Android: a localização em segundo plano pode exigir um serviço de primeiro plano; caso contrário, espere negação.

## Integração com Modelo/Ferramentas

- Superfície da ferramenta: a ferramenta `nodes` adiciona a ação `location_get` (nó exigido).
- CLI: `zero nodes location get --node <id>`.
- Diretrizes para o Agente: chame apenas quando o usuário habilitou a localização e entende o escopo.

## Textos da UX (sugeridos)

- Desativado: “O compartilhamento de localização está desativado.”
- Durante o Uso: “Apenas quando o ZERO estiver aberto.”
- Sempre: “Permitir localização em segundo plano. Exige permissão do sistema.”
- Precisa: “Usar localização GPS precisa. Desative para compartilhar localização aproximada.”
