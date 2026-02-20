---
summary: "Visão geral dos provedores de modelos com exemplos de configuração + fluxos de CLI"
read_when:
  - Você precisa de uma referência de configuração de modelos provedor por provedor
  - Você deseja exemplos de configurações ou comandos de CLI para integração de provedores de modelos
---
# Provedores de modelos

Esta página cobre os **provedores de modelos/LLM** (não canais de chat como WhatsApp/Telegram). Para as regras de seleção de modelos, veja [/concepts/models](/concepts/models).

## Regras rápidas

- Referências de modelos usam `provedor/modelo` (exemplo: `opencode/claude-opus-4-5`).
- Se você definir `agents.defaults.models`, isso se torna a lista de permissões.
- Auxiliares da CLI: `zero onboard`, `zero models list`, `zero models set <provedor/modelo>`.

## Provedores integrados (catálogo pi-ai)

O ZERO vem com o catálogo pi-ai. Esses provedores **não** exigem configuração em `models.providers`; basta definir a autenticação e escolher um modelo.

### OpenAI

- Provedor: `openai`
- Autenticação: `OPENAI_API_KEY`
- Exemplo de modelo: `openai/gpt-5.2`
- CLI: `zero onboard --auth-choice openai-api-key`

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.2" } } }
}
```

### Anthropic

- Provedor: `anthropic`
- Autenticação: `ANTHROPIC_API_KEY` ou `claude setup-token`
- Exemplo de modelo: `anthropic/claude-opus-4-5`
- CLI: `zero onboard --auth-choice token` (cole o setup-token) ou `zero models auth paste-token --provider anthropic`

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

### OpenAI Code (Codex)

- Provedor: `openai-codex`
- Autenticação: OAuth ou Codex CLI (`~/.codex/auth.json`)
- Exemplo de modelo: `openai-codex/gpt-5.2`
- CLI: `zero onboard --auth-choice openai-codex` ou `codex-cli`

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.2" } } }
}
```

### OpenCode Zen

