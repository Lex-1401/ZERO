# Story-003: Localização PT-BR e Refinamento de UX/UI

**Status**: Ready
**Agent**: @dev / @ux-design-expert
**Priority**: High
**PRD Reference**: PRD-002 (FR-TR, FR-UI)

## 1. Contexto e Problema

A interface atual apresenta inconsistências estéticas e linguísticas. Há botões que não respondem (Save/Revert) e textos em inglês que quebram a experiência do usuário brasileiro.

## 2. Critérios de Aceite

- [ ] 100% das strings visíveis em `ui/src` traduzidas para PT-BR.
- [ ] Botões de "Salvar Configurações" enviando o payload corretamente para o Gateway.
- [ ] Contraste do texto verificado e aprovado nos painéis Dark/Glassmorphism.
- [ ] Logo substituído por versão com fundo transparente e alta resolução.

## 3. Tarefas Técnicas (Issues)

- [ ] **Task 3.1**: Executar `grep` em `ui/src` para identificar strings hardcoded.
- [ ] **Task 3.2**: Implementar / Atualizar os handlers de `onClick` no `ControlPanel.tsx` (ou similar).
- [ ] **Task 3.3**: Aplicar `backdrop-filter` e ajustes de cores de fonte via CSS Variables.
- [ ] **Task 3.4**: Gerar novo logo via AI Skill e aplicar em `ui/public`.

---

— River, Scrum Master 🌊
