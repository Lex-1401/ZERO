---
summary: "High-level overview of ZERO, features, and purpose"
read_when:
  - Introducing ZERO to newcomers
---

# ZERO ∅ (Brazilian Distro)

**ZERO** is the first Agentic Personal Operating System focused on local sovereignty and high-performance multi-channel interactivity. Imagine a transparent intelligence layer that resides in your local hardware, orchestrating workflows across devices and messaging platforms with ultra-low latency.

**ZERO** is a Brazilian distribution created by **Leandro Azevedo**, based on the excellent work of **Peter Steinberger & community** (via the [Moltbot](https://molt.bot) project).

While Moltbot provides the solid foundation and modular architecture, ZERO adapts and expands this experience for the Brazilian and international market, focusing on localization, data sovereignty, **Zero Trust Security**, and active defense.

<p align="center">
  <a href="https://github.com/zero/zero">GitHub</a> ·
  <a href="https://github.com/zero/zero/releases">Releases</a> ·
  <a href="/">Documentation</a> ·
  <a href="/start/zero">ZERO Assistant Setup</a>
</p>

ZERO connects WhatsApp (via WhatsApp Web / Baileys), Telegram (Bot API / grammY), Discord (Bot API / channels.discord.js), and iMessage (imsg CLI) to coding agents like [Pi](https://github.com/badlogic/pi-mono). Plugins add Mattermost (Bot API + WebSocket) and much more.
ZERO now features **Zero**, your personal assistant with the new **Altair Interface** (Native-style Premium Design).

## Get Started

- **New zero install:** [Getting Started](/start/getting-started)
- **Guided setup (recommended):** [Wizard](/start/wizard) (`zero onboard`)
- **Open the dashboard (Altair Interface):** <http://127.0.0.1:18789/> (or <http://localhost:18789/>)

If the Gateway is running on the same computer, this link opens the Control UI in the browser immediately. If it fails, start the Gateway first: `zero gateway`.

## Dashboard (Browser Control UI)

The dashboard is the browser-based Control UI for chat, configuration, nodes, sessions, and more.
Local default: <http://127.0.0.1:18789/>
Remote access: [Web Surfaces](/web) and [Tailscale](/gateway/tailscale)

### System Architecture

![Macro Architecture](assets/macro-architecture.png)

Most operations flow through the **Gateway** (`zero gateway`), a single long-running process that holds channel connections and the WebSocket control plane.

## Networking Model

- **One Gateway per host (recommended)**: It is the only process authorized to hold the WhatsApp Web session. If you need a rescue bot or strict isolation, run multiple gateways with isolated profiles and ports; see [Multiple gateways](/gateway/multiple-gateways).
- **Loopback-first**: The Gateway WS defaults to `ws://127.0.0.1:18789`.
  - The wizard now generates a gateway token by default (even for loopback).
  - For Tailnet access, run `zero gateway --bind tailnet --token ...` (token is mandatory for non-loopback binds).
- **Nodes**: Connect to the Gateway WebSocket (LAN/tailnet/SSH as needed); legacy TCP bridge is deprecated/removed.
- **Canvas Host**: HTTP file server on `canvasHost.port` (default `18793`), serving `/__zero__/canvas/` for node WebViews; see [Gateway Configuration](/gateway/configuration) (`canvasHost`).
- **Remote use**: SSH tunnel or tailnet/VPN; see [Remote access](/gateway/remote) and [Discovery](/gateway/discovery).

## High-Level Features

- 📱 **WhatsApp Integration** — Uses Baileys for the WhatsApp Web protocol
- ✈️ **Telegram Bot** — DMs + groups via grammY
- 🎮 **Discord Bot** — DMs + guild channels via channels.discord.js
- 🧩 **Mattermost Bot (plugin)** — Bot token + WebSocket events
- 💬 **iMessage** — Local integration via imsg CLI (macOS)
- ∅ **Agent Bridge** — Pi (RPC mode) with tool streaming
- ⏱️ **Streaming + Chunking** — Chunked streaming + draft streaming details on Telegram ([/concepts/streaming](/concepts/streaming))
- 🧠 **Multi-agent Routing** — Routes provider accounts/contacts to isolated agents (workspace + sessions per agent)
- 🔐 **Subscription Auth** — Anthropic (Claude Pro/Max) + OpenAI (ChatGPT/Codex) via OAuth
- 💬 **Sessions** — Direct chats collapse into a shared `main` (default); groups are isolated
- 👥 **Group Chat Support** — Mention-based by default; owner can toggle `/activation always|mention`
- 📎 **Media Support** — Send and receive images, audio, documents
- 🗣️ **Voice 2.0 (Zero Voice)** — Real-time Fast Path via **Edge-TTS** + Native VAD (Rust) for imperceptible latency.
- 🎭 **Voice Cloning** — Integrated _zero-shot_ voice cloning (XTTS-v2) for an ultra-personalized agentic experience.
- 🎨 **Altair Interface** — New Premium UI (native style) with Glassmorphism.
- 🚀 **Mission Control** — Central telemetry dashboard and Emergency Protocol.
- 🌍 **Globalization & l10n** — Polyglot support (Portuguese/English) with automatic **IA Skill Translator**.
- ✨ **Visual Customization** — Dynamic Theme (Light/Dark/System) and Language selectors in the Core tab.
- 🏗️ **Architectural Evolution v0.2.0** — Rust Traits abstraction, Native Heartbeat, and AIEOS Vault for identity sovereignty.
- ⚡ **Kernel-Only Mode** — Low-resource execution (`--kernel-only`) ideal for background and servers.

---

### Interface Gallery (Live UI) 📸

_Altair Interface screenshots are being renewed for the v0.4.0 (Turing Wolf) standard._

---

- 🏗️ **Zero Creator** — _Autonomous Architect_. Creates Full-Stack projects (Next.js, Supabase, Vercel).
- 🛡️ **Zero Sentinel** — _Native Resilience & Security Engine_. Terminal error auto-correction (**Self-Healing**), **Speculative Pre-warming** of files, and proactive prompt injection mitigation. [Learn more](/concepts/sentinel)
- 🚀 **DevOps Suite** — Native integrations with Vercel, Netlify, Supabase, Firebase, Railway.
- 💡 **Nudge Engine** — _Proactive AI_. Suggests smart actions based on context (e.g., "Friday afternoon?").
- 🧠 **Brain V3** — **S-Rank Stability** Platform. Persistent memory, **ClearCode Architecture**, and proactive context orchestration.
- 🦞 **Zero Mascot** — The new face of your personal AI.
- 🕸 **Knowledge Graph** — Persistent and navigable vector mesh in SQLite.
- 🛡️ **Audit Dashboard** — Real-time security logs.
- 🎤 **Voice notes** — Optional transcription hook.
- 🖥️ **WebChat + macOS app** — Local UI + menu bar companion.
- 📱 **iOS/Android Node** — Pairs as a node and exposes Canvas + Chat.

Note: Pi is the only official path for a coding agent.

## Quick Start

Environment requirement: **Node ≥ 22**.

```bash
# Recommended: global installation (npm/pnpm)
npm install -g zero@latest
# or: pnpm add -g zero@latest

# Onboard + service installation (launchd/systemd user service)
zero onboard --install-daemon

# Pair WhatsApp Web (shows QR)
zero channels login

# The Gateway runs via service after onboarding; manual execution is still possible:
zero gateway --port 18789
```

Switching between npm and git installs later is easy: install the other flavor and run `zero doctor` to update the gateway service entry point.

From source (development):

```bash
git clone https://github.com/zero/zero.git
cd zero
pnpm install
pnpm ui:build # installs UI deps automatically on first run
pnpm build
zero onboard --install-daemon
```

If you don't have a global install yet, run the onboarding step via `pnpm zero ...` from the repository.

Multi-instance quick start (optional):

```bash
ZERO_CONFIG_PATH=~/.zero/a.json \
ZERO_STATE_DIR=~/.zero-a \
zero gateway --port 19001
```

Send a test message (requires a running Gateway):

```bash
zero message send --target +15555550123 --message "Hello from ZERO"
```

## Configuration (optional)

Configuration lives in `~/.zero/zero.json`.

- If you **do nothing**, ZERO uses the integrated Pi binary in RPC mode with sessions per sender.
- If you want to restrict, start with `channels.whatsapp.allowFrom` and (for groups) mention rules.

Example:

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  messages: { groupChat: { mentionPatterns: ["@zero"] } },
}
```

## Documentation

- Start here:
  - [Documentation Hubs (all pages)](/start/hubs)
  - [Help](/help) ← _common fixes + troubleshooting_
  - [Configuration](/gateway/configuration)
  - [Configuration Examples](/gateway/configuration-examples)
  - [Slash Commands](/tools/slash-commands)
  - [Multi-agent Routing](/concepts/multi-agent)
  - [Update / Rollback](/install/updating)
  - [Pairing (DM + nodes)](/start/pairing)
  - [Nix Mode](/install/nix)
  - [ZERO Assistant Configuration (Zero)](/start/zero)
  - [Skills](/tools/skills)
  - [Skills Configuration](/tools/skills-config)
  - [Workspace Templates](/reference/templates/AGENTS)
  - [RPC Adapters](/reference/rpc)
  - [Gateway Operation Guide](/gateway)
  - [Nodes (iOS/Android)](/nodes)
  - [Web Surfaces (Control UI)](/web)
  - [Discovery + Transports](/gateway/discovery)
  - [Remote access](/gateway/remote)
- Providers and UX:
  - [WebChat](/web/webchat)
  - [Control UI (browser)](/web/control-ui)
  - [Telegram](/channels/telegram)
  - [Discord](/channels/discord)
  - [Mattermost (plugin)](/channels/mattermost)
  - [iMessage](/channels/imessage)
  - [Groups](/concepts/groups)
  - [WhatsApp group messages](/concepts/group-messages)
  - [Media: images](/nodes/images)
  - [Media: audio](/nodes/audio)
- Companion Apps:
  - [macOS App](/platforms/macos)
  - [iOS App](/platforms/ios)
  - [Android App](/platforms/android)
  - [Windows (WSL2)](/platforms/windows)
  - [Linux App](/platforms/linux)
- Operations and Security:
  - [Sessions](/concepts/session)
  - [Cron Jobs](/automation/cron-jobs)
  - [Webhooks](/automation/webhook)
  - [Gmail hooks (Pub/Sub)](/automation/gmail-pubsub)
  - [Security](/gateway/security)
  - [Troubleshooting](/gateway/troubleshooting)

## The Name

**ZERO = Crypt Architecture + High Availability Pipeline** — Because data sovereignty is not optional, it is the foundation of the digital mind.

---

### 🦊 Visual Identity: The Turing Wolf

The **ZERO** logo — a fusion of the letter **"Z"** with a **Cybernetic Wolf/Fox** — represents the essence of agentic intelligence:

- **Instinct and Agility**: Like a wolf, the system has sharp instincts to navigate your file system and act with surgical precision.
- **Sovereign Solitude**: The wolf is a symbol of independence. ZERO operates locally, without depending on "packs" of third-party servers to process its mind.
- **Man-Machine Fusion**: The metallic structure with pulsing cyan circuits symbolizes the harmony between human design and raw computational power. It is technology serving life, not the other way around.

---

_"We're all just playing with our own prompts."_ — an AI, probably token-high

## Credits

- **Open Source Community Contributors** — Skills and localization support

## License

MIT — Free for expansion in the digital vacuum ∅

---

_"The void is not the absence of something, but the presence of everything that has not yet been manifested."_ ∅
