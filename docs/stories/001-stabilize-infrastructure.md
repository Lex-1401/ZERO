# Story: Estabilização de Infraestrutura (Protocolo AIOS + MCP + Skills)

**Status**: In Progress
**Agent**: @architect
**Priority**: Critical

## 1. PRD (Product Requirements Document)

### Contexto

O usuário Lex está enfrentando falhas críticas de conexão entre a interface (UI) e o Gateway do sistema ZERO. O ambiente precisa ser migrado para o padrão AIOS + MCP + Skills.

### Objetivos

1. **Conectividade**: Garantir que o Gateway esteja estável na porta 18789 e acessível pela UI.
2. **Protocolo**: Aplicar rigorosamente o fluxo Agentes -> PRDs -> Issues -> Testes.
3. **Localização**: Garantir que todas as mensagens e logs respeitem a língua Portuguesa (PT-BR).

### Critérios de Aceite

- [ ] Pasta `.aios-core` presente e configurada.
- [ ] Gateway rodando como serviço (LaunchAgent) ou daemon persistente.
- [ ] UI conectada com sucesso (sem o overlay de erro).
- [ ] Teste de sanidade do agente `main` via CLI com resposta positiva.

## 2. Issues (Technical Tasks)

- [ ] **Task 1**: Limpar processos zumbis e liberar porta 18789.
- [ ] **Task 2**: Instalar e iniciar o gateway oficial via comando `daemon`.
- [ ] **Task 3**: Validar o token de autenticação no `zero.json` e sincronizar com a UI.
- [ ] **Task 4**: Executar bateria de testes de integridade.
- [ ] **Task 5**: Corrigir incompatibilidade do Java 25 com Gradle (downgrade para Java 21).

## 3. Plano de Implementação (@architect)

1. Parar o ZERO.app para evitar conflitos de porta.
1. Instalar Java 21 LTS via brew (`brew install openjdk@21`) para estabilizar o Gradle.
1. Executar `node dist/entry.js gateway install --force` para configurar o LaunchAgent corretamente.
1. Carregar o agente e verificar logs.
1. Testar conexão do WebSocket com token `admin123`.

## 4. Testes (QA)

- [ ] Teste de conexão WS manual.
- [ ] Teste de build da UI.
