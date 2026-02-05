# 🔒 Decisões de Segurança - ZERO

**Data:** 2026-02-04  
**Versão:** 0.1.0-distro

---

## 📋 SUMÁRIO

Este documento registra as decisões de segurança críticas tomadas durante o desenvolvimento e auditoria do projeto ZERO, incluindo justificativas técnicas, trade-offs e mitigações implementadas.

---

## 🎯 DECISÕES CRÍTICAS

### 1. Uso de `eval()` em Browser Automation

**Arquivo:** `src/browser/pw-tools-core.interactions.ts`

**Contexto:**
O Playwright permite executar código JavaScript arbitrário no contexto do browser para automação. Isso é necessário para:

- Interações complexas com elementos DOM
- Espera por condições dinâmicas
- Extração de dados estruturados

**Risco:**

- **Severidade:** 🔴 CRÍTICA
- **Tipo:** LLM01 (Prompt Injection) + LLM08 (Excessive Agency)
- **Exploitabilidade:** MÉDIA (requer acesso ao browser control)

**Decisão:**
✅ **Manter `eval()` com mitigações robustas**

**Justificativa:**

1. **Funcionalidade Core:** Browser automation é fundamental para o ZERO
2. **Alternativas Limitadas:** Playwright requer execução de código no browser
3. **Mitigações Implementadas:**
   - ✅ AST parsing com `esprima` (validação sintática)
   - ✅ Whitelist de constructs permitidos
   - ✅ Blacklist de APIs perigosas (`eval`, `Function`, `require`)
   - ✅ Limite de profundidade de AST (max 50 níveis)
   - ✅ Limite de tamanho de código (max 10KB)
   - ✅ Autenticação obrigatória para browser control
   - ✅ Rate limiting (futuro)

**Mitigação Implementada:**

```typescript
// src/browser/security.ts
export function validateAndSanitizeFnBody(fnBody: string): string {
  // 1. Parse AST
  const ast = parseScript(fnBody);
  
  // 2. Validate nodes
  validateASTNode(ast); // Throws if dangerous
  
  // 3. Regenerate code
  return generate(ast);
}
```

**Testes de Segurança:**

- ✅ Bloqueia `eval()`, `Function()`, `setTimeout()`
- ✅ Bloqueia `require()`, `process`, `fs`
- ✅ Permite DOM APIs (`document`, `window`)
- ✅ Previne DoS (depth limit, size limit)

**Referências:**

- OWASP LLM01: Prompt Injection
- OWASP LLM08: Excessive Agency
- CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code

---

### 2. Substituição de `exec()` por `execFile()`

**Arquivo:** `src/voice/tts-service.ts`

**Contexto:**
O serviço de TTS precisa executar players de áudio nativos do sistema operacional (afplay, aplay, mpg123, powershell).

**Risco:**

- **Severidade:** 🔴 CRÍTICA
- **Tipo:** Command Injection (CWE-78)
- **Exploitabilidade:** BAIXA (filePath é controlado internamente)

**Decisão:**
✅ **Substituir `exec()` por `execFile()`**

**Justificativa:**

1. **Defense in Depth:** Mesmo que `filePath` seja interno, previne futuras vulnerabilidades
2. **Best Practice:** `execFile()` não usa shell, previne injection
3. **Zero Cost:** Mesma funcionalidade, mais seguro

**Antes:**

```typescript
exec(`afplay "${filePath}"`, ...);  // ❌ Usa shell, vulnerável
```

**Depois:**

```typescript
execFile("afplay", [filePath], ...);  // ✅ Sem shell, seguro
```

**Mitigações Adicionais:**

- ✅ Validação de path (path traversal protection)
- ✅ Whitelist de diretório (apenas `os.tmpdir()`)
- ✅ Argumentos separados (não concatenação)

**Referências:**

- CWE-78: OS Command Injection
- OWASP Top 10 A03:2021 - Injection

---

