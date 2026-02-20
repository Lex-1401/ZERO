---
summary: "Status de suporte do bot Zalo, capacidades e configuração"
read_when:
  - Trabalhando em recursos ou webhooks Zalo
---

# Zalo (Bot API)

Status: experimental. Apenas mensagens diretas; grupos em breve segundo docs Zalo.

## Plugin necessário

Zalo é distribuído como um plugin e não é empacotado com a instalação principal.

- Instale via CLI: `zero plugins install @zero/zalo`
- Ou selecione **Zalo** durante onboarding e confirme o prompt de instalação
- Detalhes: [Plugins](/plugin)

## Configuração rápida (iniciante)

1) Instale o plugin Zalo:
   - De um checkout fonte: `zero plugins install ./extensions/zalo`
   - Do npm (se publicado): `zero plugins install @zero/zalo`
   - Ou escolha **Zalo** no onboarding e confirme o prompt de instalação
2) Defina o token:
   - Env: `ZALO_BOT_TOKEN=...`
   - Ou config: `channels.zalo.botToken: "..."`.
3) Reinicie o gateway (ou termine o onboarding).
4) Acesso DM é pairing por padrão; aprove o código de emparelhamento no primeiro contato.

Configuração mínima:

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing"
    }
  }
}
```

## O que é

Zalo é um aplicativo de mensagens focado no Vietnã; sua API de Bot permite que o Gateway execute um bot para conversas 1:1.
É um bom ajuste para suporte ou notificações onde você quer roteamento determinístico de volta ao Zalo.

- Um canal Zalo Bot API de propriedade do Gateway.
- Roteamento determinístico: respostas voltam para o Zalo; o modelo nunca escolhe canais.
- DMs compartilham a sessão principal do agente.
- Grupos ainda não são suportados (docs Zalo dizem "em breve").

## Configuração (caminho rápido)

### 1) Criar um token de bot (Zalo Bot Platform)

1) Vá para **<https://bot.zaloplatforms.com>** e faça login.
2) Crie um novo bot e configure suas definições.
3) Copie o token do bot (formato: `12345689:abc-xyz`).

### 2) Configurar o token (env ou config)

Exemplo:

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing"
    }
  }
}
```

Opção Env: `ZALO_BOT_TOKEN=...` (funciona apenas para a conta padrão).

Suporte multi-conta: use `channels.zalo.accounts` com tokens por conta e `name` opcional.

1) Reinicie o gateway. Zalo inicia quando um token é resolvido (env ou config).
2) Acesso DM padroniza para pairing. Aprove o código quando o bot for contatado pela primeira vez.

## Como funciona (comportamento)

- Mensagens de entrada são normalizadas no envelope de canal compartilhado com placeholders de mídia.
- Respostas sempre roteiam de volta para o mesmo chat Zalo.
- Long-polling por padrão; modo webhook disponível com `channels.zalo.webhookUrl`.

## Limites

- Texto de saída é fragmentado para 2000 caracteres (limite API Zalo).
- Downloads/uploads de mídia são limitados por `channels.zalo.mediaMaxMb` (padrão 5).
- Streaming é bloqueado por padrão devido ao limite de 2000 chars tornar streaming menos útil.

## Controle de acesso (DMs)

### Acesso DM

- Padrão: `channels.zalo.dmPolicy = "pairing"`. Remetentes desconhecidos recebem um código de emparelhamento; mensagens são ignoradas até serem aprovadas (códigos expiram após 1 hora).
- Aprove via:
  - `zero pairing list zalo`
  - `zero pairing approve zalo <CODIGO>`
- Emparelhamento é a troca de token padrão. Detalhes: [Emparelhamento](/start/pairing)
- `channels.zalo.allowFrom` aceita IDs de usuário numéricos (sem busca de nome de usuário disponível).

## Long-polling vs webhook

