---
summary: "Guia de Operações (Runbook) para o serviço Gateway, ciclo de vida e operações"
read_when:
  - Executando ou depurando o processo do gateway
---

# Guia de Operações (Runbook) do serviço Gateway

Última atualização: 09/12/2025

## O que é

- O processo sempre ativo que detém a única conexão Baileys/Telegram e o plano de controle/eventos.
- Substitui o comando `gateway` legado. Ponto de entrada da CLI: `zero gateway`.
- Roda até ser interrompido; encerra com código diferente de zero em caso de erros fatais para que o supervisor o reinicie.

## Como executar (local)

```bash
zero gateway --port 18789
# para logs completos de depuração/rastreamento no stdio:
zero gateway --port 18789 --verbose
# se a porta estiver ocupada, encerre os ouvintes e então inicie:
zero gateway --force
# loop de desenvolvimento (auto-recarregamento em mudanças de TS):
pnpm gateway:watch
```

- O recarregamento a quente (hot reload) de configuração observa o arquivo `~/.zero/zero.json` (ou `ZERO_CONFIG_PATH`).
  - Modo padrão: `gateway.reload.mode="hybrid"` (aplica mudanças seguras a quente, reinicia em mudanças críticas).
  - O hot reload usa a reinicialização embutida via **SIGUSR1** quando necessário.
  - Desative com `gateway.reload.mode="off"`.
- Vincula o plano de controle WebSocket a `127.0.0.1:<porta>` (padrão 18789).
- A mesma porta também serve HTTP (UI de controle, hooks, A2UI). Multiplexação em porta única.
  - OpenAI Chat Completions (HTTP): [`/v1/chat/completions`](/gateway/openai-http-api).
  - OpenResponses (HTTP): [`/v1/responses`](/gateway/openresponses-http-api).
  - Tools Invoke (HTTP): [`/tools/invoke`](/gateway/tools-invoke-http-api).
- Inicia um servidor de arquivos do Canvas por padrão na porta `canvasHost.port` (padrão `18793`), servindo `http://<gateway-host>:18793/__zero__/canvas/` a partir de `~/zero/canvas`. Desative com `canvasHost.enabled=false` ou `ZERO_SKIP_CANVAS_HOST=1`.
- Grava logs no stdout; use launchd/systemd para mantê-lo ativo e rotacionar os logs.
- Passe `--verbose` para espelhar o log de depuração (handshakes, req/res, eventos) do arquivo de log para o stdio durante a solução de problemas.
- `--force` usa `lsof` para encontrar ouvintes na porta escolhida, envia SIGTERM, registra o que encerrou e inicia o gateway (falha rapidamente se o `lsof` estiver ausente).
- Se você executar sob um supervisor (launchd/systemd/modo de processo filho do app macOS), uma interrupção/reinicialização normalmente envia **SIGTERM**; builds mais antigos podem mostrar isso como código de saída **143** do `pnpm` `ELIFECYCLE` (SIGTERM), que é um desligamento normal, não uma falha.
- **SIGUSR1** dispara uma reinicialização interna quando autorizado (aplicação/atualização da ferramenta/configuração do gateway, ou habilite `commands.restart` para reinicializações manuais).
- Autenticação do Gateway: defina `gateway.auth.mode=token` + `gateway.auth.token` (ou passe `--token <valor>` / `ZERO_GATEWAY_TOKEN`) para exigir que os clientes enviem `connect.params.auth.token`.
- O assistente agora gera um token por padrão, mesmo em loopback.
- Precedência de porta: `--port` > `ZERO_GATEWAY_PORT` > `gateway.port` > padrão `18789`.

## Acesso remoto

- Preferencialmente Tailscale/VPN; caso contrário, túnel SSH:

  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```

- Os clientes conectam-se então a `ws://127.0.0.1:18789` através do túnel.
- Se um token estiver configurado, os clientes devem incluí-lo em `connect.params.auth.token`, mesmo através do túnel.

