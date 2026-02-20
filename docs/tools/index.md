---
summary: "Superfície de ferramenta do agente para ZERO (browser, canvas, nodes, message, cron) substituindo skills `zero-*` legadas"
read_when:
  - Adicionando ou modificando ferramentas de agente
  - Aposentando ou alterando skills `zero-*`
---

# Ferramentas (ZERO)

O ZERO expõe **ferramentas de agente de primeira classe** para navegador, canvas, nós e cron.
Elas substituem as antigas skills `zero-*`: as ferramentas são tipadas, sem uso de shell (shelling),
e o agente deve depender delas diretamente.

## Desativando ferramentas

Você pode permitir/negar ferramentas globalmente via `tools.allow` / `tools.deny` em `zero.json`
(negar vence). Isso impede que ferramentas não permitidas sejam enviadas aos provedores de modelo.

```json5
{
  tools: { deny: ["browser"] }
}
```

Notas:

- A correspondência não diferencia maiúsculas de minúsculas.
- Coringas (wildcards) `*` são suportados (`"*"` significa todas as ferramentas).
- Se `tools.allow` referenciar apenas nomes de ferramentas desconhecidas ou não carregadas de plugins, o ZERO registra um aviso e ignora a lista de permissão para que as ferramentas principais permaneçam disponíveis.

## Perfis de ferramentas (lista de permissão base)

`tools.profile` define uma **lista de permissão base de ferramentas** antes de `tools.allow`/`tools.deny`.
Substituição por agente: `agents.list[].tools.profile`.

Perfis:

- `minimal`: apenas `session_status`
- `coding`: `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image`
- `messaging`: `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`
- `full`: sem restrição (o mesmo que não definido)

Exemplo (apenas mensagens por padrão, permite ferramentas Slack + Discord também):

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"]
  }
}
```

Exemplo (perfil de codificação, mas nega exec/process em todos os lugares):

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"]
  }
}
```

Exemplo (perfil de codificação global, agente de suporte apenas para mensagens):

```json5
{
  tools: { profile: "coding" },
  agents: {
    list: [
      {
        id: "support",
        tools: { profile: "messaging", allow: ["slack"] }
      }
    ]
  }
}
```

## Política de ferramenta específica do provedor

Use `tools.byProvider` para **restringir ainda mais** ferramentas para provedores específicos
(ou um único `provider/model`) sem alterar seus padrões globais.
Substituição por agente: `agents.list[].tools.byProvider`.

Isso é aplicado **após** o perfil base de ferramentas e **antes** das listas de permitir/negar,
então só pode estreitar o conjunto de ferramentas.
Chaves de provedor aceitam `provider` (ex: `google-cloud-auth`) ou
`provider/model` (ex: `openai/gpt-5.2`).

Exemplo (mantém perfil de codificação global, mas ferramentas mínimas para Google Google Cloud Auth):

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-cloud-auth": { profile: "minimal" }
    }
  }
}
```

Exemplo (lista de permissão específica por provedor/modelo para um endpoint instável):

```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] }
    }
  }
}
```

Exemplo (substituição específica de agente para um único provedor):

```json5
{
  agents: {
    list: [
      {
        id: "support",
        tools: {
          byProvider: {
            "google-cloud-auth": { allow: ["message", "sessions_list"] }
          }
        }
      }
    ]
  }
}
```

## Grupos de ferramentas (atalhos)

Políticas de ferramentas (global, agente, sandbox) suportam entradas `group:*` que expandem para múltiplas ferramentas.
Use-as em `tools.allow` / `tools.deny`.

Grupos disponíveis:

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:zero`: todas as ferramentas integradas do ZERO (exclui plugins de provedor)

Exemplo (permite apenas ferramentas de arquivo + navegador):

```json5
{
  tools: {
    allow: ["group:fs", "browser"]
  }
}
```

## Plugins + ferramentas

Plugins podem registrar **ferramentas adicionais** (e comandos CLI) além do conjunto principal.
Veja [Plugins](/plugin) para instalação + configuração, e [Habilidades](/tools/skills) para como
a orientação de uso de ferramenta é injetada nos prompts. Alguns plugins enviam suas próprias habilidades
junto com ferramentas (por exemplo, o plugin voice-call).

Ferramentas de plugin opcionais:

- [VOID](/tools/void): runtime de fluxo de trabalho tipado com aprovações retomáveis (requer a CLI VOID no host do gateway).
- [LLM Task](/tools/llm-task): etapa LLM somente JSON para saída de fluxo de trabalho estruturada (validação de esquema opcional).

