---
summary: "Integração do Tailscale Serve/Funnel para o dashboard do Gateway"
read_when:
  - Expondo a Control UI do Gateway fora do localhost
  - Automatizando acesso via tailnet ou dashboard público
---

# Tailscale (Dashboard do Gateway)

O ZERO pode configurar automaticamente o Tailscale **Serve** (tailnet) ou **Funnel** (público) para o dashboard do Gateway e porta WebSocket. Isso mantém o Gateway vinculado ao loopback enquanto o Tailscale fornece HTTPS, roteamento e (para Serve) cabeçalhos de identidade.

## Modos

- `serve`: Apenas Tailnet via `tailscale serve`. O gateway permanece em `127.0.0.1`.
- `funnel`: HTTPS público via `tailscale funnel`. O ZERO requer uma senha compartilhada.
- `off`: Padrão (sem automação do Tailscale).

## Autenticação (Auth)

Defina `gateway.auth.mode` para controlar o handshake:

- `token` (padrão quando `ZERO_GATEWAY_TOKEN` está definido)
- `password` (segredo compartilhado via `ZERO_GATEWAY_PASSWORD` ou config)

Quando `tailscale.mode = "serve"` e `gateway.auth.allowTailscale` é `true`, requisições válidas de proxy do Serve podem autenticar via cabeçalhos de identidade do Tailscale (`tailscale-user-login`) sem fornecer um token/senha. O ZERO trata uma requisição como Serve apenas quando ela chega do loopback com cabeçalhos `x-forwarded-for`, `x-forwarded-proto` e `x-forwarded-host` do Tailscale.
Para exigir credenciais explícitas, defina `gateway.auth.allowTailscale: false` ou force `gateway.auth.mode: "password"`.

## Exemplos de configuração

### Apenas Tailnet (Serve)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" }
  }
}
```

Abrir: `https://<magicdns>/` (ou seu `gateway.controlUi.basePath` configurado)

### Apenas Tailnet (vínculo ao IP da Tailnet)

Use isso quando quiser que o Gateway escute diretamente no IP da Tailnet (sem Serve/Funnel).

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "seu-token" }
  }
}
```

Conecte-se de outro dispositivo Tailnet:

- Control UI: `http://<tailscale-ip>:18789/`
- WebSocket: `ws://<tailscale-ip>:18789`

Nota: loopback (`http://127.0.0.1:18789`) **não** funcionará neste modo.

### Internet pública (Funnel + senha compartilhada)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "substitua-me" }
  }
}
```

Prefira `ZERO_GATEWAY_PASSWORD` em vez de commitar uma senha no disco.

## Exemplos de CLI

```bash
zero gateway --tailscale serve
zero gateway --tailscale funnel --auth password
```

## Notas

- Tailscale Serve/Funnel requer que a CLI `tailscale` esteja instalada e logada.
- `tailscale.mode: "funnel"` recusa iniciar a menos que o modo de auth seja `password` para evitar exposição pública.
- Defina `gateway.tailscale.resetOnExit` se quiser que o ZERO desfaça a configuração de `tailscale serve` ou `tailscale funnel` ao encerrar.
- `gateway.bind: "tailnet"` é um vínculo direto à Tailnet (sem HTTPS, sem Serve/Funnel).
- `gateway.bind: "auto"` prefere loopback; use `tailnet` se quiser apenas Tailnet.
- Serve/Funnel expõem apenas a **Control UI do Gateway + WS**. Nós se conectam pelo mesmo endpoint WS do Gateway, então o Serve pode funcionar para acesso de nós.

## Servidor de controle do navegador (Gateway remoto + navegador local)

Se você roda o Gateway em uma máquina mas quer controlar um navegador em outra, use um **servidor de controle de navegador separado** e publique-o através do Tailscale **Serve** (apenas tailnet):

```bash
# na máquina que roda o Chrome
zero browser serve --bind 127.0.0.1 --port 18791 --token <token>
tailscale serve https / http://127.0.0.1:18791
```

Então aponte a config do Gateway para a URL HTTPS:

```json5
{
  browser: {
    enabled: true,
    controlUrl: "https://<magicdns>/"
  }
}
```

E autentique a partir do Gateway com o mesmo token (preferência por env):

```bash
export ZERO_BROWSER_CONTROL_TOKEN="<token>"
```

Evite Funnel para endpoints de controle de navegador a menos que você queira explicitamente exposição pública.

## Pré-requisitos e limites do Tailscale

- Serve requer HTTPS ativado para sua tailnet; a CLI avisa se estiver faltando.
- Serve injeta cabeçalhos de identidade do Tailscale; Funnel não.
- Funnel requer Tailscale v1.38.3+, MagicDNS, HTTPS ativado e um atributo de nó funnel.
- Funnel suporta apenas portas `443`, `8443` e `10000` via TLS.
- Funnel no macOS requer a variante open-source do app Tailscale.

## Saiba mais

- Visão geral do Tailscale Serve: <https://tailscale.com/kb/1312/serve>
- Comando `tailscale serve`: <https://tailscale.com/kb/1242/tailscale-serve>
- Visão geral do Tailscale Funnel: <https://tailscale.com/kb/1223/tailscale-funnel>
- Comando `tailscale funnel`: <https://tailscale.com/kb/1311/tailscale-funnel>
