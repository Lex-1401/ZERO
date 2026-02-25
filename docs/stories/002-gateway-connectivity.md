# Story-002: Restauração da Conectividade do Gateway

**Status**: Ready
**Agent**: @architect / @devops
**Priority**: Blocker
**PRD Reference**: PRD-002 (FR-GW-01, FR-GW-02)

## 1. Contexto e Problema

O sistema ZERO está inoperante devido a um erro de conexão (`Could not connect to the server`). O `zero doctor` indica que o daemon do LaunchAgent aponta para o entrypoint errado e há um conflito de portas entre o `zero.json` (3000) e a UI (18789).

## 2. Critérios de Aceite

- [ ] O arquivo `zero.json` deve refletir a porta `18789`.
- [ ] O comando `pnpm zero daemon install --force` deve ser executado e validado.
- [ ] O processo `node` deve estar ouvindo na porta `18789` (verificável via `lsof`).
- [ ] O overlay de erro da UI deve desaparecer, mostrando a tela de "Overview".

## 3. Tarefas Técnicas (Issues)

- [ ] **Task 2.1**: Alterar porta em `zero.json` de 3000 para 18789.
- [ ] **Task 2.2**: Atualizar o script de gerenciamento do Gateway para usar `dist/entry.js`.
- [ ] **Task 2.3**: Reiniciar o serviço via `launchctl` (macOS).
- [ ] **Task 2.4**: Validar conexão com `curl -I http://localhost:18789/gateway/ui/index.html`.

## 4. Plano de Implementação

1. Editar `zero.json`.
2. Rodar `pnpm zero doctor` para validar se a correção de porta foi detectada.
3. Forçar a reinstalação do daemon.

---
— River, Scrum Master 🌊
