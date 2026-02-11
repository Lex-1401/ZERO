---
summary: "Acesso remoto via túneis SSH (Gateway WS) e tailnets"
read_when:
  - Configurando ou depurando acessos a gateways remotos
---

# Acesso remoto (SSH, túneis e tailnets)

Este repositório suporta "remoto via SSH", mantendo um único Gateway (o mestre) executando em um host dedicado (desktop/servidor) e conectando clientes a ele.

- Para **operadores (você / o app macOS)**: O tunelamento SSH é o fallback universal.
- Para **nós (iOS/Android e dispositivos futuros)**: conectam-se ao **WebSocket** do Gateway (via LAN/tailnet ou túnel SSH, conforme necessário).

## A ideia central

- O WebSocket do Gateway vincula-se ao **loopback** na porta configurada (padrão 18789).
- Para uso remoto, você encaminha essa porta de loopback via SSH (ou utiliza uma tailnet/VPN para reduzir o tunelamento manual).

## Configurações comuns de VPN/tailnet (onde o agente reside)

Pense no **host do Gateway** como "onde o agente reside". Ele detém as sessões, perfis de autenticação, canais e estado. Seu notebook/desktop (e os nós) conectam-se a esse host.

### 1) Gateway sempre ativo em sua tailnet (VPS ou servidor doméstico)

Execute o Gateway em um host persistente e acesse-o via **Tailscale** ou SSH.

- **Melhor UX:** mantenha `gateway.bind: "loopback"` e use o **Tailscale Serve** para a Control UI.
- **Fallback:** mantenha loopback + túnel SSH de qualquer máquina que precise de acesso.
- **Exemplos:** [exe.dev](/platforms/exe-dev) (VM fácil) ou [Hetzner](/platforms/hetzner) (VPS de produção).

Isso é ideal quando seu notebook entra em hibernação com frequência, mas você deseja que o agente fique sempre ativo.

### 2) Desktop doméstico executa o Gateway, notebook é o controle remoto

O notebook **não** executa o agente. Ele se conecta remotamente:

- Use o modo **Remoto via SSH** do app macOS (Configurações → Geral → "Onde o ZERO roda").
- O app abre e gerencia o túnel, para que o WebChat + verificações de saúde (health checks) funcionem perfeitamente.

Guia de execução (runbook): [acesso remoto no macOS](/platforms/mac/remote).

### 3) Notebook executa o Gateway, acesso remoto de outras máquinas

Mantenha o Gateway local, mas exponha-o com segurança:

- Túnel SSH para o notebook a partir de outras máquinas, ou
- Tailscale Serve para a Control UI e mantenha o Gateway apenas no loopback.

Guia: [Tailscale](/gateway/tailscale) e [Visão geral Web](/web).

## Fluxo de comando (o que roda onde)

Um único serviço de gateway detém o estado + canais. Os nós são periféricos.

Exemplo de fluxo (Telegram → nó):

- Uma mensagem de Telegram chega ao **Gateway**.
- O Gateway executa o **agente** e decide se deve chamar uma ferramenta de nó.
- O Gateway chama o **nó** através do WebSocket do Gateway (RPC `node.*`).
- O nó retorna o resultado; o Gateway responde de volta para o Telegram.

Notas:

- **Os nós não executam o serviço de gateway.** Apenas um gateway deve rodar por host, a menos que você execute intencionalmente perfis isolados (veja [Múltiplos gateways](/gateway/multiple-gateways)).
- O "modo de nó" do app macOS é apenas um cliente de nó através do WebSocket do Gateway.

## Túnel SSH (CLI + ferramentas)

Crie um túnel local para o WS do Gateway remoto:

```bash
ssh -N -L 18789:127.0.0.1:18789 usuario@host
```

Com o túnel ativo:

- `zero health` e `zero status --deep` agora alcançam o gateway remoto via `ws://127.0.0.1:18789`.
- `zero gateway {status,health,send,agent,call}` também podem apontar para a URL encaminhada via `--url` quando necessário.

Nota: substitua `18789` por sua `gateway.port` configurada (ou `--port`/`ZERO_GATEWAY_PORT`).

## Padrões remotos da CLI

Você pode persistir um alvo remoto para que os comandos da CLI o utilizem por padrão:

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "seu-token"
    }
  }
}
```

Quando o gateway estiver apenas em loopback, mantenha a URL em `ws://127.0.0.1:18789` e abra o túnel SSH primeiro.

## Interface de Chat via SSH

O WebChat não utiliza mais uma porta HTTP separada. A interface de chat em SwiftUI conecta-se diretamente ao WebSocket do Gateway.

- Encaminhe a porta `18789` via SSH (veja acima) e conecte os clientes a `ws://127.0.0.1:18789`.
- No macOS, prefira o modo "Remoto via SSH" do app, que gerencia o túnel automaticamente.

## App macOS "Remoto via SSH"

O app de barra de menus do macOS pode gerenciar toda essa configuração de ponta a ponta (verificações de status remotas, WebChat e encaminhamento de Voice Wake).

Guia de execução (runbook): [acesso remoto no macOS](/platforms/mac/remote).

## Regras de segurança (remoto/VPN)

Versão curta: **mantenha o Gateway apenas no loopback**, a menos que tenha certeza de que precisa de um bind.

- **Loopback + SSH/Tailscale Serve** é o padrão mais seguro (sem exposição pública).
- **Vínculos não-loopback** (`lan`/`tailnet`/`custom`, ou `auto` quando o loopback estiver indisponível) devem usar tokens/senhas de autenticação. O modo `"bind": "lan"` é recomendado para **Docker/VPS** onde o acesso via IP externo é necessário.
- `gateway.remote.token` serve **apenas** para chamadas CLI remotas — ele **não** habilita a autenticação local.
- `gateway.remote.tlsFingerprint` fixa o certificado TLS remoto ao usar `wss://`.
- **Tailscale Serve** pode autenticar via cabeçalhos de identidade quando `gateway.auth.allowTailscale: true`. Defina como `false` se preferir o uso de tokens/senhas.
- Trate `browser.controlUrl` como uma API de administração: apenas via tailnet + autenticação por token.

Análise detalhada: [Segurança](/gateway/security).
