---
summary: "Ferramentas de busca + busca web (Brave Search API, Perplexity direto/OpenRouter)"
read_when:
  - Você quer habilitar web_search ou web_fetch
  - Você precisa configurar a chave de API Brave Search
  - Você quer usar Perplexity Sonar para busca web
---

# Ferramentas Web (Web tools)

O ZERO envia duas ferramentas web leves:

- `web_search` — Pesquisa na web via Brave Search API (padrão) ou Perplexity Sonar (direto ou via OpenRouter).
- `web_fetch` — Busca HTTP + extração legível (HTML → markdown/texto).

Estas **não** são automação de navegador. Para sites com muito JS ou logins, use a
[Ferramenta de Navegador](/tools/browser).

## Como funciona (How it works)

- `web_search` chama seu provedor configurado e retorna resultados.
  - **Brave** (padrão): retorna resultados estruturados (título, URL, trecho).
  - **Perplexity**: retorna respostas sintetizadas por IA com citações de busca na web em tempo real.
- Resultados são armazenados em cache por consulta por 15 minutos (configurável).
- `web_fetch` faz um GET HTTP simples e extrai conteúdo legível
  (HTML → markdown/texto). Ele **não** executa JavaScript.
- `web_fetch` é ativado por padrão (a menos que explicitamente desativado).

## Escolhendo um provedor de pesquisa

| Provedor | Prós | Contras | Chave de API |
|----------|------|---------|--------------|
| **Brave** (padrão) | Rápido, resultados estruturados, nível gratuito | Resultados de busca tradicionais | `BRAVE_API_KEY` |
| **Perplexity** | Respostas sintetizadas por IA, citações, tempo real | Requer acesso Perplexity ou OpenRouter | `OPENROUTER_API_KEY` ou `PERPLEXITY_API_KEY` |

Veja [Configuração de busca Brave](/brave-search) e [Perplexity Sonar](/perplexity) para detalhes específicos do provedor.

Defina o provedor na configuração:

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave"  // ou "perplexity"
      }
    }
  }
}
```

Exemplo: mude para Perplexity Sonar (API direta):

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

## Obtendo uma chave de API Brave

1) Crie uma conta Brave Search API em <https://brave.com/search/api/>
2) No painel, escolha o plano **Data for Search** (não “Data for AI”) e gere uma chave de API.
3) Execute `zero configure --section web` para armazenar a chave na configuração (recomendado), ou defina `BRAVE_API_KEY` no seu ambiente.

O Brave fornece um nível gratuito mais planos pagos; verifique o portal da API Brave para os
limites e preços atuais.

### Onde definir a chave (recomendado)

**Recomendado:** execute `zero configure --section web`. Ele armazena a chave em
`~/.zero/zero.json` sob `tools.web.search.apiKey`.

**Alternativa de ambiente:** defina `BRAVE_API_KEY` no ambiente do processo
Gateway. Para uma instalação de gateway, coloque em `~/.zero/.env` (ou seu
ambiente de serviço). Veja [Env vars](/help/faq#how-does-zero-load-environment-variables).

## Usando Perplexity (direto ou via OpenRouter)

Modelos Perplexity Sonar têm capacidades de busca na web integradas e retornam respostas sintetizadas por IA
com citações. Você pode usá-los via OpenRouter (sem cartão de crédito necessário - suporta
cripto/pré-pago).

### Obtendo uma chave de API OpenRouter

1) Crie uma conta em <https://openrouter.ai/>
2) Adicione créditos (suporta cripto, pré-pago ou cartão de crédito)
3) Gere uma chave de API nas configurações da sua conta

### Configurando busca Perplexity

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          // API key (opcional se OPENROUTER_API_KEY ou PERPLEXITY_API_KEY estiver definida)
          apiKey: "sk-or-v1-...",
          // Base URL (padrão sensível à chave se omitido)
          baseUrl: "https://openrouter.ai/api/v1",
          // Modelo (padroniza para perplexity/sonar-pro)
          model: "perplexity/sonar-pro"
        }
      }
    }
  }
}
```

**Alternativa de ambiente:** defina `OPENROUTER_API_KEY` ou `PERPLEXITY_API_KEY` no ambiente
do Gateway. Para uma instalação de gateway, coloque em `~/.zero/.env`.

Se nenhuma URL base for definida, o ZERO escolhe um padrão baseado na fonte da chave de API:

