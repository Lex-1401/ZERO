---
summary: "Use a API unificada do OpenRouter para acessar muitos modelos no ZERO"
read_when:
  - Você deseja uma única chave de API para muitos LLMs
  - Você deseja executar modelos via OpenRouter no ZERO
---
# OpenRouter

O OpenRouter fornece uma **API unificada** que roteia solicitações para muitos modelos por trás de um único endpoint e chave de API. Ele é compatível com OpenAI, portanto, a maioria dos SDKs da OpenAI funciona trocando a URL base.

## Configuração pela CLI

```bash
zero onboard --auth-choice apiKey --token-provider openrouter --token "$OPENROUTER_API_KEY"
```

## Trecho de configuração

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" }
    }
  }
}
```

## Notas

- Referências de modelos são `openrouter/<provedor>/<modelo>`.
- Para mais opções de modelos/provedores, consulte [/concepts/model-providers](/concepts/model-providers).
- O OpenRouter usa um token Bearer com sua chave de API nos bastidores.
