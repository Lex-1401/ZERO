# AMES - Validar Integridade Multidimensional (Software, Design, IA, Qualidade)

> Task ID: verify-multidimensional-integrity-ames
> Agent: Quinn (Guardian) / Multidimensional Squad
> Version: 1.0.0

## Objetivo

Realizar uma verificação holística e profunda (0-100) da saúde do projeto ZERO em quatro dimensões críticas: Engenharia de Software (CODE), Design System (VISUAL), Qualidade de Inteligência (AIQA) e Estabilidade Funcional (SQA/QC).

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: validateMultidimensionalAMES()
responsável: Quinn (Guardian)
responsavel_type: Agente / Squad
atomic_layer: Strategy / Quality

**Entrada:**
- campo: scope
  tipo: string
  origem: User Input
  obrigatório: false
  padrão: "full" (all | code | visual | aiqa | sqa)

- campo: deep_scan
  tipo: boolean
  origem: User Input
  obrigatório: false
  padrão: true

**Saída:**
- campo: ames_report
  tipo: object
  destino: File (outputs/ames/report_{timestamp}.json)
  persistido: true

- campo: multidimensional_scores
  tipo: object
  destino: Display
  persistido: false
```

---

## Dimensões de Verificação (Scores 0-100)

### I. CODE (Software Engineering & SQA)

Foco em Clean Code, limites de complexidade e arquitetura de núcleo.

- **Métricas:** Linhas por arquivo (limite 500), complexidade ciclomática, acoplamento, uso de Rust-Core.
- **Gate:** `npm run lint` e `npm run typecheck` devem estar limpos.

### II. VISUAL (Design System & UI/UX)

Foco na paridade com o Design System ZERO e estética Premium.

- **Métricas:** Uso de tokens CSS, consistência de cores (palette), responsividade, micro-interações, acessibilidade.
- **Gate:** Verificação visual via browser automation para detectar drift de design.

### III. AIQA (AI Quality & Intelligence)

Foco na eficácia dos prompts e aderência aos guardrails de segurança.

- **Métricas:** Eficácia de Prompt Injection mitigation, qualidade do CoT (Thought blocks), Sentinel Engine adherence.
- **Gate:** Verificação de logs de transito de IA (Thought process vs Output).

### IV. QC (Quality Control & Performance)

Foco em testes funcionais e estabilidade de execução.

- **Métricas:** Pass-rate de testes unitários/E2E, tempo de resposta do Gateway, uso de memória.
- **Gate:** `npm test` deve retornar 100% de sucesso.

### V. DECISION (Sovereign Decision Intelligence)

Foco na preservação encriptada da inteligência estratégica e de segurança.

- **Métricas:** Presença de DecisionVault, integridade do cofre encriptado, volume de decisões soberanas registradas.
- **Gate:** Verificação se decisões de segurança estão sendo armazenadas no cofre encriptado, protegendo a "sabedoria do sistema" sem expô-la ao histórico Git.

---

## Protocolo de Higiene (A-POS Compliant)

**Este workflow DEVE seguir estritamente o Protocolo Elite:**

- **NÃO** gerar relatórios chamados "Audit" ou "VAPT".
- **NÃO** persistir vulnerabilidades em texto claro no repositório.
- **USAR** terminologia neutra: Integridade, Verificação, Validação.
- **RELATÓRIOS:** Salvos localmente em `outputs/ames/` e ignorados pelo Git (.gitignore).

---

## Workflow de Execução

1. **Elicitação Dimensional**: Definir se o scan será total ou focado em uma dimensão específica.
2. **Coleta de Evidências**:
   - Rodar scanners estáticos de código.
   - Analisar manifesto do Design System.
   - Sondar logs de raciocínio da IA (Thought blocks).
   - Executar suíte de testes Vitest.
3. **Cálculo de Scores**: Atribuição de scores de 0 a 100 baseada no desvio dos padrões ideais do ZERO.
4. **Geração de Dashboard**: Exibir o resumo multidimensional para o Comandante.
5. **Autocorreção (Opcional)**: Sugerir ou aplicar correções imediatas para problemas críticos detetados.

---

## Critérios de Sucesso (Acceptance Criteria)

- [ ] Relatório JSON gerado com scores detalhados para as 4 dimensões.
- [ ] Nenhuma menção a termos proibidos (Audit/VAPT) no output.
- [ ] Identificação clara de dívida técnica ou desvio de UI.
- [ ] Dashboard visual exibido com métricas reais do repositório.

---
*“A perfeição não é um estado, é um processo de verificação contínua.”* ∅
