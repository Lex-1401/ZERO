# ZERO - Quality Assurance Test Plan

**QA Architect:** Quinn (Guardian)
**Epic:** Zero Imperfections - The Final Polish (PRD v2.0)
**Status:** DRAFT -> READY FOR REVIEW

## 1. Quality Strategy & Risk Profile

A estabilidade do ecossistema ZERO é crítica. A transição para "Total Type Safety" e "Native ESM" carrega risco alto de regressão em build/runtime se dependências não exportarem arquivos compatíveis. A implementação de Haptics e UX Preditiva envolve APIs nativas de browser/dispositivo que podem não estar disponíveis em ambientes limitados, devendo falhar silenciosamente (graceful degradation).

**Prioridade de Risco:** Alta (Alterações de transição ESM podem quebrar o Gateway silenciosamente em tempo de execução).

## 2. Test Scenarios (Traceability Matrix)

### 2.1 Story 1.1: The Typings Purge

* **Traceability:** FR-None / NFR1
* **Scenario 1.1.A (Static Analysis):** Executar `pnpm run lint:all`. O resultado DEVE ser 0 suppressions/warnings para os types do Typescript. Não deve existir a palavra `any` explícita desprotegida no código.
* **Scenario 1.1.B (Build Integrity):** O comando `pnpm run build:full` deve compilar sem emitir erros do compilador (`tsc`) referenciando incompatibilidades de tipagem estrita no subpacote `ui`.

### 2.2 Story 1.2: ESM Consolidation

* **Traceability:** NFR-General
* **Scenario 1.2.A (No CommonJS leakage):** Inspecionar os build artifacts em `dist/`. O bundler não deve emitir arquivos usando `require(...)` onde `import` dinâmico ou estático é esperado.
* **Scenario 1.2.B (Gateway Startup):** O comando `node scripts/run-node.mjs gateway` deve inicializar o vault sem lançar a exceção `ERR_REQUIRE_ESM`.

### 2.3 Story 1.3: Sensorial UI (Predictivity & Haptics)

* **Traceability:** FR1, FR3, CR2
* **Scenario 1.3.A (Haptics Graceful Degradation):** Executar simulação de mock no objeto `navigator.vibrate = undefined`. Confirmar via Console que e emissão de haptics não lança exceção do tipo `TypeError` que corrompa a thread da UI.
* **Scenario 1.3.B (History Cache Hit):** Iniciar `ZEROApp`. Alternar da Session A para a Session B logo após o carregamento. O tempo exibido para visualização das mensagens antigas deve ser instantâneo (visto pelo DevTools Network tab como carregado do cache local).
* **Scenario 1.3.C (Mobile Context):** Testar a aplicação com `User-Agent` Mobile; verificar disparos array `[20, 30, 20]` de Web Vibration Engine disparando *apenas* em streams de agents compatíveis.

### 2.4 Story 1.4: Resilient Edge (Gateway & VRT)

* **Traceability:** FR2, NFR2
* **Scenario 1.4.A (VRT Light/Dark Theme Switching):** Disparar snapshots limitados através de `test:ui` no modo headless (via Playwright/Vitest Browser). O CSS gerado com variáveis Light (`--bg-main`) deve preservar a altura (height) da árvore DOM em comparação com Dark (`--color-bg-dark`).
* **Scenario 1.4.B (Self-Healing Gateway LLM Fallback):**
  * *Given* que o Provedor A (ex: Anthropic) esteja com a API-Key corrompida localmente.
  * *When* o client envia um prompt e aguarda o socket.
  * *Then* o roteador em `runWithModelFallback` deve registrar o log *"Fallback to Secondary"* e emitir o stream via Provedor B (ex: OpenAI) sem desconectar o websocket local.

## 3. Automated Quality Gates

* **Pre-Merge:** Passar 100% da suíte `vitest run` e `oxlint`.
* **Dependency Check:** Nenhuma nova dependência deprecada inserida.
* **CodeRabbit Sec-Config:** Habilitado para detectar Anti-Patterns de Memory Leak nos WebSockets.

---
**Prepared by:** Quinn (QA Agent)
**Gate Decision requirement before DEV (Dex) can proceed:** `PASS`
