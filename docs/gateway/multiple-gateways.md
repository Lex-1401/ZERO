---
summary: "Execute múltiplos ZERO Gateways em um único host (isolamento, portas e perfis)"
read_when:
  - Executando mais de um Gateway na mesma máquina
  - Quando você precisa de configuração/estado/portas isolados por Gateway
---

# Múltiplos Gateways (mesmo host)

A maioria das configurações deve usar apenas um Gateway, pois um único Gateway pode lidar com múltiplas conexões de mensagens e agentes. Se você precisar de um isolamento mais forte ou redundância (ex: um bot de resgate), execute Gateways separados com perfis/portas isolados.

## Checklist de isolamento (obrigatório)

- `ZERO_CONFIG_PATH` — arquivo de configuração por instância
- `ZERO_STATE_DIR` — sessões, credenciais e caches por instância
- `agents.defaults.workspace` — raiz do espaço de trabalho por instância
- `gateway.port` (ou `--port`) — única por instância
- Portas derivadas (navegador/canvas) não devem se sobrepor

Se esses itens forem compartilhados, você enfrentará condições de corrida na configuração e conflitos de porta.

## Recomendado: perfis (`--profile`)

Os perfis definem automaticamente o escopo de `ZERO_STATE_DIR` + `ZERO_CONFIG_PATH` e adicionam sufixos aos nomes dos serviços.

```bash
# principal (main)
zero --profile main setup
zero --profile main gateway --port 18789

# resgate (rescue)
zero --profile rescue setup
zero --profile rescue gateway --port 19001
```

Serviços por perfil:

```bash
zero --profile main gateway install
zero --profile rescue gateway install
```

## Guia do Bot de Resgate (Rescue-Bot)

Execute um segundo Gateway no mesmo host com seus próprios:

- perfil/configuração
- diretório de estado
- espaço de trabalho
- porta base (além das portas derivadas)

Isso mantém o bot de resgate isolado do bot principal para que ele possa depurar ou aplicar mudanças de configuração caso o bot primário esteja fora do ar.

Espaçamento de portas: deixe pelo menos 20 portas entre as portas base para que as portas derivadas do navegador/canvas/CDP nunca colidam.

### Como instalar (bot de resgate)

```bash
# Bot principal (existente ou novo, sem o parâmetro --profile)
# Roda na porta 18789 + Portas Chrome CDC/Canvas/...
zero onboard
zero gateway install

# Bot de resgate (perfil + portas isolados)
zero --profile rescue onboard
# Notas:
# - o nome do espaço de trabalho terá o sufixo -rescue por padrão
# - a porta deve ser pelo menos 18789 + 20 portas,
#   melhor escolher uma porta base completamente diferente, como 19789,
# - o restante da integração (onboarding) é igual ao normal

# Para instalar o serviço (se não ocorreu automaticamente durante o onboarding)
zero --profile rescue gateway install
```

## Mapeamento de portas (derivadas)

Porta base = `gateway.port` (ou `ZERO_GATEWAY_PORT` / `--port`).

- `browser.controlUrl port = base + 2`
- `canvasHost.port = base + 4`
- As portas CDP do perfil do navegador são alocadas automaticamente de `browser.controlPort + 9 .. + 108`

Se você sobrescrever qualquer uma delas na configuração ou no ambiente (env), deve mantê-las únicas por instância.

## Notas sobre Navegador/CDP (armadilha comum/footgun)

- **Não** fixe `browser.controlUrl` ou `browser.cdpUrl` com os mesmos valores em múltiplas instâncias.
- Cada instância precisa de sua própria porta de controle do navegador e faixa de CDP.
- Se precisar de portas CDP explícitas, defina `browser.profiles.<nome>.cdpPort` por instância.
- Chrome remoto: use `browser.profiles.<nome>.cdpUrl` (por perfil, por instância).

## Exemplo de env manual

```bash
ZERO_CONFIG_PATH=~/.zero/main.json \
ZERO_STATE_DIR=~/.zero-main \
zero gateway --port 18789

ZERO_CONFIG_PATH=~/.zero/rescue.json \
ZERO_STATE_DIR=~/.zero-rescue \
zero gateway --port 19001
```

## Verificações rápidas

```bash
zero --profile main status
zero --profile rescue status
zero --profile rescue browser status
```