- Provedor: `opencode`
- Autenticação: `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`)
- Exemplo de modelo: `opencode/claude-opus-4-5`
- CLI: `zero onboard --auth-choice opencode-zen`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-5" } } }
}
```

### Google Gemini (Chave de API)

- Provedor: `google`
- Autenticação: `GEMINI_API_KEY`
- Exemplo de modelo: `google/gemini-3-pro-preview`
- CLI: `zero onboard --auth-choice gemini-api-key`

### Google Vertex / Google Cloud Auth / Gemini CLI

- Provedores: `google-vertex`, `google-cloud-auth`, `google-gemini-cli`
- Autenticação: Vertex usa gcloud ADC; Google Cloud Auth/Gemini CLI usam seus respectivos fluxos de autenticação.
- O OAuth da Google Cloud Auth é enviado como um plugin empacotado (`google-cloud-auth-auth`, desativado por padrão).
  - Habilitar: `zero plugins enable google-cloud-auth-auth`
  - Login: `zero models auth login --provider google-cloud-auth --set-default`
- O OAuth da Gemini CLI é enviado como um plugin empacotado (`google-gemini-cli-auth`, desativado por padrão).
  - Habilitar: `zero plugins enable google-gemini-cli-auth`
  - Login: `zero models auth login --provider google-gemini-cli --set-default`
  - Nota: você **não** cola um ID ou segredo de cliente no `zero.json`. O fluxo de login da CLI armazena os tokens em perfis de autenticação no host do gateway.

### Z.AI (GLM)

- Provedor: `zai`
- Autenticação: `ZAI_API_KEY`
- Exemplo de modelo: `zai/glm-4.7`
- CLI: `zero onboard --auth-choice zai-api-key`
  - Aliases: `z.ai/*` e `z-ai/*` são normalizados para `zai/*`

### Vercel AI Gateway

- Provedor: `vercel-ai-gateway`
- Autenticação: `AI_GATEWAY_API_KEY`
- Exemplo de modelo: `vercel-ai-gateway/anthropic/claude-opus-4.5`
- CLI: `zero onboard --auth-choice ai-gateway-api-key`

### Outros provedores integrados

- OpenRouter: `openrouter` (`OPENROUTER_API_KEY`)
- Exemplo de modelo: `openrouter/anthropic/claude-sonnet-4-5`
- xAI: `xai` (`XAI_API_KEY`)
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Modelos GLM na Cerebras usam IDs `zai-glm-4.7` e `zai-glm-4.6`.
  - URL base compatível com OpenAI: `https://api.cerebras.ai/v1`.
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)

## Provedores via `models.providers` (URL base/personalizada)

Use `models.providers` (ou `models.json`) para adicionar provedores **personalizados** ou proxies compatíveis com OpenAI/Anthropic.

### Moonshot AI (Kimi)

A Moonshot usa endpoints compatíveis com a OpenAI, então configure-a como um provedor personalizado:

- Provedor: `moonshot`
- Autenticação: `MOONSHOT_API_KEY`
- Exemplo de modelo: `moonshot/kimi-k2-0905-preview`
- IDs de modelo do Kimi K2:
  - `moonshot/kimi-k2-0905-preview`
  - `moonshot/kimi-k2-turbo-preview`
  - `moonshot/kimi-k2-thinking`
  - `moonshot/kimi-k2-thinking-turbo`

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2-0905-preview" } }
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2-0905-preview", name: "Kimi K2 0905 Preview" }]
      }
    }
  }
}
```

### Kimi Code

O Kimi Code usa um endpoint e chave dedicados (separados da Moonshot):

- Provedor: `kimi-code`
- Autenticação: `KIMICODE_API_KEY`
- Exemplo de modelo: `kimi-code/kimi-for-coding`

```json5
{
  env: { KIMICODE_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi-code/kimi-for-coding" } }
  },
  models: {
    mode: "merge",
    providers: {
      "kimi-code": {
        baseUrl: "https://api.kimi.com/coding/v1",
        apiKey: "${KIMICODE_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-for-coding", name: "Kimi For Coding" }]
      }
    }
  }
}
```

### Qwen OAuth (nível gratuito)

A Qwen fornece acesso OAuth ao Qwen Coder + Vision via um fluxo de código de dispositivo. Ative o plugin empacotado e faça o login:

```bash
zero plugins enable qwen-portal-auth
zero models auth login --provider qwen-portal --set-default
```

Referências de modelo:

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

Veja [/providers/qwen](/providers/qwen) para detalhes de configuração e notas.

### Synthetic

A Synthetic fornece modelos compatíveis com a Anthropic sob o provedor `synthetic`:

- Provedor: `synthetic`
- Autenticação: `SYNTHETIC_API_KEY`
- Exemplo de modelo: `synthetic/hf:MiniMaxAI/MiniMax-M2.1`
- CLI: `zero onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.1" } }
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.1", name: "MiniMax M2.1" }]
      }
    }
  }
}
```

### MiniMax

A MiniMax é configurada via `models.providers` porque usa endpoints personalizados:

- MiniMax (compatível com Anthropic): `--auth-choice minimax-api`
- Autenticação: `MINIMAX_API_KEY`

Veja [/providers/minimax](/providers/minimax) para detalhes de configuração, opções de modelos e trechos de configuração.

### Ollama

O Ollama é um runtime de LLM local que fornece uma API compatível com a OpenAI:

- Provedor: `ollama`
- Autenticação: Nenhuma necessária (servidor local)
- Exemplo de modelo: `ollama/llama3.3`
- Instalação: <https://ollama.ai>

```bash
# Instale o Ollama e baixe um modelo:
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } }
  }
}
```

O Ollama é detectado automaticamente ao rodar localmente em `http://127.0.0.1:11434/v1`. Veja [/providers/ollama](/providers/ollama) para recomendações de modelos e configuração personalizada.

### Proxies locais (LM Studio, vLLM, LiteLLM, etc.)

Exemplo (compatível com OpenAI):

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.1-gs32" },
      models: { "lmstudio/minimax-m2.1-gs32": { alias: "Minimax" } }
    }
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "LMSTUDIO_KEY",
        api: "openai-completions",
        models: [
          {
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

Notas:

- Para provedores personalizados, `reasoning`, `input`, `cost`, `contextWindow` e `maxTokens` são opcionais. Quando omitidos, o ZERO assume:
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recomendado: defina valores explícitos que correspondam aos limites do seu proxy/modelo.

## Exemplos de CLI

```bash
zero onboard --auth-choice opencode-zen
zero models set opencode/claude-opus-4-5
zero models list
```

Veja também: [/gateway/configuration](/gateway/configuration) para exemplos de configuração completos.
