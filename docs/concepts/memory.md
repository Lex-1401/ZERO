---
summary: "Como funciona a memória do ZERO (arquivos do espaço de trabalho + limpeza automática de memória)"
read_when:
  - Você deseja entender o layout dos arquivos de memória e o fluxo de trabalho
  - Você deseja ajustar a limpeza automática de memória pré-compactação
---
# Memória

A memória do ZERO é baseada em **Markdown simples no espaço de trabalho do agente**. Os arquivos são a fonte da verdade; o modelo apenas "lembra" o que é escrito no disco.

Ferramentas de busca de memória são fornecidas pelo plugin de memória ativo (padrão: `memory-core`). Desative plugins de memória com `plugins.slots.memory = "none"`.

## Arquivos de memória (Markdown)

O layout padrão do espaço de trabalho usa duas camadas de memória:

- `memory/AAAA-MM-DD.md`
  - Log diário (apenas adição/append).
  - Lido hoje + ontem no início da sessão.
- `MEMORY.md` (opcional)
  - Memória de longo prazo curada.
  - **Carregada apenas na sessão principal e privada** (nunca em contextos de grupo).

Estes arquivos vivem sob o espaço de trabalho (`agents.defaults.workspace`, padrão `~/zero`). Veja [Espaço de trabalho do Agente](/concepts/agent-workspace) para o layout completo.

## Grafo de Conhecimento (Grafo de Relações)

O ZERO 3.0 adiciona **Memória de Entidade-Relação** para armazenar fatos estruturados.

- **Arquivo**: `entities.json` (no espaço de trabalho do agente).
- **Estrutura**: Um grafo de nós (Entidades) e arestas (Relações).
- **Atualização**: Um loop agêntico analisa as transcrições da sessão (ou prompts de "limpeza de memória") para extrair novas entidades e relações automaticamente.
- **Busca**: A ferramenta `graph_search` permite que o agente consulte este grafo para obter contexto (ex: "A quem X está conectado?" ou "O que sabemos sobre o Projeto Y?").

Este grafo complementa a memória Markdown não estruturada ao capturar conexões específicas — grafos sociais, dependências de projetos e preferências do usuário — em um formato consultável.

## Quando escrever na memória

- Decisões, preferências e fatos duradouros vão para `MEMORY.md`.
- Notas do dia a dia e contexto em execução vão para `memory/AAAA-MM-DD.md`.
- Se alguém disser "lembre-se disso," escreva (não mantenha apenas na RAM).
- Esta área ainda está evoluindo. Ajuda lembrar o modelo de armazenar memórias; ele saberá o que fazer.
- Se você quer que algo permaneça, **peça ao bot para escrever** na memória.

## Limpeza automática de memória (ping pré-compactação)

Quando uma sessão está **perto da auto-compactação**, o ZERO dispara um **turno agêntico silencioso** que lembra o modelo de escrever memórias duradouras **antes** que o contexto seja compactado. Os prompts padrão dizem explicitamente que o modelo *pode responder*, mas geralmente `NO_REPLY` é a resposta correta para que o usuário nunca veja este turno.

