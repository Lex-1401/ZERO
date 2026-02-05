---
summary: "Corrija problemas de inicialização do CDP no Chrome/Brave/Edge/Chromium para controle de navegador ZERO no Linux"
read_when: "O controle do navegador falha no Linux, especialmente com o snap Chromium"
---

# Solução de Problemas do Navegador (Linux)

## Problema: "Failed to start Chrome CDP on port 18800"

O servidor de controle do navegador do ZERO falha ao iniciar o Chrome/Brave/Edge/Chromium com o erro:

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"zero\"."}
```

### Causa Raiz

No Ubuntu (e em muitas distribuições Linux), a instalação padrão do Chromium é um **pacote snap**. O confinamento AppArmor do Snap interfere em como o ZERO gera e monitora o processo do navegador.

O comando `apt install chromium` instala um pacote stub que redireciona para o snap:

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

Isso NÃO é um navegador real — é apenas um wrapper.

### Solução 1: Instale o Google Chrome (Recomendado)

Instale o pacote `.deb` oficial do Google Chrome, que não é isolado pelo snap:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # se houver erros de dependência
```

Então atualize sua configuração do ZERO (`~/.zero/zero.json`):

```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/google-chrome-stable",
    "headless": true,
    "noSandbox": true
  }
}
```

### Solução 2: Use Snap Chromium com Modo Apenas-Anexar (Attach-Only)

Se você precisa usar o snap Chromium, configure o ZERO para anexar a um navegador iniciado manualmente:

1. Atualize a configuração:

```json
{
  "browser": {
    "enabled": true,
    "attachOnly": true,
    "headless": true,
    "noSandbox": true
  }
}
```

1. Inicie o Chromium manualmente:

```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.zero/browser/zero/user-data \
  about:blank &
```

1. Opcionalmente, crie um serviço de usuário systemd para iniciar o Chrome automaticamente:

```ini
# ~/.config/systemd/user/zero-browser.service
[Unit]
Description=Zero Browser (Chrome CDP)
After=network.target

[Service]
ExecStart=/snap/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=18800 --user-data-dir=%h/.zero/browser/zero/user-data about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Ative com: `systemctl --user enable --now zero-browser.service`

### Verificando se o Navegador Funciona

Verifique o status:

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

Teste a navegação:

```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### Referência de Configuração

| Opção | Descrição | Padrão |
|--------|-------------|---------|
| `browser.enabled` | Habilita o controle do navegador | `true` |
| `browser.executablePath` | Caminho para um binário de navegador baseado em Chromium (Chrome/Brave/Edge/Chromium) | detectado automaticamente (prefere o navegador padrão quando baseado em Chromium) |
| `browser.headless` | Executa sem GUI | `false` |
| `browser.noSandbox` | Adiciona a flag `--no-sandbox` (necessária para algumas configurações Linux) | `false` |
| `browser.attachOnly` | Não inicia o navegador, apenas anexa ao existente | `false` |
| `browser.cdpPort` | Porta do Protocolo Chrome DevTools | `18800` |

### Problema: "Chrome extension relay is running, but no tab is connected"

Você está usando o perfil `chrome` (relay de extensão). Ele espera que a extensão de navegador ZERO esteja anexada a uma aba ativa.

Opções de correção:

1. **Use o navegador gerenciado:** `zero browser start --browser-profile zero`
   (ou defina `browser.defaultProfile: "zero"`).
2. **Use o relay de extensão:** instale a extensão, abra uma aba e clique no ícone da extensão ZERO para anexá-la.

Notas:

- O perfil `chrome` usa seu **navegador Chromium padrão do sistema** quando possível.
- Perfis locais `zero` atribuem automaticamente `cdpPort`/`cdpUrl`; defina-os apenas para CDP remoto.
