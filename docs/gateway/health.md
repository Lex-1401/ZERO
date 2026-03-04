---
summary: "Etapas de verificação de saúde para conectividade de canais"
read_when:
  - Diagnosticando a saúde do canal do WhatsApp
---

# Verificações de Saúde (CLI)

Guia curto para verificar a conectividade dos canais sem adivinhações.

## Verificações rápidas

- `zero status` — resumo local: acessibilidade/modo do gateway, dica de atualização, idade da autenticação do canal vinculado, sessões + atividade recente.
- `zero status --all` — diagnóstico local completo (somente leitura, colorido, seguro para colar para depuração).
- `zero status --deep` — também sonda o Gateway em execução (sondagens por canal quando suportadas).
- `zero health --json` — solicita ao Gateway em execução um instantâneo (snapshot) completo de saúde (apenas via WS; sem soquete direto do Baileys).
- Envie `/status` como uma mensagem autônoma no WhatsApp/WebChat para obter uma resposta de status sem invocar o agente.
- Logs: acompanhe o final de `/tmp/zero/zero-*.log` e filtre por `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

## Diagnósticos profundos

- Credenciais no disco: `ls -l ~/.zero/credentials/whatsapp/<accountId>/creds.json` (o mtime deve ser recente).
- Armazenamento de sessões: `ls -l ~/.zero/agents/<agentId>/sessions/sessions.json` (o caminho pode ser sobrescrito na configuração). A contagem e os destinatários recentes são exibidos via `status`.
- Fluxo de novo vínculo (relink): `zero channels logout && zero channels login --verbose` quando códigos de status 409–515 ou `loggedOut` aparecerem nos logs. (Nota: o fluxo de login via QR reinicia automaticamente uma vez para o status 515 após o emparelhamento).

## Quando algo falha

- `logged out` ou status 409–515 → vincule novamente com `zero channels logout` e depois `zero channels login`.
- Gateway inacessível → inicie-o: `zero gateway --port 18789` (use `--force` se a porta estiver ocupada).
- Sem mensagens recebidas → confirme se o telefone vinculado está online e se o remetente é permitido (`channels.whatsapp.allowFrom`); para chats de grupo, garanta que a lista de permissão + regras de menção coincidam (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Comando "health" dedicado

`zero health --json` solicita ao Gateway em execução o seu instantâneo de saúde (sem soquetes diretos de canal a partir da CLI). Ele relata credenciais vinculadas/idade da autenticação quando disponível, resumos de sondagem por canal, resumo do armazenamento de sessões e a duração da sondagem. Ele encerra com código diferente de zero se o Gateway estiver inacessível ou se a sondagem falhar/expirar. Use `--timeout <ms>` para sobrescrever o padrão de 10s.
