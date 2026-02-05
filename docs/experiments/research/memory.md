---
summary: "Notas de pesquisa: sistema de memória offline para espaços de trabalho Zero (fonte da verdade em Markdown + índice derivado)"
read_when:
  - Projetando a memória do espaço de trabalho (~/zero) além dos logs diários em Markdown
  - Decidindo entre: CLI independente vs integração profunda no ZERO
  - Adicionando recuperação e reflexão offline (reter/recordar/refletir)
---

# Memória do Espaço de Trabalho v2 (offline): notas de pesquisa

Alvo: espaço de trabalho estilo Zero (`agents.defaults.workspace`, padrão `~/zero`) onde a “memória” é armazenada como um arquivo Markdown por dia (`memory/AAAA-MM-DD.md`) mais um pequeno conjunto de arquivos estáveis (ex: `memory.md`, `SOUL.md`).

Este documento propõe uma arquitetura de memória **offline-first** que mantém o Markdown como a fonte da verdade canônica e revisável, mas adiciona **recuperação estruturada** (busca, resumos de entidades, atualizações de confiança) via um índice derivado.

## Por que mudar?

A configuração atual (um arquivo por dia) é excelente para:

- registro de logs apenas para anexação (“append-only”)
- edição humana
- durabilidade e auditabilidade baseadas em git
- captura de baixo atrito (“apenas escreva”)

É fraca para:

- recuperação de alta precisão (“o que decidimos sobre X?”, “da última vez que tentamos Y?”)
- respostas centradas em entidades (“me fale sobre a Alice / O Castelo / warelay”) sem reler muitos arquivos
- estabilidade de opinião/preferência (e evidências quando mudam)
- restrições de tempo (“o que era verdade em novembro de 2025?”) e resolução de conflitos

## Objetivos do projeto

- **Offline**: funciona sem rede; pode rodar no laptop/Castelo; sem dependência de nuvem.
- **Explicável**: os itens recuperados devem ser atribuíveis (arquivo + localização) e separáveis da inferência.
- **Sem burocracia**: o log diário continua sendo Markdown, sem trabalho pesado de esquema.
- **Incremental**: a v1 é útil apenas com busca textual (FTS); vetores semânticos e grafos são upgrades opcionais.
- **Amigável ao agente**: facilita a “recuperação dentro dos orçamentos de tokens” (retorna pequenos pacotes de fatos).

## Modelo norteador (Hindsight × Letta)

Duas peças para misturar:

1) **Loop de controle estilo Letta/MemGPT**

- manter um pequeno “core” sempre em contexto (persona + fatos chave do usuário)
- todo o resto está fora de contexto e é recuperado via ferramentas
- escritas na memória são chamadas de ferramentas explícitas (anexar/substituir/inserir), persistidas e reinjetadas no próximo turno

1) **Substrato de memória estilo Hindsight**

- separar o que é observado vs o que é acreditado vs o que é resumido
- suportar reter/recordar/refletir
- opiniões com níveis de confiança que podem evoluir com evidências
- recuperação centrada em entidades + consultas temporais (mesmo sem grafos de conhecimento completos)

## Arquitetura proposta (fonte da verdade Markdown + índice derivado)

### Armazenamento canônico (amigável ao git)

Mantenha o `~/zero` como memória canônica legível por humanos.

Layout sugerido do espaço de trabalho:

```text
~/zero/
  memory.md                    # pequeno: fatos duráveis + preferências (estilo core)
  memory/
    AAAA-MM-DD.md              # log diário (anexação; narrativa)
  bank/                        # páginas de memória “tipadas” (estáveis, revisáveis)
    world.md                   # fatos objetivos sobre o mundo
    experience.md              # o que o agente fez (primeira pessoa)
    opinions.md                # preferências/julgamentos subjetivos + confiança + ponteiros de evidência
    entities/
      Peter.md
      The-Castle.md
      warelay.md
      ...
```

Notas:

- **O log diário continua sendo log diário**. Não há necessidade de transformá-lo em JSON.
- Os arquivos do `bank/` são **curados**, produzidos por tarefas de reflexão, e ainda podem ser editados manualmente.
- `memory.md` permanece como “pequeno + estilo core”: as coisas que você quer que o Zero veja em cada sessão.

### Armazenamento derivado (recuperação por máquina)

Adicione um índice derivado sob o espaço de trabalho (não necessariamente rastreado pelo git):

```text
~/zero/.memory/index.sqlite
```

Baseado em:

- Esquema SQLite para fatos + links de entidades + metadados de opinião
- SQLite **FTS5** para recuperação lexical (rápido, minúsculo, offline)
- tabela de embeddings opcional para recuperação semântica (ainda offline)

O índice é sempre **reconstruível a partir do Markdown**.

## Reter / Recordar / Refletir (loop operacional)

### Reter: normalizar logs diários em “fatos”

A principal percepção do Hindsight que importa aqui: armazene **fatos narrativos e independentes**, não pequenos trechos.

Regra prática para `memory/AAAA-MM-DD.md`:

- no final do dia (ou durante), adicione uma seção `## Reter` com 2–5 tópicos que sejam:
  - narrativos (contexto entre turnos preservado)
  - independentes (fazem sentido isoladamente mais tarde)
  - marcados com tipo + menções a entidades

Exemplo:

