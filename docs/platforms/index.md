---
summary: "Visão geral do suporte a plataformas (Gateway + aplicativos complementares)"
read_when:
  - Procurando suporte a SO ou caminhos de instalação
  - Decidindo onde executar o Gateway
---
# Plataformas

O núcleo do ZERO é escrito em TypeScript. **Node é o runtime recomendado**.
Bun não é recomendado para o Gateway (bugs no WhatsApp/Telegram).

Existem aplicativos complementares para macOS (app de barra de menu) e nós móveis (iOS/Android). Aplicativos complementares para Windows e Linux estão planejados, mas o Gateway já é totalmente suportado hoje.
Aplicativos nativos complementares para Windows também estão planejados; o Gateway é recomendado via WSL2.

## Escolha seu SO

- macOS: [macOS](/platforms/macos)
- iOS: [iOS](/platforms/ios)
- Android: [Android](/platforms/android)
- Windows: [Windows](/platforms/windows)
- Linux: [Linux](/platforms/linux)

## VPS & hospedagem

- Hub de VPS: [Hospedagem VPS](/vps)
- Railway (um clique): [Railway](/railway)
- Fly.io: [Fly.io](/platforms/fly)
- Hetzner (Docker): [Hetzner](/platforms/hetzner)
- exe.dev (VM + proxy HTTPS): [exe.dev](/platforms/exe-dev)

## Links comuns

- Guia de instalação: [Primeiros Passos](/start/getting-started)
- Manual do Gateway: [Gateway](/gateway)
- Configuração do Gateway: [Configuração](/gateway/configuration)
- Status do serviço: `zero gateway status`

## Instalação do serviço do Gateway (CLI)

Use um destes (todos são suportados):

- Assistente/Mago (recomendado): `zero onboard --install-daemon`
- Direto: `zero gateway install`
- Fluxo de configuração: `zero configure` → selecione **Gateway service**
- Reparar/migrar: `zero doctor` (oferece instalar ou consertar o serviço)

O alvo do serviço depende do SO:

- macOS: LaunchAgent (`com.zero.gateway` ou `com.zero.<perfil>`)
- Linux/WSL2: serviço de usuário systemd (`zero-gateway[-<perfil>].service`)
