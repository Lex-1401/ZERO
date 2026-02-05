---
summary: "Slash commands: texto vs nativo, configuração e comandos suportados"
read_when:
  - Usando ou configurando comandos de chat
  - Depurando roteamento de comandos ou permissões
---

# Slash commands

Comandos são manipulados pelo Gateway. A maioria dos comandos deve ser enviada como uma mensagem **independente** que começa com `/`.
O comando de chat bash (somente host) usa `! <cmd>` (com `/bash <cmd>` como um alias).

Existem dois sistemas relacionados:

- **Comandos**: mensagens `/...` independentes.
- **Diretivas**: `/think`, `/verbose`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue`.
  - Diretivas são removidas da mensagem antes que o modelo a veja.
  - Em mensagens de chat normais (não apenas diretivas), elas são tratadas como “dicas inline” e **não** persistem configurações de sessão.
  - Em mensagens somente de diretiva (a mensagem contém apenas diretivas), elas persistem na sessão e respondem com um reconhecimento.

Também existem alguns **atalhos inline** (apenas remetentes na lista de permissão/autorizados): `/help`, `/commands`, `/status`, `/whoami` (`/id`).
Eles rodam imediatamente, são removidos antes que o modelo veja a mensagem, e o texto restante continua através do fluxo normal.

## Configuração

```json5
{
  commands: {
    native: "auto",
    nativeSkills: "auto",
    text: true,
    bash: false,
    bashForegroundMs: 2000,
    config: false,
    debug: false,
    restart: false,
    useAccessGroups: true
  }
}
```

- `commands.text` (padrão `true`) habilita o parsing de `/...` em mensagens de chat.
  - Em superfícies sem comandos nativos (WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams), comandos de texto ainda funcionam mesmo se você definir isso como `false`.
- `commands.native` (padrão `"auto"`) registra comandos nativos.
  - Auto: ligado para Discord/Telegram; desligado para Slack (até que você adicione slash commands); ignorado para provedores sem suporte nativo.
  - Defina `channels.discord.commands.native`, `channels.telegram.commands.native` ou `channels.slack.commands.native` para substituir por provedor (bool ou `"auto"`).
  - `false` limpa comandos previamente registrados no Discord/Telegram na inicialização. Comandos do Slack são gerenciados no app Slack e não são removidos automaticamente.
- `commands.nativeSkills` (padrão `"auto"`) registra comandos de **habilidade** nativamente quando suportado.
  - Auto: ligado para Discord/Telegram; desligado para Slack (Slack requer criar um slash command por habilidade).
  - Defina `channels.discord.commands.nativeSkills`, `channels.telegram.commands.nativeSkills` ou `channels.slack.commands.nativeSkills` para substituir por provedor (bool ou `"auto"`).
- `commands.bash` (padrão `false`) habilita `! <cmd>` para rodar comandos shell do host (`/bash <cmd>` é um alias; requer listas de permissão `tools.elevated`).
- `commands.bashForegroundMs` (padrão `2000`) controla quanto tempo o bash espera antes de mudar para o modo background (`0` coloca em background imediatamente).
- `commands.config` (padrão `false`) habilita `/config` (lê/escreve `zero.json`).
- `commands.debug` (padrão `false`) habilita `/debug` (substituições apenas em tempo de execução).
- `commands.useAccessGroups` (padrão `true`) impõe listas de permissão/políticas para comandos.

## Lista de comandos

Texto + nativo (quando habilitado):

- `/help`
- `/commands`
- `/skill <name> [input]` (executa uma habilidade por nome)
- `/status` (mostra o status atual; inclui uso/cota do provedor para o provedor de modelo atual quando disponível)
- `/allowlist` (listar/adicionar/remover entradas da lista de permissão)
- `/approve <id> allow-once|allow-always|deny` (resolver prompts de aprovação de execução)
- `/context [list|detail|json]` (explicar “contexto”; `detail` mostra por arquivo + por ferramenta + por habilidade + tamanho do prompt do sistema)
- `/whoami` (mostrar seu id de remetente; alias: `/id`)
- `/subagents list|stop|log|info|send` (inspecionar, parar, registrar ou enviar mensagem para execuções de subagente para a sessão atual)
- `/config show|get|set|unset` (persistir configuração em disco, apenas proprietário; requer `commands.config: true`)
- `/debug show|set|unset|reset` (substituições apenas em tempo de execução, apenas proprietário; requer `commands.debug: true`)
- `/usage off|tokens|full|cost` (rodapé de uso por resposta ou resumo de custo local)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (controlar TTS; veja [/tts](/tts))
  - Discord: comando nativo é `/voice` (Discord reserva `/tts`); `/tts` textual ainda funciona.
- `/stop`
- `/restart`
- `/dock-telegram` (alias: `/dock_telegram`) (mudar respostas para Telegram)
- `/dock-discord` (alias: `/dock_discord`) (mudar respostas para Discord)
- `/dock-slack` (alias: `/dock_slack`) (mudar respostas para Slack)
- `/activation mention|always` (apenas grupos)
- `/send on|off|inherit` (apenas proprietário)
- `/reset` ou `/new [model]` (dica de modelo opcional; restante é passado adiante)
- `/think <off|minimal|low|medium|high|xhigh>` (escolhas dinâmicas por modelo/provedor; aliases: `/thinking`, `/t`)
- `/verbose on|full|off` (alias: `/v`)
- `/reasoning on|off|stream` (alias: `/reason`; quando ligado, envia uma mensagem separada prefixada `Reasoning:`; `stream` = rascunho Telegram apenas)
- `/elevated on|off|ask|full` (alias: `/elev`; `full` pula aprovações de execução)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (envie `/exec` para mostrar atual)
- `/model <name>` (alias: `/models`; ou `/<alias>` de `agents.defaults.models.*.alias`)
- `/queue <mode>` (mais opções como `debounce:2s cap:25 drop:summarize`; envie `/queue` para ver configurações atuais)
- `/bash <command>` (apenas host; alias para `! <command>`; requer `commands.bash: true` + listas de permissão `tools.elevated`)

Apenas texto:

- `/compact [instructions]` (veja [/concepts/compaction](/concepts/compaction))
- `! <command>` (apenas host; um por vez; use `!poll` + `!stop` para jobs de longa duração)
- `!poll` (verificar saída / status; aceita `sessionId` opcional; `/bash poll` também funciona)
- `!stop` (parar o job bash em execução; aceita `sessionId` opcional; `/bash stop` também funciona)

Notas:

- Comandos aceitam um `:` opcional entre o comando e argumentos (ex: `/think: high`, `/send: on`, `/help:`).
- `/new <model>` aceita um alias de modelo, `provider/model` ou um nome de provedor (correspondência difusa); se não houver correspondência, o texto é tratado como o corpo da mensagem.
- Para detalhamento completo de uso do provedor, use `zero status --usage`.
- `/allowlist add|remove` requer `commands.config=true` e honra `configWrites` do canal.
- `/usage` controla o rodapé de uso por resposta; `/usage cost` imprime um resumo de custo local dos logs de sessão do ZERO.
- `/restart` é desativado por padrão; defina `commands.restart: true` para habilitá-lo.
- `/verbose` é destinado à depuração e visibilidade extra; mantenha-o **desligado** no uso normal.
- `/reasoning` (e `/verbose`) são arriscados em configurações de grupo: eles podem revelar raciocínio interno ou saída de ferramenta que você não pretendia expor. Prefira deixá-los desligados, especialmente em chats de grupo.
- **Caminho rápido:** mensagens somente de comando de remetentes na lista de permissão são manipuladas imediatamente (ignoram fila + modelo).
- **Bloqueio de menção em grupo:** mensagens somente de comando de remetentes na lista de permissão ignoram requisitos de menção.
- **Atalhos inline (apenas remetentes na lista de permissão):** certos comandos também funcionam quando incorporados em uma mensagem normal e são removidos antes que o modelo veja o texto restante.
  - Exemplo: `hey /status` dispara uma resposta de status, e o texto restante continua através do fluxo normal.
- Atualmente: `/help`, `/commands`, `/status`, `/whoami` (`/id`).
- Mensagens somente de comando não autorizadas são ignoradas silenciosamente, e tokens `/...` inline são tratados como texto simples.
- **Comandos de habilidade:** habilidades `user-invocable` são expostas como slash commands. Nomes são sanitizados para `a-z0-9_` (máx 32 caracteres); colisões recebem sufixos numéricos (ex: `_2`).
  - `/skill <name> [input]` executa uma habilidade por nome (útil quando limites de comando nativo impedem comandos por habilidade).
  - Por padrão, comandos de habilidade são encaminhados para o modelo como uma solicitação normal.
  - Habilidades podem opcionalmente declarar `command-dispatch: tool` para rotear o comando diretamente para uma ferramenta (determinístico, sem modelo).
  - Exemplo: `/prose` (plugin OpenProse) — veja [OpenProse](/prose).
- **Argumentos de comando nativo:** Discord usa preenchimento automático para opções dinâmicas (e menus de botão quando você omite argumentos obrigatórios). Telegram e Slack mostram um menu de botão quando um comando suporta escolhas e você omite o argumento.

## Superfícies de uso (o que aparece onde)

- **Uso/Cota do provedor** (exemplo: “Claude 80% left”) aparece em `/status` para o provedor de modelo atual quando o rastreamento de uso está ativado.
- **Tokens/Custo por resposta** é controlado por `/usage off|tokens|full` (anexado a respostas normais).
- `/model status` é sobre **modelos/auth/endpoints**, não uso.

## Seleção de modelo (`/model`)

`/model` é implementado como uma diretiva.

Exemplos:

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model opus@anthropic:claude-cli
/model status
```

