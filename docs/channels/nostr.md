---
summary: "Canal DM Nostr via mensagens criptografadas NIP-04"
read_when:
  - Você quer que o ZERO receba DMs via Nostr
  - Configurando mensagens descentralizadas
---

# Nostr

**Status:** Plugin opcional (desativado por padrão).

Nostr é um protocolo descentralizado para redes sociais. Este canal permite que o ZERO receba e responda a mensagens diretas (DMs) criptografadas via NIP-04.

## Instalar (sob demanda)

### Onboarding (recomendado)

- O assistente de onboarding (`zero onboard`) e `zero channels add` listam plugins de canal opcionais.
- Selecionar Nostr solicita que você instale o plugin sob demanda.

Padrões de instalação:

- **Canal Dev + git checkout disponível:** usa o caminho do plugin local.
- **Stable/Beta:** baixa do npm.

Você sempre pode sobrescrever a escolha no prompt.

### Instalação manual

```bash
zero plugins install @zero/nostr
```

Use um checkout local (workflows dev):

```bash
zero plugins install --link <caminho-para-zero>/extensions/nostr
```

Reinicie o Gateway após instalar ou ativar plugins.

## Configuração rápida

1) Gere um par de chaves Nostr (se necessário):

```bash
# Usando nak
nak key generate
```

1) Adicione à configuração:

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}"
    }
  }
}
```

1) Exporte a chave:

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

1) Reinicie o Gateway.

## Referência de configuração

| Chave | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `privateKey` | string | obrigatório | Chave privada em formato `nsec` ou hex |
| `relays` | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | URLs de Relay (WebSocket) |
| `dmPolicy` | string | `pairing` | Política de acesso DM |
| `allowFrom` | string[] | `[]` | Pubkeys de remetente permitidas |
| `enabled` | boolean | `true` | Ativar/desativar canal |
| `name` | string | - | Nome de exibição |
| `profile` | object | - | Metadados de perfil NIP-01 |

## Metadados de perfil

Dados de perfil são publicados como um evento NIP-01 `kind:0`. Você pode gerenciá-lo da Control UI (Canais -> Nostr -> Perfil) ou definir diretamente na config.

Exemplo:

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "profile": {
        "name": "zero",
        "displayName": "ZERO",
        "about": "Personal assistant DM bot",
        "picture": "https://exemplo.com/avatar.png",
        "banner": "https://exemplo.com/banner.png",
        "website": "https://exemplo.com",
        "nip05": "zero@exemplo.com",
        "lud16": "zero@exemplo.com"
      }
    }
  }
}
```

Notas:

- URLs de perfil devem usar `https://`.
- Importar de relays mescla campos e preserva sobrescritas locais.

## Controle de acesso

### Políticas de DM

- **pairing** (padrão): remetentes desconhecidos recebem um código de emparelhamento.
- **allowlist**: apenas pubkeys em `allowFrom` podem mandar DM.
- **open**: DMs de entrada públicas (requer `allowFrom: ["*"]`).
- **disabled**: ignorar DMs de entrada.

### Exemplo de allowlist

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "dmPolicy": "allowlist",
      "allowFrom": ["npub1abc...", "npub1xyz..."]
    }
  }
}
```

## Formatos de chave

Formatos aceitos:

- **Chave privada:** `nsec...` ou hex de 64 caracteres
- **Pubkeys (`allowFrom`):** `npub...` ou hex

## Relays

Padrões: `relay.damus.io` e `nos.lol`.

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": [
        "wss://relay.damus.io",
        "wss://relay.primal.net",
        "wss://nostr.wine"
      ]
    }
  }
}
```

Dicas:

- Use 2-3 relays para redundância.
- Evite muitos relays (latência, duplicação).
- Relays pagos podem melhorar confiabilidade.
- Relays locais são bons para testes (`ws://localhost:7777`).

## Suporte de protocolo

| NIP | Status | Descrição |
| :--- | :--- | :--- |
| NIP-01 | Suportado | Formato básico de evento + metadados de perfil |
| NIP-04 | Suportado | DMs criptografadas (`kind:4`) |
| NIP-17 | Planejado | DMs com gift-wrap |
| NIP-44 | Planejado | Criptografia versionada |

## Teste

### Relay local

```bash
# Iniciar strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["ws://localhost:7777"]
    }
  }
}
```

### Teste manual

1) Note a pubkey do bot (npub) dos logs.
2) Abra um cliente Nostr (Damus, Amethyst, etc.).
3) Mande DM para a pubkey do bot.
4) Verifique a resposta.

## Solução de problemas

### Não recebendo mensagens

- Verifique se a chave privada é válida.
- Garanta que URLs de relay são alcançáveis e usam `wss://` (ou `ws://` para local).
- Confirme que `enabled` não é `false`.
- Verifique logs do Gateway para erros de conexão de relay.

### Não enviando respostas

- Verifique se o relay aceita escritas.
- Verifique conectividade de saída.
- Observe limites de taxa de relay.

### Respostas duplicadas

- Esperado ao usar múltiplos relays.
- Mensagens são desduplicadas por ID de evento; apenas a primeira entrega aciona uma resposta.

## Segurança

- Nunca commite chaves privadas.
- Use variáveis de ambiente para chaves.
- Considere `allowlist` para bots de produção.

## Limitações (MVP)

- Apenas mensagens diretas (sem chats de grupo).
- Sem anexos de mídia.
- Apenas NIP-04 (NIP-17 gift-wrap planejado).
