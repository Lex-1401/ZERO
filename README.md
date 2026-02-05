# ∅ ZERO — Sistema Operacional Pessoal Agêntico (A-POS)

![ZERO Header](README-header.png)

> **"A infraestrutura invisível é a mais resiliente."** ∅

[![Status do CI](https://img.shields.io/github/actions/workflow/status/zero/zero/ci.yml?branch=main&style=for-the-badge)](https://github.com/zero/zero/actions/workflows/ci.yml?branch=main)
[![License](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge)](LICENSE)
[![QI](https://img.shields.io/badge/Engineered_by-Master_Team-000000?style=for-the-badge)](https://github.com/zero/zero)

**ZERO** não é apenas uma distribuição de IA; é o ponto de singularidade onde a computação pessoal encontra a autonomia soberana. Projetado como um **Sistema Operacional de Agente (A-POS)**, o ZERO transforma sua máquina em uma fortaleza de inteligência local, eliminando a latência da nuvem e a vigilância corporativa.

[🇺🇸 English Version](README_EN.md)

---

## 🏛️ Filosofia e Princípios de Engenharia

O ecossistema ZERO é construído sobre quatro pilares fundamentais, validados por rigorosos padrões de arquitetura de software:

1. **Soberania Local-First**: Todos os vetores de dados, modelos de pensamento e logs de auditoria residem no seu diretório `~/.zero`. A soberania não é uma opção; é o estado padrão da malha de conhecimento.
2. **Arquitetura Híbrida de Performance**: Um núcleo de performance crítica escrito em **Rust** (gerenciando VAD, telemetria de densidade e criptografia) integra-se perfeitamente com a flexibilidade do **TypeScript** para orquestração de canais.
3. **Segurança Zero Trust (Cripta de Auditoria)**: Cada ação agêntica é registrada em logs permanentes e cifrados. O acesso é governado por políticas de menor privilégio (RBAC) e pareamento de dispositivos via mDNS/Bonjour.
4. **Autonomia Agêntica Proativa**: Através do **Nudge Engine**, o sistema transcende a reatividade, antecipando necessidades baseadas em contexto e operando em loops de deliberação de alta fidelidade.

---

## 🎨 Galeria de Interface (Experiência Altair)

Visualize o **ZERO** em operação. Estes são registros reais da interface de controle unificada:

| Chat & Assistente (Interface Altair) | Catálogo de Habilidades (Marketplace) |
| :--- | :--- |
| ![Chat UI](assets/screenshots/real-chat-ui.png) | ![Skills Catalog](assets/screenshots/real-skills-catalog-ui.png) |
| *Modo Foco com comandos proativos e sugestões inteligentes.* | *Extensões prontas para expandir os poderes da sua IA.* |

| Configurações de Aparência e Idioma | Núcleo do Sistema (Config) |
| :--- | :--- |
| ![Appearance Settings](assets/screenshots/real-appearance-ui.png) | ![Core Settings](assets/screenshots/real-settings-ui.png) |
| *Customização total: Temas dinâmicos e localização PT-BR nativa.* | *Controle granular de cada parâmetro do seu A-POS.* |

---

## 🚀 Guia de Início Rápido para Desenvolvedores

### 🛠️ Pré-requisitos

- **Runtime**: Node.js ≥ 22.x
- **Package Manager**: pnpm (recomendado)
- **Rust Toolchain**: Requerido para compilação nativa do `rust-core`.

### 📦 Instalação do Workspace de Desenvolvimento

1. **Clonagem e Dependências**:

   ```bash
   git clone https://github.com/zero/zero.git
   cd zero
   pnpm install
   ```

2. **Compilação de Subsistemas**:

   ```bash
   pnpm ui:build    # Compila a Interface Altair (Glassmorphism Control UI)
   pnpm build       # Compila o Núcleo TypeScript e Native Core
   ```

3. **Orquestração Inicial**:

   ```bash
   pnpm zero onboard --install-daemon
   ```

   *Isso iniciará o mago de configuração que preparará sua "Origem" (diretório Home), chaves de API e canais de mensageria.*

---

## 📂 Anatomia do Sistema (Developer Layout)

| Diretório | Responsabilidade Técnica |
| :--- | :--- |
| `src/gateway/` | **Medula Espinhal**: Servidor WebSocket RPC, roteamento e coordenação de nós. |
| `src/agents/` | **Córtex**: Lógica do Agente Pi, governança de prompt e Runners de LLM. |
| `rust-core/` | **Motor de Alta Densidade**: Telemetria, VAD e criptografia via NAPI-RS. |
| `src/channels/` | **Sentidos**: Adaptadores para WhatsApp, Telegram, Discord, Slack, iMessage. |
| `ui/` | **Plano de Controle**: Interface Altair desenvolvida com estética premium. |
| `skills/` | **Habilidades**: Extensões isoladas que expandem as capacidades cognitivas do sistema. |

---

## 🛡️ Protocolo de Segurança e Sentinel

O módulo **Zero Sentinel** implementa defesas ativas contra ameaças vetoriais:

- **LLM Security Guardrails**: Detecção nativa de injeção de prompt via Chain-of-Thought (CoT).
- **Redação de PII**: Identificação e ocultação automática de informações sensíveis em tempo real.
- **Panic Protocol**: Interrupção imediata de todos os processos agênticos via `zero panic`.

---

## 🤝 Contribuição e Vibração

Estamos construindo a infraestrutura do amanhã. Contribuições são bem-vindas de engenheiros que buscam a soberania tecnológica.

- **Padrões de Docstrings**: Seguimos o padrão JSDoc rigoroso para documentação técnica.
- **Pilha Moderna**: TS (Node 22), Rust (napi-rs), Vitest, Playwright.

Este repositório é um fork de https://openclaw.ai/ adaptado por **Leandro Azevedo** para Brasileiros, incluindo funcionalidades e segurança.

---

*ZERO é uma ferramenta de precisão. Use-a com intenção.*
