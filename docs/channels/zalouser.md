---
summary: "Suporte Zalo conta pessoal via zca-cli (login QR), capacidades e configuração"
read_when:
  - Configurando Zalo Personal para ZERO
  - Depurando login ou fluxo de mensagem Zalo Personal
---

# Zalo Personal (não oficial)

Status: experimental. Esta integração automatiza uma **conta pessoal Zalo** via `zca-cli`.

> **Aviso:** Esta é uma integração não oficial e pode resultar em suspensão/banimento da conta. Use por sua conta e risco.

## Plugin necessário

Zalo Personal é distribuído como um plugin e não é empacotado com a instalação principal.

- Instale via CLI: `zero plugins install @zero/zalouser`
- Ou de um checkout fonte: `zero plugins install ./extensions/zalouser`
- Detalhes: [Plugins](/plugin)

## Pré-requisito: zca-cli

A máquina Gateway deve ter o binário `zca` disponível no `PATH`.

- Verifique: `zca --version`
- Se faltar, instale zca-cli (veja `extensions/zalouser/README.md` ou a documentação upstream do zca-cli).

## Configuração rápida (iniciante)

1) Instale o plugin (veja acima).
2) Login (QR, na máquina Gateway):
   - `zero channels login --channel zalouser`
   - Escaneie o código QR no terminal com o app móvel Zalo.
3) Ative o canal:

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing"
    }
  }
}
```

1) Reinicie o Gateway (ou termine o onboarding).
2) Acesso DM padroniza para pairing; aprove o código de emparelhamento no primeiro contato.

## O que é

- Usa `zca listen` para receber mensagens de entrada.
- Usa `zca msg ...` para enviar respostas (texto/mídia/link).
- Projetado para casos de uso de "conta pessoal" onde a API de Bot Zalo não está disponível.

## Nomenclatura

O id do canal é `zalouser` para tornar explícito que isso automatiza uma **conta de usuário pessoal do Zalo** (não oficial). Mantemos `zalo` reservado para uma potencial futura integração oficial da API Zalo.

## Encontrando IDs (diretório)

Use a CLI de diretório para descobrir pares/grupos e seus IDs:

```bash
zero directory self --channel zalouser
zero directory peers list --channel zalouser --query "nome"
zero directory groups list --channel zalouser --query "trabalho"
```

## Limites

- Texto de saída é fragmentado para ~2000 caracteres (limites do cliente Zalo).
- Streaming é bloqueado por padrão.

## Controle de acesso (DMs)

`channels.zalouser.dmPolicy` suporta: `pairing | allowlist | open | disabled` (padrão: `pairing`).
`channels.zalouser.allowFrom` aceita IDs de usuário ou nomes. O assistente resolve nomes para IDs via `zca friend find` quando disponível.

Aprove via:

- `zero pairing list zalouser`
- `zero pairing approve zalouser <CODIGO>`

## Acesso de grupo (opcional)

- Padrão: `channels.zalouser.groupPolicy = "open"` (grupos permitidos). Use `channels.defaults.groupPolicy` para sobrescrever o padrão quando não definido.
- Restrinja a uma allowlist com:
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (chaves são IDs de grupo ou nomes)
- Bloqueie todos os grupos: `channels.zalouser.groupPolicy = "disabled"`.
- O assistente de configuração pode pedir allowlists de grupo.
- Na inicialização, o ZERO resolve nomes de grupo/usuário em allowlists para IDs e loga o mapeamento; entradas não resolvidas são mantidas como digitadas.

Exemplo:

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groups: {
        "123456789": { allow: true },
        "Chat Trabalho": { allow: true }
      }
    }
  }
}
```

## Multi-conta

Contas mapeiam para perfis zca. Exemplo:

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      defaultAccount: "default",
      accounts: {
        trabalho: { enabled: true, profile: "work" }
      }
    }
  }
}
```

## Solução de problemas

**`zca` não encontrado:**

- Instale zca-cli e garanta que está no `PATH` para o processo Gateway.

**Login não fixa:**

- `zero channels status --probe`
- Re-login: `zero channels logout --channel zalouser && zero channels login --channel zalouser`
