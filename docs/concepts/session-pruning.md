---
summary: "Poda (pruning) de sessão: corte de resultados de ferramentas para reduzir o inchaço do contexto"
read_when:
  - Você deseja reduzir o crescimento do contexto do LLM vindo das saídas de ferramentas
  - Você está ajustando o agents.defaults.contextPruning
---
# Poda de Sessão (Session Pruning)

A poda de sessão corta **resultados de ferramentas antigos** do contexto em memória logo antes de cada chamada de LLM. Ela **não** reescreve o histórico da sessão no disco (`*.jsonl`).

## Quando ela roda

- Quando o `mode: "cache-ttl"` está habilitado e a última chamada da Anthropic para a sessão é mais antiga que o `ttl`.
- Afeta apenas as mensagens enviadas para o modelo naquela requisição específica.
- Ativa apenas para chamadas da API da Anthropic (e modelos Anthropic via OpenRouter).
- Para melhores resultados, alinhe o `ttl` com o seu `cacheControlTtl` do modelo.
- Após uma poda, a janela do TTL é reiniciada, de modo que as requisições subsequentes mantenham o cache até que o `ttl` expire novamente.

## Padrões inteligentes (Anthropic)

- Perfis **OAuth ou setup-token**: habilitam a poda `cache-ttl` e definem o batimento cardíaco (heartbeat) para `1h`.
- Perfis de **chave de API**: habilitam a poda `cache-ttl`, definem o batimento cardíaco para `30m` e o `cacheControlTtl` padrão para `1h` em modelos Anthropic.
- Se você definir qualquer um desses valores explicitamente, o ZERO **não** os sobrescreve.

## O que isso melhora (custo + comportamento do cache)

- **Por que podar:** o cache de prompt da Anthropic só se aplica dentro do TTL. Se uma sessão ficar inativa além do TTL, a próxima requisição recacheia o prompt completo, a menos que você o corte primeiro.
- **O que fica mais barato:** a poda reduz o tamanho do **cacheWrite** para aquela primeira requisição após a expiração do TTL.
- **Por que a reinicialização do TTL importa:** uma vez que a poda rodou, a janela de cache reinicia, permitindo que as requisições de acompanhamento reutilizem o prompt recém-cacheado em vez de recachear todo o histórico novamente.
- **O que não faz:** a poda não adiciona tokens ou “dobra” custos; ela apenas altera o que é cacheado naquela primeira requisição pós-TTL.

## O que pode ser podado

- Apenas mensagens de `toolResult` (resultado de ferramenta).
- Mensagens do usuário e do assistente **nunca** são modificadas.
- As últimas `keepLastAssistants` mensagens do assistente são protegidas; os resultados das ferramentas após esse ponto de corte não são podados.
- Se não houver mensagens suficientes do assistente para estabelecer o corte, a poda é ignorada.
- Resultados de ferramentas contendo **blocos de imagem** são ignorados (nunca são cortados ou limpos).

## Estimativa da janela de contexto

A poda usa uma janela de contexto estimada (caracteres ≈ tokens × 4). O tamanho da janela é resolvido nesta ordem:

1) `contextWindow` da definição do modelo (do registro do modelo).
2) Sobrescrita em `models.providers.*.models[].contextWindow`.
3) `agents.defaults.contextTokens`.
4) Padrão de `200000` tokens.

## Modos

### cache-ttl

- A poda só roda se a última chamada da Anthropic for mais antiga que o `ttl` (padrão `5m`).
- Quando ela roda: mantém o mesmo comportamento de corte suave (soft-trim) + limpeza total (hard-clear) de antes.

## Poda Suave (Soft) vs. Total (Hard)

- **Corte suave (soft-trim)**: apenas para resultados de ferramentas muito grandes.
  - Mantém o início (head) + o fim (tail), insere `...` e anexa uma nota com o tamanho original.
  - Ignora resultados com blocos de imagem.
- **Limpeza total (hard-clear)**: substitui o resultado completo da ferramenta pelo `hardClear.placeholder`.

## Seleção de ferramentas

- `tools.allow` / `tools.deny` suportam o caractere curinga `*`.
- A negação (deny) vence.
- A correspondência não diferencia maiúsculas de minúsculas.
- Lista de permissão vazia => todas as ferramentas são permitidas.

## Interação com outros limites

- Ferramentas integradas já truncam sua própria saída; a poda de sessão é uma camada extra que evita que conversas de longa duração acumulem muita saída de ferramenta no contexto do modelo.
- A compactação é separada: a compactação resume e persiste, enquanto a poda é transitória por requisição. Veja [/concepts/compaction](/concepts/compaction).

## Padrões (quando habilitado)

- `ttl`: `"5m"`
- `keepLastAssistants`: `3`
- `softTrimRatio`: `0.3`
- `hardClearRatio`: `0.5`
- `minPrunableToolChars`: `50000`
- `softTrim`: `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`
- `hardClear`: `{ enabled: true, placeholder: "[Old tool result content cleared]" }`

## Exemplos

Padrão (desativado):

```json5
{
  agent: {
    contextPruning: { mode: "off" }
  }
}
```

Habilitar poda ciente de TTL:

```json5
{
  agent: {
    contextPruning: { mode: "cache-ttl", ttl: "5m" }
  }
}
```

Restringir a poda a ferramentas específicas:

```json5
{
  agent: {
    contextPruning: {
      mode: "cache-ttl",
      tools: { allow: ["exec", "read"], deny: ["*image*"] }
    }
  }
}
```

Veja a referência de configuração: [Configuração do Gateway](/gateway/configuration)
