---
summary: "Execuções de CLI `zero agent` diretas (com entrega opcional)"
read_when:
  - Adicionando ou modificando o ponto de entrada da CLI do agente
---

# `zero agent` (execuções diretas de agente)

`zero agent` executa um único turno de agente sem precisar de uma mensagem de chat de entrada.
Por padrão, ele passa **pelo Gateway**; adicione `--local` para forçar o runtime embutido
na máquina atual.

## Comportamento

- Obrigatório: `--message <texto>`
- Seleção de sessão:
  - `--to <dest>` deriva a chave da sessão (alvos de grupo/canal preservam isolamento; chats diretos colapsam para `main`), **ou**
  - `--session-id <id>` reutiliza uma sessão existente por id, **ou**
  - `--agent <id>` visa um agente configurado diretamente (usa a chave de sessão `main` desse agente)
- Executa o mesmo runtime de agente embutido das respostas de entrada normais.
- Flags de Thinking/verbose persistem no armazenamento da sessão.
- Saída:
  - padrão: imprime o texto da resposta (mais linhas `MEDIA:<url>`)
  - `--json`: imprime payload estruturado + metadados
- Entrega opcional de volta a um canal com `--deliver` + `--channel` (formatos de alvo coincidem com `zero message --target`).
- Use `--reply-channel`/`--reply-to`/`--reply-account` para sobrescrever a entrega sem mudar a sessão.

Se o Gateway estiver inacessível, a CLI **cai (fallback)** para a execução local embutida.

## Exemplos

```bash
zero agent --to +15555550123 --message "status update"
zero agent --agent ops --message "Summarize logs"
zero agent --session-id 1234 --message "Summarize inbox" --thinking medium
zero agent --to +15555550123 --message "Trace logs" --verbose on --json
zero agent --to +15555550123 --message "Summon reply" --deliver
zero agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## Flags

- `--local`: executa localmente (requer chaves de API do provedor de modelos no seu shell)
- `--deliver`: envia a resposta para o canal escolhido
- `--channel`: canal de entrega (`whatsapp|telegram|discord|googlechat|slack|signal|imessage`, padrão: `whatsapp`)
- `--reply-to`: sobrescreve o alvo de entrega
- `--reply-channel`: sobrescreve o canal de entrega
- `--reply-account`: sobrescreve o id da conta de entrega
- `--thinking <off|minimal|low|medium|high|xhigh>`: persiste o nível de pensamento (modelos GPT-5.2 + Codex apenas)
- `--verbose <on|full|off>`: persiste o nível verboso
- `--timeout <seconds>`: sobrescreve o timeout do agente
- `--json`: saída JSON estruturada
