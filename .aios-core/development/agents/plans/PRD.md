# 🎯 PRD: Estabilização do Gateway & Build macOS Ad-Hoc

## 🔍 1. RESEARCH & CONTEXT

- **Current State Analysis:**
  - Conectividade WebSocket entre UI e Gateway restaurada via ajuste de handshake.
  - Conflito de porta (18789) e erro de `onExit` no `proper-lockfile` resolvidos via `package.json` overrides.
  - TypeScript compilation livre de erros (0 erros detectados em `tsc --noEmit`).
  - Build nativo (`package-mac-dist.sh`) bloqueado por exigência de assinatura oficial.

- **Files Involved:**
  - `package.json`: Gestão de dependências e overrides.
  - `scripts/package-mac-dist.sh`: Script mestre de empacotamento.
  - `scripts/codesign-mac-app.sh`: Lógica de assinatura e entitlements.
  - `ui/src/ui/gateway.ts`: Handshake do cliente.

- **Patterns Identified:**
  - Uso de Entitlements para Hardened Runtime no macOS para permitir `network-client` e `network-server`.
  - Modularidade Atômica: Nenhuma alteração excedeu limites de complexidade.

## 🛠️ 2. PROBLEM DEFINITION

- **The "Why":** O usuário precisa de um sistema íntegro e autossuficiente. A falha no build impede a distribuição do `.dmg` funcional.
- **Constraints:** ARM64 (M1/M2/M3) e x64. Atualmente testando em ambiente Mac Darwin.

## 🛡️ 3. SRE & SECURITY BOUNDARIES

- **Blast Radius:** Falhas no codesign impedem a execução do app fora da IDE.
- **Sentinel Audit Goal:** Garantir que o app ad-hoc assinado possua os entitlements mínimos necessários para funcionar (Gateway Localhost + LAN).
- **Performance Baseline:** Build de produção deve gerar um bundle otimizado sem logs de erro residuais.

## ✅ 4. SUCCESS CRITERIA

- [x] O código segue a Modularidade Atômica (< 500 linhas).
- [x] JSDoc atualizado em todos os commits recentes.
- [ ] Geração do `dist/ZERO.dmg` via assinatura Ad-Hoc (`-`).
- [x] Gateway conectável via `http://localhost:18789/`.

---
> **Ação:** PRD criado. Favor limpar janela de contexto (clear context) para iniciar a Spec.
