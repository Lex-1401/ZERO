---
summary: "Configuração do Perplexity Sonar para a ferramenta web_search"
read_when:
  - Você deseja usar o Perplexity Sonar para buscas na web (web_search)
  - Você precisa de uma PERPLEXITY_API_KEY ou configuração via OpenRouter
---

# Perplexity Sonar

O ZERO pode usar o Perplexity Sonar para a habilidade `web_search`. Você pode se conectar através da API direta da Perplexity ou via OpenRouter.

## Opções de API

### Perplexity (direta)

- URL Base: <https://api.perplexity.ai>
- Variável de ambiente: `PERPLEXITY_API_KEY`

### OpenRouter (alternativa)

- URL Base: <https://openrouter.ai/api/v1>
- Variável de ambiente: `OPENROUTER_API_KEY`
- Suporta créditos pré-pagos/cripto.

## Exemplo de configuração

```json5
{
  tools: {
    web: {
      search: {
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...",
          baseUrl: "https://api.perplexity.ai",
          model: "perplexity/sonar-pro"
        }
      }
    }
  }
}
```

## Alternando a partir do Brave

```json5
{
  tools: {
    web: {
      search: {
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...",
          baseUrl: "https://api.perplexity.ai"
        }
      }
    }
  }
}
```

Se as variáveis `PERPLEXITY_API_KEY` e `OPENROUTER_API_KEY` estiverem ambas definidas, configure `tools.web.search.perplexity.baseUrl` (ou `tools.web.search.perplexity.apiKey`) para desfazer a ambiguidade.

Se nenhuma URL base for definida, o ZERO escolherá um padrão baseado na origem da chave de API:

- `PERPLEXITY_API_KEY` ou formato `pplx-...` → Perplexity direta (`https://api.perplexity.ai`)
- `OPENROUTER_API_KEY` ou formato `sk-or-...` → OpenRouter (`https://openrouter.ai/api/v1`)
- Formatos de chave desconhecidos → OpenRouter (fallback seguro)

## Modelos

- `perplexity/sonar` — Perguntas e respostas rápidas com busca na web.
- `perplexity/sonar-pro` (padrão) — Raciocínio multi-etapa + busca na web.
- `perplexity/sonar-reasoning-pro` — Pesquisa profunda.

Consulte [Ferramentas Web](/tools/web) para a configuração completa do web_search.
