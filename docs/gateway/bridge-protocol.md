---
summary: "Protocolo de ponte (nós legados): TCP JSONL, emparelhamento, RPC escopado"
read_when:
  - Construindo ou depurando clientes de nós (modo nó iOS/Android/macOS)
  - Investigando falhas de autenticação de ponte ou emparelhamento
  - Auditando a superfície do nó exposta pelo gateway
---

# Protocolo de ponte (transporte de nó legado)

O protocolo de ponte (Bridge) é um transporte de nó **legado** (TCP JSONL). Novos clientes de nós devem usar o protocolo unificado WebSocket do Gateway em seu lugar.

Se você estiver construindo um operador ou um cliente de nó, use o [Protocolo do Gateway](/gateway/protocol).

**Nota:** As versões atuais do ZERO não trazem mais o ouvinte (listener) de ponte TCP; este documento é mantido para referência histórica. As chaves de configuração legadas `bridge.*` não fazem mais parte do esquema de configuração.

## Por que temos ambos

- **Fronteira de segurança**: a ponte expõe uma pequena lista de permissões em vez da superfície completa da API do gateway.
- **Identidade do nó + emparelhamento**: a admissão do nó é de propriedade do gateway e está vinculada a um token por nó.
- **UX de descoberta**: os nós podem descobrir gateways via Bonjour na LAN ou conectar-se diretamente através de uma Tailnet.
- **WS de loopback**: o plano de controle WS completo permanece local, a menos que seja tunelado via SSH.

## Transporte

- TCP, um objeto JSON por linha (JSONL).
- TLS opcional (quando `bridge.tls.enabled` é true).
- A porta de escuta padrão legada era `18790` (as versões atuais não iniciam uma ponte TCP).

Quando o TLS está habilitado, os registros TXT de descoberta incluem `bridgeTls=1` e `bridgeTlsSha256` para que os nós possam fixar (pin) o certificado.

## Handshake + emparelhamento

1) O cliente envia `hello` com os metadados do nó + token (se já estiver emparelhado).
2) Se não estiver emparelhado, o gateway responde com `error` (`NOT_PAIRED`/`UNAUTHORIZED`).
3) O cliente envia `pair-request`.
4) O gateway aguarda pela aprovação e, em seguida, envia `pair-ok` e `hello-ok`.

O `hello-ok` retorna o `serverName` e pode incluir a `canvasHostUrl`.

## Quadros (Frames)

Cliente → Gateway:

- `req` / `res`: RPC do gateway escopado (chat, sessões, configuração, saúde, voicewake, skills.bins).
- `event`: sinais do nó (transcrição de voz, requisição de agente, inscrição em chat, ciclo de vida de execução).

Gateway → Cliente:

- `invoke` / `invoke-res`: comandos de nó (`canvas.*`, `camera.*`, `screen.record`, `location.get`, `sms.send`).
- `event`: atualizações de chat para as sessões inscritas.
- `ping` / `pong`: manutenção de conexão (keepalive).

A aplicação da lista de permissões legada residia em `src/gateway/server-bridge.ts` (removido).

## Eventos de ciclo de vida de execução (exec)

Os nós podem emitir eventos `exec.finished` ou `exec.denied` para dar visibilidade à atividade de `system.run`. Estes são mapeados para eventos de sistema no gateway. (Nós legados ainda podem emitir `exec.started`.)

Campos do payload (todos opcionais, exceto quando indicado):

- `sessionKey` (obrigatório): sessão do agente para receber o evento do sistema.
- `runId`: ID de execução único para agrupamento.
- `command`: string de comando bruta ou formatada.
- `exitCode`, `timedOut`, `success`, `output`: detalhes de conclusão (apenas para o status finalizado).
- `reason`: razão da negação (apenas para o status negado).

## Uso da Tailnet

- Vincule a ponte a um IP da Tailnet: defina `bridge.bind: "tailnet"` no arquivo `~/.zero/zero.json`.
- Os clientes se conectam via nome MagicDNS ou IP da Tailnet.
- O Bonjour **não** cruza redes; use host/porta manual ou DNS-SD de área ampla quando necessário.

## Versionamento

A ponte é atualmente **v1 implícita** (sem negociação de mín/máx). Espera-se compatibilidade com versões anteriores; adicione um campo de versão do protocolo de ponte antes de qualquer alteração que quebre a compatibilidade.
