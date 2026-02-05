---
summary: "Aplicativo complementar do ZERO para macOS (barra de menus + broker do gateway)"
read_when:
  - Implementando recursos do app para macOS
  - Alterando o ciclo de vida do gateway ou a ponte de nós no macOS
---
# Complemento do ZERO para macOS (barra de menus + broker do gateway)

O aplicativo para macOS é o **companheiro da barra de menus** para o ZERO. Ele detém as permissões, gerencia/conecta-se ao Gateway localmente (launchd ou manual) e expõe os recursos do macOS ao agente como um nó.

## O que ele faz

- Mostra notificações nativas e o status na barra de menus.
- Detém os prompts de TCC (Notificações, Acessibilidade, Gravação de Tela, Microfone, Reconhecimento de Fala, Automação/AppleScript).
- Executa ou conecta-se ao Gateway (local ou remoto).
- Expõe ferramentas exclusivas do macOS (Canvas, Câmera, Gravação de Tela, `system.run`).
- Inicia o serviço do host do nó local no modo **remoto** (launchd) e o interrompe no modo **local**.
- Opcionalmente hospeda o **PeekabooBridge** para automação de UI.
- Instala a CLI global (`zero`) via npm/pnpm sob demanda (bun não é recomendado para o runtime do Gateway).

## Modo local vs remoto

- **Local** (padrão): o app conecta-se a um Gateway local em execução, se presente; caso contrário, habilita o serviço launchd via `zero gateway install`.
- **Remoto**: o app conecta-se a um Gateway via SSH/Tailscale e nunca inicia um processo local. O app inicia o **serviço de host do nó** local para que o Gateway remoto possa alcançar este Mac. O app não gera o Gateway como um processo filho.

## Controle do Launchd

O app gerencia um LaunchAgent por usuário rotulado como `com.zero.gateway` (ou `com.zero.<perfil>` ao usar `--profile`/`ZERO_PROFILE`).

```bash
launchctl kickstart -k gui/$UID/com.zero.gateway
launchctl bootout gui/$UID/com.zero.gateway
```

Substitua o rótulo por `com.zero.<perfil>` ao executar um perfil nomeado.

Se o LaunchAgent não estiver instalado, habilite-o pelo app ou execute `zero gateway install`.

## Capacidades do Nó (mac)

O app macOS apresenta-se como um nó. Comandos comuns:

- Canvas: `canvas.present`, `canvas.navigate`, `canvas.eval`, `canvas.snapshot`, `canvas.a2ui.*`
- Câmera: `camera.snap`, `camera.clip`
- Tela: `screen.record`
- Sistema: `system.run`, `system.notify`

O nó relata um mapa de `permissions` para que os agentes possam decidir o que é permitido.

Serviço de nó + IPC do app:

- Quando o serviço de host do nó headless está em execução (modo remoto), ele se conecta ao WS do Gateway como um nó.
- `system.run` executa no app macOS (contexto UI/TCC) sobre um socket Unix local; os prompts e a saída permanecem no app.

Diagrama (SCI):

```
Gateway -> Serviço de Nó (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             App Mac (UI + TCC + system.run)
```

## Aprovações de Exec (system.run)

`system.run` é controlado pelas **Aprovações de Exec** no app macOS (Configurações → Aprovações de Exec). A segurança + pedido + lista de permissões são armazenados localmente no Mac em:

```
~/.zero/exec-approvals.json
```

Exemplo:

```json
{
  "version": 1,
  "defaults": {
    "security": "deny",
    "ask": "on-miss"
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [
        { "pattern": "/opt/homebrew/bin/rg" }
      ]
    }
  }
}
```

Notas:

- As entradas da `allowlist` são padrões glob (glob patterns) para caminhos de binários resolvidos.
- Escolher "Sempre Permitir" no prompt adiciona esse comando à lista de permissões.
- As sobreposições de ambiente de `system.run` são filtradas (remove `PATH`, `DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`) e depois mescladas com o ambiente do app.

