---
summary: "Use o OpenAI via chaves de API ou assinatura Codex no ZERO"
read_when:
  - Você deseja usar modelos da OpenAI no ZERO
  - Você deseja autenticação por assinatura Codex em vez de chaves de API
---
# OpenAI

A OpenAI fornece APIs de desenvolvedor para modelos GPT. O Codex suporta o **login do ChatGPT** para acesso por assinatura ou **login por chave de API** para acesso baseado no uso. O Codex cloud requer login do ChatGPT, enquanto o Codex CLI suporta qualquer um dos métodos de login. O Codex CLI armazena detalhes de login em cache em `~/.codex/auth.json` (ou no armazenamento de credenciais do seu sistema operacional), que o ZERO pode reutilizar.

## Opção A: Chave de API da OpenAI (Plataforma OpenAI)

**Melhor para:** acesso direto à API e faturamento baseado no uso.
Obtenha sua chave de API no painel do desenvolvedor da OpenAI.

### Configuração pela CLI

```bash
zero onboard --auth-choice openai-api-key
# ou não interativo
zero onboard --openai-api-key "$OPENAI_API_KEY"
```

### Trecho de configuração

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.2" } } }
}
```

## Opção B: Assinatura OpenAI Code (Codex)

**Melhor para:** usar o acesso por assinatura do ChatGPT/Codex em vez de uma chave de API.
O Codex cloud requer o login do ChatGPT, enquanto o Codex CLI suporta o login do ChatGPT ou da chave de API.

O ZERO pode reutilizar seu login do **Codex CLI** (`~/.codex/auth.json`) ou executar o fluxo OAuth.

### Configuração pela CLI

```bash
# Reutilizar login existente do Codex CLI
zero onboard --auth-choice codex-cli

# Ou executar o OAuth do Codex no mago
zero onboard --auth-choice openai-codex
```

### Trecho de configuração

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.2" } } }
}
```

## Notas

- Referências de modelos sempre usam `provedor/modelo` (consulte [/concepts/models](/concepts/models)).
- Detalhes de autenticação + regras de reutilização estão em [/concepts/oauth](/concepts/oauth).