```text
## Reter
- W @Peter: Atualmente em Marrakech (27 de Nov–1 de Dez, 2025) para o aniversário do Andy.
- B @warelay: Corrigi a falha do Baileys WS envolvendo os handlers de connection.update em try/catch (veja memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefere respostas concisas (<1500 caracteres) no WhatsApp; conteúdo longo vai para arquivos.
```

Análise (parsing) mínima:

- Prefixo de tipo: `W` (mundo/world), `B` (experiência/biográfica), `O` (opinião), `S` (observação/resumo; geralmente gerado)
- Entidades: `@Peter`, `@warelay`, etc (slugs mapeiam para `bank/entities/*.md`)
- Confiança de opinião: `O(c=0.0..1.0)` opcional

Se você não quer que os autores pensem nisso: a tarefa de reflexão pode inferir esses tópicos do restante do log, mas ter uma seção `## Reter` explícita é a “alavanca de qualidade” mais fácil.

### Recordar (Recall): consultas sobre o índice derivado

A recuperação deve suportar:

- **lexical**: “encontre termos exatos / nomes / comandos” (FTS5)
- **entidade**: “me fale sobre X” (páginas de entidades + fatos vinculados a entidades)
- **temporal**: “o que aconteceu por volta de 27 de Nov” / “desde a semana passada”
- **opinião**: “o que o Peter prefere?” (com confiança + evidência)

O formato de retorno deve ser amigável ao agente e citar fontes:

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (dia da fonte, ou intervalo de tempo extraído, se presente)
- `entities` (`["Peter","warelay"]`)
- `content` (o fato narrativo)
- `source` (`memory/2025-11-27.md#L12` etc)

### Refletir: produzir páginas estáveis + atualizar crenças

A reflexão é uma tarefa agendada (diariamente ou via `ultrathink` de heartbeat) que:

- atualiza `bank/entities/*.md` a partir de fatos recentes (resumos de entidades)
- atualiza a confiança em `bank/opinions.md` com base em reforço/contradição
- opcionalmente propõe edições em `memory.md` (fatos duráveis “estilo core”)

Evolução de opinião (simples, explicável):

- cada opinião tem:
  - declaração
  - confiança `c ∈ [0,1]`
  - última_atualização
  - links de evidência (IDs de fatos de suporte + contradição)
- quando novos fatos chegam:
  - encontrar opiniões candidatas por sobreposição de entidade + similaridade (FTS primeiro, embeddings depois)
  - atualizar a confiança por pequenos deltas; grandes saltos exigem forte contradição + evidência repetida

## Integração com CLI: independente vs integração profunda

Recomendação: **integração profunda no ZERO**, mas mantendo uma biblioteca core separável.

### Por que integrar no ZERO?

- O ZERO já conhece:
  - o caminho do espaço de trabalho (`agents.defaults.workspace`)
  - o modelo de sessão + heartbeats
  - os padrões de log + resolução de problemas
- Você quer que o próprio agente chame as ferramentas:
  - `zero memory recall "…" --k 25 --since 30d`
  - `zero memory reflect --since 7d`

### Por que ainda separar uma biblioteca?

- manter a lógica de memória testável sem gateway/runtime
- reutilizar de outros contextos (scripts locais, futuro app desktop, etc.)

Formato:
As ferramentas de memória destinam-se a ser uma pequena camada de CLI + biblioteca, mas isso é apenas exploratório.

## “S-Collide” / SuCo: quando usar (pesquisa)

Se “S-Collide” refere-se a **SuCo (Subspace Collision)**: é uma abordagem de recuperação ANN que visa fortes trocas de precisão/latência usando colisões aprendidas/estruturadas em subespaços (artigo: arXiv 2411.14754, 2024).

Visão pragmática para `~/zero`:

- **não comece** com SuCo.
- comece com SQLite FTS + (opcional) embeddings simples; você obterá a maioria dos ganhos de UX imediatamente.
- considere soluções da classe SuCo/HNSW/ScaNN apenas quando:
  - o corpus for grande (dezenas/centenas de milhares de trechos)
  - a busca de embeddings por força bruta se tornar muito lenta
  - a qualidade da recuperação for significativamente limitada pela busca lexical

Alternativas amigáveis ao offline (em ordem crescente de complexidade):

- SQLite FTS5 + filtros de metadados (zero ML)
- Embeddings + força bruta (funciona surpreendentemente bem se a contagem de trechos for baixa)
- Índice HNSW (comum, robusto; exige binding de biblioteca)
- SuCo (nível de pesquisa; atraente se houver uma implementação sólida que você possa embutir)

Questão em aberto:

- qual é o **melhor** modelo de embedding offline para “memória de assistente pessoal” em suas máquinas (laptop + desktop)?
  - se você já tem o Ollama: use embeddings com um modelo local; caso contrário, forneça um modelo de embedding pequeno na toolchain.

## Menor piloto útil

Se você quer uma versão mínima e ainda útil:

- Adicione páginas de entidades em `bank/` e uma seção `## Reter` nos logs diários.
- Use SQLite FTS para recuperação com citações (caminho + números de linha).
- Adicione embeddings apenas se a qualidade da recuperação ou a escala exigirem.

## Referências

- Conceitos Letta / MemGPT: “core memory blocks” + “archival memory” + memória que se auto-edita via ferramentas.
- Hindsight Technical Report: “retain / recall / reflect”, memória de quatro redes, extração de fatos narrativos, evolução da confiança de opinião.
- SuCo: arXiv 2411.14754 (2024): Recuperação de vizinho mais próximo aproximado por “Subspace Collision”.
