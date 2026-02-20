---
summary: "Invoque uma única ferramenta diretamente via endpoint HTTP do Gateway"
read_when:
  - Chamando ferramentas sem executar um turno completo do agente
  - Construindo automações que precisam de aplicação de política de ferramentas
---

# Invocação de Ferramentas (HTTP)

O Gateway do ZERO expõe um endpoint HTTP simples para invocar uma única ferramenta diretamente. Ele é sempre habilitado, mas controlado pela autenticação do Gateway e política de ferramentas.

- `POST /tools/invoke`
- Mesma porta do Gateway (multiplex WS + HTTP): `http://<gateway-host>:<port>/tools/invoke`

O tamanho máximo padrão do payload é 2 MB.

## Autenticação

Usa a configuração de autenticação do Gateway. Envie um token bearer:

- `Authorization: Bearer <token>`

Notas:

- Quando `gateway.auth.mode="token"`, use `gateway.auth.token` (ou `ZERO_GATEWAY_TOKEN`).
- Quando `gateway.auth.mode="password"`, use `gateway.auth.password` (ou `ZERO_GATEWAY_PASSWORD`).

## Corpo da requisição

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

Campos:

- `tool` (string, obrigatório): nome da ferramenta a invocar.
- `action` (string, opcional): mapeado para args se o esquema da ferramenta suportar `action` e o payload de args o omitir.
- `args` (object, opcional): argumentos específicos da ferramenta.
- `sessionKey` (string, opcional): chave da sessão alvo. Se omitido ou `"main"`, o Gateway usa a chave de sessão principal configurada (honra `session.mainKey` e agente padrão, ou `global` no escopo global).
- `dryRun` (boolean, opcional): reservado para uso futuro; atualmente ignorado.

## Comportamento de política + roteamento

A disponibilidade da ferramenta é filtrada através da mesma cadeia de política usada pelos agentes do Gateway:

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- políticas de grupo (se a chave de sessão mapear para um grupo ou canal)
- política de subagente (ao invocar com uma chave de sessão de subagente)

Se uma ferramenta não for permitida pela política, o endpoint retorna **404**.

Para ajudar as políticas de grupo a resolver o contexto, você pode, opcionalmente, definir:

- `x-zero-message-channel: <channel>` (exemplo: `slack`, `telegram`)
- `x-zero-account-id: <accountId>` (quando existem múltiplas contas)

## Respostas

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (requisição inválida ou erro de ferramenta)
- `401` → não autorizado
- `404` → ferramenta não disponível (não encontrada ou não permitida)
- `405` → método não permitido

## Exemplo

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```
