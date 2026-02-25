---
summary: "Visão geral de alto nível do ZERO, recursos e propósito"
read_when:
  - Apresentando o ZERO para novatos
---
# ZERO ∅ (Distro Brasileira)

![ZERO](whatsapp-zero.jpg)

O **ZERO** é o primeiro Sistema Operacional Pessoal Agêntico focado em soberania local e interatividade multicanal de alto desempenho. Imagine uma camada de inteligência transparente que reside em seu hardware local, orquestrando fluxos de trabalho entre dispositivos e plataformas de mensageria com latência ultra-baixa.

O **ZERO** é uma distribuição brasileira criada por **Leandro Azevdo**, baseada no excelente trabalho de **Peter Steinberger & community** (através do projeto [Moltbot](https://molt.bot)).

Enquanto o Moltbot provê a base sólida e a arquitetura modular, o ZERO adapta e expande essa experiência para o mercado brasileiro, focando em localização, soberania de dados, **Segurança Zero Trust** e defesa ativa.

[GitHub](https://github.com/zero/zero) · [Releases](https://github.com/zero/zero/releases) · [Documentação](/) · [Configuração do assistente ZERO](/start/zero)

ZERO conecta WhatsApp (via WhatsApp Web / Baileys), Telegram (Bot API / grammY), Discord (Bot API / channels.discord.js) e iMessage (CLI imsg) a agentes de codificação como o [Pi](https://github.com/badlogic/pi-mono). Plugins adicionam Mattermost (Bot API + WebSocket) e muito mais.
ZERO agora apresenta o **Zero**, seu assistente pessoal com a nova **Interface Altair** (Design Premium estilo nativo).

## Comece aqui

- **Nova instalação do zero:** [Primeiros Passos](/start/getting-started)
- **Configuração guiada (recomendado):** [Mago (Wizard)](/start/wizard) (`zero onboard`)
- **Abra o painel (Interface Altair):** <http://127.0.0.1:18789/> (ou <http://localhost:18789/>)

Se o Gateway estiver rodando no mesmo computador, esse link abre a UI de Controle no navegador imediatamente. Se falhar, inicie o Gateway primeiro: `zero gateway`.

## Painel (UI de Controle no navegador)

O painel é a UI de Controle baseada em navegador para chat, configuração, nós, sessões e muito mais.
Padrão local: <http://127.0.0.1:18789/>
Acesso remoto: [Superfícies Web](/web) e [Tailscale](/gateway/tailscale)

### Arquitetura do Sistema

![Arquitetura Macro](assets/macro-architecture.png)

A maioria das operações flui através do **Gateway** (`zero gateway`), um processo de longa duração único que detém as conexões dos canais e o plano de controle WebSocket.

## Modelo de rede

- **Um Gateway por host (recomendado)**: é o único processo autorizado a deter a sessão do WhatsApp Web. Se você precisar de um bot de resgate ou isolamento estrito, execute múltiplos gateways com perfis e portas isolados; veja [Múltiplos gateways](/gateway/multiple-gateways).
- **Loopback-first**: O WS do Gateway tem como padrão `ws://127.0.0.1:18789`.
  - O mago agora gera um token de gateway por padrão (mesmo para loopback).
  - Para acesso via Tailnet, execute `zero gateway --bind tailnet --token ...` (o token é obrigatório para binds não-loopback).
- **Nós (Nodes)**: conectam-se ao WebSocket do Gateway (LAN/tailnet/SSH conforme necessário); a ponte TCP legada foi depreciada/removida.
- **Hospedeiro Canvas**: Servidor de arquivos HTTP na porta `canvasHost.port` (padrão `18793`), servindo `/__zero__/canvas/` para WebViews de nós; veja [Configuração do Gateway](/gateway/configuration) (`canvasHost`).
- **Uso remoto**: Túnel SSH ou tailnet/VPN; veja [Acesso remoto](/gateway/remote) e [Descoberta](/gateway/discovery).

## Recursos (nível alto)

- 📱 **Integração WhatsApp** — Usa Baileys para o protocolo WhatsApp Web
- ✈️ **Bot Telegram** — DMs + grupos via grammY
- 🎮 **Bot Discord** — DMs + canais de guilda via channels.discord.js
- 🧩 **Bot Mattermost (plugin)** — Token de bot + eventos WebSocket
- 💬 **iMessage** — Integração local via CLI imsg (macOS)
- ∅ **Ponte de Agente** — Pi (modo RPC) com streaming de ferramentas
- ⏱️ **Streaming + fragmentação** — Streaming de blocos + detalhes de streaming de rascunho no Telegram ([/concepts/streaming](/concepts/streaming))
- 🧠 **Roteamento Multi-agente** — Roteia contas/contatos de provedores para agentes isolados (workspace + sessões por agente)
- 🔐 **Autenticação de Assinatura** — Anthropic (Claude Pro/Max) + OpenAI (ChatGPT/Codex) via OAuth
- 💬 **Sessões** — Chats diretos colapsam em um `main` compartilhado (padrão); grupos são isolados
- 👥 **Suporte a Chat de Grupo** — Baseado em menção por padrão; o dono pode alternar `/activation always|mention`
- 📎 **Suporte a Mídia** — Envie e receba imagens, áudio, documentos
- 🗣️ **Voice 2.0 (Zero Voice)** — Real-time Fast Path via **Edge-TTS** + VAD Nativo (Rust) para latência imperceptível.
- 🎭 **Voice Cloning** — Clonagem de voz *zero-shot* (XTTS-v2) integrada para uma experiência agêntica ultra-personalizada.
- 🎨 **Interface Altair** — Nova UI Premium (estilo nativo) com Glassmorphism.
- 🚀 **Mission Control** — Painel central de telemetria e Protocolo de Emergência.
- 🌍 **Globalização & l10n** — Suporte poliglota (Português/Inglês) com **IA Skill Translator** automático.
- ✨ **Customização Visual** — Seletores dinâmicos de Tema (Light/Dark/System) e Idioma na aba Núcleo.
- 🏗️ **Evolução Arquitetural v0.2.0** — Abstração de Traits em Rust, Heartbeat Nativo e Cofre AIEOS para soberania de identidade.
- ⚡ **Modo Kernel-Only** — Execução de baixo consumo (`--kernel-only`) ideal para background e servidores.

---

### Galeria da Interface (Live UI) 📸

| Chat & Assistente (Interface Altair) | Hub de Controle (Telemetria) |
| :--- | :--- |
| ![Chat UI](assets/screenshots/chat-ui-v4.png) | ![Hub UI](assets/screenshots/hub-ui-v4.png) |
| *Modo Foco com comandos proativos e sugestões inteligentes.* | *Visão consolidada da saúde do sistema e conexões.* |

| Núcleo (Aparência) | Atualização de Software (Updates) |
| :--- | :--- |
| ![Appearance Settings](assets/screenshots/settings-ui-v4.png) | ![Update UI](assets/screenshots/update-ui-v4.png) |
| *Refinamento premium dos seletores de tema e idioma.* | *Gerenciador de integridade e versões do sistema.* |

| Catálogo de Skills |
| :--- |
| ![Skills Catalog](assets/screenshots/skills-ui-v4.png) |
| *Extensões para expandir os poderes da sua IA.* |

---

- 🏗️ **Zero Creator** — *Arquiteto Autônomo*. Cria projetos Full-Stack (Next.js, Supabase, Vercel).
- 🏗️ **Zero Creator** — *Arquiteto Autônomo*. Cria projetos Full-Stack (Next.js, Supabase, Vercel).
- 🛡️ **Zero Sentinel** — *Engine Nativa de Resiliência & Segurança*. Auto-correção de erros de terminal (**Self-Healing**), **Speculative Pre-warming** de arquivos e mitigação proativa de injeção de prompt. [Saiba mais](/concepts/sentinel)
- 🚀 **DevOps Suite** — Integrações nativas com Vercel, Netlify, Supabase, Firebase, Railway.
- 💡 **Nudge Engine** — *IA Proativa*. Sugere ações inteligentes baseadas no contexto (ex: "Sexta-feira à tarde?").
- 🧠 **Brain V3** — Plataforma com **Alta Estabilidade**. Memória persistente, **Arquitetura ClearCode** e orquestração proativa de contexto.
- 🦞 **Mascote Zero** — A nova face da sua IA pessoal.
- 🕸️ **Grafo de Conhecimento** — Malha vetorial persistente e navegável em SQLite.
- 🛡️ **Painel de Auditoria** — Logs de segurança em tempo real.
- 🎤 **Notas de voz** — Gancho de transcrição opcional.
- 🖥️ **WebChat + app macOS** — UI local + companheiro de barra de menu.
- 📱 **Nó iOS/Android** — Pareia como um nó e expõe Canvas + Chat.
- 🚀 **Modelos de Elite** — Suporte nativo para os modelos de linguagem mais avançados do mercado.
- ⚡ **Inferência de Alta Performance** — Integração com provedores de computação especializada para latência reduzida.

Nota: Pi é o único caminho oficial para agente de codificação.

## Início rápido

Requisito de ambiente: **Node ≥ 22**.

```bash
# Recomendado: instalação global (npm/pnpm)
npm install -g zero@latest
# ou: pnpm add -g zero@latest

# Onboard + instalação do serviço (serviço de usuário launchd/systemd)
zero onboard --install-daemon

# Parear WhatsApp Web (mostra QR)
zero channels login

# O Gateway roda via serviço após o onboarding; execução manual ainda é possível:
zero gateway --port 18789
```

Alternar entre instalações npm e git depois é fácil: instale o outro sabor e execute `zero doctor` para atualizar o ponto de entrada do serviço do gateway.

A partir do código-fonte (desenvolvimento):

```bash
git clone https://github.com/zero/zero.git
cd zero
pnpm install
pnpm ui:build # instala dependências da UI automaticamente na primeira execução
pnpm build
zero onboard --install-daemon
```

Se você ainda não tem uma instalação global, execute o passo de onboarding via `pnpm zero ...` a partir do repositório.

Início rápido multi-instância (opcional):

```bash
ZERO_CONFIG_PATH=~/.zero/a.json \
ZERO_STATE_DIR=~/.zero-a \
zero gateway --port 19001
```

Enviar uma mensagem de teste (requer um Gateway rodando):

```bash
zero message send --target +15555550123 --message "Olá do ZERO"
```

## Configuração (opcional)

A configuração vive em `~/.zero/zero.json`.

- Se você **não fizer nada**, o ZERO usa o binário Pi integrado em modo RPC com sessões por remetente.
- Se quiser restringir, comece com `channels.whatsapp.allowFrom` e (para grupos) regras de menção.

Exemplo:

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  },
  messages: { groupChat: { mentionPatterns: ["@zero"] } }
}
```

## Documentação

- Comece aqui:
  - [Hubs de Documentação (todas as páginas)](/start/hubs)
  - [Ajuda](/help) ← *correções comuns + solução de problemas*
  - [Configuração](/gateway/configuration)
  - [Exemplos de Configuração](/gateway/configuration-examples)
  - [Comandos Slash](/tools/slash-commands)
  - [Papéis Digitais (Roles)](/concepts/roles)
  - [Roteamento Multi-agente](/concepts/multi-agent)
  - [Atualização / Rollback](/install/updating)
  - [Pareamento (DM + nós)](/start/pairing)
  - [Modo Nix](/install/nix)
  - [Configuração do assistente ZERO (Zero)](/start/zero)
  - [Habilidades (Skills)](/tools/skills)
  - [Configuração de Habilidades](/tools/skills-config)
  - [Templates de Workspace](/reference/templates/AGENTS)
  - [Adaptadores RPC](/reference/rpc)
  - [Guia de Operação do Gateway](/gateway)
  - [Nós (iOS/Android)](/nodes)
  - [Superfícies Web (UI de Controle)](/web)
  - [Descoberta + Transportes](/gateway/discovery)
  - [Acesso remoto](/gateway/remote)
- Provedores e UX:
  - [WebChat](/web/webchat)
  - [UI de Controle (navegador)](/web/control-ui)
  - [Telegram](/channels/telegram)
  - [Discord](/channels/discord)
  - [Mattermost (plugin)](/channels/mattermost)
  - [iMessage](/channels/imessage)
  - [Grupos](/concepts/groups)
  - [Mensagens de grupo WhatsApp](/concepts/group-messages)
  - [Mídia: imagens](/nodes/images)
  - [Mídia: áudio](/nodes/audio)
- Apps acompanhantes:
  - [App macOS](/platforms/macos)
  - [App iOS](/platforms/ios)
  - [App Android](/platforms/android)
  - [Windows (WSL2)](/platforms/windows)
  - [App Linux](/platforms/linux)
- Operações e segurança:
  - [Sessões](/concepts/session)
  - [Jobs Cron](/automation/cron-jobs)
  - [Webhooks](/automation/webhook)
  - [Gmail hooks (Pub/Sub)](/automation/gmail-pubsub)
  - [Segurança](/gateway/security)
  - [Solução de problemas](/gateway/troubleshooting)

## O nome

**ZERO = Arquitetura de Cripta + Pipeline de Alta Disponibilidade** — Porque a soberania de dados não é opcional, é o alicerce da mente digital.

---

*"Estamos todos apenas brincando com nossos próprios prompts."* — uma IA, provavelmente chapada de tokens

## Créditos

- **Colaboradores da Comunidade Open Source** — Habilidades e suporte a localização

## Licença

MIT — Livre para expansão no vácuo digital ∅

---

*"O vazio não é a ausência de algo, mas a presença de tudo o que ainda não foi manifestado."* ∅
