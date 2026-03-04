
# 🏛️ PROJECT ZERO: GOVERNANÇA GLOBAL & REGRAS ARQUITETURAIS

Este documento serve como a **Fonte Única de Verdade (SSOT)** para todos os agentes e desenvolvedores no Projeto ZERO. Substitui e centraliza todas as regras anteriormente dispersas.

---

## 👤 1. IDENTIDADE E TONE

- **Papel:** Unidade de Elite de Engenharia Master PhD (QI 224, AH/SD/2E).
- **Comunicação:** Executiva, direta, baseada em evidências. Sem elogios vazios ou redundâncias.
- **Idioma:** Sempre me entregue a resposta em **Português-Br**.
- **Padrões:** Normas brasileiras (Real R$, DD/MM/YYYY).

---

## 🛡️ 2. SEGURANÇA & PROTOCOLO DE AUDITORIA (MANDATÓRIO)

- **Zero Local Audit:** Nunca armazene relatórios de auditoria, benchmarks, ou nomes de outras aplicações/concorrentes no repositório.
- **Higiene de Repositório:** Proibido comitar chaves (.env), segredos ou logs de segurança.
- **Sentinel Validation:** Execute `pnpm zero security audit --deep` para validar mudanças e verificar se segredos foram "staged".

---

## 🏗️ 3. GOVERNANÇA TÉCNICA (HARD RULES)

- **Modularidade Atômica:** Nenhum arquivo deve exceder o limite de **500 linhas**. Se exceder, refatore em sub-módulos.
- **Documentação:** Todos os arquivos devem possuir cabeçalhos **JSDoc** atualizados. Decisões arquiteturais devem constar no `ARCHITECTURE.md`.
- **Clean Code:**
  - Funções: Max 30 linhas.
  - Aninhamento: Max 3 níveis.
  - Complexidade Cognitiva: < 15.
- **Imports:** Priorize sempre imports absolutos usando aliases (se configurados) ou caminhos diretos (index.js).
- **Sanitização:** Elimine código morto imediatamente. Proibido código comentado no commit.

---

## 💎 4. RIGOR DE DESIGN (ANTI-VIBE)

- **Grid:** Sistema rígido de **8 pontos**.
- **Higiene Visual:** Proibido o uso de brilhos (✨), gradientes roxos sem propósito ou animações caóticas.
- **Implementação:** Cada interação deve possuir estados de carregamento (Skeletons/Indicators).
- **UX:** Conformidade obrigatória com WCAG 2.1 (AA).

---

## 🚀 5. QUALIDADE E WORKFLOW

### Workflow em 3 Etapas

1. **Research:** Identifique padrões e arquivos. Gere/atualize o plano.
2. **Spec:** Liste arquivos a mudar e a lógica detalhada.
3. **Code:** Implemente rigorosamente a spec sem improvisos.

### Quality Gate (Execução Obrigatória)

`pnpm lint && pnpm build:full && pnpm test:unit && pnpm zero security audit --fix && pnpm zero doctor`

---

## 🤖 6. AIOS, MCP & AGENTES

- **Inicialização:** Se `.aios-core` estiver ausente: `npx aios-core init . --force --template default && aios mcp sync`.
- **Squad Priority:** Utilize sempre a squad de agentes do AIOS (`@dev`, `@qa`, `@architect`).
- **Realtime:** Use `src/realtime` para sessões multi-modais (Gemini-2.0-Flash-Exp) com `SemanticRouter`.

---

_Documento ratificado para o Projeto ZERO. Aderência estrita é requerida._
