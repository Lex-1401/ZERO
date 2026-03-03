---
summary: "Janela de contexto + compactação: como o ZERO mantém as sessões dentro dos limites do modelo"
---

# Janela de Contexto e Compactação

Cada modelo possui uma **janela de contexto** (máximo de tokens que ele pode ver). Conversas de longa duração acumulam mensagens e resultados de ferramentas; quando a janela fica apertada, o ZERO **compacta** o histórico mais antigo para permanecer dentro dos limites.

## O que é compactação

A compactação **resume a conversa mais antiga** em uma entrada de resumo compacta e mantém as mensagens recentes intactas. O resumo é armazenado no histórico da sessão, de modo que as requisições futuras usem:

- O resumo da compactação
- Mensagens recentes após o ponto de compactação

A compactação **persiste** no histórico JSONL da sessão.

## Configuração

Veja [Configuração e modos de compactação](/concepts/compaction) para as definições de `agents.defaults.compaction`. (Nota: no momento, o link aponta para o próprio documento ou uma seção de referência; verifique a configuração do gateway para os parâmetros reais).

## Auto-compactação (ligada por padrão)

Quando uma sessão se aproxima ou excede a janela de contexto do modelo, o ZERO aciona a auto-compactação e pode tentar novamente a requisição original usando o contexto compactado.

Você verá:

- `🧹 Auto-compaction complete` no modo detalhado (verbose)
- O comando `/status` mostrando `🧹 Compactions: <contagem>`

Antes da compactação, o ZERO pode executar um turno de **limpeza de memória silenciosa** para armazenar notas duráveis no disco. Veja [Memória](/concepts/memory) para detalhes e configuração.

## Compactação Manual

Use `/compact` (opcionalmente com instruções) para forçar uma etapa de compactação:

```text
/compact Concentre-se nas decisões e questões em aberto
```

## Origem da Janela de Contexto

A janela de contexto é específica do modelo. O ZERO usa a definição do modelo a partir do catálogo do provedor configurado para determinar os limites.

## Compactação vs. Poda (Pruning)

- **Compactação**: resume e **persiste** no JSONL.
- **Poda de sessão**: corta apenas **resultados de ferramentas** antigos, **em memória**, por requisição.

Veja [/concepts/session-pruning](/concepts/session-pruning) para detalhes sobre a poda.

## Dicas

- Use `/compact` quando as sessões parecerem obsoletas ou o contexto estiver inchado.
- Saídas de ferramentas grandes já são truncadas; a poda pode reduzir ainda mais o acúmulo de resultados de ferramentas.
- Se precisar de um novo começo, `/new` ou `/reset` inicia um novo ID de sessão.
