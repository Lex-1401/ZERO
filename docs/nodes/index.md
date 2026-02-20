---
summary: "Nós (Nodes): emparelhamento, capacidades, permissões e auxiliares da CLI para canvas/camera/screen/system"
read_when:
  - Emparelhando nós de iOS/Android a um gateway
  - Usando canvas/camera de nó para contexto do agente
  - Adicionando novos comandos de nó ou auxiliares da CLI
---
# Nós (Nodes)

Um **nó** é um dispositivo complementar (macOS/iOS/Android/headless) que se conecta ao Gateway via **WebSocket** (na mesma porta que os operadores) com `role: "node"` e expõe uma superfície de comando (ex: `canvas.*`, `camera.*`, `system.*`) via `node.invoke`. Detalhes do protocolo: [Protocolo do Gateway](/gateway/protocol).

Transporte legado: [Bridge protocol](/gateway/bridge-protocol) (TCP JSONL; depreciado/removido para os nós atuais).

O macOS também pode rodar em **modo nó**: o app da barra de menus se conecta ao servidor WS do Gateway e expõe seus comandos locais de canvas/camera como um nó (assim, `zero nodes …` funciona contra este Mac).

Notas:

- Nós são **periféricos**, não gateways. Eles não rodam o serviço de gateway.
- Mensagens do Telegram/WhatsApp/etc chegam ao **gateway**, não aos nós.

## Emparelhamento + status

**Nós WS usam emparelhamento de dispositivo.** Os nós apresentam uma identidade de dispositivo durante o `connect`; o Gateway cria uma solicitação de emparelhamento de dispositivo para `role: node`. Aprove via CLI de dispositivos (ou UI).

CLI rápida:

```bash
zero devices list
zero devices approve <requestId>
zero devices reject <requestId>
zero nodes status
zero nodes describe --node <idOuNomeOuIp>
```

Notas:

- `nodes status` marca um nó como **emparelhado** quando seu papel de emparelhamento de dispositivo inclui `node`.
- `node.pair.*` (CLI: `zero nodes pending/approve/reject`) é um repositório separado de emparelhamento de nós de propriedade do gateway; ele **não** bloqueia o handshake do `connect` via WS.

## Host de nó remoto (system.run)

Use um **host de nó** quando o seu Gateway roda em uma máquina e você quer que os comandos sejam executados em outra. O modelo ainda fala com o **gateway**; o gateway encaminha as chamadas `exec` para o **host de nó** quando `host=node` é selecionado.

### O que roda onde

- **Host do Gateway**: recebe mensagens, roda o modelo, roteia chamadas de ferramentas.
- **Host do Nó**: executa `system.run`/`system.which` na máquina do nó.
- **Aprovações**: impostas no host do nó via `~/.zero/exec-approvals.json`.

### Iniciar um host de nó (primeiro plano)

Na máquina do nó:

```bash
zero node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### Iniciar um host de nó (serviço)

```bash
zero node install --host <gateway-host> --port 18789 --display-name "Build Node"
zero node restart
```

### Emparelhar + nomear

No host do gateway:

```bash
zero nodes pending
zero nodes approve <requestId>
zero nodes list
```

Opções de nomeação:

- `--display-name` no `zero node run` / `zero node install` (persiste em `~/.zero/node.json` no nó).
- `zero nodes rename --node <id|name|ip> --name "Build Node"` (sobrescrita no gateway).

### Lista de permissões dos comandos

As aprovações do Exec são **por host de nó**. Adicione entradas na lista de permissões (allowlist) a partir do gateway:

```bash
zero approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
zero approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

As aprovações residem no host do nó em `~/.zero/exec-approvals.json`.

### Apontar o exec para o nó

Configure os padrões (configuração do gateway):

```bash
zero config set tools.exec.host node
zero config set tools.exec.security allowlist
zero config set tools.exec.node "<id-ou-nome>"
```

Ou por sessão:

```text
/exec host=node security=allowlist node=<id-ou-nome>
```

Uma vez configurado, qualquer chamada `exec` com `host=node` roda no host do nó (sujeito à lista de permissões/aprovações do nó).

Relacionado:

