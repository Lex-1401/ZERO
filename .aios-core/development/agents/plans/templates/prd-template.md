# 🎯 PRD: [NOME_DA_FUNCIONALIDADE]

## 🔍 1. RESEARCH & CONTEXT

- **Current State Analysis:** Descrição técnica de como o sistema se comporta hoje.
- **Files Involved:** Lista de arquivos relevantes encontrados durante a varredura.
- **Patterns Identified:** Padrões de design (Design Systems, Hooks, Rust-core patterns) que devem ser respeitados.

## 🛠️ 2. PROBLEM DEFINITION

- **The "Why":** Qual dor real do usuário ou dívida técnica estamos resolvendo?
- **Constraints:** Limites de hardware (ARM vs x64), latência ou segurança Sentinel.

## 🛡️ 3. SRE & SECURITY BOUNDARIES

- **Blast Radius:** O que pode quebrar se essa funcionalidade falhar?
- **Sentinel Audit Goal:** Quais vetores de ataque precisamos mitigar nesta implementação?
- **Performance Baseline:** Impacto esperado no bundle size ou tempo de processamento.

## ✅ 4. SUCCESS CRITERIA

- [ ] O código segue a Modularidade Atômica (< 500 linhas).
- [ ] JSDoc atualizado.
- [ ] Teste de unidade e E2E previstos.

---
> **Ação:** PRD criado. Favor limpar janela de contexto (clear context) para iniciar a Spec.