Isso é controlado por `agents.defaults.compaction.memoryFlush`:

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Sessão próxima da compactação. Armazene memórias duradouras agora.",
          prompt: "Escreva quaisquer notas duradouras em memory/AAAA-MM-DD.md; responda com NO_REPLY se não houver nada para armazenar."
        }
      }
    }
  }
}
```

Detalhes:

- **Limiar suave (Soft threshold)**: a limpeza é disparada quando a estimativa de tokens da sessão ultrapassa `contextWindow - reserveTokensFloor - softThresholdTokens`.
- **Silencioso** por padrão: os prompts incluem `NO_REPLY` para que nada seja entregue.
- **Dois prompts**: um prompt de usuário mais um prompt de sistema anexam o lembrete.
- **Uma limpeza por ciclo de compactação** (rastreado em `sessions.json`).
- **Espaço de trabalho deve ser gravável**: se a sessão rodar em sandbox com `workspaceAccess: "ro"` ou `"none"`, a limpeza é pulada.

Para o ciclo de vida completo da compactação, veja [Gerenciamento de sessão + compactação](/reference/session-management-compaction).

## Busca de memória vetorial

O ZERO pode construir um pequeno índice vetorial sobre `MEMORY.md` e `memory/*.md` para que consultas semânticas possam encontrar notas relacionadas, mesmo quando a formulação for diferente.

Padrões:

- Habilitado por padrão.
- Monitora arquivos de memória para alterações (com debounce).
- Usa embeddings remotos por padrão. Se `memorySearch.provider` não for definido, o ZERO auto-seleciona:
  1. `local` se um `memorySearch.local.modelPath` estiver configurado e o arquivo existir.
  2. `openai` se uma chave OpenAI puder ser resolvida.
  3. `gemini` se uma chave Gemini puder ser resolvida.
  4. Caso contrário, a busca de memória permanece desativada até ser configurada.
- O modo local usa `node-llama-cpp` e pode exigir `pnpm approve-builds`.
- Usa `sqlite-vec` (quando disponível) para acelerar a busca vetorial dentro do SQLite.

Embeddings remotos **exigem** uma chave de API para o provedor de embeddings. O ZERO resolve as chaves a partir de perfis de autenticação, `models.providers.*.apiKey` ou variáveis de ambiente. O OAuth do Codex cobre apenas chat/conclusões e **não** satisfaz os embeddings para busca de memória. Para o Gemini, use `GEMINI_API_KEY` ou `models.providers.google.apiKey`. Ao usar um endpoint personalizado compatível com OpenAI, configure `memorySearch.remote.apiKey` (e opcionalmente `memorySearch.remote.headers`).

### Embeddings Gemini (nativo)

Configure o provedor como `gemini` para usar a API de embeddings do Gemini diretamente:

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-001",
      remote: {
        apiKey: "SUA_CHAVE_API_GEMINI"
      }
    }
  }
}
```

Notas:

- `remote.baseUrl` é opcional (padrão é a URL base da API Gemini).
- `remote.headers` permite adicionar cabeçalhos extras se necessário.
- Modelo padrão: `gemini-embedding-001`.

Se você quiser usar um **endpoint personalizado compatível com OpenAI** (OpenRouter, vLLM ou um proxy), você pode usar a configuração `remote` com o provedor OpenAI:

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.exemplo.com/v1/",
        apiKey: "SUA_CHAVE_API_COMPATIVEL_OPENAI",
        headers: { "X-Custom-Header": "valor" }
      }
    }
  }
}
```

Se você não quiser configurar uma chave de API, use `memorySearch.provider = "local"` ou defina `memorySearch.fallback = "none"`.

Fallbacks:

- `memorySearch.fallback` pode ser `openai`, `gemini`, `local` ou `none`.
- O provedor de fallback é usado apenas quando o provedor de embedding primário falha.

Indexação em lote (OpenAI + Gemini):

- Habilitado por padrão para embeddings OpenAI e Gemini. Defina `agents.defaults.memorySearch.remote.batch.enabled = false` para desabilitar.
- O comportamento padrão aguarda a conclusão do lote; ajuste `remote.batch.wait`, `remote.batch.pollIntervalMs` e `remote.batch.timeoutMinutes` se necessário.
- Configure `remote.batch.concurrency` para controlar quantos trabalhos em lote enviamos em paralelo (padrão: 2).
- O modo batch se aplica quando `memorySearch.provider = "openai"` ou `"gemini"` e usa a chave de API correspondente.
- Trabalhos em lote do Gemini usam o endpoint de lote de embeddings assíncronos e exigem disponibilidade da API de Lote do Gemini.

Por que o lote da OpenAI é rápido + barato:

- Para grandes preenchimentos retroativos (backfills), a OpenAI é tipicamente a opção mais rápida que suportamos, pois podemos enviar muitas requisições de embedding em um único trabalho em lote e deixar a OpenAI processá-las de forma assíncrona.
- A OpenAI oferece preços com desconto para cargas de trabalho da API de Lote, portanto, grandes execuções de indexação são geralmente mais baratas do que enviar as mesmas requisições de forma síncrona.
- Veja a documentação e os preços da API de Lote da OpenAI para detalhes:
  - <https://platform.openai.com/docs/api-reference/batch>
  - <https://platform.openai.com/pricing>

Exemplo de configuração:

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      fallback: "openai",
      remote: {
        batch: { enabled: true, concurrency: 2 }
      },
      sync: { watch: true }
    }
  }
}
```

Ferramentas:

- `memory_search` — retorna snippets com arquivos + intervalos de linhas.
- `memory_get` — lê o conteúdo do arquivo de memória pelo caminho.

Modo Local:

- Defina `agents.defaults.memorySearch.provider = "local"`.
- Forneça `agents.defaults.memorySearch.local.modelPath` (GGUF ou URI `hf:`).
- Opcional: defina `agents.defaults.memorySearch.fallback = "none"` para evitar o fallback remoto.

### Como as ferramentas de memória funcionam

- `memory_search` busca semânticamente em pedaços (chunks) de Markdown (alvo de ~400 tokens, sobreposição de 80 tokens) em `MEMORY.md` + `memory/**/*.md`. Retorna o texto do snippet (limitado a ~700 caracteres), caminho do arquivo, intervalo de linhas, pontuação, provedor/modelo e se houve fallback de embeddings locais → remotos. Nenhum payload de arquivo completo é retornado.
- `memory_get` lê um arquivo Markdown de memória específico (relativo ao espaço de trabalho), opcionalmente a partir de uma linha inicial e por N linhas. Caminhos fora de `MEMORY.md` / `memory/` são rejeitados.
- Ambas as ferramentas são habilitadas apenas quando `memorySearch.enabled` resolve como verdadeiro para o agente.

### O que é indexado (e quando)

- Tipo de arquivo: apenas Markdown (`MEMORY.md`, `memory/**/*.md`).
- Armazenamento do índice: SQLite por agente em `~/.zero/memory/<agentId>.sqlite` (configurável via `agents.defaults.memorySearch.store.path`, suporta o token `{agentId}`).
- Frescor: um monitor em `MEMORY.md` + `memory/` marca o índice como sujo (debounce 1.5s). A sincronização é agendada no início da sessão, na busca ou em um intervalo, e roda de forma assíncrona. Transcrições de sessão usam limiares delta para disparar a sincronização em segundo plano.
- Gatilhos de reindexação: o índice armazena o **provedor/modelo de embedding + impressão digital (fingerprint) do endpoint + parâmetros de chunking**. Se qualquer um destes mudar, o ZERO reseta e reindexa automaticamente todo o armazenamento.

### Busca Híbrida (BM25 + vetor)

Quando habilitada, o ZERO combina:

- **Similaridade vetorial** (correspondência semântica, a redação pode diferir)
- **Relevância de palavra-chave BM25** (tokens exatos como IDs, variáveis de ambiente, símbolos de código)

Se a busca de texto completo estiver indisponível em sua plataforma, o ZERO faz o fallback para a busca apenas vetorial.

#### Por que híbrida?

A busca vetorial é ótima para "isso significa a mesma coisa":

- “Host gateway Mac Studio” vs “a máquina que roda o gateway”
- “debounce de atualizações de arquivo” vs “evitar indexação em cada escrita”

Mas pode ser fraca com tokens exatos de alto sinal:

- IDs (`a828e60`, `b3b9895a…`)
- símbolos de código (`memorySearch.query.hybrid`)
- strings de erro (“sqlite-vec indisponível”)

BM25 (texto completo) é o oposto: forte em tokens exatos, mais fraco em paráfrases.
A busca híbrida é o meio-termo pragmático: **usa ambos os sinais de recuperação** para que você obtenha bons resultados tanto para consultas em "linguagem natural" quanto para consultas de "agulha no palheiro".

#### Como mesclamos os resultados (o design atual)

Esboço da implementação:

1) Recuperar um conjunto de candidatos de ambos os lados:

- **Vetor**: os top `maxResults * candidateMultiplier` por similaridade de cosseno.
- **BM25**: os top `maxResults * candidateMultiplier` pela classificação BM25 do FTS5 (menor é melhor).

1) Converter a classificação BM25 em uma pontuação de 0..1 aprox:

- `textScore = 1 / (1 + max(0, bm25Rank))`

1) Unir os candidatos pelo id do pedaço (chunk) e calcular uma pontuação ponderada:

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

Notas:

- `vectorWeight` + `textWeight` é normalizado para 1.0 na resolução da configuração, então os pesos se comportam como porcentagens.
- Se os embeddings estiverem indisponíveis (ou o provedor retornar um vetor zero), ainda executamos o BM25 e retornamos correspondências de palavras-chave.
- Se o FTS5 não puder ser criado, mantemos a busca apenas vetorial (sem falha crítica).

Isso não é "teoricamente perfeito em IR (Information Retrieval)", mas é simples, rápido e costuma melhorar o recall/precisão em notas reais.
Se quisermos algo mais sofisticado no futuro, os próximos passos comuns são Reciprocal Rank Fusion (RRF) ou normalização de pontuação (min/max ou z-score) antes da mistura.

Configuração:

```json5
agents: {
  defaults: {
    memorySearch: {
      query: {
        hybrid: {
          enabled: true,
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateMultiplier: 4
        }
      }
    }
  }
}
```

### Cache de Embedding

O ZERO pode colocar em cache os **embeddings de pedaços** no SQLite para que reindexações e atualizações frequentes (especialmente transcrições de sessões) não re-embarquem textos inalterados.

Configuração:

```json5
agents: {
  defaults: {
    memorySearch: {
      cache: {
        enabled: true,
        maxEntries: 50000
      }
    }
  }
}
```

### Busca na memória da sessão (experimental)

Você pode opcionalmente indexar **transcrições de sessão** e expô-las via `memory_search`.
Isso é protegido por uma flag experimental.

```json5
agents: {
  defaults: {
    memorySearch: {
      experimental: { sessionMemory: true },
      sources: ["memory", "sessions"]
    }
  }
}
```

Notas:

- A indexação de sessão é **opcional (opt-in)** (desativada por padrão).
- As atualizações de sessão sofrem debounce e são **indexadas de forma assíncrona** assim que ultrapassam os limiares delta (melhor esforço).
- `memory_search` nunca bloqueia a indexação; os resultados podem estar ligeiramente desatualizados até que a sincronização em segundo plano termine.
- Os resultados ainda incluem apenas snippets; `memory_get` permanece limitado aos arquivos de memória.
- A indexação de sessão é isolada por agente (apenas os logs de sessão desse agente são indexados).
- Os logs de sessão vivem no disco (`~/.zero/agents/<agentId>/sessions/*.jsonl`). Qualquer processo/usuário com acesso ao sistema de arquivos pode lê-los, portanto, trate o acesso ao disco como o limite de confiança. Para um isolamento mais rígido, execute os agentes em usuários ou hosts separados do SO.

Limiares delta (padrões mostrados):

```json5
agents: {
  defaults: {
    memorySearch: {
      sync: {
        sessions: {
          deltaBytes: 100000,   // ~100 KB
          deltaMessages: 50     // linhas JSONL
        }
      }
    }
  }
}
```

### Aceleração vetorial SQLite (sqlite-vec)

Quando a extensão `sqlite-vec` está disponível, o ZERO armazena os embeddings em uma tabela virtual do SQLite (`vec0`) e executa consultas de distância vetorial no banco de dados. Isso mantém a busca rápida sem carregar cada embedding no JS.

Configuração (opcional):

```json5
agents: {
  defaults: {
    memorySearch: {
      store: {
        vector: {
          enabled: true,
          extensionPath: "/caminho/para/sqlite-vec"
        }
      }
    }
  }
}
```

Notas:

- `enabled` tem como padrão verdadeiro; quando desativado, a busca faz o fallback para a similaridade de cosseno em processo sobre os embeddings armazenados.
- Se a extensão `sqlite-vec` estiver ausente ou falhar ao carregar, o ZERO registra o erro e continua com o fallback em JS (sem tabela vetorial).
- `extensionPath` sobrescreve o caminho do `sqlite-vec` embutido (útil para builds personalizados ou locais de instalação não padrão).

### Auto-download de embedding local

- Modelo de embedding local padrão: `hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf` (~0.6 GB).
- Quando `memorySearch.provider = "local"`, o `node-llama-cpp` resolve o `modelPath`; se o GGUF estiver ausente, ele faz o **download automático** para o cache (ou `local.modelCacheDir` se definido), e então o carrega. Os downloads continuam após uma nova tentativa.
- Requisito de build nativo: execute `pnpm approve-builds`, escolha `node-llama-cpp` e execute `pnpm rebuild node-llama-cpp`.
- Fallback: se a configuração local falhar e `memorySearch.fallback = "openai"`, mudamos automaticamente para embeddings remotos (`openai/text-embedding-3-small`, a menos que sobrescrito) e registramos o motivo.

### Exemplo de endpoint personalizado compatível com OpenAI

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.exemplo.com/v1/",
        apiKey: "SUA_CHAVE_API_REMOTA",
        headers: {
          "X-Organization": "id-da-org",
          "X-Project": "id-do-projeto"
        }
      }
    }
  }
}
```

Notas:

- `remote.*` tem precedência sobre `models.providers.openai.*`.
- `remote.headers` são mesclados com os cabeçalhos da OpenAI; a configuração remota vence em conflitos de chaves. Omita `remote.headers` para usar os padrões da OpenAI.
