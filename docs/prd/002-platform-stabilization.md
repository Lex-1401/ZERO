# PRD-002: Estabilização de Plataforma e Refinamento de UX

**Status**: Approved
**Data**: 2026-02-25
**Autor**: Morgan (@pm)
**Prioridade**: P0 - Crítica

## 1. Visão Geral

Este documento define os requisitos mandatórios para tirar o sistema ZERO do estado de bloqueio operacional que perdura por 5 semanas. O foco é a estabilização do Gateway, correção de design/UX e localização completa para PT-BR.

## 2. Personas Impactadas

* **Usuário Administrador (Lex)**: Não consegue utilizar o cockpit do sistema devido a erros de conexão e falhas na interface.

## 3. Requisitos Funcionais

### 3.1 Gateway e Infraestrutura (Bloqueadores)

* **FR-GW-01**: Corrigir o ponto de entrada do daemon do Gateway para `dist/entry.js`.
* **FR-GW-02**: Sincronizar a porta de escuta do Gateway com o frontend (Porta 18789).
* **FR-GW-03**: Validar o ciclo de vida do processo para garantir que ele não entre em estado zumbi.

### 3.2 Tradução e Localização (PT-BR)

* **FR-TR-01**: Traduzir todas as strings de diagnóstico ("Health", "Uptime", "Latency").
* **FR-TR-02**: Traduzir o painel de configuração de provedores de IA (Ollama, NVIDIA).
* **FR-TR-03**: Traduzir mensagens de erro do sistema e validações de input.

### 3.3 Experiência do Usuário (UX/UI)

* **FR-UI-01**: Corrigir contraste de cores em elementos de texto sobre fundos dinâmicos.
* **FR-UI-02**: Reativar os listeners dos botões "Save", "Revert" e "Apply".
* **FR-UI-03**: Corrigir o problema de fundo opaco/não-profissional do logo em `ui/public/logo.png`.

## 4. Requisitos Não-Funcionais

* **NFR-ST-01**: O sistema deve passar 100% no teste `pnpm zero doctor`.
* **NFR-ST-02**: O tempo de resposta da UI após o clique nos botões salvos não deve exceder 200ms.

## 5. Plano de Entrega

1. **Issue 002.1**: Correção do Kernel de Conectividade (Gateway).
2. **Issue 002.2**: Audit e Correção de Localização (Tradução).
3. **Issue 002.3**: Refatoração de Eventos da UI e Design Tokens.

---
— Morgan, orquestrando o produto 🎯
