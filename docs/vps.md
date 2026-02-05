---
summary: "Hub de hospedagem VPS para o ZERO (Railway/Fly/Hetzner/exe.dev)"
read_when:
  - Você deseja executar o Gateway na nuvem
  - Você precisa de um mapa rápido dos guias de hospedagem/VPS
---

# Hospedagem VPS

Este hub contém links para os guias de VPS/hospedagem suportados e explica como as implantações na nuvem funcionam em alto nível.

## Escolha um provedor

- **Railway** (template de um clique + configuração via navegador): [Railway](/railway)
- **Fly.io**: [Fly.io](/platforms/fly)
- **Hetzner (Docker)**: [Hetzner](/platforms/hetzner)
- **exe.dev** (VM + proxy HTTPS): [exe.dev](/platforms/exe-dev)
- **AWS (EC2/Lightsail/nível gratuito)**: também funciona muito bem.

## Como as configurações na nuvem funcionam

- O **Gateway é executado no VPS** e detém o estado + workspace.
- Você se conecta a partir do seu laptop/celular via **Interface de Controle (Control UI)** ou **Tailscale/SSH**.
- Trate o VPS como a fonte da verdade (source of truth) e faça **backup** do estado + workspace.

Acesso remoto: [Acesso Remoto ao Gateway](/gateway/remote)  
Hub de plataformas: [Plataformas](/platforms)

## Usando nós com um VPS

Você pode manter o Gateway na nuvem e parear **nós** (nodes) em seus dispositivos locais (Mac/iOS/Android/headless). Os nós fornecem capacidades locais de tela/câmera/canvas e execução de sistema (`system.run`), enquanto o Gateway permanece na nuvem.

Documentação: [Nós](/nodes), [CLI de Nós](/cli/nodes)
