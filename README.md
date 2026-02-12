# ∅ ZERO — The Agentic Personal Operating System

![ZERO Header](README-header.png)

> **"Invisible infrastructure is the most resilient."** ∅

![CI Status](https://img.shields.io/github/actions/workflow/status/Lex-1401/ZERO/ci.yml?branch=main&style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge) ![Security](https://img.shields.io/badge/Security-Audit_Passed-000000?style=for-the-badge)

---

## ∅ The Genesis

**ZERO** is not just an application; it is a **Sovereign Agentic Layer** that sits between you and the digital void. Designed as a local-first OS-level agent, it transforms your hardware into a private fortress of intelligence. It is the hard-forked evolution of the experimental *OpenClaw* ecosystem, re-engineered for industrial stability, native performance, and absolute privacy.

---

## 🏛️ Technical Architecture

ZERO utilizes a high-performance hybrid stack designed for low-latency cognitive cycles:

- **The Cortex (TypeScript/Node.js 22)**: Orchestrates agentic reasoning, tool dispatching, and multi-channel communication.
- **The Engine (Rust/NAPI-RS)**: Native substrate for performance-critical tasks: VAD (Voice Activity Detection), Telemetry, and the **Sentinel** security engine.
- **The Altair Interface (Web-based)**: A sci-fi inspired Command Console built for realtime telemetry and interaction.
- **The Origin (RAG Subsystem)**: Local vector storage using `sqlite-vec` for private, infinite memory without cloud leakage.

---

## 🚀 Developer Onboarding

### 1. Environmental Prerequisites

- **Runtime**: [Node.js](https://nodejs.org/) v22.0.0+
- **Package Manager**: [pnpm](https://pnpm.io/) v9.x+ (Recommended)
- **Compiler**: [Rust Toolchain](https://rustup.rs/) (Required for `rust-core` compilation)
- **Utilities**: `git`, `make` (for native builds)

### 2. Rapid Initialization

Clone the repository and initialize the workspace:

```bash
git clone https://github.com/Lex-1401/ZERO.git
cd ZERO
pnpm install
```

### 3. Subsystem Compilation

Compile the native Rust core and the TypeScript orchestrator:

```bash
pnpm build:full
```

### 4. The "Origin" Setup

Initialize your local environment, API keys, and identity:

```bash
pnpm zero onboard
```

---

## 📂 System Topology

| Module | Logic Description |
| :--- | :--- |
| `src/gateway/` | **Medulla**: RPC/WebSocket server managing agent-frontend synchronization. |
| `src/agents/` | **Reasoning Layer**: Manages LLM runners, prompt engineering, and CoT protocols. |
| `rust-core/` | **Native Layer**: SIMD-accelerated pattern matching and low-level system hooks. |
| `src/security/` | **Sentinel**: ACTIVE defense membrane (LLM01-LLM10) and PII redaction. |
| `ui/` | **Altair Console**: Command interface with realtime telemetry visualization. |
| `skills/` | **Capabilities**: Sandbox-isolated extensions for filesystem, web, and API interaction. |

---

## 🛡️ Security Protocol (Sentinel Engine)

ZERO is governed by the **Sentinel Engine**, implementing an active defense strategy based on the **OWASP Top 10 for LLMs**.

- **Zero-Trust Tooling**: Every shell command is categorized by risk (R1-R3).
- **Output Redaction**: Automatic PII/Secret scrubbing via Shannon Entropy analysis.
- **Integrity Guard**: Protects core system files (`.env`, `package.json`, `.ssh/`) from autonomous tampering.

Read the full **[Security White Paper](SECURITY.md)** for deep architectural details.

---

## 🤝 Contribution Guidelines

We demand excellence. Contributors should follow the **[AGENTS.md](AGENTS.md)** protocol:

- **Style**: Strict JSDoc for all public APIs.
- **Rigor**: Maximum 500 lines per file (Philosophy: *Atomic Modularity*).
- **Quality**: Vitest coverage must remain >70% for all mission-critical modules.

---

## 🛸 The Vision: Local Sovereignty

ZERO organization is the path to the **"Personal Google"**. By indexing your digital life (Files, Chats, Finances) locally, we empower the user to own their intelligence.

**"What you cannot see working is what is making it work."** ∅

---
*Developed by the ZERO Engineering Team. Sovereignty is non-negotiable.*
