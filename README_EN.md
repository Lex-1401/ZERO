# ∅ ZERO — Agentic Personal Operating System (A-POS)

![ZERO Header](README-header.png)

> **"Infrastructure that remains invisible is the most resilient."** ∅

[![CI Status](https://img.shields.io/github/actions/workflow/status/zero/zero/ci.yml?branch=main&style=for-the-badge)](https://github.com/zero/zero/actions/workflows/ci.yml?branch=main)
[![License](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge)](LICENSE)
[![QI](https://img.shields.io/badge/Engineered_by-PhD_Master_Team-000000?style=for-the-badge)](https://github.com/zero/zero)
[![Version](https://img.shields.io/badge/release-v0.1.0-blue?style=for-the-badge&label=Quintessence)](CHANGELOG.md)

**ZERO** is not merely an AI distribution; it is the singularity point where personal computing meets sovereign autonomy. Designed as an **Agentic Operating System (A-POS)**, ZERO transforms your machine into a fortress of local intelligence, eliminating cloud latency and corporate surveillance.

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

| Chat & Assistant (Altair Interface) | Skill Catalog (Marketplace) |
| :--- | :--- |
| ![Chat UI](assets/screenshots/real-chat-ui.png) | ![Skills Catalog](assets/screenshots/real-skills-catalog-ui.png) |
| *Focus Mode with proactive commands and smart suggestions.* | *Ready-made extensions to expand your AI's powers.* |

| Appearance & Language Settings | System Core (Config) |
| :--- | :--- |
| ![Appearance Settings](assets/screenshots/real-appearance-ui.png) | ![Core Settings](assets/screenshots/real-settings-ui.png) |
| *Total customization: Dynamic themes and native i18n support.* | *Granular control of every parameter of your A-POS.* |

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
   pnpm ui:build    # Compiles the Altair Interface (Glassmorphism Control UI)
   pnpm build       # Compiles the TypeScript Core and Native Core
   ```

2. **Initial Orchestration**:

   ```bash
   pnpm zero onboard --install-daemon
   ```

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

## 🛡️ Security Protocol & Sentinel

The **Zero Sentinel** module implements active defenses against modern vector threats:

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