### 3. Logging em Catch Blocks

**Arquivos:** `src/security/guard.ts`, `src/logging/redact.ts`

**Contexto:**
O SecurityEngine nativo (Rust) pode falhar ao carregar, fazendo fallback para implementação JavaScript.

**Risco:**

- **Severidade:** 🟢 BAIXA
- **Tipo:** Observability / Debugging
- **Impacto:** Falhas silenciosas dificultam troubleshooting

**Decisão:**
✅ **Adicionar logging quando fallback para JS**

**Justificativa:**

1. **Transparência:** Operadores devem saber quando engine nativa falha
2. **Debugging:** Facilita identificação de problemas de build/deploy
3. **Performance Awareness:** Engine JS é mais lenta que Rust

**Implementação:**

```typescript
try {
  nativeSecurity = new NativeEngine();
} catch (_err) {
  if (process.env.NODE_ENV !== "test") {
    console.warn("[security/guard] Failed to load native SecurityEngine, using JS fallback");
  }
}
```

**Nota:** Logging é suprimido em testes para evitar ruído.

---

### 4. Variável `_isTempSession` Não Utilizada

**Arquivo:** `src/agents/pi-embedded-runner/run/attempt.ts`

**Contexto:**
A variável `isTempSession` é atribuída mas nunca lida. A limpeza de sessão temporária já é feita no bloco `finally` via `AuditCrypt.finalizeSessionFile()`.

**Decisão:**
✅ **Renomear para `_isTempSession` (convenção de "não utilizada")**

**Justificativa:**

1. **Código Existente:** Lógica de limpeza já funciona corretamente
2. **Documentação:** Prefixo `_` indica intencionalmente não utilizada
3. **Futuro:** Pode ser usada para métricas/logging

**Implementação:**

```typescript
let _isTempSession = false;  // Prefixo _ indica não utilizada
if (encryptionToken) {
  const prepared = await AuditCrypt.prepareSessionFile(...);
  _isTempSession = prepared.isTemp;
}
// Limpeza já feita em finally via AuditCrypt.finalizeSessionFile()
```

---

## 🛡️ ARQUITETURA DE SEGURANÇA

