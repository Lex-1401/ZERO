---
summary: "Sintaxe de diretiva para /think + /verbose e como afetam o raciocínio do modelo"
read_when:
  - Ajustando parsing ou padrões de diretiva de pensamento (thinking) ou verbosidade (verbose)
---

# Níveis de Pensamento (diretivas /think)

(Thinking Levels)

## O que faz

- Diretiva inline em qualquer corpo de entrada: `/t <level>`, `/think:<level>`, ou `/thinking <level>`.
- Níveis (aliases): `off | minimal | low | medium | high | xhigh` (apenas modelos GPT-5.2 + Codex)
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink” (orçamento máximo)
  - xhigh → “ultrathink+” (apenas modelos GPT-5.2 + Codex)
  - `highest`, `max` mapeiam para `high`.
- Notas do provedor:
  - Z.AI (`zai/*`) suporta apenas pensamento binário (`on`/`off`). Qualquer nível não-`off` é tratado como `on` (mapeado para `low`).

## Ordem de resolução

1. Diretiva inline na mensagem (aplica-se apenas a essa mensagem).
2. Substituição de sessão (definida enviando uma mensagem somente de diretiva).
3. Padrão global (`agents.defaults.thinkingDefault` na configuração).
4. Fallback: low para modelos capazes de raciocínio; off caso contrário.

## Definindo um padrão de sessão

- Envie uma mensagem que seja **apenas** a diretiva (espaço em branco permitido), ex: `/think:medium` ou `/t high`.
- Isso persiste para a sessão atual (por remetente por padrão); limpo por `/think:off` ou redefinição de inatividade da sessão.
- Resposta de confirmação é enviada (`Thinking level set to high.` / `Thinking disabled.`). Se o nível for inválido (ex: `/thinking big`), o comando é rejeitado com uma dica e o estado da sessão permanece inalterado.
- Envie `/think` (ou `/think:`) sem argumento para ver o nível de pensamento atual.

## Aplicação por agente

- **Pi Embutido**: o nível resolvido é passado para o runtime do agente Pi em processo.

## Diretivas Verbose (/verbose ou /v)

- Níveis: `on` (mínimo) | `full` | `off` (padrão).
- Mensagem somente de diretiva alterna verbose da sessão e responde `Verbose logging enabled.` / `Verbose logging disabled.`; níveis inválidos retornam uma dica sem alterar o estado.
- `/verbose off` armazena uma substituição de sessão explícita; limpe-a via UI de Sessões escolhendo `inherit`.
- Diretiva inline afeta apenas aquela mensagem; padrões de sessão/globais aplicam-se caso contrário.
- Envie `/verbose` (ou `/verbose:`) sem argumento para ver o nível de verbose atual.
- Quando verbose está ligado, agentes que emitem resultados de ferramenta estruturados (Pi, outros agentes JSON) enviam cada chamada de ferramenta de volta como sua própria mensagem somente de metadados, prefixada com `<emoji> <tool-name>: <arg>` quando disponível (caminho/comando). Esses resumos de ferramenta são enviados assim que cada ferramenta começa (bolhas separadas), não como deltas de streaming.
- Quando verbose é `full`, saídas de ferramenta também são encaminhadas após a conclusão (bolha separada, truncada para um comprimento seguro). Se você alternar `/verbose on|full|off` enquanto uma execução está em voo, bolhas de ferramenta subsequentes honram a nova configuração.

## Visibilidade de Raciocínio (/reasoning)

- Níveis: `on|off|stream`.
- Mensagem somente de diretiva alterna se blocos de pensamento são mostrados nas respostas.
- Quando ativado, o raciocínio é enviado como uma **mensagem separada** prefixada com `Reasoning:`.
- `stream` (apenas Telegram): transmite raciocínio para a bolha de rascunho do Telegram enquanto a resposta está sendo gerada, depois envia a resposta final sem raciocínio.
- Alias: `/reason`.
- Envie `/reasoning` (ou `/reasoning:`) sem argumento para ver o nível de raciocínio atual.

## Relacionado

- Documentos do modo elevado residem em [Modo elevado](/tools/elevated).

## Heartbeats

- Corpo da sonda heartbeat é o prompt de heartbeat configurado (padrão: `Leia HEARTBEAT.md se existir (contexto workspace). Siga-o estritamente. Não infira ou repita tarefas antigas de chats anteriores. Se nada precisar de atenção, responda HEARTBEAT_OK.`). Diretivas inline em uma mensagem de heartbeat aplicam-se como de costume (mas evite mudar padrões de sessão a partir de heartbeats).
- Entrega de heartbeat padroniza para a carga útil final apenas. Para também enviar a mensagem `Reasoning:` separada (quando disponível), defina `agents.defaults.heartbeat.includeReasoning: true` ou por agente `agents.list[].heartbeat.includeReasoning: true`.

## Web chat UI

- O seletor de thinking do web chat reflete o nível armazenado da sessão a partir do armazenamento/configuração da sessão de entrada quando a página carrega.
- Escolher outro nível aplica-se apenas à próxima mensagem (`thinkingOnce`); após enviar, o seletor volta ao nível armazenado da sessão.
- Para mudar o padrão da sessão, envie uma diretiva `/think:<level>` (como antes); o seletor refletirá isso após o próximo recarregamento.