## Inventário de ferramentas

### `apply_patch`

Aplica patches estruturados em um ou mais arquivos. Use para edições multi-trecho (multi-hunk).
Experimental: ative via `tools.exec.applyPatch.enabled` (apenas modelos OpenAI).

### `exec`

Executa comandos shell no espaço de trabalho.

Parâmetros principais:

- `command` (obrigatório)
- `yieldMs` (auto-background após timeout, padrão 10000)
- `background` (background imediato)
- `timeout` (segundos; mata o processo se excedido, padrão 1800)
- `elevated` (bool; executa no host se o modo elevado estiver habilitado/permitido; só altera o comportamento quando o agente está em sandbox)
- `host` (`sandbox | gateway | node`)
- `security` (`deny | allowlist | full`)
- `ask` (`off | on-miss | always`)
- `node` (id/nome do nó para `host=node`)
- Precisa de um TTY real? Defina `pty: true`.

Notas:

- Retorna `status: "running"` com um `sessionId` quando em background.
- Use `process` para consultar/registrar/escrever/matar/limpar sessões em background.
- Se `process` for proibido, `exec` roda de forma síncrona e ignora `yieldMs`/`background`.
- `elevated` é controlado por `tools.elevated` mais qualquer substituição `agents.list[].tools.elevated` (ambos devem permitir) e é um alias para `host=gateway` + `security=full`.
- `elevated` só altera o comportamento quando o agente está em sandbox (caso contrário, é uma operação nula).
- `host=node` pode visar um app companheiro macOS ou um host de nó headless (`zero node run`).
- aprovações e listas de permissão de gateway/nó: [Aprovações de Exec](/tools/exec-approvals).

### `process`

Gerencia sessões de execução em background.

Ações principais:

- `list`, `poll`, `log`, `write`, `kill`, `clear`, `remove`

Notas:

- `poll` retorna novas saídas e status de saída quando completo.
- `log` suporta `offset`/`limit` baseados em linha (omita `offset` para pegar as últimas N linhas).
- `process` é escopado por agente; sessões de outros agentes não são visíveis.

### `web_search`

Pesquisa na web usando a API Brave Search.

Parâmetros principais:

- `query` (obrigatório)
- `count` (1–10; padrão de `tools.web.search.maxResults`)

Notas:

- Requer uma chave de API Brave (recomendado: `zero configure --section web`, ou defina `BRAVE_API_KEY`).
- Ative via `tools.web.search.enabled`.
- Respostas são armazenadas em cache (padrão 15 min).
- Veja [Ferramentas Web](/tools/web) para configuração.

### `web_fetch`

Busca e extrai conteúdo legível de uma URL (HTML → markdown/texto).

Parâmetros principais:

- `url` (obrigatório)
- `extractMode` (`markdown` | `text`)
- `maxChars` (trunca páginas longas)

Notas:

- Ative via `tools.web.fetch.enabled`.
- Respostas são armazenadas em cache (padrão 15 min).
- Para sites pesados em JS, prefira a ferramenta de navegador.
- Veja [Ferramentas Web](/tools/web) para configuração.
- Veja [Firecrawl](/tools/firecrawl) para o fallback anti-bot opcional.

### `browser`

Controla o navegador dedicado do zero.

Ações principais:

- `status`, `start`, `stop`, `tabs`, `open`, `focus`, `close`
- `snapshot` (aria/ai)
- `screenshot` (retorna bloco de imagem + `MEDIA:<path>`)
- `act` (ações de UI: click/type/press/hover/drag/select/fill/resize/wait/evaluate)
- `navigate`, `console`, `pdf`, `upload`, `dialog`

Gerenciamento de perfil:

- `profiles` — lista todos os perfis de navegador com status
- `create-profile` — cria novo perfil com porta alocada automaticamente (ou `cdpUrl`)
- `delete-profile` — para o navegador, exclui dados de usuário, remove da configuração (apenas local)
- `reset-profile` — mata processo órfão na porta do perfil (apenas local)

Parâmetros comuns:

- `controlUrl` (padrões da configuração)
- `profile` (opcional; padroniza para `browser.defaultProfile`)

Notas:

- Requer `browser.enabled=true` (padrão é `true`; defina `false` para desativar).
- Usa `browser.controlUrl` a menos que `controlUrl` seja passado explicitamente.
- Todas as ações aceitam parâmetro opcional `profile` para suporte a múltiplas instâncias.
- Quando `profile` é omitido, usa `browser.defaultProfile` (padroniza para "chrome").
- Nomes de perfil: alfanuméricos minúsculos + hifens apenas (máx 64 caracteres).
- Faixa de portas: 18800-18899 (~100 perfis máx).
- Perfis remotos são anexar-apenas (sem start/stop/reset).
- `snapshot` padroniza para `ai` quando Playwright está instalado; use `aria` para a árvore de acessibilidade.
- `snapshot` também suporta opções de snapshot de função (`interactive`, `compact`, `depth`, `selector`) que retornam refs como `e12`.
- `act` requer `ref` do `snapshot` (numérico `12` de snapshots AI, ou `e12` de snapshots de função); use `evaluate` para necessidades raras de seletor CSS.
- Evite `act` → `wait` por padrão; use apenas em casos excepcionais (sem estado de UI confiável para esperar).
- `upload` pode opcionalmente passar um `ref` para auto-clicar após armar.
- `upload` também suporta `inputRef` (ref aria) ou `element` (seletor CSS) para definir `<input type="file">` diretamente.

### `canvas`

Conduz o nó Canvas (present, eval, snapshot, A2UI).

Ações principais:

- `present`, `hide`, `navigate`, `eval`
- `snapshot` (retorna bloco de imagem + `MEDIA:<path>`)
- `a2ui_push`, `a2ui_reset`

Notas:

- Usa `node.invoke` do gateway por baixo dos panos.
- Se nenhum `node` for fornecido, a ferramenta escolhe um padrão (único nó conectado ou nó mac local).
- A2UI é v0.8 apenas (sem `createSurface`); a CLI rejeita JSONL v0.9 com erros de linha.
- Teste rápido: `zero nodes canvas a2ui push --node <id> --text "Hello from A2UI"`.

### `nodes`

Descobre e visa nós pareados; envia notificações; captura câmera/tela.

Ações principais:

- `status`, `describe`
- `pending`, `approve`, `reject` (pareamento)
- `notify` (macOS `system.notify`)
- `run` (macOS `system.run`)
- `camera_snap`, `camera_clip`, `screen_record`
- `location_get`

Notas:

- Comandos de câmera/tela requerem que o app de nó esteja em primeiro plano.
- Imagens retornam blocos de imagem + `MEDIA:<path>`.
- Vídeos retornam `FILE:<path>` (mp4).
- Localização retorna uma carga útil JSON (latitude/longitude/precisão/timestamp).
- `run` params: array argv `command`; opcionais `cwd`, `env` (`KEY=VAL`), `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording`.

Exemplo (`run`):

```json
{
  "action": "run",
  "node": "office-mac",
  "command": ["echo", "Hello"],
  "env": ["FOO=bar"],
  "commandTimeoutMs": 12000,
  "invokeTimeoutMs": 45000,
  "needsScreenRecording": false
}
```

### `image`

Analisa uma imagem com o modelo de imagem configurado.

Parâmetros principais:

- `image` (caminho ou URL obrigatório)
- `prompt` (opcional; padroniza para "Describe the image.")
- `model` (substituição opcional)
- `maxBytesMb` (limite de tamanho opcional)

Notas:

- Apenas disponível quando `agents.defaults.imageModel` está configurado (primário ou fallbacks), ou quando um modelo de imagem implícito pode ser inferido do seu modelo padrão + autenticação configurada (pareamento de melhor esforço).
- Usa o modelo de imagem diretamente (independente do modelo de chat principal).

### `message`

Envia mensagens e ações de canal através de Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams.

Ações principais:

- `send` (texto + mídia opcional; MS Teams também suporta `card` para Adaptive Cards)
- `poll` (enquetes WhatsApp/Discord/MS Teams)
- `react` / `reactions` / `read` / `edit` / `delete`
- `pin` / `unpin` / `list-pins`
- `permissions`
- `thread-create` / `thread-list` / `thread-reply`
- `search`
- `sticker`
- `member-info` / `role-info`
- `emoji-list` / `emoji-upload` / `sticker-upload`
- `role-add` / `role-remove`
- `channel-info` / `channel-list`
- `voice-status`
- `event-list` / `event-create`
- `timeout` / `kick` / `ban`

Notas:

- `send` roteia WhatsApp via Gateway; outros canais vão direto.
- `poll` usa o Gateway para WhatsApp e MS Teams; enquetes do Discord vão direto.
- Quando uma chamada de ferramenta de mensagem é vinculada a uma sessão de chat ativa, os envios são restritos ao alvo dessa sessão para evitar vazamentos entre contextos.

### `cron`

Gerencia tarefas cron e despertares (wakeups) do Gateway.

