---
description: Executar auditoria completa de qualidade e segurança (QA/QC)
---

Este workflow automatiza e guia a revisão completa do sistema ZERO para garantir estabilidade em VPS, Raspberry Pi e ambientes locais.

### 1. Verificação de Instalação e Ambiente
- Executar `bash quickstart.sh` em modo de simulação ou verificar logs de instalação.
- Rodar `zero doctor` para validar dependências e módulos nativos.
- Verificar permissões de escrita em `~/.zero`.

### 2. Auditoria de Backend e Runtime
- Inspecionar `src/entry.ts` e `src/cli/run-main.ts` para erros de bootstrap.
- Verificar gestão de portas com `netstat` ou `ss` para garantir que o Gateway subiu corretamente.
- Checar `src/process/exec.ts` por possíveis vazamentos de memória (memoria heap).

### 3. Validação Cross-Platform
- Testar comandos críticos no Windows (PowerShell/CMD) e Linux (Bash).
- Validar se comandos como `which`/`where` estão sendo usados corretamente conforme o OS.

### 4. Teste de Stress do Gateway
- Simular múltiplas conexões ao Gateway.
- Verificar se sidecars (Gmail, Plugins, Browser Control) reiniciam em caso de falha.

### 5. Limpeza de Código
- Procurar por funções duplicadas ou "Código Morto" (Dead Code).
- Garantir que todos os logs sensíveis (telefonia, tokens) estão mascarados.

// turbo
zero doctor --fix
