---
summary: "Contexto: o que o modelo vê, como ele é construído e como inspecioná-lo"
read_when:
  - Você deseja entender o que “contexto” significa no ZERO
  - Você está depurando por que o modelo “sabe” algo (ou esqueceu)
  - Você deseja reduzir a sobrecarga de contexto (/context, /status, /compact)
---

# Contexto

“Contexto” é **tudo o que o ZERO envia para o modelo para uma execução**. Ele é limitado pela **janela de contexto** do modelo (limite de tokens).

Modelo mental para iniciantes:

- **Prompt do sistema** (construído pelo ZERO): regras, ferramentas, lista de habilidades, data/hora e arquivos injetados do espaço de trabalho.
- **Histórico da conversa**: suas mensagens + as mensagens do assistente para esta sessão.
- **Chamadas/resultados de ferramentas + anexos**: saída de comandos, leitura de arquivos, imagens/áudio, etc.

Contexto _não é a mesma coisa_ que “memória”: a memória pode ser armazenada no disco e recarregada depois; o contexto é o que está dentro da janela atual do modelo.

## Início rápido (inspecionar contexto)

- `/status` → visão rápida de “quão cheia está minha janela?” + configurações da sessão.
- `/context list` → o que foi injetado + tamanhos aproximados (por arquivo + totais).
- `/context detail` → detalhamento mais profundo: tamanhos de esquemas por arquivo, por ferramenta, por habilidade e tamanho do prompt do sistema.
- `/usage tokens` → anexa um rodapé de uso por resposta em respostas normais.
- `/compact` → resume o histórico antigo em uma entrada compacta para liberar espaço na janela.

Veja também: [Comandos de barra](/tools/slash-commands), [Uso de tokens e custos](/token-use), [Compactação](/concepts/compaction).

## Exemplo de saída (Output)

Os valores variam de acordo com o modelo, provedor, política de ferramentas e o que está no seu espaço de trabalho.

### `/context list`

```text
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 20.000 chars
Sandbox: mode=non-main sandboxed=false
System prompt (run): 38.412 chars (~9.603 tok) (Project Context 23.901 chars (~5.976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1.742 chars (~436 tok) | injected 1.742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- TOOLS.md: TRUNCATED | raw 54.210 chars (~13.553 tok) | injected 20.962 chars (~5.241 tok)
- IDENTITY.md: OK | raw 211 chars (~53 tok) | injected 211 chars (~53 tok)
- USER.md: OK | raw 388 chars (~97 tok) | injected 388 chars (~97 tok)
- HEARTBEAT.md: MISSING | raw 0 | injected 0
- BOOTSTRAP.md: OK | raw 0 chars (~0 tok) | injected 0 chars (~0 tok)

Skills list (system prompt text): 2.184 chars (~546 tok) (12 skills)
Tools: read, edit, write, exec, process, browser, message, sessions_send, …
Tool list (system prompt text): 1.032 chars (~258 tok)
Tool schemas (JSON): 31.988 chars (~7.997 tok) (conta para o contexto; não mostrado como texto)
Tools: (mesmas de cima)

Session tokens (cached): 14.250 total / ctx=32.000
```

### `/context detail`

```text
🧠 Context breakdown (detailed)
…
Top skills (prompt entry size):
- frontend-design: 412 chars (~103 tok)
- oracle: 401 chars (~101 tok)
… (+10 more skills)

Top tools (schema size):
- browser: 9.812 chars (~2.453 tok)
- exec: 6.240 chars (~1.560 tok)
… (+N more tools)
```

## O que conta para a janela de contexto

Tudo o que o modelo recebe conta, incluindo:

- Prompt do sistema (todas as seções).
- Histórico da conversa.
- Chamadas de ferramentas + resultados de ferramentas.
- Anexos/transcrições (imagens/áudio/arquivos).
- Resumos de compactação e artefatos de poda.
- “Wrappers” de provedores ou cabeçalhos ocultos (não visíveis, mas contados).

