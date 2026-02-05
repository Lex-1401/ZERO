---
summary: "Descoberta de nós e transportes (Bonjour, Tailscale, SSH) para encontrar o gateway"
read_when:
  - Implementando ou alterando a descoberta/anúncio do Bonjour
  - Ajustando os modos de conexão remota (direta vs SSH)
  - Projetando a descoberta de nós + emparelhamento para nós remotos
---

# Descoberta e transportes

O ZERO tem dois problemas distintos que parecem semelhantes na superfície:

1) **Controle remoto do operador**: o aplicativo da barra de menus do macOS controlando um gateway executado em outro lugar.
2) **Emparelhamento de nós**: iOS/Android (e futuros nós) encontrando um gateway e emparelhando-se com segurança.

O objetivo do projeto é manter toda a descoberta/anúncio de rede no **Portal de Nós (Node Gateway)** (`zero` / `zero gateway`) e manter os clientes (aplicativo mac, iOS) como consumidores.

## Termos

- **Gateway**: um único processo de gateway de longa duração que possui o estado (sessões, emparelhamento, registro de nós) e executa os canais. A maioria das configurações usa um por host; configurações isoladas de múltiplos gateways são possíveis.
- **Gateway WS (plano de controle)**: o endpoint WebSocket em `127.0.0.1:18789` por padrão; pode ser vinculado à LAN/tailnet via `gateway.bind`.
- **Transporte WS direto**: um endpoint Gateway WS voltado para a LAN/tailnet (sem SSH).
- **Transporte SSH (fallback)**: controle remoto ao encaminhar o `127.0.0.1:18789` sobre SSH.
- **Ponte TCP legada (descontinuada/removida)**: transporte de nó antigo (veja [Protocolo de ponte](/gateway/bridge-protocol)); não é mais anunciado para descoberta.

Detalhes do protocolo:

- [Protocolo do Gateway](/gateway/protocol)
- [Protocolo de ponte (legado)](/gateway/bridge-protocol)

## Por que mantemos tanto o "direto" quanto o SSH

- **WS Direto** é a melhor experiência de usuário na mesma rede e dentro de uma tailnet:
  - autodescoberta na LAN via Bonjour
  - tokens de emparelhamento + ACLs de propriedade do gateway
  - não é necessário acesso ao shell; a superfície do protocolo pode permanecer restrita e auditável
- **SSH** continua sendo o fallback universal:
  - funciona em qualquer lugar que você tenha acesso via SSH (mesmo em redes não relacionadas)
  - sobrevive a problemas de multicast/mDNS
  - não requer novas portas de entrada além do SSH

## Entradas de descoberta (como os clientes aprendem onde o gateway está)

### 1) Bonjour / mDNS (apenas LAN)

O Bonjour é baseado no melhor esforço e não atravessa redes. Ele é usado apenas para conveniência na "mesma LAN".

Direção alvo:

- O **gateway** anuncia seu endpoint WS via Bonjour.
- Os clientes navegam e mostram uma lista de "escolha um gateway", e então armazenam o endpoint escolhido.

Solução de problemas e detalhes do beacon: [Bonjour](/gateway/bonjour).

#### Detalhes do beacon de serviço

- Tipos de serviço:
  - `_zero-gw._tcp` (beacon de transporte do gateway)
- Chaves TXT (não secretas):
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22` (ou o que quer que seja anunciado)
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (apenas quando o TLS está habilitado)
  - `gatewayTlsSha256=<sha256>` (apenas quando o TLS está habilitado e o fingerprint está disponível)
  - `canvasPort=18793` (porta padrão do canvas host; serve `/__zero__/canvas/`)
  - `cliPath=<path>` (opcional; caminho absoluto para um ponto de entrada ou binário `zero` executável)
  - `tailnetDns=<magicdns>` (dica opcional; detectada automaticamente quando o Tailscale está disponível)

Desativar/sobrescrever:

- `ZERO_DISABLE_BONJOUR=1` desativa o anúncio.
- `gateway.bind` em `~/.zero/zero.json` controla o modo de vinculação do Gateway.
- `ZERO_SSH_PORT` sobrescreve a porta SSH anunciada no TXT (padrão 22).
- `ZERO_TAILNET_DNS` publica uma dica `tailnetDns` (MagicDNS).
- `ZERO_CLI_PATH` sobrescreve o caminho da CLI anunciado.

### 2) Tailnet (através de redes)

Para configurações do tipo Londres/Viena, o Bonjour não ajudará. O alvo "direto" recomendado é:

- Nome Tailscale MagicDNS (preferido) ou um IP estável da tailnet.

Se o gateway detectar que está rodando sob o Tailscale, ele publica `tailnetDns` como uma dica opcional para os clientes (incluindo beacons de área ampla).

### 3) Manual / Alvo SSH

Quando não há rota direta (ou a direta está desativada), os clientes sempre podem se conectar via SSH encaminhando a porta do gateway local (loopback).

Veja [Acesso remoto](/gateway/remote).

## Seleção de transporte (política do cliente)

Comportamento recomendado do cliente:

1) Se um endpoint direto emparelhado estiver configurado e acessível, use-o.
2) Caso contrário, se o Bonjour encontrar um gateway na LAN, ofereça uma escolha "Usar este gateway" com um toque e salve-o como o endpoint direto.
3) Caso contrário, se um DNS/IP da tailnet estiver configurado, tente o direto.
4) Caso contrário, faça o fallback para o SSH.

## Emparelhamento + autenticação (transporte direto)

O gateway é a fonte da verdade para a admissão de nós/clientes.

- As solicitações de emparelhamento são criadas/aprovadas/rejeitadas no gateway (veja [Emparelhamento do Gateway](/gateway/pairing)).
- O gateway impõe:
  - autenticação (token / par de chaves)
  - escopos/ACLs (o gateway não é um proxy bruto para todos os métodos)
  - limites de taxa

## Responsabilidades por componente

- **Gateway**: anuncia beacons de descoberta, possui decisões de emparelhamento e hospeda o endpoint WS.
- **Aplicativo macOS**: ajuda você a escolher um gateway, mostra avisos de emparelhamento e usa SSH apenas como fallback.
- **Nós iOS/Android**: navegam pelo Bonjour como uma conveniência e se conectam ao Gateway WS emparelhado.

---

*Próximo: [Protocolo do Gateway](/gateway/protocol)* ∅