Ações principais:

- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake` (enfileira evento de sistema + heartbeat imediato opcional)

Notas:

- `add` espera um objeto de tarefa cron completo (mesmo esquema que `cron.add` RPC).
- `update` usa `{ id, patch }`.

### `gateway`

Reinicia ou aplica atualizações ao processo Gateway em execução (in-place).

Ações principais:

- `restart` (autoriza + envia `SIGUSR1` para reinício no processo; `zero gateway` reinicia in-place)
- `config.get` / `config.schema`
- `config.apply` (valida + escreve config + reinicia + acorda)
- `config.patch` (mescla atualização parcial + reinicia + acorda)
- `update.run` (executa atualização + reinicia + acorda)

Notas:

- Use `delayMs` (padrão para 2000) para evitar interromper uma resposta em andamento.
- `restart` é desativado por padrão; ative com `commands.restart: true`.

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

Lista sessões, inspeciona histórico de transcrição ou envia para outra sessão.

Parâmetros principais:

- `sessions_list`: `kinds?`, `limit?`, `activeMinutes?`, `messageLimit?` (0 = nenhum)
- `sessions_history`: `sessionKey` (ou `sessionId`), `limit?`, `includeTools?`
- `sessions_send`: `sessionKey` (ou `sessionId`), `message`, `timeoutSeconds?` (0 = disparar-e-esquecer)
- `sessions_spawn`: `task`, `label?`, `agentId?`, `model?`, `runTimeoutSeconds?`, `cleanup?`
- `session_status`: `sessionKey?` (padrão atual; aceita `sessionId`), `model?` (`default` limpa substituição)

Notas:

- `main` é a chave canônica de chat direto; global/desconhecido são ocultos.
- `messageLimit > 0` busca as últimas N mensagens por sessão (mensagens de ferramenta filtradas).
- `sessions_send` espera pela conclusão final quando `timeoutSeconds > 0`.
- Entrega/anúncio acontece após a conclusão e é de melhor esforço; `status: "ok"` confirma que a execução do agente terminou, não que o anúncio foi entregue.
- `sessions_spawn` inicia uma execução de subagente e posta uma resposta de anúncio de volta para o chat solicitante.
- `sessions_spawn` não bloqueia e retorna `status: "accepted"` imediatamente.
- `sessions_send` executa um ping-pong de resposta (responda `REPLY_SKIP` para parar; máx turnos via `session.agentToAgent.maxPingPongTurns`, 0–5).
- Após o ping-pong, o agente alvo executa uma **etapa de anúncio**; responda `ANNOUNCE_SKIP` para suprimir o anúncio.

### `agents_list`

Lista ids de agentes que a sessão atual pode alvejar com `sessions_spawn`.

Notas:

- Resultado é restrito a listas de permissão por agente (`agents.list[].subagents.allowAgents`).
- Quando `["*"]` é configurado, a ferramenta inclui todos os agentes configurados e marca `allowAny: true`.

## Parâmetros (comum)

Ferramentas baseadas no Gateway (`canvas`, `nodes`, `cron`):

- `gatewayUrl` (padrão `ws://127.0.0.1:18789`)
- `gatewayToken` (se autenticação habilitada)
- `timeoutMs`

Ferramenta de navegador:

- `controlUrl` (padrões da configuração)

## Fluxos de agente recomendados

Automação de navegador:

1) `browser` → `status` / `start`
2) `snapshot` (ai ou aria)
3) `act` (click/type/press)
4) `screenshot` se você precisar de confirmação visual

Renderização de Canvas:

1) `canvas` → `present`
2) `a2ui_push` (opcional)
3) `snapshot`

Seleção de nó:

1) `nodes` → `status`
2) `describe` no nó escolhido
3) `notify` / `run` / `camera_snap` / `screen_record`

## Segurança

- Evite `system.run` direto; use `nodes` → `run` apenas com consentimento explícito do usuário.
- Respeite o consentimento do usuário para captura de câmera/tela.
- Use `status/describe` para garantir permissões antes de invocar comandos de mídia.

## Como as ferramentas são apresentadas ao agente

Ferramentas são expostas em dois canais paralelos:

1) **Texto do prompt do sistema**: uma lista legível por humanos + orientação.
2) **Esquema de ferramenta**: as definições de função estruturadas enviadas para a API do modelo.

Isso significa que o agente vê tanto “quais ferramentas existem” quanto “como chamá-las”. Se uma ferramenta
não aparecer no prompt do sistema ou no esquema, o modelo não pode chamá-la.
