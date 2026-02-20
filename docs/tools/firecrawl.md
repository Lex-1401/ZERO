---
summary: "Fallback do Firecrawl para web_fetch (extração com cache + anti-bot)"
read_when:
  - Você quer extração web suportada pelo Firecrawl
  - Você precisa de uma chave de API do Firecrawl
  - Você quer extração anti-bot para web_fetch
---

# Firecrawl

O ZERO pode usar o **Firecrawl** como um extrator de fallback (reserva) para `web_fetch`. É um serviço de
extração de conteúdo hospedado que suporta elisão de bots (bot circumvention) e cache, o que ajuda
com sites pesados em JS ou páginas que bloqueiam buscas HTTP simples.

## Obtenha uma chave de API

1) Crie uma conta no Firecrawl e gere uma chave de API.
2) Armazene-a na configuração ou defina `FIRECRAWL_API_KEY` no ambiente do gateway.

## Configurar Firecrawl

```json5
{
  tools: {
    web: {
      fetch: {
        firecrawl: {
          apiKey: "FIRECRAWL_API_KEY_HERE",
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 172800000,
          timeoutSeconds: 60
        }
      }
    }
  }
}
```

Notas:
- `firecrawl.enabled` padroniza para true quando uma chave de API está presente.
- `maxAgeMs` controla o quão antigos os resultados armazenados em cache podem ser (ms). O padrão é 2 dias.

## Furtividade / elisão de bots (Stealth / bot circumvention)

O Firecrawl expõe um parâmetro de **modo proxy** para evitar detecção de bot (`basic`, `stealth`, ou `auto`).
O ZERO sempre usa `proxy: "auto"` mais `storeInCache: true` para requisições do Firecrawl.
Se o proxy for omitido, o Firecrawl padroniza para `auto`. `auto` tenta novamente com proxies furtivos se uma tentativa básica falhar, o que pode usar mais créditos
do que o scraping apenas básico.

## Como o `web_fetch` usa o Firecrawl

Ordem de extração do `web_fetch`:
1) Readability (local)
2) Firecrawl (se configurado)
3) Limpeza básica de HTML (último recurso)

Veja [Ferramentas Web](/tools/web) para a configuração completa das ferramentas web.
