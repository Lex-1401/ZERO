---
summary: "Como o ZERO rotaciona perfis de autenticação e faz o fallback entre modelos"
read_when:
  - Diagnosticando a rotação de perfis de autenticação, cooldowns ou comportamento de fallback de modelos
  - Atualizando as regras de failover para perfis de autenticação ou modelos
---
# Failover de modelos

O ZERO trata as falhas em dois estágios:

1) **Rotação de perfil de autenticação** dentro do provedor atual.
2) **Fallback de modelo** para o próximo modelo em `agents.defaults.model.fallbacks`.

Este documento explica as regras de tempo de execução e os dados que as sustentam.

## Armazenamento de autenticação (chaves + OAuth)

O ZERO usa **perfis de autenticação** tanto para chaves de API quanto para tokens OAuth.

- Os segredos vivem em `~/.zero/agents/<agentId>/agent/auth-profiles.json` (legado: `~/.zero/agent/auth-profiles.json`).
- As configurações `auth.profiles` / `auth.order` são **apenas metadados + roteamento** (sem segredos).
- Arquivo OAuth legado apenas para importação: `~/.zero/credentials/oauth.json` (importado para `auth-profiles.json` no primeiro uso).

Mais detalhes em: [/concepts/oauth](/concepts/oauth)

Tipos de credencial:

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` para alguns provedores)

## IDs de Perfil

Logins OAuth criam perfis distintos para que múltiplas contas possam coexistir.

- Padrão: `provider:default` quando nenhum e-mail está disponível.
- OAuth com e-mail: `provider:<email>` (exemplo: `google-cloud-auth:usuario@gmail.com`).

Os perfis vivem em `~/.zero/agents/<agentId>/agent/auth-profiles.json` sob `profiles`.

## Ordem de rotação

Quando um provedor tem múltiplos perfis, o ZERO escolhe uma ordem desta forma:

1) **Configuração explícita**: `auth.order[provider]` (se definido).
2) **Perfis configurados**: `auth.profiles` filtrado pelo provedor.
3) **Perfis armazenados**: entradas em `auth-profiles.json` para o provedor.

Se nenhuma ordem explícita for configurada, o ZERO usa uma ordem round‑robin:

- **Chave primária:** tipo de perfil (**OAuth antes de chaves de API**).
- **Chave secundária:** `usageStats.lastUsed` (o mais antigo primeiro, dentro de cada tipo).
- **Perfis em cooldown/desativados** são movidos para o final, ordenados pela expiração mais próxima.

### Adesão da sessão (Session stickiness - amigável ao cache)

O ZERO **fixa (pin) o perfil de autenticação escolhido por sessão** para manter os caches do provedor aquecidos. Ele **não** rotaciona em cada requisição. O perfil fixado é reutilizado até:

- a sessão ser resetada (`/new` / `/reset`)
- uma compactação ser concluída (a contagem de compactação aumenta)
- o perfil entrar em cooldown/desativado

A seleção manual via `/model …@<profileId>` define uma **sobrescrita do usuário** para aquela sessão e não é rotacionada automaticamente até que uma nova sessão comece.

Perfis auto-fixados (selecionados pelo roteador de sessão) são tratados como uma **preferência**: são tentados primeiro, mas o ZERO pode rotacionar para outro perfil em caso de limites de taxa (rate limits)/timeouts. Perfis fixados pelo usuário permanecem bloqueados naquele perfil; se ele falhar e os fallbacks de modelo estiverem configurados, o ZERO passará para o próximo modelo em vez de trocar de perfil.

### Por que o OAuth pode “parecer perdido”

Se você tiver tanto um perfil OAuth quanto um perfil de chave de API para o mesmo provedor, o round-robin pode alternar entre eles entre as mensagens, a menos que esteja fixado. Para forçar um único perfil:

- Fixe com `auth.order[provider] = ["provedor:profileId"]`, ou
- Use uma sobrescrita por sessão via `/model …` com uma sobrescrita de perfil (quando suportado pela sua UI/superfície de chat).

## Cooldowns (Tempos de espera)

Quando um perfil falha devido a erros de autenticação/limite de taxa (ou um timeout que parece um limite de taxa), o ZERO o marca em cooldown e passa para o próximo perfil. Erros de formato/requisição inválida (por exemplo, falhas de validação de ID de chamada de ferramenta do Cloud Code Assist) são tratados como dignos de failover e usam os mesmos cooldowns.

Os cooldowns usam backoff exponencial:

- 1 minuto
- 5 minutos
- 25 minutos
- 1 hora (limite máximo)

O estado é armazenado em `auth-profiles.json` sob `usageStats`:

```json
{
  "usageStats": {
    "provider:perfil": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## Desativações por faturamento (Billing disables)

Falhas de faturamento/créditos (por exemplo, “créditos insuficientes” / “saldo de crédito muito baixo”) são tratadas como dignas de failover, mas geralmente não são transitórias. Em vez de um cooldown curto, o ZERO marca o perfil como **desativado** (com um backoff mais longo) e rotaciona para o próximo perfil/provedor.

O estado é armazenado em `auth-profiles.json`:

```json
{
  "usageStats": {
    "provider:perfil": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

Padrões:

- O backoff de faturamento começa em **5 horas**, dobra a cada falha de faturamento e tem um limite de **24 horas**.
- Os contadores de backoff são resetados se o perfil não falhar por **24 horas** (configurável).

## Fallback de modelo

Se todos os perfis para um provedor falharem, o ZERO passa para o próximo modelo em `agents.defaults.model.fallbacks`. Isso se aplica a falhas de autenticação, limites de taxa e timeouts que esgotaram a rotação de perfis (outros erros não avançam o fallback).

Quando uma execução começa com uma sobrescrita de modelo (hooks ou CLI), os fallbacks ainda terminam em `agents.defaults.model.primary` após tentar todos os fallbacks configurados.

## Configurações relacionadas

Veja [Configuração do Gateway](/gateway/configuration) para:

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- roteamento `agents.defaults.imageModel`

Veja [Modelos](/concepts/models) para a visão geral mais ampla de seleção de modelos e fallback.
