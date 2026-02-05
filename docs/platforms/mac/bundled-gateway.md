---
summary: "Tempo de execução do Gateway no macOS (serviço launchd externo)"
read_when:
  - Empacotando ZERO.app
  - Depurando o serviço launchd do gateway no macOS
  - Instalando a CLI do gateway para macOS
---

# Gateway no macOS (launchd externo)

O ZERO.app não empacota mais o Node/Bun ou o tempo de execução do Gateway. O app macOS espera uma instalação **externa** da CLI `zero`, não inicia o Gateway como um processo filho e gerencia um serviço launchd por usuário para manter o Gateway em execução (ou anexa-se a um Gateway local existente, caso já esteja rodando).

## Instalar a CLI (obrigatório para o modo local)

Você precisa do Node 22+ no Mac, então instale o `zero` globalmente:

```bash
npm install -g zero@<versão>
```

O botão **Install CLI** do app macOS executa o mesmo fluxo via npm/pnpm (bun não é recomendado para o tempo de execução do Gateway).

## Launchd (Gateway como LaunchAgent)

Rótulo (Label):

- `com.zero.gateway` (ou `com.zero.<perfil>`)

Localização do Plist (por usuário):

- `~/Library/LaunchAgents/com.zero.gateway.plist`
  (ou `~/Library/LaunchAgents/com.zero.<perfil>.plist`)

Gerenciador:

- O app macOS é o proprietário da instalação/atualização do LaunchAgent no modo Local.
- A CLI também pode instalá-lo: `zero gateway install`.

Comportamento:

- “ZERO Ativo” habilita/desabilita o LaunchAgent.
- Encerrar o app **não** interrompe o gateway (o launchd o mantém vivo).
- Se um Gateway já estiver em execução na porta configurada, o app se anexa a ele em vez de iniciar um novo.

Logs:

- stdout/err do launchd: `/tmp/zero/zero-gateway.log`

## Compatibilidade de versão

O app macOS verifica a versão do gateway em relação à sua própria versão. Se forem incompatíveis, atualize a CLI global para corresponder à versão do app.

## Verificação rápida (Smoke check)

```bash
zero --version

ZERO_SKIP_CHANNELS=1 \
ZERO_SKIP_CANVAS_HOST=1 \
zero gateway --port 18999 --bind loopback
```

Então:

```bash
zero gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```