- Padrão: long-polling (sem URL pública necessária).
- Modo Webhook: defina `channels.zalo.webhookUrl` e `channels.zalo.webhookSecret`.
  - O segredo do webhook deve ter 8-256 caracteres.
  - URL do Webhook deve usar HTTPS.
  - Zalo envia eventos com cabeçalho `X-Bot-Api-Secret-Token` para verificação.
  - Gateway HTTP lida com requisições webhook em `channels.zalo.webhookPath` (padroniza para o caminho da URL de webhook).

**Nota:** getUpdates (polling) e webhook são mutuamente exclusivos por docs da API Zalo.

## Tipos de mensagem suportados

- **Mensagens de texto**: Suporte total com fragmentação de 2000 caracteres.
- **Mensagens de imagem**: Baixa e processa imagens de entrada; envia imagens via `sendPhoto`.
- **Adesivos**: Logados mas não totalmente processados (sem resposta de agente).
- **Tipos não suportados**: Logados (ex., mensagens de usuários protegidos).

## Capacidades

| Recurso | Status |
| :--- | :--- |
| Mensagens diretas | ✅ Suportado |
| Grupos | ❌ Em breve (segundo docs Zalo) |
| Mídia (imagens) | ✅ Suportado |
| Reações | ❌ Não suportado |
| Threads | ❌ Não suportado |
| Enquetes | ❌ Não suportado |
| Comandos nativos | ❌ Não suportado |
| Streaming | ⚠️ Bloqueado (limite 2000 char) |

## Alvos de entrega (CLI/cron)

- Use um chat id como o alvo.
- Exemplo: `zero message send --channel zalo --target 123456789 --message "oi"`.

## Solução de problemas

**Bot não responde:**

- Verifique se o token é válido: `zero channels status --probe`
- Verifique se o remetente está aprovado (pairing ou allowFrom)
- Verifique logs do gateway: `zero logs --follow`

**Webhook não recebendo eventos:**

- Garanta que URL de webhook usa HTTPS
- Verifique se o token secreto tem 8-256 caracteres
- Confirme que o endpoint HTTP do gateway é alcançável no caminho configurado
- Verifique se polling getUpdates não está rodando (são mutuamente exclusivos)

## Referência de configuração (Zalo)

Configuração completa: [Configuração](/gateway/configuration)

Opções do provedor:

- `channels.zalo.enabled`: ativar/desativar inicialização do canal.
- `channels.zalo.botToken`: token de bot da Zalo Bot Platform.
- `channels.zalo.tokenFile`: ler token de caminho de arquivo.
- `channels.zalo.dmPolicy`: `pairing | allowlist | open | disabled` (padrão: pairing).
- `channels.zalo.allowFrom`: allowlist de DM (IDs de usuário). `open` requer `"*"`. O assistente pedirá IDs numéricos.
- `channels.zalo.mediaMaxMb`: limite de mídia de entrada/saída (MB, padrão 5).
- `channels.zalo.webhookUrl`: ativar modo webhook (HTTPS necessário).
- `channels.zalo.webhookSecret`: segredo de webhook (8-256 chars).
- `channels.zalo.webhookPath`: caminho de webhook no servidor HTTP do gateway.
- `channels.zalo.proxy`: URL de proxy para requisições API.

Opções multi-conta:

- `channels.zalo.accounts.<id>.botToken`: token por conta.
- `channels.zalo.accounts.<id>.tokenFile`: arquivo de token por conta.
- `channels.zalo.accounts.<id>.name`: nome de exibição.
- `channels.zalo.accounts.<id>.enabled`: ativar/desativar conta.
- `channels.zalo.accounts.<id>.dmPolicy`: política de DM por conta.
- `channels.zalo.accounts.<id>.allowFrom`: allowlist por conta.
- `channels.zalo.accounts.<id>.webhookUrl`: URL de webhook por conta.
- `channels.zalo.accounts.<id>.webhookSecret`: segredo de webhook por conta.
- `channels.zalo.accounts.<id>.webhookPath`: caminho de webhook por conta.
- `channels.zalo.accounts.<id>.proxy`: URL de proxy por conta.
