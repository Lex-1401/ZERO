---
summary: "Onde o ZERO carrega as variáveis de ambiente e a ordem de precedência"
read_when:
  - Você precisa saber quais variáveis de ambiente são carregadas e em qual ordem
  - Você está depurando chaves de API ausentes no Gateway
  - Você está documentando a autenticação do provedor ou ambientes de implantação
---

# Variáveis de ambiente

O ZERO extrai variáveis de ambiente de múltiplas fontes. A regra fundamental é **nunca substituir valores existentes**.

## Precedência (mais alta → mais baixa)

1) **Ambiente do processo** (o que o processo do Gateway já possui do shell pai ou daemon).
2) **`.env` no diretório de trabalho atual** (padrão dotenv; não substitui).
3) **`.env` global** em `~/.zero/.env` (também conhecido como `$ZERO_STATE_DIR/.env`; não substitui).
4) **Bloco `env` da configuração** em `~/.zero/zero.json` (aplicado apenas se estiver ausente).
5) **Importação opcional de shell de login** (`env.shellEnv.enabled` ou `ZERO_LOAD_SHELL_ENV=1`), aplicada apenas para chaves esperadas que estejam ausentes.

Se o arquivo de configuração estiver totalmente ausente, o passo 4 é pulado; a importação do shell ainda ocorre se estiver ativada.

## Bloco `env` da configuração

Duas formas equivalentes de definir variáveis de ambiente inline (ambas não substituem valores pré-existentes):

```json5
{
  "env": {
    "OPENROUTER_API_KEY": "sk-or-...",
    "vars": {
      "GROQ_API_KEY": "gsk-..."
    }
  }
}
```

## Importação de ambiente do shell

`env.shellEnv` executa seu shell de login e importa apenas as chaves esperadas **ausentes**:

```json5
{
  "env": {
    "shellEnv": {
      "enabled": true,
      "timeoutMs": 15000
    }
  }
}
```

Equivalentes em variáveis de ambiente:

- `ZERO_LOAD_SHELL_ENV=1`
- `ZERO_SHELL_ENV_TIMEOUT_MS=15000`

## Substituição de variáveis de ambiente na configuração

Você pode referenciar variáveis de ambiente diretamente nos valores de string da configuração usando a sintaxe `${NOME_DA_VAR}`:

```json5
{
  "models": {
    "providers": {
      "vercel-gateway": {
        "apiKey": "${VERCEL_GATEWAY_API_KEY}"
      }
    }
  }
}
```

Consulte [Configuração: Substituição de variáveis de ambiente](/gateway/configuration#env-var-substitution-in-config) para detalhes completos.

## Relacionado

- [Configuração do Gateway](/gateway/configuration)
- [FAQ: variáveis de ambiente e carregamento de .env](/help/faq#env-vars-and-env-loading)
- [Visão geral de Modelos](/concepts/models)
