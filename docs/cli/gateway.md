---
summary: "CLI Gateway ZERO (`zero gateway`) — execute, consulte e descubra gateways"
read_when:
  - Rodando o Gateway da CLI (dev ou servidores)
  - Depurando auth de Gateway, modos bind, e conectividade
  - Descobrindo gateways via Bonjour (LAN + tailnet)
---

# CLI Gateway

O Gateway é o servidor WebSocket do ZERO (canais, nós, sessões, hooks).

Subcomandos nesta página vivem sob `zero gateway …`.

Docs relacionadas:

- [/gateway/bonjour](/gateway/bonjour)
- [/gateway/discovery](/gateway/discovery)
- [/gateway/configuration](/gateway/configuration)

## Execute o Gateway

Execute um processo Gateway local:

```bash
zero gateway
```

Alias de foreground:

```bash
zero gateway run
```

Notas:

- Por padrão, o Gateway se recusa a iniciar a menos que `gateway.mode=local` esteja definido em `~/.zero/zero.json`. Use `--allow-unconfigured` para execuções ad-hoc/dev.
- Bind além de loopback sem auth é bloqueado (barreira de segurança).
- `SIGUSR1` aciona uma reinicialização no processo quando autorizado (ative `commands.restart` ou use o gateway tool/config apply/update).
- Manipuladores `SIGINT`/`SIGTERM` param o processo gateway, mas não restauram nenhum estado de terminal personalizado. Se você envolver a CLI com um TUI ou entrada raw-mode, restaure o terminal antes da saída.

### Opções

- `--port <porta>`: Porta WebSocket (padrão vem de config/env; geralmente `18789`).
- `--bind <loopback|lan|tailnet|auto|custom>`: modo bind do listener.
- `--auth <token|password>`: sobrescrita de modo auth.
- `--token <token>`: sobrescrita de token (também define `ZERO_GATEWAY_TOKEN` para o processo).
- `--password <senha>`: sobrescrita de senha (também define `ZERO_GATEWAY_PASSWORD` para o processo).
- `--tailscale <off|serve|funnel>`: expor o Gateway via Tailscale.
- `--tailscale-reset-on-exit`: resetar config Tailscale serve/funnel ao desligar.
- `--allow-unconfigured`: permitir início de gateway sem `gateway.mode=local` na config.
- `--dev`: criar uma config dev + workspace se faltar (pula BOOTSTRAP.md).
- `--reset`: resetar config dev + credenciais + sessões + workspace (requer `--dev`).
- `--force`: matar qualquer listener existente na porta selecionada antes de iniciar.
- `--verbose`: logs verbosos.
- `--claude-cli-logs`: mostrar apenas logs claude-cli no console (e ativar seu stdout/stderr).
- `--ws-log <auto|full|compact>`: estilo de log websocket (padrão `auto`).
- `--compact`: alias para `--ws-log compact`.
- `--raw-stream`: log de eventos de stream de modelo brutos para jsonl.
- `--raw-stream-path <caminho>`: caminho jsonl de stream bruto.

## Consultar um Gateway rodando

Todos os comandos de consulta usam WebSocket RPC.

Modos de saída:

- Padrão: legível por humanos (colorido em TTY).
- `--json`: JSON legível por máquina (sem estilo/spinner).
- `--no-color` (ou `NO_COLOR=1`): desativar ANSI mantendo layout humano.

Opções compartilhadas (onde suportado):

- `--url <url>`: URL WebSocket do Gateway.
- `--token <token>`: Token do Gateway.
- `--password <senha>`: Senha do Gateway.
- `--timeout <ms>`: timeout/orçamento (varia por comando).
- `--expect-final`: esperar por uma resposta "final" (chamadas de agente).

### `gateway health`

```bash
zero gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` mostra o serviço Gateway (launchd/systemd/schtasks) mais uma sonda RPC opcional.

```bash
zero gateway status
zero gateway status --json
```

Opções:

- `--url <url>`: sobrescrever a URL de sonda.
- `--token <token>`: auth de token para a sonda.
- `--password <senha>`: auth de senha para a sonda.
- `--timeout <ms>`: timeout de sonda (padrão `10000`).
- `--no-probe`: pular a sonda RPC (visão apenas serviço).
- `--deep`: escanear serviços de nível de sistema também.

### `gateway probe`

`gateway probe` é o comando "debug everything". Ele sempre sonda:

- seu gateway remoto configurado (se definido), e
- localhost (loopback) **mesmo se remoto estiver configurado**.

Se múltiplos gateways forem alcançáveis, ele imprime todos eles. Múltiplos gateways são suportados quando você usa perfis/portas isolados (ex., um bot de resgate), mas a maioria das instalações ainda roda um único gateway.

```bash
zero gateway probe
zero gateway probe --json
```

#### Remoto sobre SSH (paridade app Mac)

O modo "Remoto sobre SSH" do app macOS usa um port-forward local para que o gateway remoto (que pode estar vinculado apenas a loopback) se torne alcançável em `ws://127.0.0.1:<porta>`.

Equivalente CLI:

```bash
zero gateway probe --ssh usuario@gateway-host
```

Opções:

- `--ssh <alvo>`: `usuario@host` ou `usuario@host:porta` (porta padroniza para `22`).
- `--ssh-identity <caminho>`: arquivo de identidade.
- `--ssh-auto`: escolher o primeiro host gateway descoberto como alvo SSH (LAN/WAB apenas).

Config (opcional, usada como padrões):

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Auxiliar RPC de baixo nível.

```bash
zero gateway call status
zero gateway call logs.tail --params '{"sinceMs": 60000}'
```

## Gerencie o serviço Gateway

```bash
zero gateway install
zero gateway start
zero gateway stop
zero gateway restart
zero gateway uninstall
```

Notas:

- `gateway install` suporta `--port`, `--runtime`, `--token`, `--force`, `--json`.
- Comandos de ciclo de vida aceitam `--json` para scripts.

## Descubra gateways (Bonjour)

`gateway discover` escaneia por beacons de Gateway (`_zero-gw._tcp`).

- Multicast DNS-SD: `local.`
- Unicast DNS-SD (Wide-Area Bonjour): `zero.internal.` (requer split DNS + servidor DNS; veja [/gateway/bonjour](/gateway/bonjour))

Apenas gateways com descoberta Bonjour ativada (padrão) anunciam o beacon.

Registros de descoberta Wide-Area incluem (TXT):

- `role` (dica de função de gateway)
- `transport` (dica de transporte, ex. `gateway`)
- `gatewayPort` (porta WebSocket, geralmente `18789`)
- `sshPort` (porta SSH; padroniza para `22` se não presente)
- `tailnetDns` (hostname MagicDNS, quando disponível)
- `gatewayTls` / `gatewayTlsSha256` (TLS ativado + impressão digital de cert)
- `cliPath` (dica opcional para instalações remotas)

### `gateway discover`

```bash
zero gateway discover
```

Opções:

- `--timeout <ms>`: timeout por comando (browse/resolve); padrão `2000`.
- `--json`: saída legível por máquina (também desativa estilo/spinner).

Exemplos:

```bash
zero gateway discover --timeout 4000
zero gateway discover --json | jq '.beacons[].wsUrl'
```
