# ∅ ZERO — Agentic Personal Operating System

![ZERO Header](README-header.png)

> **"Infrastructure that remains invisible is the most resilient."** ∅

[![CI Status](https://img.shields.io/github/actions/workflow/status/zero/zero/ci.yml?branch=main&style=for-the-badge)](https://github.com/zero/zero/actions/workflows/ci.yml?branch=main)
[![License](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge)](LICENSE)
[![QI](https://img.shields.io/badge/Engineered_by-PhD_Master_Team-000000?style=for-the-badge)](https://github.com/zero/zero)
[![Version](https://img.shields.io/badge/release-v0.1.0-blue?style=for-the-badge)](CHANGELOG.md)

**ZERO** is not merely an AI distribution; it is the singularity point where personal computing meets sovereign autonomy. Designed as an **Agentic Operating System**, ZERO transforms your machine into a fortress of local intelligence, eliminating cloud latency and corporate surveillance.

[🇧🇷 Versão em Português](README.md)

---

## 🏛️ Philosophy & Engineering Principles

The ZERO ecosystem is built upon four fundamental pillars, validated by rigorous software architecture standards:

1. **Local-First Sovereignty (Local LLMs)**: Every data vector, thought model, and audit log resides in your `~/.zero` directory. With native **Ollama** support and models like **Llama 3.2**, ZERO ensures your autonomy even without a cloud connection.
2. **Hybrid Performance Architecture**: A performance-critical core written in **Rust** (handling density telemetry, VAD, and encryption) integrates seamlessly with the flexibility of **TypeScript** for channel orchestration.
3. **Zero Trust Security (Audit Crypt)**: Every agentic action is recorded in permanent, encrypted logs. Access is governed by least-privilege (RBAC) policies and explicit device pairing via mDNS/Bonjour.
4. **Proactive Agentic Autonomy**: Through the **Nudge Engine**, the system transcends reactivity—it anticipates needs based on context, operating within high-fidelity deliberation loops.

---

## 🎨 Interface Gallery (The Altair Experience)

Visualize **ZERO** in operation. These are real captures of the unified control interface:

| Chat & Assistant (Altair Interface) | Control Hub (Telemetry) |
| :--- | :--- |
| ![Chat UI](assets/screenshots/chat-ui-v3.png) | ![Hub UI](assets/screenshots/hub-ui-v3.png) |
| *Focus Mode with proactive commands and smart suggestions.* | *Consolidated view of system health and connections.* |

| System Core (Appearance) | Software Update (Updates) |
| :--- | :--- |
| ![Core Settings](assets/screenshots/settings-ui-v3.png) | ![Update UI](assets/screenshots/update-ui-v3.png) |
| *Granular control of every parameters of your System.* | *Proactive version management and integrity via Git/PNPM.* |

| Skill Catalog (Marketplace) |
| :--- |
| ![Skills Catalog](assets/screenshots/skills-ui-v3.png) |
| *Ready-made extensions to expand your AI's powers.* |

---

## 📐 Blueprints & Systemic Anatomy

ZERO is designed with the rigor of aeronautical engineering. Below is the Blueprint of our agentic architecture:

![ZERO Architecture Blueprint](assets/blueprint-arch.png)

*Agentic Cortex Schema: Integration between the Rust Engine and the Altair Interface.*

---

---

## 🚀 Developer Quick Start

### 🛠️ Prerequisites

- **Runtime**: Node.js ≥ 22.x
- **Package Manager**: pnpm (recommended)
- **Rust Toolchain**: Required for native compilation of the `rust-core`.

#### 💻 System Requirements (Hardware)

To ensure stability and performance:

- **🖥️ Local Desktop (Mac/Windows/Linux)**:
  - **Minimum**: 8 GB RAM (ZERO has low overhead, but OS + Browser need the rest).
  - **Recommended**: 16 GB+ RAM (For fluid use with VS Code + Browser + ZERO).
- **🌐 Server / VPS (Cloud)**:
  - **Minimum**: 1 vCPU, 1 GB RAM (with Swap), 20 GB SSD.
  - **Ideal**: 2 vCPUs, 2 GB+ RAM, 40 GB+ SSD.
  - **Elite**: 4 vCPUs, 4 GB+ RAM (For browser automation and multiple agents).

### 🛠️ One-Liner Installation (Simplified)

Choose the method that best fits your environment:

#### 🖥️ Local (Mac/Linux/Windows WSL)

Ideal for developers and daily use on a personal computer.

```bash
curl -fsSL https://raw.githubusercontent.com/Lex-1401/ZERO/main/quickstart.sh | bash
```

#### 🌐 VPS / Cloud (Docker)

Ideal for keeping ZERO online 24/7 with total isolation.

```bash
curl -fsSL https://raw.githubusercontent.com/Lex-1401/ZERO/main/deploy-docker.sh | bash
```

### 📦 Development Workspace Installation (Manual)

   ```bash
   git clone https://github.com/zero/zero.git
   cd zero
   pnpm install
   ```

1. **Subsystem Compilation**:

    ```bash
    pnpm build:full  # Compiles Subsystems (Rust), UI, and TS Core
    ```

2. **Initial Orchestration**:

    ```bash
    pnpm zero onboard --install-daemon
    ```

    *💡 If the command above fails with "command not found", ensure pnpm is correctly configured (`pnpm setup`) or use `pnpm zero onboard` instead.*

   *This will launch the configuration wizard to prepare your "Origin" (Home directory), API keys, and messaging channels.*

---

## 📂 System Anatomy (Developer Layout)

| Directory | Technical Responsibility |
| :--- | :--- |
| `src/gateway/` | **Spinal Cord**: WebSocket RPC server, routing, and node coordination. |
| `src/agents/` | **Cortex**: Pi Agent logic, prompt governance, and LLM Runners. |
| `rust-core/` | **High-Density Engine**: Telemetry, VAD, and encryption via NAPI-RS. |
| `src/channels/` | **Senses**: Adapters for WhatsApp, Telegram, Discord, Slack, iMessage. |
| `ui/` | **Control Plane**: Altair Interface developed with premium aesthetics. |
| `skills/` | **Skills**: Isolated functional extensions that expand cognitive capabilities. |
| `src/realtime/` | **Perception**: Low-latency multimodal engine (WebSocket) for audio/video streaming and semantic routing. |

---

## ∅ The ZERO Manifesto

**ZERO is not just a name. It is a living concept.**

- **The Void that Contains Infinity**: Like an AI agent with full-stack access to your hardware, ZERO appears invisible, but it is limitless. It is the algorithmic poetry of a system that does not seek attention but delivers freedom.
- **Point of Origin**: Everything starts from zero. It represents the "Zero Point" or the "Origin." It is the pursuit of **Zero Latency**, **Zero Trust**, and a return to total sovereignty, where control begins and ends with the user, without intermediaries. It is the necessary reset for truly personal computing.
- **Symbol of Subversion**: The zero that breaks systems and annuls assumptions. It is neurodivergence applied to code: what society says "doesn't fit" is, in fact, the foundation of everything.
- **Radical Humility**: A simultaneous act of defense and offense. "You said I am no one? Now I see I am everything."

> **"What you cannot see working is exactly what is making it work."**

ZERO operates in silence. Invisible. Neglected by the giants, yet sustaining your new sovereign infrastructure. When they ask "what is this?", don't explain. Show it working.

**Install ZERO. See what happens. ∅**

---

## 🛡️ Security Protocol & Sentinel

The **Zero Sentinel** module implements active defenses against modern vector threats:

![Zero Sentinel Artwork](assets/sentinel-artwork.png)

- **LLM Security Guardrails**: Native prompt injection detection via Chain-of-Thought (CoT).
- **PII Redaction**: Automatic identification and masking of sensitive information in real-time.
- **Panic Protocol**: Immediate interruption of all agentic processes via `zero panic`.
- **Local LLM Sovereignty**: Optimized integration with Ollama for Llama 3.x and DeepSeek models.

---

## 🤝 Contribution & Vibe

We are building the infrastructure of tomorrow. Contributions are welcome from engineers who share our vision of technological sovereignty.

- **Docstring Standards**: We follow rigorous JSDoc standards for Master-level technical documentation.
- **Modern Stack**: TS (Node 22), Rust (napi-rs), Vitest, Playwright.

Special thanks to **Leandro Azevedo** and all the pioneers shaping ZERO. ∅

---

*ZERO is a precision tool. Use it with intent.*