Notas:

- `/model` e `/model list` mostram um seletor compacto e numerado (família de modelo + provedores disponíveis).
- `/model <#>` seleciona daquele seletor (e prefere o provedor atual quando possível).
- `/model status` mostra a visão detalhada, incluindo endpoint de provedor configurado (`baseUrl`) e modo de API (`api`) quando disponível.

## Substituições de depuração (Debug overrides)

`/debug` permite que você defina substituições de configuração **apenas em tempo de execução** (memória, não disco). Apenas proprietário. Desativado por padrão; habilite com `commands.debug: true`.

Exemplos:

```
/debug show
/debug set messages.responsePrefix="[zero]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

Notas:

- Substituições aplicam-se imediatamente a novas leituras de configuração, mas **não** escrevem em `zero.json`.
- Use `/debug reset` para limpar todas as substituições e retornar à configuração em disco.

## Atualizações de configuração

`/config` escreve na sua configuração em disco (`zero.json`). Apenas proprietário. Desativado por padrão; habilite com `commands.config: true`.

Exemplos:

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[zero]"
/config unset messages.responsePrefix
```

Notas:

- A configuração é validada antes da escrita; alterações inválidas são rejeitadas.
- Atualizações de `/config` persistem através de reinícios.

## Notas de superfície

- **Comandos de texto** rodam na sessão de chat normal (DMs compartilham `main`, grupos têm sua própria sessão).
- **Comandos nativos** usam sessões isoladas:
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (prefixo configurável via `channels.slack.slashCommand.sessionPrefix`)
  - Telegram: `telegram:slash:<userId>` (almeja a sessão de chat via `CommandTargetSessionKey`)
- **`/stop`** almeja a sessão de chat ativa para que possa abortar a execução atual.
- **Slack:** `channels.slack.slashCommand` ainda é suportado para um único comando estilo `/zero`. Se você habilitar `commands.native`, deve criar um slash command no Slack por comando embutido (mesmos nomes que `/help`). Menus de argumento de comando para Slack são entregues como botões efêmeros Block Kit.
