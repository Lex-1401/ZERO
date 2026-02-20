---
summary: "Logs do ZERO: log de diagnóstico de arquivos rotativos + sinalizadores de privacidade de log unificado"
read_when:
  - Capturando logs do macOS ou investigando o registro de dados privados
  - Depurando problemas de ativação por voz/ciclo de vida da sessão
---
# Registro de Logs (macOS)

## Log de diagnóstico de arquivos rotativos (Painel Debug)

O ZERO encaminha os logs do app macOS através do swift-log (log unificado por padrão) e pode gravar um log de arquivo local rotativo no disco quando você precisar de uma captura duradoura.

- Verbosidade: **Painel Debug → Logs → App logging → Verbosity**
- Habilitar: **Painel Debug → Logs → App logging → “Write rolling diagnostics log (JSONL)”**
- Localização: `~/Library/Logs/ZERO/diagnostics.jsonl` (rotaciona automaticamente; arquivos antigos recebem sufixos `.1`, `.2`, …)
- Limpar: **Painel Debug → Logs → App logging → “Clear”**

Notas:

- Isso fica **desativado por padrão**. Habilite apenas enquanto estiver depurando ativamente.
- Trate o arquivo como sensível; não o compartilhe sem revisão.

## Dados privados de log unificado no macOS

O log unificado oculta a maioria dos payloads, a menos que um subsistema opte por `privacy -off`. De acordo com o artigo de Peter sobre [macOS logging privacy shenanigans](https://steipete.me/posts/2025/logging-privacy-shenanigans) (2025), isso é controlado por um plist em `/Library/Preferences/Logging/Subsystems/` identificado pelo nome do subsistema. Apenas novas entradas de log adotam o sinalizador, portanto, habilite-o antes de reproduzir um problema.

## Habilitar para o ZERO (`com.zero`)

- Grave o plist em um arquivo temporário primeiro e, em seguida, instale-o atomicamente como root:

```bash
cat <<'EOF' >/tmp/com.zero.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/com.zero.plist /Library/Preferences/Logging/Subsystems/com.zero.plist
```

- Não é necessário reiniciar; o logd percebe o arquivo rapidamente, mas apenas novas linhas de log incluirão payloads privados.
- Visualize a saída detalhada com o auxiliar existente, ex: `./scripts/clawlog.sh --category WebChat --last 5m`.

## Desabilitar após a depuração

- Remova a substituição: `sudo rm /Library/Preferences/Logging/Subsystems/com.zero.plist`.
- Opcionalmente, execute `sudo log config --reload` para forçar o logd a descartar a substituição imediatamente.
- Lembre-se que essa superfície pode incluir números de telefone e corpos de mensagens; mantenha o plist no lugar apenas enquanto precisar ativamente dos detalhes extras.
