# PRD - Estabilização e Localização do Ecossistema ZERO (MacOS & Dashboard)

## 1. Introdução

O projeto ZERO apresenta instabilidades críticas no ambiente MacOS (falha de conexão com o Gateway via launchd) e inconsistências de localização no Dashboard (mistura de idiomas PT-BR/EN-US). Este documento define os requisitos para sanar esses pontos e garantir a soberania operacional do sistema.

## 2. Objetivos

- **Estabilização do Gateway (MacOS)**: Garantir que o processo `zero-gateway` inicie e mantenha conexão estável via `launchd` ou `PM2`.
- **Localização Total (Internationalization)**: Garantir que 100% da interface do Dashboard respeite o idioma selecionado (atualmente foco em PT-BR), eliminando "ghost English strings".

## 3. Requisitos Técnicos

### 3.1. Infraestrutura (MacOS)

- **R1 (Gateway Persistence)**: O serviço `com.zero.gateway.plist` deve ser validado e carregado corretamente.
- **R2 (Port Binding)**: Garantir que a porta `18789` esteja disponível e o gateway responda a `localhost`.
- **R3 (Error Recovery)**: Se o `launchd` falhar, o sistema deve ter um fallback claro ou instrução de reparo automático.

### 3.2. Interface e UX (Dashboard)

- **R4 (i18n Coverage)**: Mapear todos os arquivos `.ts` e `.tsx` nas views do Dashboard que possuem strings hardcoded em inglês.
- **R5 (Centralized Translations)**: Mover todas as strings para o `ui/src/ui/i18n.ts`.
- **R6 (Theme/Context consistency)**: Garantir que termos técnicos (ex: "Mission Control", "Gateway") tenham traduções consagradas ou fiquem padronizados.

## 4. Plano de Testes (Critérios de Aceite)

- [ ] O comando `curl localhost:18789/health` retorna status 200.
- [ ] O Dashboard carrega sem o popup "Could not connect to the server".
- [ ] Varredura de busca por termos em inglês em arquivos de visualização (views) retorna zero resultados para chaves não-traduzidas.

## 5. Próximos Passos

1. Executar `launchctl bootstrap` e verificar logs de erro do sistema.
2. Auditar `ui/src/ui/i18n.ts` contra as views.
3. Aplicar patches de tradução.
