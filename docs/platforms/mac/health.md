---
summary: "Como o app macOS relata os estados de saúde do gateway/Baileys"
read_when:
  - Depurando os indicadores de saúde do app mac
---
# Verificações de Saúde no macOS

Como ver se o canal vinculado está saudável a partir do app da barra de menus.

## Barra de menus

- O ponto de status agora reflete a saúde do Baileys:
  - Verde: vinculado + socket aberto recentemente.
  - Laranja: conectando/tentando novamente.
  - Vermelho: deslogado ou falha na sondagem.
- A linha secundária indica "vinculado · autenticação 12m" ou exibe o motivo da falha.
- O item de menu "Run Health Check" dispara uma sondagem sob demanda.

## Configurações

- A guia General ganha um cartão Health mostrando: idade da autenticação vinculada, caminho/contagem do armazenamento de sessões, hora da última verificação, último erro/código de status e botões para Run Health Check / Reveal Logs.
- Utiliza um instantâneo (snapshot) em cache para que a interface carregue instantaneamente e volte para um estado anterior de forma graciosa quando offline.
- A **guia Channels** exibe o status do canal + controles para WhatsApp/Telegram (QR de login, logout, sondagem, última desconexão/erro).

## Como funciona a sondagem

- O app executa `zero health --json` via `ShellExecutor` a cada ~60s e sob demanda. A sondagem carrega as credenciais e relata o status sem enviar mensagens.
- Armazena em cache o último instantâneo bom e o último erro separadamente para evitar oscilações; exibe o carimbo de data/hora (timestamp) de cada um.

## Em caso de dúvida

- Você ainda pode usar o fluxo da CLI em [Saúde do Gateway](/gateway/health) (`zero status`, `zero status --deep`, `zero health --json`) e acompanhar com tail `/tmp/zero/zero-*.log` para `web-heartbeat` / `web-reconnect`.