## Como o ZERO constrói o prompt do sistema

O prompt do sistema é **propriedade do ZERO** e reconstruído a cada execução. Ele inclui:

- Lista de ferramentas + descrições curtas.
- Lista de habilidades (apenas metadados; veja abaixo).
- Localização do espaço de trabalho.
- Hora (UTC + hora do usuário convertida, se configurada).
- Metadados de tempo de execução (host/SO/modelo/pensamento).
- Arquivos de inicialização injetados do espaço de trabalho sob o **Contexto do Projeto**.

Detalhamento completo: [Prompt do Sistema](/concepts/system-prompt).

## Arquivos injetados do espaço de trabalho (Contexto do Projeto)

Por padrão, o ZERO injeta um conjunto fixo de arquivos do espaço de trabalho (se presentes):

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (apenas na primeira execução)

Arquivos grandes são truncados por arquivo usando `agents.defaults.bootstrapMaxChars` (padrão `20000` caracteres). O comando `/context` mostra os tamanhos **brutos vs injetados** e se houve truncamento.

## Habilidades: o que é injetado vs carregado sob demanda

O prompt do sistema inclui uma **lista de habilidades** compacta (nome + descrição + localização). Esta lista tem uma sobrecarga real. As instruções das habilidades _não_ são incluídas por padrão. Espera-se que o modelo use `read` no arquivo `SKILL.md` da habilidade **apenas quando necessário**.

## Ferramentas: existem dois custos

As ferramentas afetam o contexto de duas maneiras:

1. **Texto da lista de ferramentas** no prompt do sistema (o que você vê como “Tooling”).
2. **Esquemas de ferramentas** (JSON). Eles são enviados para o modelo para que ele possa chamar as ferramentas. Eles contam para o contexto, mesmo que você não os veja como texto simples.

O comando `/context detail` detalha os maiores esquemas de ferramentas para que você possa ver o que domina.

## Comandos, diretivas e “atalhos inline”

Os comandos de barra são tratados pelo Gateway. Existem alguns comportamentos diferentes:

- **Comandos avulsos**: uma mensagem que é apenas `/...` roda como um comando.
- **Diretivas**: `/think`, `/verbose`, `/reasoning`, `/elevated`, `/model`, `/queue` são removidas antes que o modelo veja a mensagem.
  - Mensagens apenas com diretivas persistem as configurações de sessão.
  - Diretivas inline em uma mensagem normal agem como dicas por mensagem.
- **Atalhos inline** (apenas remetentes permitidos): certos tokens `/...` dentro de uma mensagem normal podem rodar imediatamente (exemplo: “olá /status”) e são removidos antes que o modelo veja o texto restante.

Detalhes: [Comandos de barra](/tools/slash-commands).

## Sessões, compactação e poda (o que persiste)

O que persiste entre as mensagens depende do mecanismo:

- **O histórico normal** persiste na transcrição da sessão até ser compactado/podado por política.
- **A compactação** persiste um resumo na transcrição e mantém as mensagens recentes intactas.
- **A poda (pruning)** remove resultados de ferramentas antigos do prompt _em memória_ para uma execução, mas não reescreve a transcrição.

Documentação: [Sessão](/concepts/session), [Compactação](/concepts/compaction), [Poda de sessão](/concepts/session-pruning).

## O que o comando `/context` realmente relata

O `/context` prefere o relatório de prompt do sistema mais recente **construído para uma execução**, quando disponível:

- `System prompt (run)` = capturado da última execução embutida (capaz de usar ferramentas) e persistido no armazenamento da sessão.
- `System prompt (estimate)` = computado na hora quando não existe relatório de execução (ou quando roda via um backend CLI que não gera o relatório).

De qualquer forma, ele relata tamanhos e os maiores contribuintes; ele **não** despeja o prompt do sistema completo ou os esquemas de ferramentas.
