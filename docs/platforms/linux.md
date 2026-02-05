---
summary: "Suporte a Linux + status do aplicativo complementar"
read_when:
  - Procurando o status do aplicativo complementar para Linux
  - Planejando a cobertura de plataformas ou contribuições
---
# Aplicativo para Linux

O Gateway é totalmente suportado no Linux. **Node é o runtime recomendado**.
Bun não é recomendado para o Gateway (bugs no WhatsApp/Telegram).

Aplicativos nativos complementares para Linux estão planejados. Contribuições são bem-vindas se você quiser ajudar a construir um.

## Caminho rápido para iniciantes (VPS)

1) Instale Node 22+
2) `npm i -g zero@latest`
3) `zero onboard --install-daemon`
4) Do seu laptop: `ssh -N -L 18789:127.0.0.1:18789 <usuario>@<host>`
5) Abra `http://127.0.0.1:18789/` e cole seu token

Guia passo a passo para VPS: [exe.dev](/platforms/exe-dev)

## Instalação

- [Primeiros Passos](/start/getting-started)
- [Instalação & atualizações](/install/updating)
- Fluxos opcionais: [Bun (experimental)](/install/bun), [Nix](/install/nix), [Docker](/install/docker)

## Gateway

- [Manual do Gateway](/gateway)
- [Configuração](/gateway/configuration)

## Instalação do serviço do Gateway (CLI)

Use um destes:

```bash
zero onboard --install-daemon
```

Ou:

```bash
zero gateway install
```

Ou:

```bash
zero configure
```

Selecione **Gateway service** quando solicitado.

Reparar/migrar:

```bash
zero doctor
```

## Controle do sistema (unidade de usuário do systemd)

O ZERO instala um serviço de **usuário** do systemd por padrão. Use um serviço de **sistema** para servidores compartilhados ou de funcionamento ininterrupto. O exemplo completo da unidade e as orientações estão no [Manual do Gateway](/gateway).

Configuração mínima:

Crie `~/.config/systemd/user/zero-gateway[-<perfil>].service`:

```ini
[Unit]
Description=ZERO Gateway (perfil: <perfil>, v<versao>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/zero gateway --port 18789
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

Habilite-o:

```bash
systemctl --user enable --now zero-gateway[-<perfil>].service
```