- [CLI do Host de Nó](/cli/node)
- [Ferramenta Exec](/tools/exec)
- [Aprovações de Exec](/tools/exec-approvals)

## Invocando comandos

Nível baixo (RPC bruto):

```bash
zero nodes invoke --node <idOuNomeOuIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

Existem auxiliares de nível superior para os fluxos de trabalho comuns de “dar ao agente um anexo MEDIA”.

## Capturas de tela (snapshots do canvas)

Se o nó estiver exibindo o Canvas (WebView), `canvas.snapshot` retorna `{ format, base64 }`.

Auxiliar da CLI (escreve em um arquivo temporário e imprime `MEDIA:<caminho>`):

```bash
zero nodes canvas snapshot --node <idOuNomeOuIp> --format png
zero nodes canvas snapshot --node <idOuNomeOuIp> --format jpg --max-width 1200 --quality 0.9
```

### Controles do Canvas

```bash
zero nodes canvas present --node <idOuNomeOuIp> --target https://example.com
zero nodes canvas hide --node <idOuNomeOuIp>
zero nodes canvas navigate https://example.com --node <idOuNomeOuIp>
zero nodes canvas eval --node <idOuNomeOuIp> --js "document.title"
```

Notas:

- `canvas present` aceita URLs ou caminhos de arquivos locais (`--target`), além de `--x/--y/--width/--height` opcionais para posicionamento.
- `canvas eval` aceita JS em linha (`--js`) ou um argumento posicional.

### A2UI (Canvas)

```bash
zero nodes canvas a2ui push --node <idOuNomeOuIp> --text "Olá"
zero nodes canvas a2ui push --node <idOuNomeOuIp> --jsonl ./payload.jsonl
zero nodes canvas a2ui reset --node <idOuNomeOuIp>
```

Notas:

- Apenas A2UI v0.8 JSONL é suportado (v0.9/createSurface é rejeitado).

## Fotos + vídeos (câmera do nó)

Fotos (`jpg`):

```bash
zero nodes camera list --node <idOuNomeOuIp>
zero nodes camera snap --node <idOuNomeOuIp>            # padrão: ambas as faces (2 linhas MEDIA)
zero nodes camera snap --node <idOuNomeOuIp> --facing front
```

Clipes de vídeo (`mp4`):

```bash
zero nodes camera clip --node <idOuNomeOuIp> --duration 10s
zero nodes camera clip --node <idOuNomeOuIp> --duration 3000 --no-audio
```

Notas:

- O nó deve estar em **primeiro plano** (foreground) para `canvas.*` e `camera.*` (chamadas em segundo plano retornam `NODE_BACKGROUND_UNAVAILABLE`).
- A duração do clipe é limitada (atualmente `<= 60s`) para evitar payloads base64 excessivamente grandes.
- O Android solicitará as permissões de `CAMERA`/`RECORD_AUDIO` quando possível; permissões negadas falham com `*_PERMISSION_REQUIRED`.

## Gravações de tela (nós)

Os nós expõem `screen.record` (mp4). Exemplo:

```bash
zero nodes screen record --node <idOuNomeOuIp> --duration 10s --fps 10
zero nodes screen record --node <idOuNomeOuIp> --duration 10s --fps 10 --no-audio
```

Notas:

- `screen.record` exige que o app do nó esteja em primeiro plano.
- O Android exibirá o prompt de captura de tela do sistema antes de gravar.
- As gravações de tela são limitadas a `<= 60s`.
- `--no-audio` desativa a captura do microfone (suportado no iOS/Android; macOS usa áudio de captura do sistema).
- Use `--screen <index>` para selecionar um monitor quando houver múltiplas telas disponíveis.

## Localização (nós)

Os nós expõem `location.get` quando a Localização está habilitada nas configurações.

Auxiliar da CLI:

```bash
zero nodes location get --node <idOuNomeOuIp>
zero nodes location get --node <idOuNomeOuIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

Notas:

- A Localização vem **desativada por padrão**.
- “Sempre” (Always) exige permissão do sistema; a busca em segundo plano (background fetch) é melhor esforço.
- A resposta inclui lat/lon, precisão (metros) e carimbo de data/hora.

## SMS (Nós Android)

