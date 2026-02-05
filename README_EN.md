# ∅ ZERO — Agentic Personal Operating System (A-POS)

![ZERO Header](README-header.png)

> **"Infrastructure that remains invisible is the most resilient."** ∅

[![CI Status](https://img.shields.io/github/actions/workflow/status/zero/zero/ci.yml?branch=main&style=for-the-badge)](https://github.com/zero/zero/actions/workflows/ci.yml?branch=main)
[![License](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge)](LICENSE)
[![QI](https://img.shields.io/badge/Engineered_by-PhD_Master_Team-000000?style=for-the-badge)](https://github.com/zero/zero)

**ZERO** is not merely an AI distribution; it is the singularity point where personal computing meets sovereign autonomy. Designed as an **Agentic Operating System (A-POS)**, ZERO transforms your machine into a fortress of local intelligence, eliminating cloud latency and corporate surveillance.

[🇧🇷 Versão em Português](README.md)

---

## 🏛️ Philosophy & Engineering Principles

The ZERO ecosystem is built upon four fundamental pillars, validated by rigorous software architecture standards:

1. **Local-First Sovereignty**: Every data vector, thought model, and audit log resides in your `~/.zero` directory. Sovereignty is not an option; it is the default state of the knowledge mesh.
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

### 📦 Development Workspace Installation

1. **Clone and Dependencies**:

   ```bash
   git clone https://github.com/zero/zero.git
   cd zero
   pnpm install
   ```

2. **Subsystem Compilation**:

   ```bash
   pnpm ui:build    # Compiles the Altair Interface (Glassmorphism Control UI)
   pnpm build       # Compiles the TypeScript Core and Native Core
   ```

3. **Initial Orchestration**:

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

---

## 🛡️ Security Protocol & Sentinel

The **Zero Sentinel** module implements active defenses against modern vector threats:

- **LLM Security Guardrails**: Native prompt injection detection via Chain-of-Thought (CoT).
- **PII Redaction**: Automatic identification and masking of sensitive information in real-time.
- **Panic Protocol**: Immediate interruption of all agentic processes via `zero panic`.

---

## 🤝 Contribution & Vibe

We are building the infrastructure of tomorrow. Contributions are welcome from engineers who share our vision of technological sovereignty.

- **Docstring Standards**: We follow rigorous JSDoc standards for Master-level technical documentation.
- **Modern Stack**: TS (Node 22), Rust (napi-rs), Vitest, Playwright.

Special thanks to **Leandro Azevedo** and all the pioneers shaping ZERO. ∅

---

*ZERO is a precision tool. Use it with intent.*
