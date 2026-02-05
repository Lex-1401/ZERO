---
summary: "Configuração do bot Mattermost e config do ZERO"
read_when:
  - Configurando Mattermost
  - Depurando roteamento Mattermost
---

# Mattermost (plugin)

Status: suportado via plugin (bot token + eventos WebSocket). Canais, grupos e DMs são suportados.
Mattermost é uma plataforma de mensagens de equipe auto-hospedável; veja o site oficial em
[mattermost.com](https://mattermost.com) para detalhes do produto e downloads.

## Plugin necessário

Mattermost é distribuído como um plugin e não é empacotado com a instalação principal.

Instale via CLI (registro npm):

```bash
zero plugins install @zero/mattermost
```

Checkout local (ao rodar de um repositório git):

```bash
zero plugins install ./extensions/mattermost
```

Se você escolher Mattermost durante configuração/onboarding e um checkout git for detectado,
o ZERO oferecerá o caminho de instalação local automaticamente.

Detalhes: [Plugins](/plugin)

## Configuração rápida

1) Instale o plugin Mattermost.
2) Crie uma conta de bot Mattermost e copie o **bot token**.
3) Copie a **URL base** do Mattermost (ex., `https://chat.exemplo.com`).
4) Configure o ZERO e inicie o gateway.

Configuração mínima:

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.exemplo.com",
      dmPolicy: "pairing"
    }
  }
}
```

## Variáveis de ambiente (conta padrão)

Defina estas no host do gateway se preferir variáveis de ambiente:

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.exemplo.com`

Vars de env aplicam-se apenas à conta **padrão** (`default`). Outras contas devem usar valores de configuração.

## Modos de chat

O Mattermost responde a DMs automaticamente. O comportamento do canal é controlado por `chatmode`:

- `oncall` (padrão): responde apenas quando @mencionado em canais.
- `onmessage`: responde a toda mensagem de canal.
- `onchar`: responde quando uma mensagem começa com um prefixo de gatilho.

Exemplo de configuração:

```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"]
    }
  }
}
```

Notas:

- `onchar` ainda responde a @menções explícitas.
- `channels.mattermost.requireMention` é honrado para configs legadas mas `chatmode` é preferido.

## Controle de acesso (DMs)

- Padrão: `channels.mattermost.dmPolicy = "pairing"` (remetentes desconhecidos recebem um código de emparelhamento).
- Aprove via:
  - `zero pairing list mattermost`
  - `zero pairing approve mattermost <CODIGO>`
- DMs Públicas: `channels.mattermost.dmPolicy="open"` mais `channels.mattermost.allowFrom=["*"]`.

## Canais (grupos)

- Padrão: `channels.mattermost.groupPolicy = "allowlist"` (bloqueado por menção).
- Remetentes da allowlist com `channels.mattermost.groupAllowFrom` (IDs de usuário ou `@nome-de-usuario`).
- Canais abertos: `channels.mattermost.groupPolicy="open"` (bloqueado por menção).

## Alvos para entrega de saída

Use estes formatos de alvo com `zero message send` ou cron/webhooks:

- `channel:<id>` para um canal
- `user:<id>` para uma DM
- `@nome-de-usuario` para uma DM (resolvido via API Mattermost)

IDs puros são tratados como canais.

## Multi-conta

O Mattermost suporta múltiplas contas sob `channels.mattermost.accounts`:

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primaria", botToken: "mm-token", baseUrl: "https://chat.exemplo.com" },
        alerts: { name: "Alertas", botToken: "mm-token-2", baseUrl: "https://alerts.exemplo.com" }
      }
    }
  }
}
```

## Solução de problemas

- Sem respostas em canais: garanta que o bot está no canal e mencione-o (oncall), use um prefixo de gatilho (onchar), ou defina `chatmode: "onmessage"`.
- Erros de Auth: verifique o bot token, URL base, e se a conta está ativada.
- Problemas multi-conta: vars de env se aplicam apenas à conta `default`.