Nós Android podem expor `sms.send` quando o usuário concede permissão de **SMS** e o dispositivo suporta telefonia.

Invocação de nível baixo:

```bash
zero nodes invoke --node <idOuNomeOuIp> --command sms.send --params '{"to":"+15555550123","message":"Olá do ZERO"}'
```

Notas:

- O prompt de permissão deve ser aceito no dispositivo Android antes que a capacidade seja anunciada.
- Dispositivos apenas Wi-Fi sem telefonia não anunciarão `sms.send`.

## Comandos de sistema (host de nó / nó mac)

O nó macOS expõe `system.run`, `system.notify` e `system.execApprovals.get/set`.
O host de nó headless expõe `system.run`, `system.which` e `system.execApprovals.get/set`.

Exemplos:

```bash
zero nodes run --node <idOuNomeOuIp> -- echo "Olá do nó mac"
zero nodes notify --node <idOuNomeOuIp> --title "Ping" --body "Gateway pronto"
```

Notas:

- `system.run` retorna stdout/stderr/código de saída no payload.
- `system.notify` respeita o estado da permissão de notificação no app macOS.
- `system.run` suporta `--cwd`, `--env CHAVE=VAL`, `--command-timeout` e `--needs-screen-recording`.
- `system.notify` suporta `--priority <passive|active|timeSensitive>` e `--delivery <system|overlay|auto>`.
- Nós macOS descartam sobrescritas de `PATH`; hosts de nó headless apenas aceitam `PATH` quando ele prefixa o PATH do host de nó.
- No modo nó do macOS, `system.run` é bloqueado pelas aprovações de exec no app macOS (Configurações → Aprovações de Exec).
  Pedir/Lista de permissões/Completo (Ask/allowlist/full) se comportam da mesma forma que o host de nó headless; prompts negados retornam `SYSTEM_RUN_DENIED`.
- No host de nó headless, `system.run` é bloqueado por aprovações de exec (`~/.zero/exec-approvals.json`).

## Vínculo de Nó Exec (Exec node binding)

Quando múltiplos nós estão disponíveis, você pode vincular o exec a um nó específico.
Isso define o nó padrão para `exec host=node` (e pode ser sobrescrito por agente).

Padrão global:

```bash
zero config set tools.exec.node "id-ou-nome-do-no"
```

Sobrescrita por agente:

```bash
zero config get agents.list
zero config set agents.list[0].tools.exec.node "id-ou-nome-do-no"
```

Limpar para permitir qualquer nó:

```bash
zero config unset tools.exec.node
zero config unset agents.list[0].tools.exec.node
```

## Mapa de Permissões

Os nós podem incluir um mapa de `permissions` no `node.list` / `node.describe`, indexado pelo nome da permissão (ex: `screenRecording`, `accessibility`) com valores booleanos (`true` = concedido).

## Host de nó headless (multiplataforma)

O ZERO pode rodar um **host de nó headless** (sem interface) que se conecta ao WebSocket do Gateway e expõe `system.run` / `system.which`. Isso é útil no Linux/Windows ou para rodar um nó minimalista ao lado de um servidor.

Inicie-o:

```bash
zero node run --host <gateway-host> --port 18789
```

Notas:

- O emparelhamento ainda é obrigatório (o Gateway mostrará um prompt de aprovação de nó).
- O host de nó armazena seu id de nó, token, nome de exibição e informações de conexão do gateway em `~/.zero/node.json`.
- As aprovações de exec são impostas localmente via `~/.zero/exec-approvals.json` (veja [Aprovações de Exec](/tools/exec-approvals)).
- No macOS, o host de nó headless prefere o host de exec do app complementar quando acessível e recorre à execução local se o app estiver indisponível. Defina `ZERO_NODE_EXEC_HOST=app` para exigir o app, ou `ZERO_NODE_EXEC_FALLBACK=0` para desativar o fallback.
- Adicione `--tls` / `--tls-fingerprint` quando o WS do Gateway usar TLS.

## Modo nó Mac

- O app da barra de menus do macOS se conecta ao servidor WS do Gateway como um nó (assim, `zero nodes …` funciona contra este Mac).
- No modo remoto, o app abre um túnel SSH para a porta do Gateway e se conecta ao `localhost`.
