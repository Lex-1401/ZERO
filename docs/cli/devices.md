---
summary: "Referência CLI para `zero devices` (emparelhamento de dispositivo + rotação/revogação de token)"
read_when:
  - Você está aprovando requisições de emparelhamento de dispositivo
  - Você precisa rotacionar ou revogar tokens de dispositivo
---

# `zero devices`

Gerencie requisições de emparelhamento de dispositivo e tokens com escopo de dispositivo.

## Comandos

### `zero devices list`

Liste requisições de emparelhamento pendentes e dispositivos emparelhados.

```
zero devices list
zero devices list --json
```

### `zero devices approve <requestId>`

Aprove uma requisição de emparelhamento de dispositivo pendente.

```
zero devices approve <requestId>
```

### `zero devices reject <requestId>`

Rejeite uma requisição de emparelhamento de dispositivo pendente.

```
zero devices reject <requestId>
```

### `zero devices rotate --device <id> --role <role> [--scope <scope...>]`

Rotacione um token de dispositivo para uma função específica (opcionalmente atualizando escopos).

```
zero devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `zero devices revoke --device <id> --role <role>`

Revogue um token de dispositivo para uma função específica.

```
zero devices revoke --device <deviceId> --role node
```

## Opções comuns

- `--url <url>`: URL WebSocket do Gateway (padroniza para `gateway.remote.url` quando configurado).
- `--token <token>`: Token do Gateway (se obrigatório).
- `--password <senha>`: Senha do Gateway (auth de senha).
- `--timeout <ms>`: Timeout de RPC.
- `--json`: Saída JSON (recomendado para scripts).

## Notas

- Rotação de token retorna um novo token (sensível). Trate como um segredo.
- Estes comandos requerem escopo `operator.pairing` (ou `operator.admin`).
