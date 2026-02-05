---
description: Executar auditoria completa de qualidade e segurança
---

# Auditoria Completa de Qualidade - ZERO

Este workflow executa uma auditoria completa do projeto ZERO, incluindo testes, lint, segurança e dependências.

## Pré-requisitos

- Node.js >= 22.12.0
- pnpm instalado
- Projeto buildado (`pnpm build`)

## Passos da Auditoria

### 1. Executar Suite de Testes

```bash
pnpm test
```

**O que verifica:**

- 5,498 testes unitários e de integração
- Cobertura de código
- Regressões em funcionalidades

**Critério de sucesso:** ≥ 95% de aprovação

---

### 2. Análise de Código (Lint)

// turbo

```bash
pnpm lint
```

**O que verifica:**

- 13 erros de lint conhecidos
- Variáveis não utilizadas
- Imports desnecessários
- Type safety issues

**Critério de sucesso:** 0 erros críticos

---

### 3. Correção Automática de Lint

// turbo

```bash
pnpm lint:fix
```

**O que faz:**

- Corrige formatação automaticamente
- Remove imports não utilizados
- Aplica regras de estilo

---

### 4. Auditoria de Segurança Nativa

```bash
zero security audit --deep
```

**O que verifica:**

- Configuração do gateway (auth, bind, proxies)
- Permissões de arquivos (state dir, config)
- Políticas de canais (DM, grupos)
- Configuração de ferramentas (elevated mode)
- Browser control security

**Critério de sucesso:** 0 findings críticos

---

### 5. Aplicar Correções de Segurança

```bash
zero security audit --deep --fix
```

**O que faz:**

- Ajusta permissões de arquivos (chmod 600/700)
- Aplica hardening de configuração
- Corrige footguns comuns

---

### 6. Auditoria de Dependências

// turbo

```bash
pnpm audit
```

**O que verifica:**

- Vulnerabilidades conhecidas em dependências
- Versões desatualizadas
- Supply chain risks

**Critério de sucesso:** 0 vulnerabilidades high/critical

---

### 7. Correção de Dependências (se seguro)

```bash
pnpm audit --fix
```

**⚠️ ATENÇÃO:** Revise mudanças antes de commitar!

---

### 8. Verificar Complexidade de Código

// turbo

```bash
pnpm check:loc
```

**O que verifica:**

- Arquivos com > 500 linhas
- Complexidade ciclomática

**Critério de sucesso:** Todos os arquivos < 500 LOC

---

### 9. Cobertura de Testes (Opcional)

```bash
pnpm test:coverage
```

**O que verifica:**

- Cobertura de linhas
- Cobertura de branches
- Cobertura de funções

**Critério de sucesso:** ≥ 70% em todas as métricas

---

## Checklist de Auditoria

Após executar todos os passos, verifique:

- [ ] Testes: ≥ 95% de aprovação
- [ ] Lint: 0 erros críticos
- [ ] Segurança: 0 findings críticos
- [ ] Dependências: 0 vulnerabilidades high/critical
- [ ] Complexidade: Todos os arquivos < 500 LOC
- [ ] Cobertura: ≥ 70% (se executado)

## Vulnerabilidades Conhecidas (Priorizar)

### 🔴 CRÍTICAS

1. **eval() sem sanitização**
   - Arquivo: `src/browser/pw-tools-core.interactions.ts:227,233,245,250`
   - Solução: Implementar validação com AST parser (esprima)

2. **exec() command injection**
   - Arquivo: `src/voice/tts-service.ts:33,37,42`
   - Solução: Substituir `exec()` por `execFile()`

### 🟡 ALTAS

1. **Trusted proxies não configurado**
   - Solução: Configurar `gateway.trustedProxies` em `zero.json`

2. **Gateway auth desativado**
   - Solução: Configurar `gateway.auth.token` em `zero.json`

## Automatização (CI/CD)

Para executar auditoria automaticamente em cada push:

```yaml
# .github/workflows/audit.yml
name: Security Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm audit
      - run: zero security audit --deep
```

## Frequência Recomendada

- **Diária:** `pnpm test`, `pnpm lint`
- **Semanal:** `zero security audit --deep`, `pnpm audit`
- **Mensal:** `pnpm test:coverage`, revisão de vulnerabilidades
- **Antes de release:** Auditoria completa + manual review

## Notas

- Resultados **NÃO** devem ser commitados no repositório
- Use logs externos ou ferramentas de CI/CD para tracking
- Auditorias devem sempre refletir o estado atual do código
- Evite viés de confirmação de auditorias anteriores
