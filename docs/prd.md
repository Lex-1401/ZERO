# ZERO - Brownfield Enhancement PRD

**Title:** Refinação Estética e Técnica do Ecossistema ZERO
**Version:** 2.0
**Mode:** Interactive (Advanced Elicitation)

## 1. Intro Project Analysis and Context

**Analysis Source:** User-provided information and IDE interaction history.
**Current Project State:** O ecossistema ZERO (A-POS) é uma plataforma avançada de orquestração de agentes. O objetivo atual é quebrar as últimas barreiras rumo a um score de 100/100, através de melhorias incisivas (mas não destrutivas) de UI, UX Preditiva, Code Security e Testing. Já avançamos na sanitização do README e paridade do Light Mode, mas requeremos a implementação consolidada de automações e feedbacks.

### 1.1 Available Documentation

* [x] Tech Stack Documentation
* [x] Source Tree/Architecture
* [ ] Coding Standards (to be reinforced)
* [x] UI/UX Guidelines (design-system.css)

### 1.2 Enhancement Scope Definition

* **Enhancement Type:** UI/UX Overhaul & Bug Fix/Stability Improvements
* **Description:** Implementação de Haptic Feedback (mobile), testes de regressão visual, self-healing gateway robusto e encerramento da migração de CommonJS para Native ESM com tipagem 100% estrita.
* **Impact Assessment:** Moderate Impact (Alterações focadas em estilos, tipagens e entrypoints de proxy/gateway, sem reescrita profunda do core logico em Rust).

## 2. Goals and Background Context

### 2.1 Goals

* Alcançar "Total Type Safety" removendo todos os resíduos do tipo `any`.
* Finalizar a transição para ESM puro em todos os subpacotes Node.js (Zero CommonJS).
* Garantir a paridade total e responsividade "pixel-perfect" do Light Mode.
* Implementar Feedback Háptico e UX Preditiva (Zero latency percebida) nas rotas críticas.
* Implementar automação de Visual Regression Testing (VRT).
* Garantir mecanismo Self-Healing no ZERO Gateway em falhas de LLMs.

### 2.2 Background Context

A magia do ecossistema ZERO depende da invisibilidade de sua complexidade ("The best setup is no setup"). Para manter essa promessa, a estabilidade e previsibilidade (type safety, testes de regressão visual) são fundamentais. A estética visual (Light vs Dark Mode) e tátil (Haptic feedback) devem refletir a sofisticação da infraestrutura de IA rolando por trás (Rust Vault + Multi-Agent).

## 3. Requirements

### 3.1 Functional (FR)

* **FR1:** O `ZEROApp` deve realizar o "prefetch" dos 3 últimos históricos de chat em segundo plano logo após autenticação.
* **FR2:** O sistema `runWithModelFallback` deve detectar falhas no provedor primário (timeout, rate limit) e migrar o roteamento para o secundário em menos de 1000ms.
* **FR3:** Tool streams (`ui/src/ui/app-tool-stream.ts`) devem disparar sinais hápticos (pulse, double pulse) através da Web Vibration API (ou bridge nativo) durantes subfases (`thinking`, `compaction`).

### 3.2 Non-Functional (NFR)

* **NFR1:** Coleta rigorosa de todos os `eslint` warnings referentes ao uso explícito de `any` ou type-casting inseguro.
* **NFR2:** 100% das asserções de snapshot de UI não devem quebrar ao alternar do tema `dark` para `light`.

### 3.3 Compatibility Requirements (CR)

* **CR1:** Manter a API WebSocket do Gateway inalterada para garantir a estabilidade do fluxo de chat atual com o backend Rust.
* **CR2:** As variáveis do `design-system.css` devem suportar fallback seguro em browsers mais antigos que não suportam LCH ou Display-P3.

## 4. Epic & Stories Structure

**Epic 1: Zero Imperfections - The Final Polish**
*This epic targets the "last mile" polish, converting a 98% system into a true 100% masterpiece, touching strictly UI rendering, typing validation, and automated QA gates.*

* **Story 1.1: The Typings Purge**
  * **Goal:** Replace all `any` usages with exact interfaces or `unknown`/`Record<string, unknown>`.
  * **AC:** `pnpm run lint:all` returns 0 warnings regarding `any` types.
* **Story 1.2: ESM Consolidation**
  * **Goal:** Verify and convert remaining CommonJS require/exports.
  * **AC:** No `require()` calls exist outside of permitted polyfills/scripts. `type: module` validated globally.
* **Story 1.3: Sensorial UI (Predictivity & Haptics)**
  * **Goal:** Plug history prefetch in `app.ts` and Vibration traces in `app-tool-stream.ts`.
  * **AC:** Cache hit rate >90% on recent session navigation; Haptics trigger sequentially without JS errors.
* **Story 1.4: Resilient Edge (Gateway & VRT)**
  * **Goal:** Setup snapshot diff testing and validate zero-downtime Gateway fallback.
  * **AC:** `vitest --update` successfully secures visual baselines; Failed provider requests auto-heal transparently.
