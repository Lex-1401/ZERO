---
summary: "Configuração da API do Brave Search para a ferramenta web_search"
read_when:
  - Você deseja usar o Brave Search para buscas na web (web_search)
  - Você precisa de uma BRAVE_API_KEY ou detalhes do plano
---

# API do Brave Search

O ZERO usa o Brave Search como o provedor padrão para a habilidade `web_search`.

## Obter uma chave de API

1) Crie uma conta na API do Brave Search em <https://brave.com/search/api/>
2) No painel, escolha o plano **Data for Search** e gere uma chave de API.
3) Armazene a chave na configuração (recomendado) ou defina `BRAVE_API_KEY` no ambiente do Gateway.

## Exemplo de configuração

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave",
        apiKey: "SUA_BRAVE_API_KEY_AQUI",
        maxResults: 5,
        timeoutSeconds: 30
      }
    }
  }
}
```

## Notas

- O plano "Data for AI" **não** é compatível com o `web_search`.
- O Brave oferece um nível gratuito além de planos pagos; verifique o portal da API do Brave para os limites atuais.

Consulte [Ferramentas Web](/tools/web) para a configuração completa do web_search.