## Múltiplos gateways (mesmo host)

Geralmente desnecessário: um Gateway pode servir múltiplos canais de mensagens e agentes. Use múltiplos Gateways apenas para redundância ou isolamento estrito (ex: bot de resgate).

Suportado se você isolar o estado + configuração e usar portas únicas. Guia completo: [Múltiplos gateways](/gateway/multiple-gateways).

Os nomes dos serviços estão cientes do perfil:

- macOS: `com.zero.<perfil>`
- Linux: `zero-gateway-<perfil>.service`
- Windows: `ZERO Gateway (<perfil>)`

Metadados de instalação são incorporados na configuração do serviço:

- `ZERO_SERVICE_MARKER=zero`
- `ZERO_SERVICE_KIND=gateway`
- `ZERO_SERVICE_VERSION=<versão>`

Padrão de Bot de Resgate (Rescue-Bot): mantenha um segundo Gateway isolado com seu próprio perfil, diretório de estado, espaço de trabalho e espaçamento de porta base. Guia completo: [Guia do rescue-bot](/gateway/multiple-gateways#rescue-bot-guide).

### Perfil de desenvolvimento (Dev)

Caminho rápido: execute uma instância de desenvolvimento totalmente isolada (configuração/estado/espaço de trabalho) sem tocar na sua configuração principal.

```bash
zero --dev setup
zero --dev gateway --allow-unconfigured
# depois aponte para a instância dev:
zero --dev status
zero --dev health
```

Padrões (podem ser sobrescritos via env/flags/configuração):

- `ZERO_STATE_DIR=~/.zero-dev`
- `ZERO_CONFIG_PATH=~/.zero-dev/zero.json`
- `ZERO_GATEWAY_PORT=19001` (Gateway WS + HTTP)
- `browser.controlUrl=http://127.0.0.1:19003` (derivado: `gateway.port+2`)
- `canvasHost.port=19005` (derivado: `gateway.port+4`)
- O padrão de `agents.defaults.workspace` torna-se `~/zero-dev` quando você executa `setup`/`onboard` sob o modo `--dev`.

Portas derivadas (regras práticas):

- Porta base = `gateway.port` (ou `ZERO_GATEWAY_PORT` / `--port`)
- `browser.controlUrl port = base + 2` (ou `ZERO_BROWSER_CONTROL_URL` / sobrescrita de configuração)
- `canvasHost.port = base + 4` (ou `ZERO_CANVAS_HOST_PORT` / sobrescrita de configuração)
- As portas CDP do perfil do navegador são alocadas automaticamente a partir de `browser.controlPort + 9 .. + 108` (persistidas por perfil).

Checklist por instância:

- `gateway.port` único
- `ZERO_CONFIG_PATH` único
- `ZERO_STATE_DIR` único
- `agents.defaults.workspace` único
- números de WhatsApp separados (se estiver usando WA)

Instalação do serviço por perfil:

```bash
zero --profile main gateway install
zero --profile rescue gateway install
```

Exemplo:

```bash
ZERO_CONFIG_PATH=~/.zero/a.json ZERO_STATE_DIR=~/.zero-a zero gateway --port 19001
ZERO_CONFIG_PATH=~/.zero/b.json ZERO_STATE_DIR=~/.zero-b zero gateway --port 19002
```

## Protocolo (visão do operador)

- Documentação completa: [Protocolo do Gateway](/gateway/protocol) e [Protocolo de ponte (legado)](/gateway/bridge-protocol).
- Primeiro quadro obrigatório do cliente: `req {type:"req", id, method:"connect", params:{minProtocol,maxProtocol,client:{id,displayName?,version,platform,deviceFamily?,modelIdentifier?,mode,instanceId?}, caps, auth?, locale?, userAgent? } }`.
- O Gateway responde `res {type:"res", id, ok:true, payload:hello-ok }` (ou `ok:false` com um erro, e então fecha).
- Após o handshake:
  - Requisições: `{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - Eventos: `{type:"event", event, payload, seq?, stateVersion?}`
- Entradas de presença estruturadas: `{host, ip, version, platform?, deviceFamily?, modelIdentifier?, mode, lastInputSeconds?, ts, reason?, tags?[], instanceId? }` (para clientes WS, o `instanceId` vem de `connect.client.instanceId`).
- As respostas de `agent` são em duas etapas: primeiro o reconhecimento `res` `{runId,status:"accepted"}`, depois um `res` final `{runId,status:"ok"|"error",summary}` após a conclusão da execução; a saída transmitida chega como `event:"agent"`.

## Métodos (conjunto inicial)

- `health` — instantâneo completo de saúde (mesmo formato de `zero health --json`).
- `status` — resumo curto.
- `system-presence` — lista de presença atual.
- `system-event` — publica uma nota de presença/sistema (estruturada).
- `send` — envia uma mensagem via canal(is) ativo(s).
- `agent` — executa um turno do agente (transmite eventos de volta na mesma conexão).
- `node.list` — lista nós emparelhados + conectados no momento (inclui `caps`, `deviceFamily`, `modelIdentifier`, `paired`, `connected` e comandos anunciados).
- `node.describe` — descreve um nó (capacidades + comandos `node.invoke` suportados; funciona para nós emparelhados e para nós conectados no momento que não estão emparelhados).
- `node.invoke` — invoca um comando em um nó (ex: `canvas.*`, `camera.*`).
- `node.pair.*` — ciclo de vida de emparelhamento (`request`, `list`, `approve`, `reject`, `verify`).

Veja também: [Presença](/concepts/presence) para saber como a presença é produzida/deduplicada e por que um `client.instanceId` estável é importante.

## Eventos

- `agent` — eventos de ferramenta/saída transmitidos da execução do agente (marcados por seq).
- `presence` — atualizações de presença (deltas com stateVersion) enviadas a todos os clientes conectados.
- `tick` — pulso periódico de keepalive/no-op para confirmar que a conexão está ativa.
- `shutdown` — o Gateway está encerrando; o payload inclui a `reason` (razão) e o `restartExpectedMs` opcional. Os clientes devem se reconectar.

## Integração com WebChat

- O WebChat é uma UI nativa em SwiftUI que se comunica diretamente com o WebSocket do Gateway para histórico, envios, cancelamentos e eventos.
- O uso remoto passa pelo mesmo túnel SSH/Tailscale; se um token de gateway estiver configurado, o cliente o inclui durante o `connect`.
- O app macOS conecta-se via um único WS (conexão compartilhada); ele hidrata a presença a partir do snapshot inicial e ouve eventos de `presence` para atualizar a UI.

## Tipagem e validação

- O servidor valida cada quadro de entrada com AJV contra o JSON Schema emitido a partir das definições do protocolo.
- Clientes (TS/Swift) consomem tipos gerados (TS diretamente; Swift via gerador do repositório).
- As definições de protocolo são a fonte da verdade; regenere esquemas/modelos com:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`

## Snapshot (instantâneo) da conexão

- O `hello-ok` inclui um `snapshot` com `presence`, `health`, `stateVersion` e `uptimeMs`, além da `policy {maxPayload,maxBufferedBytes,tickIntervalMs}` para que os clientes possam renderizar imediatamente sem requisições extras.
- `health`/`system-presence` permanecem disponíveis para atualização manual, mas não são obrigatórios no momento da conexão.

## Códigos de erro (formato res.error)

- Erros usam `{ code, message, details?, retryable?, retryAfterMs? }`.
- Códigos padrão:
  - `NOT_LINKED` — WhatsApp não autenticado.
  - `AGENT_TIMEOUT` — o agente não respondeu dentro do prazo configurado.
  - `INVALID_REQUEST` — falha na validação do esquema/parâmetro.
  - `UNAVAILABLE` — o Gateway está desligando ou uma dependência está inacessível.

## Comportamento de keepalive

- Eventos `tick` (ou ping/pong de WS) são emitidos periodicamente para que os clientes saibam que o Gateway está ativo, mesmo quando não há tráfego.
- Os reconhecimentos de envio/agente permanecem como respostas separadas; não sobrecarregue os ticks para envios.

## Replay / lacunas (gaps)

- Eventos não são reproduzidos (replayed). Os clientes detectam lacunas de seq e devem atualizar (`health` + `system-presence`) antes de continuar. Os clientes WebChat e macOS agora se atualizam automaticamente em caso de lacuna.

## Supervisão (exemplo macOS)

- Use o launchd para manter o serviço ativo:
  - Program: caminho para o `zero`
  - Arguments: `gateway`
  - KeepAlive: true
  - StandardOut/Err: caminhos de arquivo ou `syslog`
- Em caso de falha, o launchd reinicia; uma configuração incorreta fatal deve continuar encerrando para que o operador perceba.
- LaunchAgents são por usuário e requerem uma sessão iniciada; para configurações headless, use um LaunchDaemon personalizado (não fornecido).
  - `zero gateway install` grava `~/Library/LaunchAgents/com.zero.gateway.plist` (ou `com.zero.<perfil>.plist`).
  - `zero doctor` audita a configuração do LaunchAgent e pode atualizá-la para os padrões atuais.

## Gerenciamento do serviço Gateway (CLI)

Use a CLI do Gateway para instalar/iniciar/parar/reiniciar/verificar o status:

```bash
zero gateway status
zero gateway install
zero gateway stop
zero gateway restart
zero logs --follow
```

Notas:

- `gateway status` sonda o RPC do Gateway por padrão usando a porta/configuração resolvida do serviço (sobrescreva com `--url`).
- `gateway status --deep` adiciona varreduras em nível de sistema (LaunchDaemons/unidades do sistema).
- `gateway status --no-probe` pula a sondagem RPC (útil quando a rede está fora do ar).
- `gateway status --json` é estável para scripts.
- `gateway status` relata o **tempo de execução do supervisor** (launchd/systemd rodando) separadamente da **acessibilidade via RPC** (conexão WS + RPC de status).
- `gateway status` imprime o caminho da configuração + o alvo da sondagem para evitar confusão entre "localhost vs LAN bind" e incompatibilidades de perfil.
- `gateway status` inclui a última linha de erro do gateway quando o serviço parece estar rodando, mas a porta está fechada.
- `logs` acompanha o arquivo de log do Gateway via RPC (sem necessidade de `tail`/`grep` manual).
- Se outros serviços semelhantes a gateways forem detectados, a CLI avisa, a menos que sejam serviços de perfil do ZERO. Ainda recomendamos **um gateway por máquina** para a maioria das configurações; use perfis/portas isolados para redundância ou para um bot de resgate. Veja [Múltiplos gateways](/gateway/multiple-gateways).
  - Limpeza: `zero gateway uninstall` (serviço atual) e `zero doctor` (migrações legadas).
- `gateway install` não faz nada quando já está instalado; use `zero gateway install --force` para reinstalar (mudanças de perfil/env/caminho).

App macOS integrado:

- O ZERO.app pode agrupar um relay de gateway baseado em Node e instalar um LaunchAgent por usuário rotulado como `com.zero.gateway` (ou `com.zero.<perfil>`).
- Para pará-lo de forma limpa, use `zero gateway stop` (ou `launchctl bootout gui/$UID/com.zero.gateway`).
- Para reiniciar, use `zero gateway restart` (ou `launchctl kickstart -k gui/$UID/com.zero.gateway`).
  - O `launchctl` só funciona se o LaunchAgent estiver instalado; caso contrário, use `zero gateway install` primeiro.
  - Substitua o rótulo por `com.zero.<perfil>` ao executar um perfil nomeado.

## Supervisão (unidade de usuário do systemd)

O ZERO instala um **serviço de usuário do systemd** por padrão no Linux/WSL2. Recomendamos serviços de usuário para máquinas de usuário único (ambiente mais simples, configuração por usuário). Use um **serviço do sistema** para servidores multiusuário ou sempre ativos (sem necessidade de persistência/linger, supervisão compartilhada).

`zero gateway install` grava a unidade de usuário. `zero doctor` audita a unidade e pode atualizá-la para corresponder aos padrões atuais recomendados.

Crie `~/.config/systemd/user/zero-gateway[-<perfil>].service`:

```ini
[Unit]
Description=ZERO Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/zero gateway --port 18789
Restart=always
RestartSec=5
Environment=ZERO_GATEWAY_TOKEN=
WorkingDirectory=/home/youruser

[Install]
WantedBy=default.target
```

Habilite a persistência (lingering) (necessário para que o serviço do usuário sobreviva ao logout/inatividade):

```bash
sudo loginctl enable-linger seuusuario
```

A integração (onboarding) executa isso no Linux/WSL2 (pode solicitar sudo; grava em `/var/lib/systemd/linger`). Em seguida, habilite o serviço:

```bash
systemctl --user enable --now zero-gateway[-<perfil>].service
```

**Alternativa (serviço do sistema)** - para servidores sempre ativos ou multiusuário, você pode instalar uma unidade de **sistema** do systemd em vez de uma unidade de usuário (não é necessária persistência). Crie `/etc/systemd/system/zero-gateway[-<perfil>].service` (copie a unidade acima, mude `WantedBy=multi-user.target`, defina `User=` + `WorkingDirectory=`), então:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now zero-gateway[-<perfil>].service
```

## Windows (WSL2)

As instalações no Windows devem usar o **WSL2** e seguir a seção de systemd do Linux acima.

## Verificações operacionais

- Vivacidade (liveness): abra o WS e envie `req:connect` → espere `res` com `payload.type="hello-ok"` (com snapshot).
- Prontidão (readiness): chame `health` → espere `ok: true` e um canal vinculado em `linkChannel` (quando aplicável).
- Depuração: inscreva-se nos eventos `tick` e `presence`; certifique-se de que o `status` mostre o canal vinculado/idade da autenticação; as entradas de presença mostram o host do Gateway e os clientes conectados.

## Garantias de segurança

- Assuma um Gateway por host por padrão; se você executar múltiplos perfis, isole as portas/estado e aponte para a instância correta.
- Não há fallback para conexões Baileys diretas; se o Gateway estiver fora do ar, os envios falham rapidamente.
- Primeiros quadros que não sejam de conexão ou JSON malformado são rejeitados e o soquete é fechado.
- Desligamento gracioso: emite o evento `shutdown` antes de fechar; os clientes devem lidar com o fechamento + reconexão.

## Auxiliares da CLI

- `zero gateway health|status` — solicita saúde/status via WS do Gateway.
- `zero message send --target <num> --message "oi" [--media ...]` — envia via Gateway (idempotente para WhatsApp).
- `zero agent --message "oi" --to <num>` — executa um turno do agente (espera pelo final por padrão).
- `zero gateway call <method> --params '{"k":"v"}'` — invocador de método bruto para depuração.
- `zero gateway stop|restart` — para/reinicia o serviço de gateway supervisionado (launchd/systemd).
- Subcomandos auxiliares do gateway assumem um gateway rodando em `--url`; eles não o iniciam mais automaticamente.

## Orientações de migração

- Aposente o uso de `zero gateway` e da porta de controle TCP legada.
- Atualize os clientes para falar o protocolo WS com conexão obrigatória e presença estruturada.