- `PERPLEXITY_API_KEY` ou `pplx-...` → `https://api.perplexity.ai`
- `OPENROUTER_API_KEY` ou `sk-or-...` → `https://openrouter.ai/api/v1`
- Formatos de chave desconhecidos → OpenRouter (fallback seguro)

### Modelos Perplexity disponíveis

| Modelo | Descrição | Melhor para |
|-------|-------------|-------------|
| `perplexity/sonar` | Q&A rápido com busca web | Consultas rápidas |
| `perplexity/sonar-pro` (padrão) | Raciocínio de múltiplos passos com busca web | Perguntas complexas |
| `perplexity/sonar-reasoning-pro` | Análise de cadeia de pensamento (Chain-of-thought) | Pesquisa profunda |

## web_search

Pesquise na web usando seu provedor configurado.

### Requisitos

- `tools.web.search.enabled` não deve ser `false` (padrão: ativado)
- Chave de API para seu provedor escolhido:
  - **Brave**: `BRAVE_API_KEY` ou `tools.web.search.apiKey`
  - **Perplexity**: `OPENROUTER_API_KEY`, `PERPLEXITY_API_KEY` ou `tools.web.search.perplexity.apiKey`

### Configuração

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE", // opcional se BRAVE_API_KEY estiver definida
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15
      }
    }
  }
}
```

### Parâmetros da ferramenta

- `query` (obrigatório)
- `count` (1–10; padrão da configuração)
- `country` (opcional): código de país de 2 letras para resultados específicos da região (ex: "DE", "US", "ALL"). Se omitido, o Brave escolhe sua região padrão.
- `search_lang` (opcional): código de idioma ISO para resultados de pesquisa (ex: "de", "en", "fr")
- `ui_lang` (opcional): código de idioma ISO para elementos de UI
- `freshness` (opcional, apenas Brave): filtro por tempo de descoberta (`pd`, `pw`, `pm`, `py` ou `YYYY-MM-DDtoYYYY-MM-DD`)

**Exemplos:**

```javascript
// Busca específica para Alemanha
await web_search({
  query: "TV online schauen",
  count: 10,
  country: "DE",
  search_lang: "de"
});

// Busca em francês com UI em francês
await web_search({
  query: "actualités",
  country: "FR",
  search_lang: "fr",
  ui_lang: "fr"
});

// Resultados recentes (semana passada)
await web_search({
  query: "TMBG interview",
  freshness: "pw"
});
```

## web_fetch

Busque uma URL e extraia conteúdo legível.

### Requisitos

- `tools.web.fetch.enabled` não deve ser `false` (padrão: ativado)
- Fallback opcional Firecrawl: defina `tools.web.fetch.firecrawl.apiKey` ou `FIRECRAWL_API_KEY`.

### Configuração

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true,
        maxChars: 50000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        readability: true,
        firecrawl: {
          enabled: true,
          apiKey: "FIRECRAWL_API_KEY_HERE", // opcional se FIRECRAWL_API_KEY estiver definida
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // ms (1 dia)
          timeoutSeconds: 60
        }
      }
    }
  }
}
```

### Parâmetros da ferramenta

- `url` (obrigatório, apenas http/https)
- `extractMode` (`markdown` | `text`)
- `maxChars` (trunca páginas longas)

Notas:

- `web_fetch` usa Readability (extração de conteúdo principal) primeiro, depois Firecrawl (se configurado). Se ambos falharem, a ferramenta retorna um erro.
- Requisições Firecrawl usam modo de elisão de bot e cache de resultados por padrão.
- `web_fetch` envia um User-Agent semelhante ao Chrome e `Accept-Language` por padrão; substitua `userAgent` se necessário.
- `web_fetch` bloqueia hostnames privados/internos e verifica redirecionamentos (limite com `maxRedirects`).
- `web_fetch` é extração de melhor esforço; alguns sites precisarão da ferramenta de navegador.
- Veja [Firecrawl](/tools/firecrawl) para configuração de chave e detalhes do serviço.
- Respostas são armazenadas em cache (padrão 15 minutos) para reduzir buscas repetidas.
- Se você usa perfis/listas de permissão de ferramenta, adicione `web_search`/`web_fetch` ou `group:web`.
- Se a chave Brave estiver faltando, `web_search` retorna uma dica curta de configuração com um link para a documentação.
