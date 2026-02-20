---
summary: "Plataformas de mensagens que o ZERO pode se conectar"
read_when:
  - Você quer escolher um canal de chat para o ZERO
  - Você precisa de uma visão geral rápida das plataformas de mensagens suportadas
---
# Canais de Chat

O ZERO pode falar com você em qualquer aplicativo de chat que você já usa. Cada canal se conecta via Gateway. O texto é suportado em todos os lugares; mídias e reações variam por canal.

## Canais suportados

- [WhatsApp](/channels/whatsapp) — O mais popular; usa Baileys e exige emparelhamento via QR code.
- [Telegram](/channels/telegram) — Bot API via grammY; suporta grupos.
- [Discord](/channels/discord) — Discord Bot API + Gateway; suporta servidores, canais e DMs.
- [Slack](/channels/slack) — Bolt SDK; aplicativos de workspace.
- [Google Chat](/channels/googlechat) — Google Chat API via webhook HTTP.
- [Mattermost](/channels/mattermost) — Bot API + WebSocket; canais, grupos, DMs (plugin, instalado separadamente).
- [Signal](/channels/signal) — signal-cli; focado em privacidade.
- [BlueBubbles](/channels/bluebubbles) — **Recomendado para iMessage**; usa a API REST do servidor macOS BlueBubbles com suporte total a funcionalidades (editar, cancelar envio, efeitos, reações, gerenciamento de grupo — a edição está atualmente quebrada no macOS 26 Tahoe).
- [iMessage](/channels/imessage) — Apenas macOS; integração nativa via imsg (legado, considere o BlueBubbles para novas configurações).
- [Microsoft Teams](/channels/msteams) — Bot Framework; suporte empresarial (plugin, instalado separadamente).
- [Nextcloud Talk](/channels/nextcloud-talk) — Chat auto-hospedado via Nextcloud Talk (plugin, instalado separadamente).
- [Matrix](/channels/matrix) — Protocolo Matrix (plugin, instalado separadamente).
- [Nostr](/channels/nostr) — DMs descentralizadas via NIP-04 (plugin, instalado separadamente).
- [Tlon](/channels/tlon) — Mensageiro baseado em Urbit (plugin, instalado separadamente).
- [Zalo](/channels/zalo) — Zalo Bot API; o mensageiro popular do Vietnã (plugin, instalado separadamente).
- [Zalo Personal](/channels/zalouser) — conta pessoal de Zalo via login QR (plugin, instalado separadamente).
- [WebChat](/web/webchat) — Interface WebChat do Gateway via WebSocket.

## Notas

- Os canais podem rodar simultaneamente; configure múltiplos e o ZERO roteará por chat.
- A configuração mais rápida costuma ser o **Telegram** (token de bot simples). O WhatsApp exige emparelhamento via QR e armazena mais estado em disco.
- O comportamento em grupo varia por canal; veja [Grupos](/concepts/groups).
- O emparelhamento de DMs e as listas de permissões (allowlists) são aplicados por segurança; veja [Segurança](/gateway/security).
- Internals do Telegram: [Notas do grammY](/channels/grammy).
- Resolução de problemas: [Resolução de problemas de canais](/channels/troubleshooting).
- Provedores de modelos são documentados separadamente; veja [Provedores de Modelos](/providers/models).
