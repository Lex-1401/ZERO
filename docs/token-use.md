---
summary: "Como o ZERO constrói o contexto do prompt e relata o uso de tokens e custos"
read_when:
  - Ao explicar o uso de tokens, custos ou janelas de contexto
  - Ao depurar o crescimento do contexto ou o comportamento de compactação
---

# Uso de Tokens e Custos

O ZERO rastreia **tokens**, não caracteres. Os tokens são específicos do modelo, mas a maioria dos modelos estilo OpenAI tem uma média de ~4 caracteres por token para textos em inglês (e um pouco menos para português).

## Como o prompt do sistema é construído

O ZERO monta seu próprio prompt de sistema em cada execução. Ele inclui:

- Lista de ferramentas + descrições curtas.
- Lista de habilidades (apenas metadados; as instruções são carregadas sob demanda com `read`).
- Instruções de auto-atualização.
- Workspace + arquivos de bootstrap (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` quando novo). Arquivos grandes são truncados por `agents.defaults.bootstrapMaxChars` (padrão: 20000).
- Hora (UTC + fuso horário do usuário).
- Tags de resposta + comportamento do batimento cardíaco (heartbeat).
- Metadados de tempo de execução (host/SO/modelo/pensamento).

Veja o detalhamento completo em [Prompt do Sistema](/concepts/system-prompt).

## O que conta na janela de contexto

Tudo o que o modelo recebe conta para o limite de contexto:

- Prompt do sistema (todas as seções listadas acima).
- Histórico da conversa (mensagens do usuário + assistente).
- Chamadas de ferramentas e resultados de ferramentas.
- Anexos/transcrições (imagens, áudio, arquivos).
- Resumos de compactação e artefatos de poda.
- Wrappers do provedor ou cabeçalhos de segurança (não visíveis, mas ainda contados).

Para um detalhamento prático (por arquivo injetado, ferramentas, habilidades e tamanho do prompt do sistema), use `/context list` ou `/context detail`. Veja [Contexto](/concepts/context).

## Como ver o uso atual de tokens

Use estes comandos no chat:

- `/status` → **cartão de status rico em emojis** com o modelo da sessão, uso do contexto, tokens de entrada/saída da última resposta e **custo estimado** (apenas para chaves de API).
- `/usage off|tokens|full` → anexa um **rodapé de uso por resposta** em cada réplica.
  - Persiste por sessão (armazenado como `responseUsage`).
  - Autenticação OAuth **oculta o custo** (exibe apenas tokens).
- `/usage cost` → mostra um resumo de custo local a partir dos logs de sessão do ZERO.

Outras superfícies:

- **TUI/Web TUI:** `/status` + `/usage` são suportados.
- **CLI:** `zero status --usage` e `zero channels list` mostram as janelas de cota do provedor (não os custos por resposta).

## Estimativa de custo (quando exibida)

Os custos são estimados a partir da sua configuração de preços do modelo:

```json
models.providers.<provider>.models[].cost
```

Estes são valores em **USD por 1 milhão de tokens** para `input`, `output`, `cacheRead` e `cacheWrite`. Se os preços estiverem ausentes, o ZERO mostrará apenas os tokens. Tokens via OAuth nunca mostram o custo em dólares.

## Impacto do TTL do Cache e da Poda

O cache de prompt do provedor só se aplica dentro da janela de TTL do cache. O ZERO pode opcionalmente executar a **poda por TTL de cache**: ele poda a sessão assim que o TTL do cache expira e então reseta a janela de cache para que as solicitações subsequentes possam reutilizar o contexto recém-cacheado em vez de recachear todo o histórico. Isso mantém os custos de gravação de cache mais baixos quando uma sessão fica inativa além do TTL.

Configure isso em [Configuração do Gateway](/gateway/configuration) e veja os detalhes do comportamento em [Poda de Sessão](/concepts/session-pruning).

O Heartbeat pode manter o cache **aquecido** durante intervalos de inatividade. Se o TTL do cache do seu modelo for de `1h`, definir o intervalo do heartbeat para um pouco menos (ex: `55m`) pode evitar o recacheamento do prompt completo, reduzindo os custos de gravação no cache.

Para os preços da API Anthropic, as leituras de cache são significativamente mais baratas que os tokens de entrada, enquanto as gravações de cache são cobradas com um multiplicador mais alto. Consulte os preços de cache de prompt da Anthropic para as taxas e multiplicadores de TTL mais recentes:
<https://docs.anthropic.com/docs/build-with-claude/prompt-caching>

### Exemplo: manter cache de 1h aquecido com heartbeat

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-5"
    models:
      "anthropic/claude-opus-4-5":
        params:
          cacheControlTtl: "1h"
    heartbeat:
      every: "55m"
```

## Dicas para reduzir a pressão de tokens

- Use `/compact` para resumir sessões longas.
- Corte saídas de ferramentas grandes em seus fluxos de trabalho.
- Mantenha as descrições das habilidades curtas (a lista de habilidades é injetada no prompt).
- Prefira modelos menores para trabalhos detalhados ou exploratórios.

Veja [Habilidades (Skills)](/tools/skills) para a fórmula exata de overhead da lista de habilidades.
