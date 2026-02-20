---
summary: "Runtime do agente (p-mono embutido), contrato do espaço de trabalho e inicialização da sessão"
read_when:
  - Alterando o runtime do agente, a inicialização do espaço de trabalho ou o comportamento da sessão
---
# Runtime do Agente ∅

O ZERO executa um único runtime de agente embutido derivado do **p-mono**.

## Espaço de Trabalho (Obrigatório)

O ZERO usa um único diretório de espaço de trabalho do agente (`agents.defaults.workspace`) como o **único** diretório de trabalho (`cwd`) do agente para ferramentas e contexto.

Recomendado: use `zero setup` para criar `~/.zero/zero.json` se estiver ausente e inicializar os arquivos do espaço de trabalho.

Guia completo de layout do espaço de trabalho + backup: [Espaço de trabalho do agente](/concepts/agent-workspace)

Se `agents.defaults.sandbox` estiver habilitado, sessões não-principais podem sobrescrever isso com espaços de trabalho por sessão em `agents.defaults.sandbox.workspaceRoot` (veja [Configuração do Gateway](/gateway/configuration)).

## Arquivos de inicialização (Injetados)

Dentro de `agents.defaults.workspace`, o ZERO espera estes arquivos editáveis pelo usuário:

- `AGENTS.md` — instruções de operação + “memória”
- `SOUL.md` — persona, limites, tom
- `TOOLS.md` — notas de ferramentas mantidas pelo usuário (ex: `imsg`, `sag`, convenções)
- `BOOTSTRAP.md` — ritual de primeira execução única (deletado após a conclusão)
- `IDENTITY.md` — nome/vibe/emoji do agente
- `USER.md` — perfil do usuário + tratamento preferencial

No primeiro turno de uma nova sessão, o ZERO injeta o conteúdo desses arquivos diretamente no contexto do agente.

Arquivos em branco são ignorados. Arquivos grandes são aparados e truncados com um marcador para que os prompts permaneçam enxutos (leia o arquivo para o conteúdo completo).

Se um arquivo estiver ausente, o ZERO injeta uma única linha de marcador de “arquivo ausente” (e o `zero setup` criará um modelo padrão seguro).

O `BOOTSTRAP.md` é criado apenas para um **espaço de trabalho novo** (sem outros arquivos de inicialização presentes). Se você deletá-lo após completar o ritual, ele não deve ser recriado em reinicializações posteriores.

Para desativar inteiramente a criação de arquivos de inicialização (para espaços de trabalho pré-semeados), defina:

```json5
{ agent: { skipBootstrap: true } }
```

## Ferramentas integradas

As ferramentas principais (read/exec/edit/write e ferramentas de sistema relacionadas) estão sempre disponíveis, sujeitas à política de ferramentas. `apply_patch` é opcional e controlado por `tools.exec.applyPatch`. O arquivo `TOOLS.md` **não** controla quais ferramentas existem; é uma orientação sobre como *você* quer que elas sejam usadas.

## Habilidades (Skills)

O ZERO carrega habilidades de três locais (o espaço de trabalho vence em caso de conflito de nomes):

- Empacotadas (enviadas com a instalação)
- Gerenciadas/locais: `~/.zero/skills`
- Espaço de Trabalho: `<workspace>/skills`

As habilidades podem ser restritas por configuração/env (veja `skills` em [Configuração do Gateway](/gateway/configuration)).

## Integração p-mono

O ZERO reutiliza partes da base de código p-mono (modelos/ferramentas), mas **o gerenciamento de sessão, a descoberta e a fiação de ferramentas são de propriedade do ZERO**.

- Nenhum runtime de agente p-coding.
- Nenhuma configuração em `~/.pi/agent` ou `<workspace>/.pi` é consultada.

## Sessões

As transcrições das sessões são armazenadas como JSONL em:

- `~/.zero/agents/<agentId>/sessions/<SessionId>.jsonl`

O ID da sessão é estável e escolhido pelo ZERO.
As pastas de sessão legadas do Pi/Tau **não** são lidas.

## Direcionamento durante o streaming (Steering)

Quando o modo de fila é `steer`, as mensagens recebidas são injetadas na execução atual. A fila é verificada **após cada chamada de ferramenta**; se houver uma mensagem enfileirada, as chamadas de ferramenta restantes da mensagem atual do assistente são ignoradas (resultados da ferramenta de erro com "Pulado devido a mensagem de usuário enfileirada."), então a mensagem do usuário enfileirada é injetada antes da próxima resposta do assistente.

Quando o modo de fila é `followup` ou `collect`, as mensagens recebidas são retidas até que o turno atual termine, então um novo turno do agente começa com os payloads enfileirados. Veja [Fila](/concepts/queue) para o comportamento de modo + debounce/limite.

O streaming de blocos (Block streaming) envia blocos de assistente concluídos assim que terminam; está **desligado por padrão** (`agents.defaults.blockStreamingDefault: "off"`). Ajuste o limite via `agents.defaults.blockStreamingBreak` (`text_end` vs `message_end`; padrão text_end). Controle o agrupamento de blocos soft com `agents.defaults.blockStreamingChunk` (padrão de 800–1200 caracteres; prefere quebras de parágrafo, depois novas linhas; sentenças por último). Combine trechos transmitidos com `agents.defaults.blockStreamingCoalesce` para reduzir o spam de uma única linha. Canais não-Telegram exigem `*.blockStreaming: true` explícito para habilitar respostas em bloco. Resumos detalhados das ferramentas são emitidos no início da ferramenta (sem debounce); a UI de Controle transmite a saída da ferramenta via eventos do agente quando disponível.
Mais detalhes: [Streaming + chunking](/concepts/streaming).

## Referências de modelo

As referências de modelo na configuração (por exemplo, `agents.defaults.model` e `agents.defaults.models`) são analisadas dividindo-se na **primeira** barra `/`.

- Use `provedor/modelo` ao configurar modelos.
- Se o ID do modelo em si contiver `/` (estilo OpenRouter), inclua o prefixo do provedor (exemplo: `openrouter/moonshotai/kimi-k2`).
- Se você omitir o provedor, o ZERO trata a entrada como um alias ou um modelo para o **provedor padrão** (só funciona quando não há `/` no ID do modelo).

## Configuração (mínima)

No mínimo, defina:

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (fortemente recomendado)

---

*Próximo: [Chats de Grupo](/concepts/group-messages)* ∅
