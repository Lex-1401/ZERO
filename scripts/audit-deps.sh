#!/bin/bash
# MEDIUM-007: Script de auditoria de dependências
# Executar via: ./scripts/audit-deps.sh
# Para CI/CD, adicionar ao pipeline: pnpm run audit:deps

set -euo pipefail

echo "🛡️ ZERO — Auditoria de Dependências"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. pnpm audit (vulnerabilidades conhecidas)
echo "📦 Verificando vulnerabilidades em pacotes..."
if pnpm audit --audit-level=high 2>/dev/null; then
    echo "✅ Nenhuma vulnerabilidade HIGH/CRITICAL encontrada."
else
    EXIT_CODE=$?
    echo ""
    echo "⚠️  Vulnerabilidades encontradas. Revise o relatório acima."
    echo "   Para corrigir automaticamente: pnpm audit --fix"
    echo ""
    # Em CI, falhar o build
    if [ "${CI:-}" = "true" ]; then
        echo "❌ CI/CD: Build falhou por vulnerabilidades de segurança."
        exit $EXIT_CODE
    fi
fi

echo ""

# 2. Verificar pacotes desatualizados (informativo)
echo "📊 Pacotes desatualizados (informativo):"
pnpm outdated --no-table 2>/dev/null | head -20 || echo "✅ Todos os pacotes atualizados."

echo ""

# 3. Verificar licenças problemáticas (se license-checker disponível)
if command -v npx >/dev/null 2>&1; then
    echo "📜 Verificando licenças (GPL/AGPL podem ser incompatíveis)..."
    npx -y license-checker-webpack-plugin --failOn "GPL-3.0" 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Auditoria de dependências concluída."
