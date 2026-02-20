---
summary: "Execute o Gateway ZERO 24 horas por dia, 7 dias por semana, em um VPS Hetzner barato (Docker) com estado durável e binários integrados"
read_when:
  - Você deseja o ZERO rodando 24/7 em um VPS na nuvem (não no seu laptop)
  - Você quer um Gateway de nível de produção sempre ativo em seu próprio VPS
  - Você quer controle total sobre persistência, binários e comportamento de reinicialização
  - Você está executando o ZERO no Docker na Hetzner ou em um provedor semelhante
---

# ZERO na Hetzner (Docker, Guia VPS de Produção)

## Objetivo

Executar um Gateway ZERO persistente em um VPS Hetzner usando Docker, com estado durável, binários integrados e comportamento de reinicialização seguro.

Se você quer o “ZERO 24/7 por ~$5”, esta é a configuração confiável mais simples.
Os preços da Hetzner mudam; escolha o menor VPS Debian/Ubuntu e aumente a escala se encontrar erros de falta de memória (OOM).

## O que estamos fazendo (em termos simples)?

- Alugar um pequeno servidor Linux (VPS Hetzner)
- Instalar o Docker (runtime de aplicativo isolado)
- Iniciar o Gateway ZERO no Docker
- Persistir `~/.zero` + `~/zero` no host (sobrevive a reinicializações/reconstruções)
- Acessar a UI de Controle do seu laptop através de um túnel SSH

O Gateway pode ser acessado via:

- Encaminhamento de porta SSH do seu laptop
- Exposição direta de porta se você mesmo gerenciar o firewall e os tokens

Este guia assume Ubuntu ou Debian na Hetzner.
Se você estiver em outro VPS Linux, mapeie os pacotes adequadamente.
Para o fluxo genérico do Docker, consulte [Docker](/install/docker).

---

## Caminho rápido (operadores experientes)

1) Provisionar VPS Hetzner
2) Instalar Docker
3) Clonar o repositório do ZERO
4) Criar diretórios persistentes no host
5) Configurar `.env` e `docker-compose.yml`
6) Integrar (bake) os binários necessários na imagem
7) `docker compose up -d`
8) Verificar a persistência e o acesso ao Gateway

---

## O que você precisa

- VPS Hetzner com acesso root
- Acesso SSH a partir do seu laptop
- Conforto básico com SSH + copiar/colar
- ~20 minutos
- Docker e Docker Compose
- Credenciais de autenticação do modelo
- Credenciais opcionais do provedor
  - QR do WhatsApp
  - Token do bot do Telegram
  - OAuth do Gmail

---

## 1) Provisionar o VPS

Crie um VPS Ubuntu ou Debian na Hetzner.

Conecte-se como root:

```bash
ssh root@IP_DO_SEU_VPS
```

Este guia assume que o VPS é persistente (stateful).
Não o trate como infraestrutura descartável.

---

## 2) Instalar o Docker (no VPS)

```bash
apt-get update
apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sh
```

Verifique:

```bash
docker --version
docker compose version
```

---

## 3) Clonar o repositório do ZERO

```bash
git clone https://github.com/zero/zero.git
cd zero
```

Este guia assume que você construirá uma imagem personalizada para garantir a persistência dos binários.

---

## 4) Criar diretórios persistentes no host

Os contêineres Docker são efêmeros.
Todo o estado de longa duração deve viver no host.

```bash
mkdir -p /root/.zero
mkdir -p /root/zero

# Defina a propriedade para o usuário do contêiner (uid 1000):
chown -R 1000:1000 /root/.zero
chown -R 1000:1000 /root/zero
```

---

## 5) Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do repositório.

```bash
ZERO_IMAGE=zero:latest
ZERO_GATEWAY_TOKEN=mude-me-agora
ZERO_GATEWAY_BIND=lan
ZERO_GATEWAY_PORT=18789

ZERO_CONFIG_DIR=/root/.zero
ZERO_WORKSPACE_DIR=/root/zero

GOG_KEYRING_PASSWORD=mude-me-agora
XDG_CONFIG_HOME=/home/node/.zero
```

Gere segredos fortes:

```bash
openssl rand -hex 32
```

**Não envie este arquivo para o repositório (commit).**

---

## 6) Configuração do Docker Compose

Crie ou atualize o `docker-compose.yml`.

