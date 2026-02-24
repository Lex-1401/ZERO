#!/bin/bash
# Pre-commit hook para validar limites de LOC e Segurança AIOS

echo \"🔍 Executando auditoria de pre-commit...\"

# 1. Validar limite de linhas (LOC)
pnpm check:loc --max 500
if [ $? -ne 0 ]; then
  echo \"❌ ERRO: Arquivos excedendo 500 linhas detectados. Refatore antes de commitar.\"
  exit 1
fi

# 2. Validar Estrutura de Agentes
pnpm validate:agents
if [ $? -ne 0 ]; then
  echo \"❌ ERRO: Configuração de agentes inválida.\"
  exit 1
fi

# 3. Lint rápido
pnpm lint
if [ $? -ne 0 ]; then
  echo \"❌ ERRO: Falha no linting.\"
  exit 1
fi

echo \"✅ Auditoria concluída com sucesso!\"
exit 0
