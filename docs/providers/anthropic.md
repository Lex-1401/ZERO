---
summary: "Use o Anthropic Claude via chaves de API ou autenticação Claude Code CLI no ZERO"
read_when:
  - Você deseja usar modelos Anthropic no ZERO
  - Você deseja usar setup-token ou autenticação Claude Code CLI em vez de chaves de API
---
# Anthropic (Claude)

A Anthropic constrói a família de modelos **Claude** e fornece acesso via uma API.
No ZERO, você pode autenticar com uma chave de API ou reutilizar credenciais do **Claude Code CLI**
(setup-token ou OAuth).

## Opção A: Chave de API da Anthropic

**Melhor para:** acesso padrão à API e faturamento baseado no uso.
Crie sua chave de API no Console da Anthropic.

### Configuração pela CLI

```bash
zero onboard
# escolha: Anthropic API key
```

### Trecho de configuração

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## Caching de prompt (API Anthropic)

O ZERO **não** substitui o TTL de cache padrão da Anthropic, a menos que você o defina.
Isso é **apenas para API**; o OAuth do Claude Code CLI ignora as configurações de TTL.

Para definir o TTL por modelo, use `cacheControlTtl` nos `params` do modelo:

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": {
          params: { cacheControlTtl: "5m" } // ou "1h"
        }
      }
    }
  }
}
```

O ZERO inclui a flag beta `extended-cache-ttl-2025-04-11` para solicitações da API Anthropic;
mantenha-a se você substituir os cabeçalhos do provedor (consulte [/gateway/configuration](/gateway/configuration)).

## Opção B: Claude Code CLI (setup-token ou OAuth)

**Melhor para:** usar sua assinatura do Claude ou login existente do Claude Code CLI.

### Onde obter um setup-token

Os setup-tokens são criados pelo **Claude Code CLI**, não pelo Console da Anthropic. Você pode executar isso em **qualquer máquina**:

```bash
claude setup-token
```

Cole o token no ZERO (mago: **Anthropic token (paste setup-token)**), ou execute-o no host do gateway:

```bash
zero models auth setup-token --provider anthropic
```

Se você gerou o token em uma máquina diferente, cole-o:

```bash
zero models auth paste-token --provider anthropic
```

### Configuração pela CLI

```bash
# Reutilizar credenciais OAuth do Claude Code CLI se já estiver logado
zero onboard --auth-choice claude-cli
```

### Trecho de configuração

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## Notas

- Gere o setup-token com `claude setup-token` e cole-o, ou execute `zero models auth setup-token` no host do gateway.
- Se você vir “OAuth token refresh failed …” em uma assinatura do Claude, autentique novamente com um setup-token ou sincronize novamente o OAuth do Claude Code CLI no host do gateway. Consulte [/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription](/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription).
- O ZERO grava `auth.profiles["anthropic:claude-cli"].mode` como `"oauth"` para que o perfil aceite tanto credenciais OAuth quanto setup-token. Configurações mais antigas usando `"token"` são migradas automaticamente ao carregar.
- Detalhes de autenticação + regras de reutilização estão em [/concepts/oauth](/concepts/oauth).

## Solução de problemas

**Erros 401 / token subitamente inválido**

- A autenticação da assinatura do Claude pode expirar ou ser revogada. Execute novamente `claude setup-token` e cole-o no **host do gateway**.
- Se o login do Claude CLI residir em uma máquina diferente, use `zero models auth paste-token --provider anthropic` no host do gateway.

**Nenhuma chave de API encontrada para o provedor "anthropic"**

- A autenticação é **por agente**. Novos agentes não herdam as chaves do agente principal.
- Execute novamente a integração para esse agente, ou cole um setup-token / chave de API no host do gateway e verifique com `zero models status`.

**Nenhuma credencial encontrada para o perfil `anthropic:default` ou `anthropic:claude-cli`**

- Execute `zero models status` para ver qual perfil de autenticação está ativo.
- Execute novamente a integração ou cole um setup-token / chave de API para esse perfil.

**Nenhum perfil de autenticação disponível (todos em cooldown/indisponíveis)**

- Verifique `zero models status --json` para `auth.unusableProfiles`.
- Adicione outro perfil da Anthropic ou aguarde o cooldown.

Mais: [/gateway/troubleshooting](/gateway/troubleshooting) e [/help/faq](/help/faq).
