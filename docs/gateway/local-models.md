---
summary: "Execute o ZERO em LLMs locais (LM Studio, vLLM, LiteLLM, endpoints OpenAI personalizados)"
read_when:
  - Você deseja servir modelos a partir do seu próprio hardware (GPU)
  - Você está integrando o LM Studio ou um proxy compatível com OpenAI
  - Você precisa de orientações seguras para modelos locais
---

# Modelos locais

O uso local é possível, mas o ZERO espera um contexto amplo + defesas fortes contra injeção de prompt (prompt injection). Modelos pequenos truncam o contexto e falham na segurança. Mire alto: **≥2 Mac Studios com especificações máximas ou um rig de GPU equivalente (~$30k+)**. Uma única GPU de **24 GB** funciona apenas para prompts mais leves e com maior latência. Use a **variante de modelo de tamanho total/maior que você conseguir rodar**; checkpoints excessivamente quantizados ou "pequenos" aumentam o risco de injeção de prompt (veja [Segurança](/gateway/security)).

## Recomendado: LM Studio + MiniMax M2.1 (Responses API, tamanho total)

Melhor stack local atual. Carregue o MiniMax M2.1 no LM Studio, habilite o servidor local (padrão `http://127.0.0.1:1234`) e use a Responses API para manter o raciocínio separado do texto final.

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.1-gs32" },
      models: {
        "anthropic/claude-opus-4-5": { alias: "Opus" },
        "lmstudio/minimax-m2.1-gs32": { alias: "Minimax" }
      }
    }
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

### Checklist de configuração

- Instale o LM Studio: <https://lmstudio.ai>
- No LM Studio, baixe a **maior build do MiniMax M2.1 disponível** (evite variantes "pequenas" ou fortemente quantizadas), inicie o servidor e confirme se `http://127.0.0.1:1234/v1/models` a lista.
- Mantenha o modelo carregado; o carregamento a frio (cold-load) adiciona latência de inicialização.
- Ajuste `contextWindow`/`maxTokens` se sua build do LM Studio for diferente.
- Para WhatsApp, utilize a Responses API para que apenas o texto final seja enviado.

Mantenha modelos hospedados configurados mesmo ao rodar localmente; use `models.mode: "merge"` para que os fallbacks permaneçam disponíveis.

### Configuração híbrida: primário hospedado, fallback local

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["lmstudio/minimax-m2.1-gs32", "anthropic/claude-opus-4-5"]
      },
      models: {
        "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
        "lmstudio/minimax-m2.1-gs32": { alias: "MiniMax Local" },
        "anthropic/claude-opus-4-5": { alias: "Opus" }
      }
    }
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.1-gs32",
            name: "MiniMax M2.1 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

### Local como prioridade com rede de segurança hospedada

Inverta a ordem do primário e do fallback; mantenha o mesmo bloco de provedores e `models.mode: "merge"` para que você possa recorrer ao Sonnet ou Opus quando a máquina local estiver fora do ar.

### Hospedagem regional / roteamento de dados

- Variantes hospedadas do MiniMax/Kimi/GLM também existem no OpenRouter com endpoints fixados por região (ex: hospedado nos EUA). Escolha a variante regional lá para manter o tráfego em sua jurisdição preferida, enquanto ainda usa `models.mode: "merge"` para fallbacks Anthropic/OpenAI.
- O uso exclusivamente local continua sendo o caminho mais forte para a privacidade; o roteamento regional hospedado é o meio-termo quando você precisa de recursos do provedor, mas deseja controle sobre o fluxo de dados.

## Outros proxies locais compatíveis com OpenAI

vLLM, LiteLLM, OAI-proxy ou gateways personalizados funcionam se expuserem um endpoint `/v1` no estilo OpenAI. Substitua o bloco do provedor acima pelo seu endpoint e ID do modelo:

```json5
{
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

Mantenha `models.mode: "merge"` para que modelos hospedados permaneçam disponíveis como fallbacks.

## Solução de problemas

- O Gateway consegue alcançar o proxy? `curl http://127.0.0.1:1234/v1/models`.
- O modelo do LM Studio foi descarregado? Recarregue; a inicialização a frio é uma causa comum de travamentos.
- Erros de contexto? Diminua o `contextWindow` ou aumente o limite do seu servidor.
- Segurança: modelos locais ignoram filtros do provedor; mantenha os agentes restritos e a compactação ativa para limitar o raio de alcance de possíveis injeções de prompt.
