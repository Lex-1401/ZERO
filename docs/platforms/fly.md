---
title: Fly.io
description: Implante o ZERO no Fly.io
---

# Implantação no Fly.io

**Objetivo:** Gateway ZERO rodando em uma máquina [Fly.io](https://fly.io) com armazenamento persistente, HTTPS automático e acesso a canais/Discord.

## O que você precisa

- [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/) instalado
- Conta no Fly.io (o plano gratuito funciona)
- Autenticação de modelo: Chave de API Anthropic (ou outras chaves de provedores)
- Credenciais de canal: Token de bot do Discord, token do Telegram, etc.

## Caminho rápido para iniciantes

1. Clone o repositório → personalize o `fly.toml`
2. Crie o aplicativo + volume → configure os segredos (secrets)
3. Implante com `fly deploy`
4. Acesse via SSH para criar a configuração ou use a UI de Controle

## 1) Criar o aplicativo Fly

```bash
# Clone o repositório
git clone https://github.com/zero/zero.git
cd zero

# Crie um novo aplicativo Fly (escolha seu próprio nome)
fly apps create meu-zero

# Crie um volume persistente (1GB geralmente é suficiente)
fly volumes create zero_data --size 1 --region iad
```

**Dica:** Escolha uma região próxima a você. Opções comuns: `lhr` (Londres), `iad` (Virgínia), `sjc` (San Jose).

## 2) Configurar o fly.toml

Edite o `fly.toml` para corresponder ao nome do seu aplicativo e requisitos:

```toml
app = "meu-zero"  # O nome do seu aplicativo
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  ZERO_PREFER_PNPM = "1"
  ZERO_STATE_DIR = "/data"
  NODE_OPTIONS = "--max-old-space-size=1536"

[processes]
  app = "node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[vm]]
  size = "shared-cpu-2x"
  memory = "2048mb"

[mounts]
  source = "zero_data"
  destination = "/data"
```

**Configurações principais:**

| Configuração | Por quê |
|---------|-----|
| `--bind lan` | Vincula ao `0.0.0.0` para que o proxy do Fly possa alcançar o gateway |
| `--allow-unconfigured` | Inicia sem um arquivo de configuração (você criará um depois) |
| `internal_port = 3000` | Deve corresponder à porta `--port 3000` (ou `ZERO_GATEWAY_PORT`) para as verificações de saúde do Fly |
| `memory = "2048mb"` | 512MB é muito pouco; 2GB recomendado |
| `ZERO_STATE_DIR = "/data"` | Persiste o estado no volume |

## 3) Configurar segredos (secrets)

```bash
# Obrigatório: Token do Gateway (para vínculo não-loopback)
fly secrets set ZERO_GATEWAY_TOKEN=$(openssl rand -hex 32)

# Chaves de API do provedor de modelos
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# Opcional: Outros provedores
fly secrets set OPENAI_API_KEY=sk-...
fly secrets set GOOGLE_API_KEY=...

# Tokens de canal
fly secrets set DISCORD_BOT_TOKEN=MTQ...
```

**Notas:**

- Vínculos não-loopback (`--bind lan`) exigem `ZERO_GATEWAY_TOKEN` por segurança.
- Trate esses tokens como senhas.

## 4) Implantar (Deploy)

```bash
fly deploy
```

A primeira implantação constrói a imagem Docker (~2-3 minutos). As implantações subsequentes são mais rápidas.

Após a implantação, verifique:

```bash
fly status
fly logs
```

Você deve ver:

```
[gateway] listening on ws://0.0.0.0:3000 (PID xxx)
[discord] logged in to discord as xxx
```

## 5) Criar arquivo de configuração

Acesse a máquina via SSH para criar uma configuração adequada:

```bash
fly ssh console
```

Crie o diretório e o arquivo de configuração:

```bash
mkdir -p /data
cat > /data/zero.json << 'EOF'
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-5",
        "fallbacks": ["anthropic/claude-sonnet-4-5", "openai/gpt-4o"]
      },
      "maxConcurrent": 4
    },
    "list": [
      {
        "id": "main",
        "default": true
      }
    ]
  },
  "auth": {
    "profiles": {
      "anthropic:default": { "mode": "token", "provider": "anthropic" },
      "openai:default": { "mode": "token", "provider": "openai" }
    }
  },
  "bindings": [
    {
      "agentId": "main",
      "match": { "channel": "discord" }
    }
  ],
  "channels": {
    "discord": {
      "enabled": true,
      "groupPolicy": "allowlist",
      "guilds": {
        "SEU_ID_DO_SERVIDOR": {
          "channels": { "general": { "allow": true } },
          "requireMention": false
        }
      }
    }
  },
  "gateway": {
    "mode": "local",
    "bind": "auto"
  },
  "meta": {
    "lastTouchedVersion": "2026.1.25"
  }
}
EOF
```

**Nota:** Com `ZERO_STATE_DIR=/data`, o caminho da configuração é `/data/zero.json`.

**Nota:** O token do Discord pode vir de:

- Variável de ambiente: `DISCORD_BOT_TOKEN` (recomendado para segredos)
- Arquivo de configuração: `channels.discord.token`

Se estiver usando a variável de ambiente, não há necessidade de adicionar o token na configuração. O gateway lê `DISCORD_BOT_TOKEN` automaticamente.

Reinicie para aplicar:

```bash
exit
fly machine restart <machine-id>
```

## 6) Acessar o Gateway

### UI de Controle

Abra no navegador:

```bash
fly open
```

Ou visite `https://meu-zero.fly.dev/`

Cole o token do gateway (o valor de `ZERO_GATEWAY_TOKEN`) para se autenticar.

### Logs

```bash
fly logs              # Logs ao vivo
fly logs --no-tail    # Logs recentes
```

### Console SSH

```bash
fly ssh console
```

## Solução de problemas

### "App is not listening on expected address"

O gateway está se vinculando a `127.0.0.1` em vez de `0.0.0.0`.

**Correção:** Adicione `--bind lan` ao comando do processo no `fly.toml`.

### Falha nas verificações de saúde (Health checks) / Conexão recusada

O Fly não consegue alcançar o gateway na porta configurada.

**Correção:** Garanta que o `internal_port` corresponda à porta do gateway (defina `--port 3000` ou `ZERO_GATEWAY_PORT=3000`).

### Problemas de Memória (OOM)

O contêiner continua reiniciando ou sendo encerrado. Sinais: `SIGABRT`, `v8::internal::Runtime_AllocateInYoungGeneration` ou reinicializações silenciosas.

**Correção:** Aumente a memória no `fly.toml`:

```toml
[[vm]]
  memory = "2048mb"
```

Ou atualize uma máquina existente:

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**Nota:** 512MB é muito pouco. 1GB pode funcionar, mas pode ocorrer OOM sob carga ou com logs detalhados. **2GB é o recomendado.**

### Problemas de Bloqueio do Gateway (Lock)

O gateway recusa-se a iniciar com erros de "já em execução" (already running).

Isso acontece quando o contêiner reinicia, mas o arquivo de bloqueio PID persiste no volume.

**Correção:** Remova o arquivo de bloqueio:

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

O arquivo de bloqueio está em `/data/gateway.*.lock` (não em um subdiretório).

### Configuração não sendo lida

Se estiver usando `--allow-unconfigured`, o gateway cria uma configuração mínima. Sua configuração personalizada em `/data/zero.json` deve ser lida após a reinicialização.

Verifique se a configuração existe:

```bash
fly ssh console --command "cat /data/zero.json"
```

### Gravando configuração via SSH

O comando `fly ssh console -C` não suporta redirecionamento de shell. Para gravar um arquivo de configuração:

```bash
# Use echo + tee (pipe do local para o remoto)
echo '{"sua":"config"}' | fly ssh console -C "tee /data/zero.json"

# Ou use sftp
fly sftp shell
> put /caminho/local/config.json /data/zero.json
```

**Nota:** `fly sftp` pode falhar se o arquivo já existir. Delete-o primeiro:

```bash
fly ssh console --command "rm /data/zero.json"
```

### Estado não persistindo

Se você perder credenciais ou sessões após uma reinicialização, o diretório de estado está sendo gravado no sistema de arquivos do contêiner.

**Correção:** Garanta que `ZERO_STATE_DIR=/data` esteja definido no `fly.toml` e implante novamente.

## Atualizações

```bash
# Obtenha as últimas alterações
git pull

# Implante novamente
fly deploy

# Verifique o status
fly status
fly logs
```

### Atualizando o comando da máquina

Se você precisar alterar o comando de inicialização sem uma implantação completa:

```bash
# Obtenha o ID da máquina
fly machines list

# Atualize o comando
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Ou com aumento de memória
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**Nota:** Após um `fly deploy`, o comando da máquina pode ser resetado para o que está no `fly.toml`. Se você fez alterações manuais, reaplique-as após a implantação.

## Notas

- O Fly.io usa **arquitetura x86** (não ARM)
- O Dockerfile é compatível com ambas as arquiteturas
- Para a integração do WhatsApp/Telegram, use `fly ssh console`
- Os dados persistentes vivem no volume em `/data`
- O Signal requer Java + signal-cli; use uma imagem personalizada e mantenha a memória em 2GB+.

## Custo

Com a configuração recomendada (`shared-cpu-2x`, 2GB RAM):

- ~$10-15/mês, dependendo do uso
- O nível gratuito inclui algum subsídio

Consulte os [preços do Fly.io](https://fly.io/docs/about/pricing/) para mais detalhes.
