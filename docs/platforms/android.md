---
summary: "App Android (nó): manual de conexão + Canvas/Chat/Câmera"
read_when:
  - Emparelhando ou reconectando o nó Android
  - Depurando o descobrimento do gateway no Android ou a autenticação
  - Verificando a paridade do histórico de chat entre clientes
---

# Aplicativo Android (Nó)

## Resumo do suporte

- Papel: aplicativo de nó complementar (o Android não hospeda o Gateway).
- Gateway necessário: sim (execute-o no macOS, Linux ou Windows via WSL2).
- Instalação: [Primeiros Passos](/start/getting-started) + [Emparelhamento](/gateway/pairing).
- Gateway: [Manual](/gateway) + [Configuração](/gateway/configuration).
  - Protocolos: [Protocolo do Gateway](/gateway/protocol) (nós + plano de controle).

## Controle do sistema

O controle do sistema (launchd/systemd) vive no host do Gateway. Veja [Gateway](/gateway).

## Manual de Conexão

App de nó Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

O Android conecta-se diretamente ao WebSocket do Gateway (padrão `ws://<host>:18789`) e usa o emparelhamento gerenciado pelo Gateway.

### Pré-requisitos

- Você pode executar o Gateway na máquina "mestra".
- O dispositivo/emulador Android consegue alcançar o WebSocket do gateway:
  - Na mesma LAN com mDNS/NSD, **ou**
  - Na mesma rede Tailscale usando Wide-Area Bonjour / DNS-SD unicast (veja abaixo), **ou**
  - Host/porta do gateway manual (fallback)
- Você pode executar a CLI (`zero`) na máquina do gateway (ou via SSH).

### 1) Inicie o Gateway

```bash
zero gateway --port 18789 --verbose
```

Confirme nos logs se você vê algo como:

- `listening on ws://0.0.0.0:18789`

Para configurações apenas via Tailscale (recomendado para Viena ⇄ Londres), vincule o gateway ao IP da tailnet:

- Defina `gateway.bind: "tailnet"` em `~/.zero/zero.json` no host do gateway.
- Reinicie o Gateway / app da barra de menus do macOS.

### 2) Verifique o descobrimento (opcional)

A partir da máquina do gateway:

```bash
dns-sd -B _zero-gw._tcp local.
```

Mais notas de depuração: [Bonjour](/gateway/bonjour).

#### Tailnet (Viena ⇄ Londres) descobrimento via DNS-SD unicast

O descobrimento NSD/mDNS do Android não atravessa redes. Se o seu nó Android e o gateway estiverem em redes diferentes, mas conectados via Tailscale, use Wide-Area Bonjour / DNS-SD unicast em vez disso:

1) Configure uma zona DNS-SD (exemplo `zero.internal.`) no host do gateway e publique os registros `_zero-gw._tcp`.
2) Configure o DNS split do Tailscale para `zero.internal` apontando para esse servidor DNS.

Detalhes e exemplo de configuração do CoreDNS: [Bonjour](/gateway/bonjour).

### 3) Conecte-se a partir do Android

No aplicativo Android:

- O aplicativo mantém sua conexão com o gateway ativa através de um **serviço de primeiro plano** (notificação persistente).
- Abra as **Configurações** (Settings).
- Em **Discovered Gateways**, selecione o seu gateway e toque em **Connect**.
- Se o mDNS estiver bloqueado, use **Advanced → Manual Gateway** (host + porta) e **Connect (Manual)**.

Após o primeiro emparelhamento bem-sucedido, o Android reconecta-se automaticamente ao iniciar:

- Endpoint manual (se habilitado), senão
- O último gateway descoberto (melhor esforço).

### 4) Aprove o emparelhamento (CLI)

Na máquina do gateway:

```bash
zero nodes pending
zero nodes approve <requestId>
```

Detalhes do emparelhamento: [Emparelhamento do Gateway](/gateway/pairing).

### 5) Verifique se o nó está conectado

- Via status dos nós:

  ```bash
  zero nodes status
  ```

- Via Gateway:

  ```bash
  zero gateway call node.list --params "{}"
  ```

### 6) Chat + histórico

A aba de Chat do nó Android usa a **chave de sessão primária** do gateway (`main`), portanto, o histórico e as respostas são compartilhados com o WebChat e outros clientes:

- Histórico: `chat.history`
- Enviar: `chat.send`
- Atualizações push (melhor esforço): `chat.subscribe` → `event:"chat"`

### 7) Canvas + câmera

#### Host de Canvas do Gateway (recomendado para conteúdo web)

Se você quer que o nó mostre conteúdo HTML/CSS/JS real que o agente pode editar no disco, aponte o nó para o host de canvas do Gateway.

Nota: os nós usam o host de canvas independente na porta `canvasHost.port` (padrão `18793`).

1) Crie `~/zero/canvas/index.html` no host do gateway.

2) Navegue o nó até ele (LAN):

```bash
zero nodes invoke --node "<No Android>" --command canvas.navigate --params '{"url":"http://<hostname-do-gateway>.local:18793/__zero__/canvas/"}'
```

Tailnet (opcional): se ambos os dispositivos estiverem no Tailscale, use um nome MagicDNS ou o IP da tailnet em vez de `.local`, ex: `http://<gateway-magicdns>:18793/__zero__/canvas/`.

Este servidor injeta um cliente de live-reload no HTML e recarrega nas alterações de arquivos.
O host A2UI vive em `http://<host-do-gateway>:18793/__zero__/a2ui/`.

Comandos de Canvas (apenas em primeiro plano):

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (use `{"url":""}` ou `{"url":"/"}` para retornar ao scaffold padrão). `canvas.snapshot` retorna `{ format, base64 }` (padrão `format="jpeg"`).
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` apelido legado)

Comandos de Câmera (apenas em primeiro plano; protegidos por permissão):

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Veja [Nó de Câmera](/nodes/camera) para parâmetros e auxiliares da CLI.
