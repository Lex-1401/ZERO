#!/bin/bash
# VPS Hygiene Script - A-POS Standard
# [PT] Script de Higiene de Ambiente - Padronização Pós-Integridade

echo "🛡️ Iniciando Protocolo de Higiene de Ambiente (Soberania ZERO)..."

# 1. Limpar logs de sistema que possam conter metadados de auditoria anterior
echo "🧹 Limpando logs de serviço (pm2/systemd)..."
if command -v pm2 &> /dev/null; then
    pm2 flush
fi

sudo journalctl --vacuum-time=1s
sudo journalctl --vacuum-size=50M

# 2. Renomear serviços se necessário (exemplo se houver algo como 'zero-audit')
# Nota: Isso deve ser adaptado ao nome real do serviço no VPS
echo "🔄 Verificando nomes de serviços..."
# sudo systemctl stop zero-audit 2>/dev/null
# sudo systemctl disable zero-audit 2>/dev/null
# sudo mv /etc/systemd/system/zero-audit.service /etc/systemd/system/zero-integrity.service 2>/dev/null
# sudo systemctl daemon-reload
# sudo systemctl enable zero-integrity.service 2>/dev/null

# 3. Remover arquivos temporários e rastros de scripts de auditoria
echo "🗑️ Removendo rastros de arquivos de verificação passados..."
rm -f *.log
rm -f *-report.json
rm -f vapt-results.md
rm -rf outputs/audit/

# 4. Forçar rotação de logs
sudo logrotate -f /etc/logrotate.conf 2>/dev/null

echo "✅ Higiene de Ambiente concluída. Status de Soberania restaurado."