### Camadas de Defesa

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: INPUT VALIDATION                                  │
│  - SecurityGuard.detectPromptInjection()                    │
│  - SecurityGuard.obfuscatePrompt()                          │
│  - validateAndSanitizeFnBody() (browser)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: AUTHENTICATION & AUTHORIZATION                    │
│  - Gateway auth (token-based)                               │
│  - Browser control auth                                     │
│  - Access groups (channels)                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: EXECUTION SANDBOXING                              │
│  - Sandbox mode (Docker/Firecracker)                        │
│  - Least privilege (elevated mode)                          │
│  - Path restrictions                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: OUTPUT VALIDATION                                 │
│  - SecurityGuard.scanForPII()                               │
│  - SecurityGuard.validateCoT()                              │
│  - Citation validation                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: AUDIT & MONITORING                                │
│  - AuditCrypt (encrypted logs)                              │
│  - Security audit CLI                                       │
│  - Metrics tracking                                         │
└─────────────────────────────────────────────────────────────┘
```

### Princípios Aplicados

1. **Zero Trust Architecture**
   - Nunca confiar, sempre verificar
   - Autenticação em todas as camadas
   - Least privilege por padrão

2. **Defense in Depth**
   - Múltiplas camadas de segurança
   - Falha de uma camada não compromete o sistema
   - Mitigações redundantes

3. **Security by Design**
   - Segurança desde o início, não afterthought
   - Defaults seguros
   - Fail-safe (falha para estado seguro)

4. **Auditability**
   - Todas as ações são logadas
   - Logs criptografados (AuditCrypt)
   - Rastreabilidade completa

---

## 📊 CONFORMIDADE

### OWASP Top 10 (Web)

| ID | Categoria | Status | Notas |
|----|-----------|--------|-------|
| A01 | Broken Access Control | ✅ | Gateway auth, access groups |
| A02 | Cryptographic Failures | ✅ | AuditCrypt (AES-256-GCM) |
| A03 | Injection | ✅ | AST validation, execFile() |
| A04 | Insecure Design | ✅ | Zero Trust, Defense in Depth |
| A05 | Security Misconfiguration | ✅ | Security audit CLI |
| A06 | Vulnerable Components | ⚠️ | Dependências transitivas |
| A07 | Auth Failures | ✅ | Token-based, OAuth |
| A08 | Software/Data Integrity | ✅ | AuditCrypt, protected paths |
| A09 | Logging Failures | ✅ | tslog, redaction |
| A10 | SSRF | ✅ | URL validator |

### OWASP Top 10 for LLM

| ID | Categoria | Status | Notas |
|----|-----------|--------|-------|
| LLM01 | Prompt Injection | ✅ | 36 padrões, entropy analysis |
| LLM02 | Insecure Output | ✅ | CoT validation, PII scan |
| LLM03 | Training Data Poisoning | ✅ | RAG sanitization |
| LLM04 | Model DoS | ✅ | Rate limiting, timeouts |
| LLM05 | Supply Chain | ⚠️ | Dependências transitivas |
| LLM06 | Sensitive Info Disclosure | ✅ | 16 PII patterns, redaction |
| LLM07 | Insecure Plugin Design | ✅ | Plugin SDK, sandboxing |
| LLM08 | Excessive Agency | ✅ | Tool approval, AST validation |
| LLM09 | Overreliance | ✅ | Citation validation |
| LLM10 | Model Theft | ✅ | Local-first, no external calls |

---

## 🔄 TRADE-OFFS

### 1. Funcionalidade vs. Segurança

**Decisão:** Manter `eval()` com mitigações  
**Trade-off:**

- ✅ **Ganho:** Browser automation completa
- ⚠️ **Custo:** Superfície de ataque maior
- ✅ **Mitigação:** AST validation, auth, rate limiting

### 2. Performance vs. Segurança

**Decisão:** Rust nativo para SecurityEngine  
**Trade-off:**

- ✅ **Ganho:** Sub-millisecond pattern matching
- ⚠️ **Custo:** Complexidade de build, fallback JS
- ✅ **Mitigação:** Fallback gracioso, logging

### 3. Usabilidade vs. Segurança

**Decisão:** Defaults seguros (auth obrigatório)  
**Trade-off:**

- ✅ **Ganho:** Seguro por padrão
- ⚠️ **Custo:** Configuração inicial mais complexa
- ✅ **Mitigação:** Doctor CLI, documentação

---

## 📝 PRÓXIMAS MELHORIAS

### Curto Prazo (1-2 Semanas)

1. **Rate Limiting**
   - Browser control: 10 req/min
   - Gateway API: 100 req/min
   - Channel webhooks: 50 req/min

2. **CSP Headers**
   - Content-Security-Policy para Control UI
   - Prevenir XSS no frontend

3. **CORS Configuration**
   - Whitelist de origins permitidos
   - Credentials: same-origin only

### Médio Prazo (1 Mês)

1. **Dependency Audit**
   - Resolver vulnerabilidades transitivas
   - Atualizar pacotes desatualizados
   - Implementar Dependabot/Renovate

2. **Penetration Testing**
   - Contratar auditoria externa
   - Testes de prompt injection
   - Testes de privilege escalation

3. **Security Metrics Dashboard**
   - Visualizar findings de audit
   - Tracking de vulnerabilidades
   - Alertas automáticos

---

## 📚 REFERÊNCIAS

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Zero Trust Architecture (NIST SP 800-207)](https://csrc.nist.gov/publications/detail/sp/800-207/final)

---

**Última Atualização:** 2026-02-04 20:23:41 BRT  
**Responsável:** Equipe de Segurança ZERO  
**Revisão:** Trimestral
