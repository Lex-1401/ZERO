---
summary: "Configuração de túnel SSH para o ZERO.app conectar-se a um gateway remoto"
read_when: "Conectando o app macOS a um gateway remoto via SSH"
---

# Executando o ZERO.app com um Gateway Remoto

O ZERO.app utiliza tunelamento SSH para se conectar a um gateway remoto. Este guia mostra como configurá-lo.

## Visão Geral

```text
┌─────────────────────────────────────────────────────────────┐
│                       Máquina Cliente                        │
│                                                              │
│  ZERO.app ──► ws://127.0.0.1:18789 (porta local)         │
│                     │                                        │
│                     ▼                                        │
│  Túnel SSH ──────────────────────────────────────────────────│
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       Máquina Remota                         │
│                                                              │
│  Gateway WebSocket ──► ws://127.0.0.1:18789 ──►             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Configuração Rápida

### Passo 1: Adicionar Configuração SSH

Edite o arquivo `~/.ssh/config` e adicione:

```ssh
Host remote-gateway
    HostName <IP_REMOTO>          # ex: 172.27.187.184
    User <USUARIO_REMOTO>         # ex: jefferson
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

Substitua `<IP_REMOTO>` e `<USUARIO_REMOTO>` pelos seus valores.

### Passo 2: Copiar a Chave SSH

Copie sua chave pública para a máquina remota (será necessário digitar a senha uma vez):

```bash
ssh-copy-id -i ~/.ssh/id_rsa <USUARIO_REMOTO>@<IP_REMOTO>
```

### Passo 3: Definir o Token do Gateway

```bash
launchctl setenv ZERO_GATEWAY_TOKEN "<seu-token>"
```

### Passo 4: Iniciar o Túnel SSH

```bash
ssh -N remote-gateway &
```

### Passo 5: Reiniciar o ZERO.app

```bash
# Encerre o ZERO.app (⌘Q) e abra-o novamente:
open /caminho/para/ZERO.app
```

O app agora se conectará ao gateway remoto através do túnel SSH.

---

## Iniciar o Túnel Automaticamente no Login

Para que o túnel SSH seja iniciado automaticamente ao fazer login, crie um Launch Agent.

### Criar o arquivo PLIST

Salve este conteúdo como `~/Library/LaunchAgents/com.zero.ssh-tunnel.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.zero.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

### Carregar o Launch Agent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.zero.ssh-tunnel.plist
```

O túnel agora irá:

- Iniciar automaticamente quando você fizer login
- Reiniciar se falhar (crash)
- Continuar executando em segundo plano

---

## Solução de Problemas

### Verificar se o túnel está rodando

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

### Reiniciar o túnel

```bash
launchctl kickstart -k gui/$UID/com.zero.ssh-tunnel
```

### Parar o túnel

```bash
launchctl bootout gui/$UID/com.zero.ssh-tunnel
```

---

## Como Funciona

| Componente | O que faz |
| :--- | :--- |
| `LocalForward 18789 127.0.0.1:18789` | Encaminha a porta local 18789 para a porta remota 18789 |
| `ssh -N` | SSH sem executar comandos remotos (apenas encaminhamento de porta) |
| `KeepAlive` | Reinicia automaticamente o túnel se ele falhar |
| `RunAtLoad` | Inicia o túnel quando o agente é carregado |

O ZERO.app se conecta a `ws://127.0.0.1:18789` na sua máquina cliente. O túnel SSH encaminha essa conexão para a porta 18789 na máquina remota onde o Gateway está sendo executado.
