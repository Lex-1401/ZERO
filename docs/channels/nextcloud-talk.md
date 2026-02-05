---
summary: "Status de suporte do Nextcloud Talk, capacidades e configuração"
read_when:
  - Trabalhando em recursos do canal Nextcloud Talk
---

# Nextcloud Talk (plugin)

Status: suportado via plugin (robô webhook). Mensagens diretas, salas, reações e mensagens markdown são suportados.

## Plugin necessário

Nextcloud Talk é distribuído como um plugin e não é empacotado com a instalação principal.

Instale via CLI (registro npm):

```bash
zero plugins install @zero/nextcloud-talk
```

Checkout local (ao rodar de um repositório git):

```bash
zero plugins install ./extensions/nextcloud-talk
```

Se você escolher Nextcloud Talk durante configuração/onboarding e um checkout git for detectado, o ZERO oferecerá o caminho de instalação local automaticamente.

Detalhes: [Plugins](/plugin)

## Configuração rápida (iniciante)

1) Instale o plugin Nextcloud Talk.
2) No seu servidor Nextcloud, crie um bot:

   ```bash
   ./occ talk:bot:install "ZERO" "<segredo-compartilhado>" "<url-webhook>" --feature reaction
   ```

3) Ative o bot nas configurações da sala alvo.
4) Configure ZERO:
   - Config: `channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - Ou env: `NEXTCLOUD_TALK_BOT_SECRET` (apenas conta padrão)
5) Reinicie o gateway (ou termine o onboarding).

Configuração mínima:

```json5
{
  channels: {
    "nextcloud-talk": {
      enabled: true,
      baseUrl: "https://cloud.exemplo.com",
      botSecret: "segredo-compartilhado",
      dmPolicy: "pairing"
    }
  }
}
```

## Notas

- Bots não podem iniciar DMs. O usuário deve mandar mensagem para o bot primeiro.
- URL do webhook deve ser alcançável pelo Gateway; defina `webhookPublicUrl` se estiver atrás de um proxy.
- Uploads de mídia não são suportados pela API do bot; mídia é enviada como URLs.
- O payload do webhook não distingue DMs vs salas; defina `apiUser` + `apiPassword` para habilitar buscas de tipo de sala (caso contrário, DMs são tratadas como salas).

## Controle de acesso (DMs)

- Padrão: `channels.nextcloud-talk.dmPolicy = "pairing"`. Remetentes desconhecidos recebem um código de emparelhamento.
- Aprove via:
  - `zero pairing list nextcloud-talk`
  - `zero pairing approve nextcloud-talk <CODIGO>`
- DMs Públicas: `channels.nextcloud-talk.dmPolicy="open"` mais `channels.nextcloud-talk.allowFrom=["*"]`.

## Salas (grupos)

- Padrão: `channels.nextcloud-talk.groupPolicy = "allowlist"` (bloqueado por menção).
- Salas na allowlist com `channels.nextcloud-talk.rooms`:

```json5
{
  channels: {
    "nextcloud-talk": {
      rooms: {
        "token-da-sala": { requireMention: true }
      }
    }
  }
}
```

- Para permitir nenhuma sala, mantenha a allowlist vazia ou defina `channels.nextcloud-talk.groupPolicy="disabled"`.

## Capacidades

| Recurso | Status |
| :--- | :--- |
| Mensagens diretas | Suportado |
| Salas | Suportado |
| Threads | Não suportado |
| Mídia | Apenas URL |
| Reações | Suportado |
| Comandos nativos | Não suportado |

## Referência de configuração (Nextcloud Talk)

Configuração completa: [Configuração](/gateway/configuration)

Opções do provedor:

- `channels.nextcloud-talk.enabled`: ativar/desativar inicialização do canal.
- `channels.nextcloud-talk.baseUrl`: URL da instância Nextcloud.
- `channels.nextcloud-talk.botSecret`: segredo compartilhado do bot.
- `channels.nextcloud-talk.botSecretFile`: caminho do arquivo de segredo.
- `channels.nextcloud-talk.apiUser`: usuário API para buscas de sala (detecção de DM).
- `channels.nextcloud-talk.apiPassword`: senha API/app para buscas de sala.
- `channels.nextcloud-talk.apiPasswordFile`: caminho do arquivo de senha API.
- `channels.nextcloud-talk.webhookPort`: porta do ouvinte webhook (padrão: 8788).
- `channels.nextcloud-talk.webhookHost`: host do webhook (padrão: 0.0.0.0).
- `channels.nextcloud-talk.webhookPath`: caminho do webhook (padrão: /nextcloud-talk-webhook).
- `channels.nextcloud-talk.webhookPublicUrl`: URL de webhook alcançável externamente.
- `channels.nextcloud-talk.dmPolicy`: `pairing | allowlist | open | disabled`.
- `channels.nextcloud-talk.allowFrom`: allowlist de DM (IDs de usuário). `open` requer `"*"`.
- `channels.nextcloud-talk.groupPolicy`: `allowlist | open | disabled`.
- `channels.nextcloud-talk.groupAllowFrom`: allowlist de grupo (IDs de usuário).
- `channels.nextcloud-talk.rooms`: configurações por sala e allowlist.
- `channels.nextcloud-talk.historyLimit`: limite de histórico de grupo (0 desabilita).
- `channels.nextcloud-talk.dmHistoryLimit`: limite de histórico de DM (0 desabilita).
- `channels.nextcloud-talk.dms`: sobrescritas por DM (historyLimit).
- `channels.nextcloud-talk.textChunkLimit`: tamanho de fragmento de texto de saída (chars).
- `channels.nextcloud-talk.chunkMode`: `length` (padrão) ou `newline` para dividir em linhas em branco (limites de parágrafo) antes da fragmentação por comprimento.
- `channels.nextcloud-talk.blockStreaming`: desativar streaming de bloco para este canal.
- `channels.nextcloud-talk.blockStreamingCoalesce`: ajuste de coalescência de streaming de bloco.
- `channels.nextcloud-talk.mediaMaxMb`: limite de mídia de entrada (MB).