## Links Profundos (Deep links)

O app registra o esquema de URL `zero://` para ações locais.

### `zero://agent`

Dispara uma requisição de `agent` no Gateway.

```bash
open 'zero://agent?message=Ola%20do%20link%20profundo'
```

Parâmetros de consulta:

- `message` (obrigatório)
- `sessionKey` (opcional)
- `thinking` (opcional)
- `deliver` / `to` / `channel` (opcional)
- `timeoutSeconds` (opcional)
- `key` (chave opcional para modo não supervisionado)

Segurança:

- Sem a `key`, o app solicita confirmação.
- Com uma `key` válida, a execução não é supervisionada (destinada a automações pessoais).

## Fluxo de Integração (Típico)

1) Instale e inicie o **ZERO.app**.
2) Complete o checklist de permissões (prompts de TCC).
3) Garanta que o modo **Local** esteja ativo e o Gateway esteja em execução.
4) Instale a CLI se desejar acesso via terminal.

## Fluxo de Build & Dev (Nativo)

- `cd apps/macos && swift build`
- `swift run ZERO` (ou use o Xcode)
- Pacote do app: `scripts/package-mac-app.sh`

## Depurar conectividade do gateway (CLI macOS)

Use a CLI de depuração para exercitar o mesmo handshake de WebSocket do Gateway e a mesma lógica de descoberta que o app macOS usa, sem iniciar o app.

```bash
cd apps/macos
swift run zero-mac connect --json
swift run zero-mac discover --timeout 3000 --json
```

Opções de conexão:

- `--url <ws://host:port>`: sobrescreve a configuração
- `--mode <local|remote>`: resolve a partir da configuração (padrão: config ou local)
- `--probe`: força uma nova sonda de saúde (health probe)
- `--timeout <ms>`: tempo limite da requisição (padrão: `15000`)
- `--json`: saída estruturada para comparação (diff)

Opções de descoberta:

- `--include-local`: inclui gateways que seriam filtrados como "locais"
- `--timeout <ms>`: janela de descoberta geral (padrão: `2000`)
- `--json`: saída estruturada para comparação (diff)

Dica: compare com `zero gateway discover --json` para ver se o pipeline de descoberta do app macOS (NWBrowser + fallback Tailscale DNS-SD) difere da descoberta baseada em `dns-sd` do Node CLI.

## Encanamento de conexão remota (túneis SSH)

Quando o app macOS roda no modo **Remoto**, ele abre um túnel SSH para que os componentes locais de UI possam falar com um Gateway remoto como se ele estivesse no localhost.

### Túnel de Controle (porta WebSocket do Gateway)

- **Propósito:** verificações de saúde, status, Web Chat, configuração e outras chamadas de plano de controle.
- **Porta local:** a porta do Gateway (padrão `18789`), sempre estável.
- **Porta remota:** a mesma porta do Gateway no host remoto.
- **Comportamento:** sem porta local aleatória; o app reutiliza um túnel saudável existente ou o reinicia se necessário.
- **Formato SSH:** `ssh -N -L <local>:127.0.0.1:<remoto>` com BatchMode + ExitOnForwardFailure + opções de keepalive.
- **Relatório de IP:** o túnel SSH usa loopback, então o gateway verá o IP do nó como `127.0.0.1`. Use o transporte **Direto (ws/wss)** se quiser que o IP real do cliente apareça (veja [Acesso remoto macOS](/platforms/mac/remote)).

Para etapas de configuração, veja [Acesso remoto macOS](/platforms/mac/remote). Para detalhes do protocolo, veja [Protocolo do Gateway](/gateway/protocol).

## Documentos relacionados

- [Manual do Gateway](/gateway)
- [Gateway (macOS)](/platforms/mac/bundled-gateway)
- [Permissões do macOS](/platforms/mac/permissions)
- [Canvas](/platforms/mac/canvas)