```yaml
services:
  zero-gateway:
    image: ${ZERO_IMAGE}
    build: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - HOME=/home/node
      - NODE_ENV=production
      - TERM=xterm-256color
      - ZERO_GATEWAY_BIND=${ZERO_GATEWAY_BIND}
      - ZERO_GATEWAY_PORT=${ZERO_GATEWAY_PORT}
      - ZERO_GATEWAY_TOKEN=${ZERO_GATEWAY_TOKEN}
      - GOG_KEYRING_PASSWORD=${GOG_KEYRING_PASSWORD}
      - XDG_CONFIG_HOME=${XDG_CONFIG_HOME}
      - PATH=/home/linuxbrew/.linuxbrew/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
    volumes:
      - ${ZERO_CONFIG_DIR}:/home/node/.zero
      - ${ZERO_WORKSPACE_DIR}:/home/node/zero
    ports:
      # Recomendado: manter o Gateway apenas em loopback no VPS; acesso via túnel SSH.
      # Para expô-lo publicamente, remova o prefixo `127.0.0.1:` e configure o firewall adequadamente.
      - "127.0.0.1:${ZERO_GATEWAY_PORT}:18789"

      # Opcional: apenas se você rodar nós iOS/Android contra este VPS e precisar do host Canvas.
      # Se você expuser isso publicamente, leia /gateway/security e configure o firewall adequadamente.
      # - "18793:18793"
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${ZERO_GATEWAY_BIND}",
        "--port",
        "${ZERO_GATEWAY_PORT}"
      ]
```

---

## 7) Integrar (bake) binários na imagem (crítico)

Instalar binários dentro de um contêiner em execução é uma armadilha.
Qualquer coisa instalada em tempo de execução será perdida na reinicialização.

Todos os binários externos exigidos pelas habilidades (skills) devem ser instalados no momento da construção (build) da imagem.

Os exemplos abaixo mostram apenas três binários comuns:

- `gog` para acesso ao Gmail
- `goplaces` para o Google Places
- `wacli` para o WhatsApp

Estes são exemplos, não uma lista completa.
Você pode instalar quantos binários forem necessários usando o mesmo padrão.

Se você adicionar novas habilidades posteriormente que dependam de binários adicionais, você deve:

1. Atualizar o Dockerfile
2. Reconstruir a imagem
3. Reiniciar os contêineres

**Exemplo de Dockerfile**

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Exemplo de binário 1: CLI do Gmail
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# Exemplo de binário 2: CLI do Google Places
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# Exemplo de binário 3: CLI do WhatsApp
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# Adicione mais binários abaixo usando o mesmo padrão

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

---

## 8) Construir e lançar (Build and launch)

```bash
docker compose build
docker compose up -d zero-gateway
```

Verifique os binários:

```bash
docker compose exec zero-gateway which gog
docker compose exec zero-gateway which goplaces
docker compose exec zero-gateway which wacli
```

Saída esperada:

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

---

## 9) Verificar o Gateway

```bash
docker compose logs -f zero-gateway
```

Sucesso:

```
[gateway] listening on ws://0.0.0.0:18789
```

A partir do seu laptop:

```bash
ssh -N -L 18789:127.0.0.1:18789 root@IP_DO_SEU_VPS
```

Abra:

`http://127.0.0.1:18789/`

Cole o seu token do gateway.

---

## O que persiste onde (fonte da verdade)

O ZERO roda no Docker, mas o Docker não é a fonte da verdade.
Todo o estado de longa duração deve sobreviver a reinicializações, reconstruções e reboots.

| Componente | Localização | Mecanismo de persistência | Notas |
|---|---|---|---|
| Config do Gateway | `/home/node/.zero/` | Montagem de volume do host | Inclui `zero.json`, tokens |
| Perfis de autenticação | `/home/node/.zero/` | Montagem de volume do host | Tokens OAuth, chaves de API |
| Configurações de habilidades | `/home/node/.zero/skills/` | Montagem de volume do host | Estado ao nível da habilidade |
| Workspace do agente | `/home/node/zero/` | Montagem de volume do host | Código e artefatos do agente |
| Sessão do WhatsApp | `/home/node/.zero/` | Montagem de volume do host | Preserva o login por QR |
| Keyring do Gmail | `/home/node/.zero/` | Volume do host + senha | Requer `GOG_KEYRING_PASSWORD` |
| Binários externos | `/usr/local/bin/` | Imagem Docker | Devem ser integrados no build |
| Runtime do Node | Sistema de arquivos do contêiner | Imagem Docker | Reconstruído a cada build da imagem |
| Pacotes do SO | Sistema de arquivos do contêiner | Imagem Docker | Não instale em tempo de execução |
| Contêiner Docker | Efêmero | Reiniciável | Seguro para destruir |
